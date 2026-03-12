# 飞书 AI 通知系统 - 开发规范指南

**版本：** v1.4.0 | **更新时间：** 2026-03-12 | **内容：** 文档规范、代码规范、项目规范、流程规范、飞书汇报规范

---

## 📄 文档书写规范

### 字符编码标准

**全项目编码要求**：所有文件均使用 **UTF-8 编码（无 BOM）**

- ✅ **源代码文件** (`.ts`, `.tsx`, `.js`, `.jsx`, `.json`)：**必须无 BOM**
  - 理由：Node.js 和 TypeScript 编译器不支持 BOM，可能导致模块解析失败
  
- ✅ **文档文件** (`.md`, `.markdown`)：**UTF-8 无 BOM**
  - 最佳实践，便于 Git 管理
  
- ✅ **配置文件** (YAML, TOML, JSONC)：**必须无 BOM**
  - 大多数解析器不支持 BOM

**IDE 配置** (`.editorconfig` 参考)：
```ini
[*]
charset = utf-8
insert_final_newline = true
trim_trailing_whitespace = true

[*.{ts,tsx,js,jsx,json}]
end_of_line = lf
indent_style = space
indent_size = 2
```

### 文档编写约定

- **文档语言**：所有文档内容必须使用 **中文**
- **文档头部**：所有文档文件头必须包含版本信息
  ```
  # 文档标题
  **版本：** vX.Y.Z | **更新时间：** YYYY-MM-DD | **内容：** 主要变更说明
  ```
- **版本号格式**：`vX.Y.Z`
  - `X` - 主版本：大功能新增或重大改动
  - `Y` - 次版本：功能改进或新增需求
  - `Z` - 修订版本：文档修正或规范调整
- **代码注释**：所有代码注释必须使用 **中文**
- **提交日志**：所有 Git 提交日志必须使用 **中文** 描述

---

## 🎯 代码编写规范

### TypeScript & JavaScript 编码规范

#### 导入与导出规范
- **命名导入优于默认导入**：`import { DatabaseService } from './database'`
- **路径使用相对路径**：优先使用 `../` 或 `./`，避免依赖别名
- **分组导入**：stdlib → 第三方库 → 项目内部，各组间空一行
  ```typescript
  import fs from 'fs';
  import path from 'path';
  
  import express, { Router } from 'express';
  import { v4 as uuidv4 } from 'uuid';
  
  import { DatabaseService } from '../database';
  import { verifyToken } from '../middleware/auth';
  ```
- **避免 `import *`**：显式导入需要的对象，便于追踪依赖
- **通常使用 `export default`**：对于单个导出的模块（如 `database.ts`）
- **命名导出用于实用函数**：如中间件、工具函数

#### 变量与函数命名
- **常量**: `UPPER_SNAKE_CASE`（全局常量、环境变量）
- **变量/函数**: `camelCase`（局部变量、函数名）
- **类/接口**: `PascalCase`（类、类型、接口）
- **路由路径**: `kebab-case` （`/api/robots/:robotId/integrations`）
- **数据库字段**: `camelCase` （`createdAt`, `projectType`）
- **布尔变量**: 前缀 `is/has/can/should`（`isActive`, `hasPermission`, `canDelete`）

#### 类型定义规范
- **优先接口优于类型别名**：`interface User { ... }` 优于 `type User = { ... }`
- **不使用 `any` 类型**：必要时用 `unknown` 然后显式类型守卫
- **使用 `Record<string, unknown>` 处理动态对象**
- **可选字段使用 `?:`**：`email?: string`

#### 异常处理规范
- **所有异步操作必须 try/catch**
- **API 返回统一格式**：
  ```typescript
  // 成功响应
  res.json({ success: true, data: result });
  
  // 错误响应
  res.status(400).json({ success: false, error: 'Invalid input' });
  ```
- **HTTP 状态码规范**：
  - `200`: 成功
  - `400`: 参数/请求错误
  - `401`: 未认证
  - `403`: 无权限
  - `404`: 资源不存在
  - `500`: 服务器错误

#### 注释规范
- **公开 API 使用 JSDoc**
- **复杂逻辑添加中文注释**
- **避免显而易见的注释**

#### 严格模式配置 (tsconfig.json)
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### React & Frontend 编码规范

#### 文件与组件组织
- **页面组件**: `frontend/src/pages/PageName.tsx`
- **可复用组件**: `frontend/src/components/ComponentName.tsx`
- **自定义 Hooks**: `frontend/src/hooks/useHookName.ts`
- **服务/API**: `frontend/src/services/serviceName.ts`

#### 组件编写规范
- **函数式组件优于类组件**：使用 React Hooks
- **Props 类型定义**：所有 Props 必须明确类型
- **使用 `useState` 管理本地状态**
- **使用 `useEffect` 处理副作用**（空依赖数组仅在挂载时运行）
- **消息提示自动清除**：3 秒后清除

#### 样式规范
- **使用 Tailwind 类名**：`className="px-4 py-2 bg-blue-500 rounded"`
- **动态样式用 inline styles**
- **避免 CSS-in-JS**

### 验证命令 (PowerShell)：
```powershell
# 检查文件是否有 BOM
$bytes = [System.IO.File]::ReadAllBytes("file.ts")
if ($bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    Write-Host "文件包含 UTF-8 BOM - 需要移除"
} else {
    Write-Host "文件编码正确（无 BOM）"
}
```

---

## 📋 项目规范

### 编码规范
- **工作语言**：项目全部采用 **中文** 进行沟通、编码和文档
- **字符编码**：所有文件均使用 **UTF-8 编码（无 BOM）**
- **IDE 配置**：使用 `.editorconfig` 统一编辑器格式

### 脚本与批处理管理
- **禁止频繁生成脚本**：不允许在项目根目录或各模块内随意生成 `.ps1`、`.sh` 等一次性脚本
- **统一存放**：所有测试脚本、批处理必须放在 **`testfile/` 目录**
- **目录结构**：
  ```
  testfile/
  ├── api/           # API 测试脚本
  ├── e2e/           # 端到端测试
  └── data/          # 测试数据文件
  ```
- **命名规范**：`test-功能名.ps1` 或 `test-功能名.ts`

### 版本号管理

#### 版本号更新规则
- **格式**：`vX.Y.Z`（前后端必须保持一致）
- **更新触发条件**：
  - 新功能实现 → 更新最小位数（Z）
  - BUG 修复 → 更新最小位数（Z）
  - Breaking Changes → 更新主版本（X）
- **最小位数上限**：不超过 100
  - 如 `v1.0.100` → 改为 `v1.1.0`
  - 如 `v1.9.99` → 改为 `v2.0.0`
- **查看版本号**：
  - 后端：`GET /api/version` 端点
  - 前端：`frontend/package.json` 的 `version` 字段
  - 后端：`backend/package.json` 的 `version` 字段

#### 版本号更新时机
- 功能发布时
- 有 Breaking Changes 时
- 重大 Bug 修复时

### 文件管理约定

#### 直接修改原则
- **修改现有文件**：直接修改源文件，无需新建临时文件
- **对现有代码的改进** → 直接修改源文件
- **对现有文档的更新** → 直接修改源文档

#### 新建文件约定
- **非必要不新建**：项目内新建文件必须有明确用途
- **新建前声明**：确需新建时必须明确说明：
  - 文件用途
  - 放置位置
  - 特殊命名规范

---

## 🔄 流程规范

### 每次对话的工作流程

#### 1. 任务开始前
- **阅读需求文档**：每次对话都需要读取 `docs/REQUIREMENTS.md`
- **检查待实现项**：查看是否有未实现的 `待开发` 和 `待修复` 条目
- **按文档要求操作**：严格按照 REQUIREMENTS.md 的说明进行实现

#### 2. 代码修改阶段
- **及时更新**：代码修改完成后立即更新版本号
- **格式验证**：确保代码编码为 UTF-8 无 BOM
- **验证无错**：使用编译器或 linter 检查错误

#### 3. 本地构建与测试
- **前端构建**：`npm run build` 生成生产版本
- **后端重启**：
  - 停止当前进程
  - 启动新进程（使用 `npm run dev` 或 `npm start`）
  - 验证启动成功（通过 API 检查）
- **基本验证**：测试关键功能是否正常

#### 4. 代码推送
- **Git 提交**：
  ```bash
  git add -A
  git commit -m "feat/fix: 简要说明 | 详细描述"
  ```
  - 中文 commit message 描述具体修改内容
  - `feat:` 新功能，`fix:` bug修复，`chore:` 其他改动
  
- **推送到 GitHub**：
  ```bash
  git push origin main
  ```

#### 5. 镜像构建
- **等待指令**：镜像构建需要用户明确指示
- **构建方式**：根据用户指令触发 GitHub Actions 工作流
- **参数说明**：
  - `image_tag`：镜像标签（如 `v1.3.3`）
  - `build_title`：构建标题
  - `build_description`：构建描述
  - `push_to_registry`：是否推送到镜像仓库

#### 6. 工作总结
- **完成后汇报**：所有操作完成后必须总结当前对话的任务完成情况
- **推送方式**：通过 `mcp_feishu-notifi_feishu_notify` 服务推送到飞书
- **汇报内容**：
  - ✅ 已完成的任务
  - 🔧 进行的改动
  - 📝 后续说明或注意事项

### 对 REQUIREMENTS.md 的维护

- **阅读规则**：每次对话开始前读取最新的 REQUIREMENTS.md
- **更新规则**：任务完成后立即更新文档：
  - 将完成的条目从对应的 `待开发`/`待修复` 移到 `已完成`/`已修复`
  - 标注 ✅ 已完成 或 ✅ 已修复
  - 记录完成版本号
  - 更新版本记录
- **不允许增加新项**：新需求或 BUG 由用户在文档中补充，AI 不自行增加

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

**启动方式**: VS Code 通过 `.vscode/mcp.json` 的 SSE 启动，Token 通过系统环境变量 `FEISHU_MCP_TOKEN` 传入

**`.vscode/mcp.json` 配置**:
```json
{
  "servers": {
    "feishu-notifier": {
      "type": "sse",
      "url": "http://localhost:5173/api/mcp/sse?token=${env:FEISHU_MCP_TOKEN}"
    }
  }
}
```

**Token 设置（一次性，不进版本控制）**:
```powershell
# Windows PowerShell（用户级环境变量，重启 VS Code 后生效）
[System.Environment]::SetEnvironmentVariable("FEISHU_MCP_TOKEN", "你的Token", "User")
```
```bash
# macOS / Linux（添加到 ~/.zshrc 或 ~/.bashrc）
export FEISHU_MCP_TOKEN="你的Token"
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

## 🤖 飞书自动汇报规范（AI 强制执行）

### 工作总结自动推送 📨

**每次完成用户的任务请求后，若 `feishu-notifier` MCP 工具已连接可用，则调用 `feishu_notify` 工具将本次工作总结发送到飞书群组。**

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

## 💡 关键数字速记

- **前端端口**: 5173 (Vite)
- **后端端口**: 3000 (Express)
- **通知自动清除**: 3 秒
- **版本号 Z 上限**: 100 (超过则 Y+1, Z=0)
- **每次任务起点**: 阅读 `docs/REQUIREMENTS.md`
- **每次任务终点**: 调用 `mcp_feishu-notifi_feishu_notify` 汇报到飞书


