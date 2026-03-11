# 飞书 AI 通知系统 - Copilot 开发指南

项目版本：v1.0.0 | 最后更新：2026-03-11 | 内容：MCP 实现完善、文档整合

---

## 🏗️ 架构概览

### 系统架构

```
外部系统/工程 → HTTP/Webhook → 后端 API (Node.js/Express)
                                      ↓
                          数据库 (JSON 文件系统)
                                      ↓
                    前端 Dashboard (React 5173) + 飞书机器人
```

### 核心技术栈

| 层 | 技术 | 版本 |
|----|------|------|
| **后端** | Node.js + Express + TypeScript | 18.x, v4.18 |
| **前端** | React + React Router + Vite | v18.2, v6.20 |
| **数据库** | 文件系统 JSON | - |
| **认证** | JWT (HS256) + bcrypt | - |
| **API 文档** | 见 `docs/DESIGN_DOCUMENT.md` | v1.1.0 |

---

## 📁 项目结构

```
vscode-ai-feishu-bot/
├── backend/
│   ├── src/
│   │   ├── server.ts           # Express 主入口
│   │   ├── database.ts         # 数据持久化层 (JSON 文件)
│   │   ├── config.ts           # 环境配置
│   │   ├── logger.ts           # Pino 日志系统
│   │   ├── feishu.ts           # 飞书 API 集成
│   │   ├── middleware/
│   │   │   └── auth.ts         # JWT 认证中间件
│   │   └── routes/             # API 路由群
│   │       ├── auth.ts         # 登录、改密
│   │       ├── robots.ts       # 机器人 CRUD
│   │       ├── integrations.ts # 集成管理 (新)
│   │       ├── users.ts        # 用户信息
│   │       └── webhook.ts      # 通知接收
│   ├── data/                   # 数据存储目录
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/              # 页面组件
│   │   │   ├── Login.tsx
│   │   │   ├── Robots.tsx      # 机器人管理 (已含 🔗 集成 按钮)
│   │   │   ├── Integrations.tsx # 集成管理页面 (新)
│   │   │   ├── Dashboard.tsx
│   │   │   ├── History.tsx
│   │   │   └── Settings.tsx
│   │   ├── services/
│   │   │   └── auth.ts         # JWT 存储 + API 调用
│   │   ├── App.tsx             # 路由定义
│   │   └── main.tsx
│   └── package.json
│
├── docs/
│   ├── DESIGN_DOCUMENT.md      # 完整设计文档 (861 行)
│   ├── architecture.md
│   ├── deployment.md
│   └── 其他文档
│
├── UI_PREVIEW/                 # HTML 预览文件
│   ├── ROBOTS_PREVIEW.html
│   ├── INTEGRATION_PREVIEW.html
│   └── ...
│
└── scripts/                    # 启动脚本
```

---

## 💾 数据模型

### User (用户)
```typescript
{
  id: string (UUID)
  username: string
  passwordHash: string (bcrypt)
  email?: string
  role: 'admin' | 'user'
  status: 'active' | 'inactive'
  passwordChanged: boolean      // 首次登录标记
  createdAt: string (ISO)
  updatedAt: string (ISO)
}
```

### Robot (机器人实例)
```typescript
{
  id: string (UUID)
  name: string
  description: string
  webhookUrl: string            // 飞书 Webhook URL
  status: 'active' | 'inactive'
  userId: string
  createdAt: string (ISO)
  updatedAt: string (ISO)
}
```

### Integration (项目集成) - **新增**
```typescript
{
  id: string (UUID)
  robotId: string               // 关联机器人
  projectName: string           // 如: "api-service"
  projectSubName?: string       // 如: "deploy-prod"
  projectType: 'jenkins' | 'github' | 'gitlab' | 'api' | 'custom'
  config: Record<string, any>   // 类型特定配置
  triggeredEvents: string[]     // ['build_success', 'deploy_failure', ...]
  notifyOn: 'always' | 'success' | 'failure' | 'changes'
  status: 'active' | 'inactive' // 启用/停用
  createdAt: string (ISO)
  updatedAt: string (ISO)
}
```

### Notification (通知记录)
```typescript
{
  id: number
  title: string
  summary: string
  status: 'success' | 'error' | 'warning' | 'info'
  robotName?: string
  source?: string
  createdAt: string (ISO)
}
```

---

## 🔀 API 路由设计

### 认证 (`/api/auth`)
- `POST /login` → `{username, password}` → JWT token
- `POST /change-password` → 需要 Token
- `POST /verify` → 验证 Token 有效性

### 机器人 (`/api/robots`)
- `GET /` → 获取当前用户的机器人列表
- `POST /` → 创建机器人
- `GET /:id` → 获取详情
- `PUT /:id` → 更新配置
- `DELETE /:id` → 删除机器人
- `POST /:id/test` → 测试连接 (发送测试通知)

### 项目集成 (`/api/robots/:robotId/integrations`) - **新增**
- `GET /` → 获取该机器人的所有集成
- `POST /` → 创建新集成
- `GET /:integrationId` → 获取集成详情
- `PUT /:integrationId` → 更新集成配置
- `PATCH /:integrationId/status` → **切换启用/停用** (关键!)
- `DELETE /:integrationId` → 删除集成

### 用户 (`/api/users`)
- `GET /me` → 获取当前用户信息
- `PUT /profile` → 更新用户信息

### 通知 (`/api`)
- `POST /notify` → 接收通知 (webhooks)
- `GET /notifications` → 查询历史
- `GET /stats` → 获取统计数据

---

## 🎯 代码风格与约定

### TypeScript 类型
- 所有接口定义在 `database.ts`：`User`, `Robot`, `Integration`, `Notification`
- 路由中使用 `interface AuthPayload` 定义 JWT 解码后的数据
- 避免 `any`；使用 `Record<string, unknown>` 处理动态对象

### 错误处理
- 所有异步操作用 try/catch；数据库访问必须抛出 `Error`
- API 返回统一格式：`{ success: boolean, data?: T, error?: string }`
- HTTP 状态码：401 (无认证), 403 (无权限), 404 (不存在), 400 (参数错误), 500 (服务器错误)

### 命名规范
- **文件**: kebab-case (`auth.ts`, `integrations.ts`)
- **接口**: PascalCase (`User`, `Integration`)
- **变量/函数**: camelCase (`getUserById`, `robotModalMode`)
- **路由**: kebab-case (`/api/robots/:robotId/integrations/:integrationId/status`)
- **数据库字段**: camelCase (`createdAt`, `projectType`)

### 认证流程
1. 前端: `authService.login(username, password)` → 获取 JWT
2. Token 存储在 `localStorage` (key: `auth_token`)
3. 每次请求在 Header 中：`Authorization: Bearer <token>`
4. 后端验证中间件 `verifyToken` 解码 JWT 并挂载 `req.user`
5. 所有需认证的路由先调用 `verifyToken` 中间件

### 数据库操作
- 数据存储在 `./data/notifications.db` (JSON 文件)
- 每次修改后自动调用 `saveToFile()`
- `database.ts` 导出单例：`export default new DatabaseService()`
- 所有方法都是 async (即使本地操作也保持一致)

### React 前端约定
- 页面组件在 `frontend/src/pages/`
- 使用 `useState`, `useEffect`, `useNavigate` (react-router-dom)
- 样式：混合 inline styles + Tailwind (旧代码用 inline，新代码可用 CSS class)
- API 调用通过 `fetch` + `authService.getToken()`
- 错误/消息状态用 state 及时清除 (3 秒后)

### 路由认证逻辑 (后端)
```typescript
// 每个路由文件的模板
function verifyToken(req, res, next) {
  // 检查 'Bearer <token>' 并 jwt.verify
  // 失败返回 401，成功则 req.user = decoded
}

router.post('/endpoint', verifyToken, async (req, res) => {
  const userId = req.user.userId; // 已认证用户 ID
  // 业务逻辑...
});
```

---

## 🤖 MCP 服务器实现细节

### MCP 架构概览

```
Copilot Agent
  ↓ (决定何时调用，基于 copilot-instructions.md)
MCP Server ← → stdio (JSON-RPC 协议)
  ├─ 读取环境变量：WEBHOOK_ENDPOINT, TRIGGER_TOKEN, PROJECT_NAME
  ├─ 格式化 summary（✅/🔧/📝）
  ├─ 自动生成 title
  └─ HTTP POST → 后端 /api/webhook/:integrationId
        ↓ (body: {event, status, title, summary, projectName})
      Express 后端
        ├─ 签名验证（X-Trigger-Token）
        ├─ 事件标准化
        └─ 转发到飞书 Webhook
```

### MCP 服务器配置

**位置**: `mcp-server/index.js`

**启动方式**: VS Code 通过 `.vscode/mcp.json` 的 stdio 启动

**环境变量注入** (由 `.vscode/mcp.json` 提供):
```json
{
  "WEBHOOK_ENDPOINT": "http://localhost:3000/api/webhook/{integrationId}",
  "TRIGGER_TOKEN": "集成的 webhookSecret",
  "PROJECT_NAME": "项目名称（可选）"
}
```

### MCP 格式化规则（核心逻辑）

**输入**: 原始 `summary` 文本或数组
**处理步骤**:
1. 检测是否已包含符号（✅/🔧/📝）→ 直接返回
2. 解析 JSON 数组格式 → join('\n')
3. 按长度和内容分析：
   - > 150 字符且多句 → 自动分解为列表项
   - 包含"完成"→ 前缀 ✅  
   - 包含"修复/改进" → 前缀 🔧
   - 其他 → 前缀 📝
4. **输出**: 统一的 `✅/🔧/📝` 列表格式

**重点**: 格式化在 MCP 侧（服务端），所有调用者都受约束

### 后端 Webhook 接收

**路由**: `POST /api/webhook/:integrationId`

**请求头验证**:
```
X-Trigger-Token: {integrationId对应的webhookSecret}
```

**请求体** (来自 MCP):
```json
{
  "event": "chat_session_end",
  "status": "info",
  "title": "✅ 任务完成",
  "summary": "✅ 完成任务\n🔧 修复bug",
  "projectName": "项目名"
}
```

**后端处理**:
1. 验证签名 (`X-Trigger-Token`)
2. 通过 `normalizeGeneric()` 标准化事件
3. 检查 `triggeredEvents` 和 `notifyOn` 规则
4. 构建飞书卡片并发送

---

## 🏗️ 集成管理 (Phase 1) - 现有功能

### 前端集成页面
- **文件**: `frontend/src/pages/Integrations.tsx`
- **路由**: `/robots/:robotId/integrations`
- **入口**: 机器人管理页面的紫色 **🔗 集成** 按钮
- **功能**:
  - 列表：展示该机器人的所有集成 + 状态切换开关
  - 新建：3 步骤模态（选择类型 → 基本信息 → 触发规则）
  - 编辑：跳过类型选择（第 2 步），类型锁定不可改

### 状态切换的关键设计
- **方式**: `PATCH /api/robots/:robotId/integrations/:integrationId/status`
- **body**: `{ status: 'active' | 'inactive' }`
- **前端**: 只改状态，不改其他字段
- **UI**: 滑动开关 + 实时标签切换（启用/停用）

### 验证逻辑
- 路由层：`checkRobotOwner` 中间件验证机器人所有权
- 集成自动继承机器人的用户 ID（集成必须属于该用户的机器人）
- PATCH 状态时不需要重新验证整个集成（只验证机器人权限即可）

---

## 🤖 飞书自动汇报规范（AI 强制执行）

### 工作总结自动推送 📨

**每次完成用户的任务请求后，若 `feishu-notifier` MCP 工具已连接可用，则调用 `feishu_notify` 工具将本次工作总结发送到飞书群组。**

> ⚠️ **重要：工具可用性原则**
> - 本工作区使用 **stdio 模式**（`mcp-server/index.js`），VS Code 启动时静默加载，无需弹框确认
> - **调用前不需要检测**：直接调用 `feishu_notify`，若工具不可用调用会直接失败并返回错误
> - **调用失败时**：在回复中简短说明"飞书通知发送失败（后端未启动或MCP未连接）"，**不要重试、不要等待、不要阻塞**，直接结束任务
> - **不要尝试启动或重启 MCP 服务器**：stdio 模式由 VS Code 管理，AI 无法也不应该手动启动它

#### 汇报格式规范（自动美化）

**格式要求**：采用 ✅/🔧/📝 符号的列表形式，每行一个要点

```
✅ 已完成的事项（成功、完成）
🔧 改动的内容（修改、改进、修复）
📝 补充说明（说明、注意、后续）
```

**示例 1 - 编码问题修复**：
```
✅ 修复MCP服务器HTTP请求的UTF-8编码问题
✅ 修复后端Express响应的字符集声明
🔧 完善日志系统的中文输出配置
🔧 优化axios请求头的UTF-8设置
📝 已验证飞书消息中文正确显示
```

**示例 2 - 功能开发完成**：
```
✅ 完成集成管理功能开发
✅ 添加前端集成页面和表单
🔧 修复了3处状态切换的边界条件
📝 已提交到飞书自动汇报系统
```

#### 调用规范

- **触发时机**：完成一个完整任务时（代码修改完毕、问题解决后、功能实现后）
- **调用方式**：直接调用 `feishu_notify` 工具，无需用户提示
- **参数说明**：
  - `summary` ⭐ （必填）：工作总结内容
    - 支持纯文本（自动美化为列表）
    - 支持数组格式：`["✅ 项A", "🔧 项B", "📝 项C"]`
    - 支持已格式化的列表文本（直接使用）
  - `title` （可选）：自定义消息标题，不提供则自动生成
  - `projectName` （可选）：项目名称，默认从后端 package.json 读取

#### MCP Server 自动格式化逻辑

MCP 服务器会自动处理以下场景：

1. **纯文本转换**
   - 超过 150 字符且包含多个句子 → 自动分解为列表
   - 包含"完成"、"已完成" → 前缀 `✅`
   - 包含"修复"、"改进" → 前缀 `🔧`
   - 其他 → 前缀 `📝`

2. **数组格式支持** - 推荐使用
   ```javascript
   feishu_notify({
     summary: ["✅ 完成A", "🔧 修复B", "📝 说明C"]
   })
   ```

3. **标题自动生成**
   - 默认检测内容中的符号，自动选择：
     - 包含 `✅` → `"✅ 任务完成"`
     - 包含 `🔧` → `"🔧 问题修复"`
     - 其他 → `"📝 工作总结"`

4. **项目名称自动读取**
   - 优先级：环境变量 > 参数传入 > 后端 package.json > 默认值
   - 项目名称会显示在飞书消息中

#### 示例调用（推荐模式）：

```javascript
// 模式 A：数组格式（最佳实践）
feishu_notify({
  summary: [
    "✅ 修复MCP服务器的UTF-8编码问题",
    "✅ 更新后端axios请求的字符集配置",
    "🔧 完善了日志系统的中文输出",
    "📝 已验证飞书消息中文显示正常"
  ]
})

// 模式 B：纯文本自动美化
feishu_notify({
  summary: `完成了集成管理页面开发。
  修复了3处状态切换的bug。
  已在飞书群中验证功能正常。`
})

// 模式 C：完全自定义
feishu_notify({
  title: "🎉 集成管理功能上线",
  summary: "✅ 已完成集成管理功能\n🔧 修复了状态切换问题",
  projectName: "飞书AI通知系统"
})
```

#### 注意事项

- ✅ 总结使用中文，建议 3-5 行要点
- ✅ 每个要点保持简洁（不超过一行）
- ✅ 自动生成标题时无需手动指定
- ✅ 项目名称会自动获取，通常不需要传入
- ✅ 调用失败时（后端未启动/MCP未连接）：在回复中简短说明并**立即结束**，不重试
- ❌ 不需要用户说"发送到飞书"，任务完成后自动调用
- ❌ 工具调用失败不应阻塞任务完成 — 通知只是附加行为，非核心功能
- ❌ 不要因为工具不可用而重复尝试或等待，一次失败即跳过

---

## 📋 项目约定和规范

### 语言约定 🌐
- **沟通语言**：项目全部采用 **中文** 进行沟通
- **文档**：所有文档内容必须使用中文
- **代码注释**：所有代码注释必须使用中文
- **提交日志**：所有 Git 提交日志必须使用中文描述

### 页面设计规范 🎨
- **设计方式**：所有页面设计使用 **HTML** 进行设计，保存在 `UI_PREVIEW/` 目录
- **文件组织**：
  - 每个功能模块独占 **一个 HTML 文件**
  - HTML 文件必须包含 **所有相关弹窗**（新建、编辑、删除确认等）
  - 文件命名：`功能名_PREVIEW.html`（如 `ROBOTS_PREVIEW.html`、`INTEGRATION_PREVIEW.html`）
- **集成可动原型**：`INDEX.html` 是一个**集成可动原型文件**，内嵌完整的应用外壳（导航栏 + 侧边栏），通过 iframe 加载各模块预览文件，完整呈现各主要页面之间的跳转关系，可作为产品演示使用
  - 不是简单的链接列表，而是模拟真实应用的交互体验
  - 点击导航项即可在同一页面内切换到对应模块预览
- **交互设计**：HTML 预览中的所有按钮和交互必须在前端实现中保持一致

### 文档设计要求 📋
- **文档版本管理**：所有文档文件头必须包含：
  ```
  # 文档标题
  **版本：** v1.0.0 | **更新时间：** 2026-03-10 10:30:00 | **内容：** 初始版本 / 功能变更说明
  ```
- **版本号规范**：
  - 文档版本号格式：`vX.Y.Z`
  - 主版本（X）：大功能新增或重大改动
  - 次版本（Y）：功能改进或新增需求
  - 修订版本（Z）：文档修正或规范调整
- **变更前置**：
  - ⚠️ **功能变更前必须先更新设计文档**
  - 设计文档更新后才能开始编码
  - 功能上线前设计文档版本号必须更新

### 新建文件约定 ⚠️
- **非必要不新建**：项目内新建文件（文档、脚本等）必须征求允许
- **新建前声明**：如确需新建文件，必须在代码审查或需求讨论中明确说明：
  - 文件用途
  - 放置位置
  - 是否特殊命名规范

### 文件修改约定 🔧
- **直接修改源文件**：修改文件时，**非必要不得新建文件进行修改**
- **就地修改原则**：
  - 对现有代码的改进 → 直接修改源文件
  - 对现有文档的更新 → 直接修改源文档
  - 样式调整 → 在原 CSS/inline style 中修改
- **例外情况**：只有在以下情况可新建文件：
  - 确实需要新模块/新功能
  - 已获得许可
  - 文件名和用途清晰明确

### 版本号管理约定 🔢
- **前后端分离管理**：
  - **前端版本号**：位置 `frontend/package.json` 的 `version` 字段
  - **后端版本号**：位置 `backend/package.json` 的 `version` 字段
- **版本号同步**：
  - 项目更新时，前后端版本号应 **保持一致**
  - 大版本更新时，前后端同时递增主版本号
  - 开发者在修改版本号前必须 **同时修改前后端**
- **版本号更新时机**：
  - 功能发布时
  - 有 Breaking Changes 时
  - 重大 Bug 修复时
- **查看版本号**：
  - 后端：`GET /api/version` → 返回后端版本号
  - 前端：`frontend/package.json` 的 version 字段

### 测试文件管理 🧪
- **统一存放**：所有测试文件、测试脚本必须保存在 **`testfile/` 目录**下
- **目录结构**：
  ```
  testfile/
  ├── api/              # API 测试脚本
  │   ├── test-auth.ps1
  │   ├── test-robots.ps1
  │   └── test-integrations.ps1
  ├── e2e/              # 端到端测试
  └── data/             # 测试数据文件
  ```
- **命名规范**：`test-功能名.ps1` 或 `测试功能名.ts`
- **不随意存放**：
  - ❌ 不在项目根目录存放 `.ps1` 脚本
  - ❌ 不在 `scripts/` 存放测试脚本（只放启动脚本）
  - ✅ 所有测试都应在 `testfile/` 中

---

## �🚀 构建和启动

### 本地开发

```bash
# 后端 (端口 3000)
cd backend
npm install --ignore-scripts  # 跳过 better-sqlite3 编译
npm run dev                    # ts-node 直接运行

# 前端 (端口 5173)
cd frontend
npm install
npm run dev                    # Vite dev server
```

### 生产构建

```bash
# 后端
cd backend
npm run build        # 输出到 dist/
npm start            # 运行编译后的 dist/server.js

# 前端
cd frontend
npm run build        # 输出到 dist/
npm run preview      # 本地预览构建结果
```

### 环境变量 (backend)

```bash
# .env 或环境变量
PORT=3000
HOST=localhost
NODE_ENV=development
JWT_SECRET=your-secret-key
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/...
DATABASE_PATH=./data/notifications.db
LOG_LEVEL=info
```

### 初始化凭证

- **用户名**: admin
- **密码**: admin
- 首次登录后强制修改密码
- 密码哈希用 bcrypt (库已在 package.json)

---

## 📝 常见开发任务

### 添加新 API 端点

1. **定义数据库方法** (`backend/src/database.ts`)
   ```typescript
   async getIntegrationsByRobotId(robotId: string): Promise<Integration[]> {
     return this.integrations.filter(i => i.robotId === robotId);
   }
   ```

2. **创建路由文件** (`backend/src/routes/new-feature.ts`)
   ```typescript
   import { Router } from 'express';
   const router = Router({ mergeParams: true });
   
   router.get('/', verifyToken, checkRobotOwner, async (req, res) => {
     // 业务逻辑
   });
   export default router;
   ```

3. **在 server.ts 中注册路由**
   ```typescript
   import newRouter from './routes/new-feature';
   app.use('/api/new-path', newRouter);
   ```

4. **前端调用**
   ```typescript
   const token = authService.getToken();
   const res = await fetch('/api/new-path', {
     headers: { 'Authorization': `Bearer ${token}` }
   });
   ```

### 添加新 UI 页面

1. **创建页面** (`frontend/src/pages/NewPage.tsx`)
   - 使用 StateHooks，在 useEffect 中加载数据
   - 错误和成功消息用 state 管理，3 秒后清除

2. **在 App.tsx 添加路由**
   ```typescript
   <Route path="/new-route" element={<ProtectedRoute><NewPage /></ProtectedRoute>} />
   ```

3. **参考已有页面**: `Integrations.tsx` (新页面) 或 `Robots.tsx` (完整示例)

### 修改数据模型

1. **更新 database.ts 中的 interface**
2. **添加需要的 DatabaseService 方法**
3. **更新 saveToFile() 逻辑**
4. **前端类型同步**（若有 TypeScript 页面）

---

## 🧪 测试

### 现有测试文档

- API 测试脚本: `test-api.ps1` (powershell)
- 机器人创建测试: `test-robot-creation.ps1`

### 手动测试端点

```bash
# 登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'

# 创建集成
curl -X POST http://localhost:3000/api/robots/{robotId}/integrations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "my-project",
    "projectType": "jenkins",
    "triggeredEvents": ["build_success"],
    "notifyOn": "always"
  }'

# 切换状态
curl -X PATCH http://localhost:3000/api/robots/{robotId}/integrations/{integrationId}/status \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"status":"inactive"}'
```

---

## 🔒 安全关键点

### 认证和授权

- JWT 密钥存在 `JWT_SECRET` 环境变量（生产需强密钥）
- 密码用 bcrypt 哈希（cost factor: 10）
- 所有需认证的路由都必须先验证 Token
- 机器人、集成等资源都绑定用户 ID（私有隔离）

### 飞书 Webhook 安全

- Webhook URL 从环境变量读取，不要硬编码
- 通知发送失败时记录日志但不暴露技术细节

### 请求验证

- 使用 helmet 中间件防止常见 HTTP 攻击
- 速率限制: 15 分钟 100 个请求/IP
- 请求体大小限制: 10MB

---

## 📚 关键文件参考

| 文件 | 用途 |
|------|------|
| [docs/DESIGN_DOCUMENT.md](../docs/DESIGN_DOCUMENT.md) | 完整产品设计 (1.1.0) |
| [backend/src/database.ts](../backend/src/database.ts) | 所有数据模型 + CRUD |
| [backend/src/routes/integrations.ts](../backend/src/routes/integrations.ts) | 集成管理 API (新) |
| [frontend/src/pages/Integrations.tsx](../frontend/src/pages/Integrations.tsx) | 集成管理页面 (新) |
| [frontend/src/App.tsx](../frontend/src/App.tsx) | 路由定义 |
| [backend/src/server.ts](../backend/src/server.ts) | 主服务器 + 中间件 |
| [UI_PREVIEW/INTEGRATION_PREVIEW.html](../UI_PREVIEW/INTEGRATION_PREVIEW.html) | 集成页面设计稿 |

---

## 🛠️ IDE 设置建议

- **后端**: VS Code + TypeScript + ESLint extension
- **前端**: 同上 + Tailwind CSS IntelliSense
- **调试**: 使用浏览器 F12 开发者工具 + VS Code Debugger

---

## 📞 常见问题

### Q: 如何处理未认证的请求？
A: 在路由中使用 `verifyToken` 中间件。失败自动返回 401。

### Q: 集成状态切换（PATCH）和更新（PUT）有什么区别？
A: `PATCH` 只改 `status` 字段；`PUT` 更新包括 `projectName`, `triggeredEvents` 等配置字段。

### Q: 新集成创建时是否自动启用？
A: 是的，创建时 `status` 默认为 `'active'`。

### Q: 能删除一个已启用的集成吗？
A: 可以。删除前端会询问确认。无需先停用。

### Q: 添加新功能时最常见的遗漏？
A: 忘记更新前后端路由注册、忘记添加 JWT 验证中间件、忘记验证资源所有权。
