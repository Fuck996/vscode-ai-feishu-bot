# Phase 2 功能规划 - 用户偏好和集成管理增强

**版本**: v1.0.0 | **日期**: 2026-03-11 | **状态**: 规划阶段

## 概述

Phase 1 已完成所有核心功能（集成管理、MCP 通知、飞书适配）。
Phase 2 将增强用户对集成的定制化控制，包括消息模板、触发规则优化和高级配置。

---

## 当前状态

### ✅ Phase 1 完成（已上线）

| 功能 | 实现位置 | 状态 |
|------|---------|------|
| MCP 服务器 | `mcp-server/index.js` | ✓ 运行中 |
| 自动格式化 | `formatSummary()` 函数 | ✓ 正常工作 |
| 集成管理 CRUD | `backend/src/routes/integrations.ts` | ✓ 完整实现 |
| 前端集成页面 | `frontend/src/pages/Integrations.tsx` | ✓ UI 完成 |
| 飞书 Webhook | `backend/src/routes/platform-webhook.ts` | ✓ 多平台支持 |

### 现有 API 端点

**集成管理 (`/api/robots/:robotId/integrations`)**:
- `GET /` - 获取列表
- `POST /` - 创建集成
- `GET /:id` - 获取详情
- `PUT /:id` - 更新配置
- `PATCH /:id/status` - 切换启用/停用
- `DELETE /:id` - 删除集成

---

## Phase 2 计划

### 1. 数据库模型扩展

**现有 Integration 字段**:
```typescript
{
  id: string
  robotId: string
  projectName: string
  projectSubName?: string
  projectType: 'vercel' | 'railway' | 'github' | 'gitlab' | 'vscode-chat' | 'api' | 'custom'
  config: Record<string, any>
  triggeredEvents: string[]
  notifyOn: 'always' | 'success' | 'failure' | 'changes'
  messageTemplate?: string  // 已存在（暂未使用）
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}
```

**Phase 2 增加字段** (可选):
```typescript
{
  // ... 现有字段 ...
  displaySettings?: {
    showProjectName: boolean      // 卡片中显示项目名
    showTimestamp: boolean        // 显示事件时间
    maxSummaryLines: number       // 限制摘要行数（防止过长）
  }
  notificationRules?: {
    minSeverity: 'info' | 'warning' | 'error'  // 最低通知等级
    groupByProject: boolean       // 按项目分组
    throttleInterval: number      // 节流间隔（毫秒）
  }
}
```

**预计工作量**: 1-2 小时 (含迁移和后向兼容性)

---

### 2. 后端功能增强

#### 2.1 消息模板系統

**API**:
```typescript
// GET /api/robots/:robotId/integrations/:id/template
// 获取当前模板

// PUT /api/robots/:robotId/integrations/:id/template
// 更新消息模板
Body: {
  template: string  // 支持变量替换 ${event}, ${status}, ${projectName} 等
}
```

**模板变量支持**:
```
${event}        - 事件名称
${status}       - 状态（success/failure/info）
${projectName}  - 项目名
${timestamp}    - UTC 时间戳
${summary}      - 事件摘要内容
${url}          - 关联 URL
```

**预计工作量**: 2-3 小时

#### 2.2 触发规则优化

**增强的规则检查**:
```typescript
// 支持更细粒度的条件
shouldNotify(event, status, integration):
  ├─ 按事件类型精确匹配
  ├─ 按严重程度过滤
  ├─ 按时间节流
  └─ 按项目分组汇总
```

**预计工作量**: 1-2 小时

#### 2.3 webhook 历史和重试

**新端点**:
```typescript
// GET /api/robots/:robotId/integrations/:id/webhook-logs
// 查询最近100条 webhook 调用记录

Response: [
  {
    id: string
    event: string
    status: 'sent' | 'failed'
    statusCode: number
    timestamp: string
  }
]

// POST /api/robots/:robotId/integrations/:id/webhook-retry/:logId
// 重新发送特定的 webhook
```

**预计工作量**: 2-3 小时

---

### 3. 前端功能增强

#### 3.1 集成详情页面改进

**在现有 Integrations.tsx 中扩展**:
- 添加"高级选项"折叠面板
- 显示最近的 webhook 日志
- 测试消息发送按钮
- 模板编辑器（带预览）

**预计工作量**: 3-4 小时

#### 3.2 集成模板库

**创建公共模板**:
- Jenkins 触发模板
- GitHub Actions 模板
- Vercel 部署模板
- 自定义 API 模板

**功能**:
```typescript
// GET /api/integrations/templates/:type
// 获取某类型的推荐模板

// POST /api/robots/:id/integrations/from-template
// 从模板快速创建集成
```

**预计工作量**: 2-3 小时

---

### 4. 测试和文档

**单元测试**:
- 消息模板变量替换
- 触发规则检查
- webhook 重试逻辑

**集成测试**:
- E2E 集成创建 → 使用 → 修改 → 删除
- 多个集成同时触发
- 权限隔离验证

**预计工作量**: 2-3 小时

---

## 实施时间表

| 阶段 | 任务 | 预计时间 | 优先级 |
|------|------|--------|------|
| 1 | 数据库模型扩展 | 1-2 h | ⭐⭐⭐ 高 |
| 2 | 消息模板系统 | 2-3 h | ⭐⭐⭐ 高 |
| 3 | webhook 日志和重试 | 2-3 h | ⭐⭐ 中 |
| 4 | 前端 UI 改进 | 3-4 h | ⭐⭐ 中 |
| 5 | 触发规则优化 | 1-2 h | ⭐ 低 |
| 6 | 集成模板库 | 2-3 h | ⭐ 低 |
| 7 | 测试和文档 | 2-3 h | ⭐⭐⭐ 高 |

**总预计**: 15-22 小时（可分次迭代）

---

## 优先级建议

### 立即开始 (迭代1 - 1 周)
- ✅ 数据库字段扩展
- ✅ 消息模板系统
- ✅ 基础 UI 改进
- ✅ 测试脚本

### 后续迭代 (迭代2 - 2-3 周)
- webhook 日志和重试
- 触发规则细化
- 集成模板库

---

## 技术风险和缓解方案

| 风险 | 影响 | 缓解方案 |
|------|------|--------|
| 向后兼容性 | 旧集成数据丢失 | 提供默认值，迁移脚本 |
| 数据库结构变更 | 现有数据格式混乱 | 使用数据库版本管理 |
| 性能影响 | webhook 处理变慢 | 添加缓存和节流 |
| 权限边界 | 用户能修改他人配置 | 在每个端点验证所有权 |

---

## 不在 Phase 2 范围内

以下功能经讨论决定延迟到后续版本：
- ❌ 前端配置 MCP 参数（WEBHOOK_ENDPOINT, TOKEN 等）
  - 原因：这些是系统安全参数，应由管理员控制
  - 计划：Phase 3 在管理员面板中实现
  
- ❌ 多 MCP 服务器支持
  - 原因：当前架构假设单一 MCP
  - 计划：Phase 4 支持多套环境

- ❌ MCP 可视化编辑/调试器
  - 原因：功能复杂，收益有限
  - 计划：可选的高级功能

---

## 参考资源

- 现有代码：
  - `backend/src/routes/integrations.ts` - API 模板
  - `backend/src/database.ts` - 数据库操作
  - `frontend/src/pages/Integrations.tsx` - UI 参考
  
- 外部资源：
  - 飞书文档：`docs/deployment.md` 中的链接
  - MCP 参考：`.github/copilot-instructions.md` 的 MCP 部分

---

## 后续行动

1. **技术评审** (30 分钟)
   - 验证设计是否可行
   - 确认优先级

2. **分支创建** (5 分钟)
   - `feature/phase2-integration-enhancements`

3. **实施** (15-22 小时)
   - 按优先级分次完成
   - 每完成一个子任务提交一个 commit

4. **质量检查** (2-3 小时)
   - 单元测试
   - 集成测试
   - 代码审查

5. **发布** (30 分钟)
   - 版本号升级 (v1.1.0)
   - 文档更新
   - GitHub Release

