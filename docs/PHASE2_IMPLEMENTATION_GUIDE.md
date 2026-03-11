# Copilot-MCP 架构项目 - Phase 2 实施指南

**版本**: v1.0.0 | **日期**: 2026-03-11 | **状态**: 规划阶段

## 来源和背景

基于用户对四个核心问题的咨询：
1. ✅ Copilot 和 MCP 如何工作的？
2. ✅ MCP 约束是否强制？其他会话是否受影响？
3. ✅ MCP 和后端如何部署？
4. ✅ 前端能否控制 MCP 和后端设置？

本指南提供 Phase 2（用户配置功能开发）的详细实施步骤。

---

## 现状总结

### ✅ Phase 1 完成项（已上线）
- MCP 服务器搭建和 ✅/🔧/📝 格式化约束
- 后端 Express 应用和集成管理
- 前端基础UI（Robots、Integrations）
- 飞书 Webhook 集成
- UTF-8 编码修复
- GitHub 提交 (c7095f5)

### 📋 Phase 2 规划项（待实施）
- 数据库扩展（Integration 表添加 preferences）
- 后端 API 新增 3 个端点
- 前端 Settings 页面添加 MCP 配置区块
- 用户偏好持久化和预览功能

---

## Phase 2 详细实施计划

### 步骤 1：数据库模型扩展 (backend/src/database.ts)

**修改内容**:
```typescript
// 在 Interface 中扩展 Integration 定义
interface IntegrationPreferences {
  displayProjectName: boolean;
  formatStyle: 'standard' | 'compact' | 'detailed';
  includeTimestamp: boolean;
  customDisplayName?: string;
  customPrefix?: string;
  maxItems?: number;
  customRules?: {
    autoFold: boolean;
    includeCode: boolean;
    pinImportant: boolean;
  };
}

interface Integration {
  // ... 现有字段 ...
  preferences?: IntegrationPreferences;
}
```

**数据库操作**:
- 新增方法: `updateIntegrationPreferences(integrationId, preferences)`
- 修改方法: `getIntegrationById()` 返回包含 preferences 的完整对象

**预计工作量**: 30 分钟

---

### 步骤 2：后端 API 端点开发 (backend/src/routes/)

#### 2.1 新增文件：`backend/src/routes/mcp-settings.ts`

**端点1**: GET /api/mcp/preferences/:integrationId
```typescript
// 获取集成的用户偏好设置
// 返回 IntegrationPreferences 对象或默认值
```

**端点2**: PUT /api/mcp/preferences/:integrationId
```typescript
// 更新集成的用户偏好
// 验证权限、数据有效性
// 返回更新后的 preferences 对象
```

**端点3**: POST /api/mcp/preview
```typescript
// 格式化预览接口
// 输入: { summary, formatStyle, projectName, includeTimestamp }
// 输出: { formatted, html, preview }
```

**预计工作量**: 1 小时

---

### 步骤 3：前端 Settings 页面改造 (frontend/src/pages/Settings.tsx)

#### 3.1 新增组件：`MCPNotificationSettings.tsx`

**功能**:
```javascript
// 1. 加载当前集成的偏好设置
// 2. 渲染配置表单（项目名称、格式选择、显示选项）
// 3. 实时预览功能
// 4. 保存/重置操作
```

#### 3.2 状态管理

```typescript
const [preferences, setPreferences] = useState<IntegrationPreferences>({
  displayProjectName: true,
  formatStyle: 'standard',
  includeTimestamp: true
});

const [previewResult, setPreviewResult] = useState<string>('');
```

#### 3.3 核心函数

```typescript
// 1. 加载偏好
const loadPreferences = async (integrationId: string) => {
  const res = await fetch(`/api/mcp/preferences/${integrationId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  setPreferences(data);
}

// 2. 预览效果
const handlePreview = async (summary: string) => {
  const res = await fetch('/api/mcp/preview', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      summary,
      formatStyle: preferences.formatStyle,
      projectName: preferences.customDisplayName,
      includeTimestamp: preferences.includeTimestamp
    })
  });
  const result = await res.json();
  setPreviewResult(result.html);
}

// 3. 保存设置
const handleSave = async () => {
  const res = await fetch(`/api/mcp/preferences/${integrationId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(preferences)
  });
  if (res.ok) {
    showSuccess('设置已保存');
  }
}
```

**预计工作量**: 1.5 小时

---

### 步骤 4：集成到 Settings 页面

**在 frontend/src/pages/Settings.tsx 中**:

```typescript
<MCPNotificationSettings 
  robotId={selectedRobotId}
  integrationId={selectedIntegrationId}
  onPreferencesChange={handlePreferencesChange}
/>
```

**预计工作量**: 30 分钟

---

### 步骤 5：测试

#### 5.1 手动测试清单

- [ ] 创建集成后，Settings 中显示配置选项
- [ ] 修改项目名称、格式符号、时间戳等选项
- [ ] 预览按钮实时展示效果
- [ ] 保存后刷新页面验证数据持久化
- [ ] 不同用户间数据隔离
- [ ] 权限验证（无权限用户无法修改）

#### 5.2 API 测试脚本

在 `testfile/api/test-mcp-settings.ps1` 中创建测试脚本：

```powershell
# 1. 获取偏好
Invoke-RestMethod -Uri "http://localhost:3000/api/mcp/preferences/$integrationId" `
  -Headers @{ Authorization = "Bearer $token" }

# 2. 更新偏好
$body = @{
  displayProjectName = $true
  formatStyle = "standard"
  includeTimestamp = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/mcp/preferences/$integrationId" `
  -Method PUT -Headers @{ Authorization = "Bearer $token" } -Body $body

# 3. 预览格式
$preview = @{
  summary = "完成任务。修复bug。"
  formatStyle = "standard"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/mcp/preview" `
  -Method POST -Headers @{ Authorization = "Bearer $token" } -Body $preview
```

**预计工作量**: 1 小时

---

### 步骤 6：文档和版本更新

#### 6.1 版本号更新
- `frontend/package.json`: v1.1.0
- `backend/package.json`: v1.1.0
- `docs/DESIGN_DOCUMENT.md`: v1.2.0

#### 6.2 文档更新
- 在 `docs/DESIGN_DOCUMENT.md` 中添加"用户偏好"章节
- 在 `docs/api.md` 中记录新增的 3 个 API 端点

**预计工作量**: 30 分钟

---

## 实施时间表

| 步骤 | 内容 | 预计时间 | 累计 |
|------|------|--------|------|
| 1 | 数据库扩展 | 30 分钟 | 30 分 |
| 2 | 后端 API | 1 小时 | 1.5 h |
| 3 | 前端组件 | 1.5 小时 | 3 h |
| 4 | 集成 Settings | 30 分钟 | 3.5 h |
| 5 | 测试 | 1 小时 | 4.5 h |
| 6 | 文档版本 | 30 分钟 | 5 h |

**总预计**: 5 小时（含测试和文档）

---

## 风险和注意事项

### 🚩 风险
1. **数据迁移**: 现有集成没有 preferences 字段
   - 解决: 提供默认值或迁移脚本

2. **向后兼容性**: 旧集成在更新后可能出错
   - 解决: 添加版本检查和降级逻辑

3. **权限边界**: 确保用户只能修改自己的配置
   - 解决: 在路由中验证 robotId 所有权

### ⚠️ 注意事项
- 不修改 WEBHOOK_ENDPOINT 和 TRIGGER_TOKEN（由系统管理）
- MCP 格式化规则不在前端配置（由 MCP 决定）
- 预览接口不应实际发送到飞书（只是格式演示）

---

## 推荐实施顺序

```
阶段 1: 后端支撑 (1.5 小时)
├─ 数据库扩展
└─ API 端点开发

阶段 2: 前端功能 (2 小时)
├─ 创建组件
├─ 集成到 Settings
└─ UI 调试

阶段 3: 验收 (1.5 小时)
├─ 手动测试
├─ 自动化测试脚本
└─ 文档版本更新

发布: 提交 PR → Code Review → Merge → Release v1.1.0
```

---

## 参考资源

- 架构文档: [`docs/MCP_ARCHITECTURE_AND_USER_CONFIG.md`](../../docs/MCP_ARCHITECTURE_AND_USER_CONFIG.md)
- 快速 FAQ: [`docs/MCP_FAQ.md`](../../docs/MCP_FAQ.md)
- UI 预览: [`UI_PREVIEW/SETTINGS_MCP_PREVIEW.html`](../../UI_PREVIEW/SETTINGS_MCP_PREVIEW.html)
- 现有代码参考:
  - 数据库：`backend/src/database.ts`
  - 路由模板：`backend/src/routes/robots.ts`
  - 页面模板：`frontend/src/pages/Integrations.tsx`

---

## 下一步行动

1. **审批和计划** (5 分钟)
   - 评估实施计划是否可行
   - 确认优先级

2. **开发准备** (15 分钟)
   - 从 main 分支创建 feature 分支
   - 命名: `feature/mcp-user-preferences`

3. **开发执行** (5 小时)
   - 按步骤实施
   - 每完成一步提交一个 commit

4. **质量保证** (1 小时)
   - 执行测试清单
   - 代码审查

5. **发布** (30 分钟)
   - 版本号升级
   - 更新文档
   - 合并到 main
   - 标记 Release v1.1.0

