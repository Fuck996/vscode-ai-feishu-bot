# Copilot-MCP-Backend架构分析和MCP配置管理设计

**文档版本**: v1.0.0 | **更新时间**: 2026-03-11 | **内容**: Copilot-MCP关系、约束规范、部署架构、用户配置方案

---

## 第一部分：Copilot 和 MCP 服务器的工作关系

### 1.1 架构交互流程

```
┌─────────────────────────────────────────────────────────────────┐
│ VS Code Workbench                                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────┐              ┌──────────────────────┐ │
│  │ Copilot Chat Agent  │──← stdio →──→│  MCP Server          │ │
│  │ (进程A)             │   (stdout)    │ (Node.js进程B)       │ │
│  └─────────────────────┘              └──────────────────────┘ │
│           ↓                                      ↓               │
│      读取instruction                    暴露 feishu_notify      │
│      检查是否需要                        工具和规范约束         │
│      调用feishu_notify                  从.vscode/mcp.json      │
│                                         读取参数                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ .vscode/mcp.json 配置文件                                    ││
│  │ ──────────────────────────────────────────────────────────   ││
│  │ {                                                       ││
│  │   "servers": {                                          ││
│  │     "feishu-notifier": {                               ││
│  │       "type": "stdio",                                 ││
│  │       "command": "node",                               ││
│  │       "args": ["mcp-server/index.js"],                ││
│  │       "env": {                                         ││
│  │         "WEBHOOK_ENDPOINT": "http://localhost:3000/...", ││
│  │         "TRIGGER_TOKEN": "4cd8847ce224f31...",        ││
│  │         "PROJECT_NAME": "(可选)"                      ││
│  │       }                                                ││
│  │     }                                                   ││
│  │   }                                                     ││
│  │ }                                                       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
         ↓ (HTTP POST)
    后端 Express 应用 (3000)
         ↓ 
    转发到飞书 Webhook URL
```

### 1.2 Copilot-MCP 的通信协议

**通信方式**: stdio (标准输入输出)

**流程**:
1. Copilot Agent 加载 `.vscode/mcp.json`，启动 MCP 服务器子进程
2. MCP 服务器通过 stdio 向 Copilot 宣告可用工具
3. Copilot 根据 `copilot-instructions.md` 决定何时调用工具
4. 调用时通过 stdio 向 MCP 发送参数
5. MCP 处理请求，返回结果通过 stdout 回复

**示例通信**:
```json
// 1. Copilot → MCP (请求工具调用)
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "feishu_notify",
    "arguments": {
      "summary": ["✅ 完成任务A", "🔧 改进B"],
      "title": "✅ 任务完成",
      "projectName": "我的项目"
    }
  }
}

// 2. MCP → Copilot (返回结果)
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "✅ 工作总结已成功发送到飞书！"
      }
    ]
  }
}
```

---

## 第二部分：MCP 对回报的约束和规范

### 2.1 MCP 服务器的四层约束

| 层级 | 约束方式 | 具体规范 |
|------|---------|---------|
| **工具签名** | 在MCP中定义 | 参数类型、必填项、可选项 |
| **格式化** | formatSummary() 函数 | 自动转✅/🔧/📝格式 |
| **标题生成** | 符号检测 | 自动生成合适的标题 |
| **项目名称** | 优先级规则 | 环境变量 > 参数 > package.json > 默认值 |

### 2.2 MCP 工具的完整签名

```javascript
{
  name: 'feishu_notify',
  description: '将工作总结发送到飞书群组。自动推送工作汇报卡片（采用 ✅/🔧 列表格式）。',
  inputSchema: {
    type: 'object',
    properties: {
      summary: {
        type: 'string',
        description: '工作总结。支持三种格式：(1) 纯文本自动美化；(2) 数组["✅ 完成A", "🔧 改进B"]；(3) 已格式化列表'
      },
      title: {
        type: 'string',
        description: '消息标题（可选，默认自动生成）'
      },
      projectName: {
        type: 'string',
        description: `项目名称（可选，默认为 "${PROJECT_NAME}"）`
      }
    },
    required: ['summary']
  }
}
```

### 2.3 格式化约束的执行过程

```
输入 summary
  ├─ 检测格式
  │  ├─ 已包含✅/🔧/📝 → 直接返回
  │  ├─ JSON数组        → join('\n')
  │  └─ 纯文本          → 自动分解
  │
  ├─ 长度判断
  │  ├─ > 150字符且多句    → 按句号分解为列表
  │  │  ├─ 第1句前缀✅
  │  │  ├─ 中间句前缀🔧
  │  │  └─ 最后句前缀📝
  │  └─ ≤150字符         → 添加相关前缀
  │
  └─ 输出 → 统一格式的列表
```

### 2.4 这些约束的作用

```
┌──────────────────────────────────────────────────────────────┐
│ MCP 约束的意义                                               │
├──────────────────────────────────────────────────────────────┤
│ ✅ 保证一致性     所有调用者都遵循同样的格式规范              │
│ ✅ 降低认知负担   调用者只需关心内容，格式自动处理            │
│ ✅ 支持多源集成   不同来源的调用都能规范输出                  │
│ ✅ 版本管理       MCP 属于后端，便于集中维护和升级            │
│ ✅ 跨进程隔离     MCP 在独立进程，调用者无需关心实现细节      │
└──────────────────────────────────────────────────────────────┘
```

---

## 第三部分：其他会话通过 MCP 是否能规范输出

### 3.1 结论：**能。完全兼容多会话调用。**

### 3.2 原理分析

**MCP 的通用性设计**:
- MCP 是一个通过 stdio/HTTP 的独立服务器
- 任何能连接到 MCP 的客户端都会受到同样的约束
- 约束逻辑在 MCP 侧（服务端），不在 Copilot 侧（客户端）

**多会话场景**:

```
场景A: 多个 VS Code 窗口
┌─ VS Code 窗口1 ─┐    ┌─ VS Code 窗口2 ─┐
│  Copilot Chat1  │    │  Copilot Chat2  │
└────────┬────────┘    └────────┬────────┘
         │                      │
         └──────────┬───────────┘
                    │
              ┌─────▼─────┐
              │ MCP Server│ ← 同一个进程
              │(单例)      │   或多个独立实例
              └─────┬─────┘
                    │
            ┌───────▼────────┐
            │ Backend Express│
            │   (3000 port)  │
            └────────────────┘

场景B: 其他编辑器/工具连接  
┌─────────────────┐
│ Cursor Editor   │
│  (支持MCP规范)  │
└────────┬────────┘
         │
    ┌────▼─────────────────┐
    │ 同一个 MCP Server    │
    │ (通过 stdio 连接)    │
    └────┬─────────────────┘
         │
    ┌────▼─────────────────┐
    │ 后端整合             │
    │ (统一的规范约束)     │
    └─────────────────────┘
```

### 3.3 多会话调用的规范保证

```javascript
// 无论谁调用，输出都是一致的

// 调用者A调用
feishu_notify({
  summary: "完成了功能A。改进了性能。验证成功。"
})

// ↓ MCP 处理 ↓ (同样的格式化逻辑)

输出:
✅ 完成了功能A。
🔧 改进了性能。
📝 验证成功。

// 调用者B同样的输入
feishu_notify({
  summary: "完成了功能A。改进了性能。验证成功。"
})

// ↓ MCP 处理 ↓ (同样的格式化逻辑)

输出:
✅ 完成了功能A。
🔧 改进了性能。
📝 验证成功。
```

### 3.4 这种设计的好处

```
┌────────────────────────────────────────────────────────────────┐
│ 多会话规范输出的优势                                           │
├────────────────────────────────────────────────────────────────┤
│ 1. 单一来源真实 (SSOT)                                        │
│    - 格式规范在 MCP 中定义，不重复                             │
│    - 所有调用者都执行同一套逻辑                                │
│                                                                │
│ 2. 跨工具兼容                                                  │
│    - VS Code / Cursor / 其他 IDE                             │
│    - 自定义脚本 / CLI 工具                                     │
│    - HTTP API 客户端                                          │
│    都能得到一致的处理                                          │
│                                                                │
│ 3. 版本升级无缝                                                │
│    - 规范提升只需修改 MCP                                     │
│    - 所有客户端立即享受新规范                                  │
│    - 无需逐个更新                                              │
│                                                                │
│ 4. 监管和审计                                                  │
│    - 后端可记录所有调用                                        │
│    - 知道谁、什么时间、用什么参数发的                          │
│    - 便于问题追踪                                              │
└────────────────────────────────────────────────────────────────┘
```

---

## 第四部分：MCP 和后端的部署关系

### 4.1 当前的部署拓扑

```
┌─────────────────────────────────────────────────────────────────┐
│ 开发环境 (本地)                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  VS Code 工作区                                                  │
│  ├─ .vscode/mcp.json ← MCP 配置                                │
│  └─ mcp-server/index.js ← MCP 服务器代码                       │
│           ↓ (HTTP POST)                                         │
│  Backend Express App (localhost:3000)                           │
│  ├─ routes/platform-webhook.ts                                 │
│  ├─ routes/integrations.ts                                     │
│  ├─ database.ts (JSON 数据库)                                  │
│  └─ config 配置                                                 │
│           ↓ (HTTPS)                                             │
│  飞书 Webhook Endpoint                                          │
│           ↓                                                     │
│  飞书群组消息                                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 生产环境 (假设部署方案)                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  容器1 (MCP Server)            容器2 (Backend)                  │
│  ├─ Node.js                    ├─ Node.js                     │
│  ├─ mcp-server/                ├─ backend/src                 │
│  ├─ 监听 stdio                  ├─ 监听 :3000                  │
│  └─ 读取环境变量               ├─ Express app                │
│      连接后端 HTTP              └─ database                   │
│                 ↓                   ↓                          │
│         (通过网络)          (由前端或外部系统管理)            │
│                                                                 │
│  共享配置 (.env)                                                │
│  ├─ WEBHOOK_ENDPOINT                                           │
│  ├─ TRIGGER_TOKEN                                              │
│  └─ PROJECT_NAME                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 MCP 和后端的关系

| 特性 | MCP | 后端 |
|------|-----|------|
| **启动位置** | VS Code 内 / 独立命令 | 后端容器/进程 |
| **配置来源** | .vscode/mcp.json / 环境变量 | .env / 数据库 |
| **主要责任** | 格式化、验证、调度 | 数据持久化、集成管理 |
| **运行时间** | 按需启动，通常随VS Code | 常驻运行 |
| **外部依赖** | 后端 HTTP 接口 | 飞书、数据库 |

### 4.3 数据流向

```
Copilot Agent
    ↓
MCP Server (格式化)
    ├─ 约束检查
    ├─ 格式美化
    ├─ 标题生成
    └─ 参数验证
    ↓ HTTP POST
Backend /api/webhook/{integrationId}
    ├─ 签名验证
    ├─ 权限检查
    ├─ 持久化存储
    └─ 转发到飞书
    ↓ HTTPS POST
Feishu Webhook
    ↓
飞书群组消息
```

---

## 第五部分：用户可配置的部分和前端设置方案

### 5.1 当前可配置的参数

**位置1：.vscode/mcp.json**
```json
{
  "WEBHOOK_ENDPOINT": "http://localhost:3000/api/webhook/...",
  "TRIGGER_TOKEN": "4cd8847ce224f31decc20ebeb972392ce9ff...",
  "PROJECT_NAME": "自定义项目名称"
}
```

**位置2：backend/package.json**
```json
{
  "name": "项目标识符",
  "description": "用户友好的项目名称"
}
```

**位置3：环境变量 (.env)**
```bash
PROJECT_NAME=我的项目
WEBHOOK_ENDPOINT=http://...
TRIGGER_TOKEN=...
```

### 5.2 哪些参数应该由用户在前端配置

```
┌──────────────────────────────────────────────────────────┐
│ 参数分类                                                 │
├──────────────────────────────────────────────────────────┤
│ ✅ 前端可配置                                             │
│   ├─ PROJECT_NAME (项目显示名称)                        │
│   ├─ 通知新增字段 (如标签、分类)                        │
│   ├─ 汇报模板选择 (简洁/详细/自定义)                    │
│   └─ 通知接收人/群组 (飞书)                            │
│                                                          │
│ ⚠️  不建议前端配置                                       │
│   ├─ WEBHOOK_ENDPOINT (安全敏感)                        │
│   ├─ TRIGGER_TOKEN (认证令牌)                          │
│   └─ MCP 格式化规则 (业务规范)                         │
│                                                          │
│ 📋 由管理员控制                                          │
│   ├─ MCP 版本升级                                        │
│   ├─ 后端集成管理                                        │
│   └─ 飞书机器人配置                                      │
└──────────────────────────────────────────────────────────┘
```

### 5.3 推荐方案：前端配置设置页面

**方案概述**:

在前端 Settings 页面添加 "MCP 通知设置" 部分，允许用户配置：

1. **项目配置**
   - 项目显示名称
   - 项目描述/标签

2. **通知偏好**
   - 汇报格式选择 (✅/🔧/📝 / 简洁版 / 详细版)
   - 是否包含时间戳
   - 是否显示项目名称

3. **集成管理**
   - 查看当前激活的机器人
   - 查看当前集成的基本信息
   - 启用/禁用通知

4. **高级选项** (仅限开发者)
   - 自定义标题prefix
   - 自定义格式规则

**用户面向的配置**:
```
保存位置: 后端数据库 (integrations表)

结构:
{
  integrations: {
    id: "集成ID",
    notificationPreferences: {
      displayProjectName: true,
      formatStyle: "standard",  // standard | compact | detailed
      includeTimestamp: true,
      customPrefix: ""
    },
    displayName: "我的项目",
    description: "项目描述"
  }
}
```

---

## 第六部分：前端集成设计（UI 预览方案）

### 6.1 位置：Settings.tsx 页面中新增 MCP 配置块

### 6.2 设计思路

**原则**:
- 不修改一言一行都会影响系统的参数 (WEBHOOK_ENDPOINT, TOKEN)
- 只开放用户体验相关的配置
- 通过后端 API 持久化配置
- 提供预览功能实时看到汇报效果

**布局**:
```
Settings 页面
├─ ... 现有设置项 ...
├─ ────────────────────────
│ 🤖 MCP 通知设置 (新增)
├─ ────────────────────────
│
├─ 【项目配置】
│ ├─ 项目显示名称: [文本框] "Feishu AI notification..."
│ ├─ 项目标签: [多选] ✓开发 ✓生产 □测试
│ └─ 描述: [大文本框]
│
├─ 【汇报格式】
│ ├─ 格式风格: ◉ 标准(✅/🔧/📝) ○ 简洁 ○ 详细
│ ├─ ☐ 显示时间戳
│ ├─ ☐ 显示项目名称
│ └─ ☐ 包含详细信息
│
├─ 【预览效果】
│ ├─ 示例输入: [文本框(可编辑)]
│ │  "完成了编码工作。修复了bug。已验证。"
│ ├─ [预览按钮]
│ └─ 效果演示框:
│    ┌─────────────────────────────────┐
│    │ ✅ 任务完成                      │
│    │ 项目：Feishu AI notification... │
│    │                                  │
│    │ ✅ 完成了编码工作。             │
│    │ 🔧 修复了bug。                  │
│    │ 📝 已验证。                      │
│    │                                  │
│    │ 🕐 2026-03-11 09:30:00        │
│    └─────────────────────────────────┘
│
├─ 【当前集成】
│ ├─ 激活机器人: 测试机器人 ✓
│ ├─ 集成类型: VS Code Chat
│ ├─ 状态: 启用 [切换开关]
│ └─ [更多信息] 链接
│
└─ [保存] [重置]
```

### 6.3 API 变更

**新增后端 API**:

```typescript
// GET /api/robots/:robotId/integrations/:integrationId/preferences
// 获取通知偏好设置

// PUT /api/robots/:robotId/integrations/:integrationId/preferences
// 更新通知偏好
Request:
{
  displayProjectName: boolean,
  formatStyle: 'standard' | 'compact' | 'detailed',
  includeTimestamp: boolean,
  customDisplayName?: string,
  description?: string
}

// POST /api/mcp/preview
// 预览格式化效果
Request:
{
  summary: string,
  formatStyle: 'standard' | 'compact' | 'detailed',
  projectName: string,
  includeTimestamp: boolean
}
Response:
{
  formatted: string,
  html: string  // 用于在前端展示
}
```

---

## 第七部分：如何实现用户配置的前端控制

### 7.1 实现步骤

**Step 1: 扩展数据库 (integration 对象)**
```typescript
interface Integration {
  // ... 现有字段 ...
  preferences?: {
    displayProjectName: boolean;
    formatStyle: 'standard' | 'compact' | 'detailed';
    includeTimestamp: boolean;
    customDisplayName?: string;
    description?: string;
  };
}
```

**Step 2: 后端添加 API 端点**
- `GET /api/robots/:robotId/integrations/:integrationId/preferences`
- `PUT /api/robots/:robotId/integrations/:integrationId/preferences`
- `POST /api/mcp/preview` (格式预览)

**Step 3: 前端 Settings.tsx 添加新模块**
```tsx
<MCPNotificationSettings 
  robotId={selectedRobotId}
  integrationId={selectedIntegrationId}
  onSave={handlePreferenceSave}
/>
```

**Step 4: 后端修改格式化逻辑**
在向飞书发送前，根据用户偏好调整格式

---

## 总结对比图

```
┌────────────────────────────────────────────────────────────────┐
│ Copilot-MCP-Backend 完整架构                                   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ Copilot Agent                                                  │
│ (follows copilot-instructions.md)                             │
│         ↓                                                      │
│ MCP Server ← ← ← ← ← [约束/规范]                             │
│ ├─ 格式化 (✅/🔧/📝)                                          │
│ ├─ 标题生成                                                    │
│ ├─ 项目名称处理                                                │
│ └─ 参数验证                                                    │
│         ↓ HTTP POST                                            │
│ Backend Express (3000)                                         │
│ ├─ Route: /api/webhook/:integrationId                        │
│ ├─ Route: /api/robots/:robotId/integrations/... (CRUD)     │
│ ├─ Route: /api/mcp/preview (用户配置预览)                  │
│ ├─ Database: integrations (含preferences)                    │
│ └─ [用户配置UI]                                               │
│         ↓ HTTPS                                               │
│ Feishu Webhook                                                │
│         ↓                                                     │
│ 飞书群组消息                                                   │
│                                                                │
│ ┌─────────────────────────────────────────────────────┐      │
│ │ 用户可配置的纬度 (前端Settings)                       │      │
│ ├─────────────────────────────────────────────────────┤      │
│ │ ✅ 项目显示名称                                      │      │
│ │ ✅ 汇报格式风格 (标准/简洁/详细)                    │      │
│ │ ✅ 时间戳显示选项                                    │      │
│ │ ✅ 项目名称显示选项                                  │      │
│ │ ✅ 激活/停用集成                                     │      │
│ │ ✅ 实时预览效果                                      │      │
│ └─────────────────────────────────────────────────────┘      │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

