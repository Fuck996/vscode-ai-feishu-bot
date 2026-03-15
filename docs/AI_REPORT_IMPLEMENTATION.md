# AI 汇报功能完整实现指南 - v1.4.14

**版本：** v1.4.14 | **更新时间：** 2026-03-15 | **内容：** LLM 报告生成、通知格式化、机器人发送完整实现

---

## 📌 核心流程架构

```
任务执行请求
   ↓
【1】收集通知数据
   ↓ (按时间/状态/机器人/集成过滤)
【2】格式化为 JSON 方案A（最多50条）
   ├─ total: 收集的通知数量
   ├─ statistics: {success, error, warning, info 各类数量}
   └─ events: 按优先级最多20条关键事件
   ↓
【3】调用 LLM API 生成报告
   ├─ 传递格式化数据 + 提示词模板
   ├─ 支持 DeepSeek/OpenAI/Google 模型
   └─ 超时时间：60秒
   ↓
【4】发送报告到汇报机器人
   ├─ 飞书卡片格式（markdown + 统计信息）
   └─ Webhook 超时：10秒
   ↓
【5】记录历史和通知
   ├─ 保存执行历史（成功/失败）
   ├─ 生成内容摘要（前300字）
   └─ 记录到审计通知系统
```

---

## 🔧 技术实现细节

### 1. 通知格式化函数 - `formatNotificationsAsJSON()`

**位置**：`backend/src/routes/services.ts:310-360`

**功能**：将收集的通知转换为 JSON 方案A 格式

```typescript
function formatNotificationsAsJSON(
  notifications: Array<Notification & { id?: number; createdAt?: string }>
): {
  total: number;
  statistics: Record<string, number>;
  events: Array<{ status: string; title: string; summary: string; timestamp: string }>;
}
```

**处理步骤**：
1. **过滤有效通知**：仅保留有 `createdAt` 和 `id` 的记录
2. **限制为50条**：`slice(0, 50)` 防止 token 溢出
3. **统计分类**：计算 success/error/warning/info 各占比
4. **优先级排序**：error(0) > warning(1) > success(2) > info(3)
5. **提取关键事件**：取排序后前20条作为事件摘要

**输出示例**：
```json
{
  "total": 45,
  "statistics": {
    "success": 30,
    "error": 10,
    "warning": 4,
    "info": 1
  },
  "events": [
    {
      "status": "error",
      "title": "部署失败",
      "summary": "Docker 构建超时",
      "timestamp": "2026-03-15T13:30:00Z"
    },
    ...
  ]
}
```

### 2. LLM API 调用函数 - `callLLMAPI()`

**位置**：`backend/src/routes/services.ts:362-405`

**功能**：调用任何兼容 OpenAI 接口的 LLM 模型

```typescript
async function callLLMAPI(
  model: ModelConfig,
  promptTemplate: PromptTemplate,
  notificationData: ReturnType<typeof formatNotificationsAsJSON>,
  taskName: string
): Promise<string>
```

**支持的模型**：
- DeepSeek（推荐）：`https://api.deepseek.com/v1`
- OpenAI：`https://api.openai.com/v1`
- Google Gemini：`https://generativelanguage.googleapis.com/v1beta/openai/`
- 自定义模型：任何兼容 OpenAI `/v1/chat/completions` 接口的服务

**请求格式**：
```typescript
POST {model.apiUrl}/v1/chat/completions
Header: Authorization: Bearer {model.apiKey}
Body: {
  model: model.modelId,
  messages: [
    {
      role: "user",
      content: `${promptTemplate.content}\n\n【当前数据】\n${JSON.stringify(notificationData)}\n\n请生成报告`
    }
  ],
  temperature: 0.7,
  max_tokens: 2000
}
```

**超时时间**：60秒

**错误处理**：
- API Key 或 URL 缺失会直接抛错并记录日志
- 网络错误、超时、返回空结果都有具体错误消息
- 错误消息格式：`调用模型 {name} 失败: {detailMessage}`

### 3. 机器人消息发送函数 - `sendReportToRobot()`

**位置**：`backend/src/routes/services.ts:407-450`

**功能**：将生成的报告发送给配置的汇报机器人

```typescript
async function sendReportToRobot(
  robot: Robot | null,
  report: string,
  taskName: string,
  statisticsData: any
): Promise<void>
```

**飞书卡片格式**：
```json
{
  "msg_type": "interactive",
  "card": {
    "config": { "wide_screen_mode": true },
    "header": {
      "title": { "content": "📊 任务名 - AI 周报", "tag": "plain_text" },
      "template": "blue"
    },
    "elements": [
      { "tag": "markdown", "content": "{生成的报告文本}" },
      { "tag": "hr" },
      { 
        "tag": "note",
        "elements": [
          { "tag": "plain_text", "content": "📈 统计: 成功 30 | 警告 4 | 错误 10 | 信息 1" },
          { "tag": "plain_text", "content": "⏰ 生成时间: 2026-03-15T13:36:06Z" }
        ]
      }
    ]
  }
}
```

**发送端点**：
- 从 `task.robotId` 获取机器人配置
- 使用 `robot.webhookUrl` 作为飞书 Webhook 地址
- 超时时间：10秒

**错误处理**：
- Webhook URL 缺失会直接返回错误
- HTTP 错误、超时都有明确错误消息

### 4. 完整的任务执行函数 - `runReportTask()`

**位置**：`backend/src/routes/services.ts:452-540`

**整合上述三个函数的完整流程**：

```typescript
async function runReportTask(task: ReportTask): Promise<ReportTaskHistory>
```

**执行步骤**（新增与优化部分）：

**优化1：通知过滤**
```typescript
// 按四个维度过滤
const relatedNotifications = allNotifications.filter(notification => {
  // ✓ 时间范围：getRangeStart() 确定起始时间
  // ✓ 通知状态：task.notificationStatuses 精确匹配
  // ✓ 机器人过滤：可选，如果指定则仅收集该机器人
  // ✓ 集成过滤：可选，如果指定则仅收集这些集成
});
// 限制最多50条
relatedNotifications = relatedNotifications.slice(0, 50);
```

**优化2：配置有效性检查**
```typescript
if (!model || !prompt || model.status === 'unconfigured') {
  throw new Error('模型或提示词配置不可用');
}
if (!robot || !robot.webhookUrl) {
  throw new Error('汇报机器人未配置');
}
```

**优化3：数据格式化**
```typescript
const formattedData = formatNotificationsAsJSON(relatedNotifications);
// 结果：{ total: 45, statistics: {...}, events: [...] }
```

**优化4：LLM 调用**
```typescript
const generatedReport = await callLLMAPI(model, prompt, formattedData, task.name);
// 若失败则捕获异常，输出明确的错误消息
```

**优化5：报告发送**
```typescript
await sendReportToRobot(robot, generatedReport, task.name, formattedData.statistics);
// 飞书机器人立即收到卡片消息
```

**优化6：历史记录**
```typescript
const history: ReportTaskHistory = {
  summary: `${成功消息}\n\n【生成内容】\n${generatedReport.substring(0, 300)}...`,
  status: 'success'
};
```

---

## 📋 通知过滤规则说明

### 规则优先级

| 优先级 | 规则 | 说明 |
|--------|------|------|
| 1 | **时间范围** | 由 `task.rangeType`（7d/14d/30d/week/month）确定，通知必须在时间范围内 |
| 2 | **必须条件** | `createdAt` 必须非空 |
| 3 | **状态过滤** | 通知状态必须在 `task.notificationStatuses` 中（精确匹配） |
| 4 | **机器人过滤** | 如果有机器人指定，通知 `robotName` 必须匹配 |
| 5 | **集成过滤** | 如果指定了集成，通知来源（source）必须包含任一集成的 ID 或名称 |
| 6 | **数量限制** | 最终结果限制为50条（按时间倒序） |

### 典型场景

**场景1**：汇报所有类型通知
```
rangeType: 'week'
notificationStatuses: ['success', 'error', 'warning', 'info']
integrationIds: [] 
robotId: '{}' (任意)
→ 结果：本周所有通知，最多50条
```

**场景2**：仅错误和警告，来自特定集成
```
rangeType: 'week'
notificationStatuses: ['error', 'warning']
integrationIds: ['integration-abc', 'integration-def']
→ 结果：本周来自这两个集成的错误+警告，最多50条
```

**场景3**：特定机器人最近30天的所有消息
```
rangeType: '30d'
notificationStatuses: ['success', 'error', 'warning', 'info']
robotId: 'robot-123'  ← 会自动过滤
→ 结果：robot-123 最近30天的所有通知，最多50条
```

---

## 🧪 测试验证步骤

### 前置条件

1. **配置好汇报机器人**：
   - Services → 机器人选择 → 选择已启用的机器人

2. **配置 LLM 模型**（必需）：
   - Services → MCP 模型 → 选择/配置 DeepSeek 或其他模型
   - 提供有效的 API Key 和 Model ID
   - 点击"测试连接"验证模型可用

3. **配置提示词模板**（必需）：
   - Services → AI 提示词 → 选择内置模板或创建自定义模板
   - 模板内容会与格式化通知数据一起发送给 LLM

4. **数据库中有通知记录**：
   - Dashboard 应显示"最近通知"
   - 或手动创建几条测试通知

### 测试步骤

1. **创建汇报任务**：
   ```
   Services → AI 汇报 → 新增任务
   ├─ 任务名称：测试汇报
   ├─ 运行时间：每周一 09:00
   ├─ 周期：最近7天
   ├─ 机器人：选择汇报机器人
   ├─ 集成：（可选，留空则包含所有）
   ├─ 状态过滤：success 和 error
   ├─ 模型：DeepSeek 或配置的模型
   ├─ 提示词：选择内置或自定义
   └─ 保存
   ```

2. **手动执行任务**：
   ```
   Services → AI 汇报 → 任务列表 → 点击目标任务右侧"执行"按钮
   ```

3. **观察执行结果**：

   **后端日志应显示**：
   ```
   [INFO] 开始调用 LLM 生成报告 (taskName=测试汇报, notificationCount=45)
   [INFO] LLM 报告生成成功 (reportLength=1523)
   [INFO] 报告已发送到汇报机器人 (robotId=robot-123)
   ```

   **前端应显示**：
   ```
   执行成功 → 任务「测试汇报」成功执行：通过模型 DeepSeek 汇总了 45 条通知，并已发送给汇报机器人。
   ```

   **汇报机器人（飞书）应收到卡片**：
   ```
   📊 测试汇报 - AI 周报
   
   【生成的报告内容】
   ...（LLM 生成的详细分析）...
   
   📈 统计: 成功 30 | 警告 5 | 错误 10 | 信息 0
   ⏰ 生成时间: 2026-03-15T13:36:06Z
   ```

4. **查看执行历史**：
   ```
   Services → AI 汇报 → 历史记录
   └─ 应看到刚才执行的记录：
      ├─ 执行时间：2026-03-15 13:36:06
      ├─ 收集通知：45 条
      ├─ 状态：成功 ✅
      └─ 详情：包含生成内容摘要
   ```

### 故障排查

| 现象 | 原因 | 解决 |
|------|------|------|
| "模型或提示词配置不可用" | 模型未配置或状态不对 | 在 Services → MCP 模型中测试并保存配置 |
| "汇报机器人未配置" | 机器人 Webhook 缺失 | 确认机器人已启用，Webhook URL 有效 |
| API 调用超时 | LLM 服务无响应或太慢 | 检查网络、API Key、模型是否可用 |
| 报告发送失败 | 飞书 API 超时或格式错误 | 检查机器人 Webhook、网络连接 |
| 通知数为0 | 时间范围内无匹配通知 | 检查过滤条件、数据库内是否有数据 |

---

## 📊 数据流向图

```
┌─────────────────────────────────┐
│  任务配置                        │
│ ┌─────────────────────────────┐ │
│ │ robotId: 汇报机器人ID       │ │
│ │ modelConfigId: LLM 模型ID   │ │
│ │ promptTemplateId: 提示词ID  │ │
│ │ rangeType: 'week'           │ │
│ │ notificationStatuses: [...]  │ │
│ │ integrationIds: [...]       │ │
│ └─────────────────────────────┘ │
└────────────┬────────────────────┘
             │
      【执行任务】
             │
      ┌──────▼──────┐
      │   过滤+格式 │
      └──────┬──────┘
             │
┌────────────▼────────────────────────┐
│ JSON 方案A（结构化数据）            │
│ {                                  │
│   "total": 45,                     │
│   "statistics": {...},             │
│   "events": [...]                  │
│ }                                  │
└────────────┬────────────────────────┘
             │
      【LLM 处理】
      ┌──────▼───────┐
      │ 模型 API 调用 │
      └──────┬───────┘
             │
┌────────────▼────────────────┐
│ 生成的报告文本              │
│ （AI 生成的分析和总结）     │
└────────────┬────────────────┘
             │
      【发送消息】
      ┌──────▼────────┐
      │ 飞书 Webhook  │
      └──────┬────────┘
             │
┌────────────▼────────────────────┐
│ 汇报机器人收到卡片消息         │
│ （飞书 AI 周报通知）           │
└────────────┬────────────────────┘
             │
      ┌──────▼──────┐
      │ 保存历史记录 │
      └─────────────┘
```

---

## 🚀 性能和安全考虑

### 性能优化

1. **通知限制为50条**
   - 防止过大的 JSON 数据传输
   - 控制 LLM 输入 token 数量
   - 减少填充时间

2. **事件摘要仅取20条关键项**
   - 优先级排序确保错误优先展示
   - 减少 token 消耗同时保留主要信息

3. **超时配置**
   - LLM 调用：60秒（允许较长的推理时间）
   - Robot Webhook：10秒（飞书 API 响应快）

### 安全考虑

1. **API Key 保护**
   - 模型配置中的 API Key 不会在日志中打印
   - 仅在必要时（API 调用）才传递给 HTTP 请求

2. **错误信息脱敏**
   - 用户界面显示友好的错误消息
   - 详细错误只在后端日志中记录

3. **权限验证**
   - 任务执行需要管理员权限
   - Webhook 签名验证（后续可增强）

---

## 🔮 未来改进方向

1. **智能批处理**
   - 当通知 > 50 条时，自动分批调用 LLM
   - 合并多个批次的报告为最终报告

2. **自定义格式化**
   - 允许用户选择通知格式（JSON/纯文本/HTML）
   - 自定义统计维度（按项目/状态/来源）

3. **定时调度**
   - 当前支持周期任务（周报/月报）
   - 未来支持实时触发、跳规则等

4. **多通道发送**
   - 除了飞书机器人，支持发送到其他渠道
   - 邮件、Slack、钉钉等

5. **报告历史对比**
   - 显示本周 vs 上周的趋势对比
   - 高亮关键变化

---

## 📚 相关代码文件

| 文件 | 说明 |
|------|------|
| `backend/src/routes/services.ts` | 主实现文件，包含所有核心函数 |
| `backend/src/database.ts` | 数据模型和持久化操作 |
| `backend/src/logger.ts` | 日志系统 |
| `frontend/src/pages/Services.tsx` | 前端任务管理界面 |
| `frontend/src/services/reportTasks.ts` | 前端 API 客户端 |
| `docs/REQUIREMENTS.md` | 需求和版本记录 |

