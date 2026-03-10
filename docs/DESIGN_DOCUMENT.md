# 飞书AI通知系统 - 前端功能设计文档

**版本:** 1.3.1  
**状态:** 更新中  
**最后更新:** 2026-03-11 | **变更内容:** 修正 Webhook 接收地址应使用前端 origin（Vite proxy / nginx 代理 /api 到后端）；集成列表新增复制 URL/Token 按钮；修复机器人编辑功能

---

## 📋 目录

1. [系统架构](#系统架构)
2. [数据模型](#数据模型)
3. [功能设计](#功能设计)
4. [平台集成方案](#平台集成方案)
5. [飞书卡片消息设计](#飞书卡片消息设计)
6. [VS Code Chat 汇报集成](#vs-code-chat-汇报集成)
7. [API接口定义](#api接口定义)
8. [实现路线图](#实现路线图)

---

## 系统架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      前端应用 (React)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  登录/认证   │  │  机器人管理  │  │  管理中心    │       │
│  │   Module     │  │   Module     │  │   Module     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│         │                  │                 │               │
│         └──────────────────┼─────────────────┘               │
│                            │                                │
│                    ┌───────▼────────┐                       │
│                    │  Redux Store   │                       │
│                    │  - auth        │                       │
│                    │  - robots      │                       │
│                    │  - projects    │                       │
│                    └───────┬────────┘                       │
│                            │                                │
└────────────────────────────┼────────────────────────────────┘
                             │
             ┌───────────────┼───────────────┐
             │               │               │
    ┌────────▼────────┐ ┌────▼──────┐ ┌────▼──────────┐
    │  后端 API       │ │ 项目 SDK   │ │ 外部平台      │
    │  (Node.js)      │ │ (CLI/库)   │ │ (Vercel等)    │
    └─────────────────┘ └────────────┘ └───────────────┘
```

---

## 数据模型

### 1. 用户模型 (User)

```typescript
interface User {
  id: string;                    // UUID
  username: string;              // 用户名（唯一）
  passwordHash: string;           // 密码哈希值
  email?: string;                // 邮箱
  role: 'admin' | 'user';        // 角色
  status: 'active' | 'inactive'; // 状态
  passwordChanged: boolean;       // 密码是否已修改（初次登录判断）
  createdAt: Date;               // 创建时间
  updatedAt: Date;               // 更新时间
  lastLoginAt?: Date;            // 最后登录时间
}
```

### 2. 机器人实例模型 (Robot)

```typescript
interface Robot {
  id: string;                        // UUID
  name: string;                      // 机器人名称，如"生产部署通知"
  description?: string;              // 描述
  webhookUrl: string;                // 飞书Webhook地址（加密存储）
  status: 'active' | 'inactive';     // 状态
  
  // 项目集成相关
  integrations: Integration[];       // 关联的项目集成配置
  
  // 权限相关
  owner: string;                     // 创建人ID
  collaborators?: string[];          // 协作者ID列表
  
  // 统计信息
  notificationCount: number;         // 消息发送数
  lastNotificationAt?: Date;         // 最后消息时间
  
  createdAt: Date;
  updatedAt: Date;
}
```

### 3. 项目集成模型 (Integration)

```typescript
interface Integration {
  id: string;                        // UUID
  robotId: string;                   // 关联的机器人ID
  projectName: string;               // 项目名称
  projectType: 
    | 'vercel'      // Vercel 部署平台
    | 'railway'     // Railway 部署平台
    | 'github'      // GitHub 代码托管
    | 'gitlab'      // GitLab 代码托管
    | 'vscode-chat' // VS Code Copilot Chat 汇报
    | 'api'         // 直接 API 调用
    | 'custom';     // 自定义 Webhook
  
  // Webhook 签名密钥（创建时自动生成 48 位 Hex，对所有平台统一使用）
  // GitHub: HMAC-SHA256（X-Hub-Signature-256）
  // Vercel: HMAC-SHA1（x-vercel-signature）
  // GitLab: 直接比对（X-Gitlab-Token）
  // 其他: 直接比对（X-Webhook-Secret 或 X-Trigger-Token）
  webhookSecret: string;

  // 平台专属附加配置（标识性字段，不影响签名验证）
  config: IntegrationConfig;
  
  // 通知规则
  triggeredEvents: TriggerEvent[];
  notifyOn: 'success' | 'failure' | 'always' | 'changes';
  
  // 消息模板（留空使用平台专属默认卡片模板）
  messageTemplate?: string;
  
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

// 各平台专属配置
type IntegrationConfig =
  | VercelConfig
  | RailwayConfig
  | GitHubConfig
  | GitLabConfig
  | VSCodeChatConfig
  | DirectAPIConfig
  | CustomWebhookConfig;

/** Vercel - 标识性配置，签名密钥统一使用 Integration.webhookSecret */
interface VercelConfig {
  // 无额外必填字段
}

/** Railway - 标识性配置 */
interface RailwayConfig {
  // 无额外必填字段
}

/** GitHub - 仓库标识（仅展示用，签名使用 Integration.webhookSecret） */
interface GitHubConfig {
  repo?: string;                   // owner/repo 格式（选填，仅标识）
}

/** GitLab - 实例和项目标识（仅展示用） */
interface GitLabConfig {
  instanceUrl?: string;            // GitLab 实例地址，留空=官方 gitlab.com（仅标识）
  projectPath?: string;            // namespace/project 格式（仅标识）
}

/**
 * VS Code Chat 汇报
 * triggerToken 即 Integration.webhookSecret，VS Code 扩展在请求头中传入：
 * X-Trigger-Token: {triggerToken}
 */
interface VSCodeChatConfig {
  aiProvider?: 'openai' | 'deepseek' | 'none'; // 外部 AI 摘要提供商（使用 vscode.lm 时无需配置）
  aiApiKey?: string;               // 外部 AI API Key（加密存储）
}

/** 直接 API 调用 */
interface DirectAPIConfig {
  description?: string;
}

/** 自定义 Webhook */
interface CustomWebhookConfig {
  description?: string;
  customHeaders?: Record<string, string>;
}
```

### 4. 触发事件模型 (TriggerEvent)

```typescript
enum TriggerEvent {
  // 部署类（Vercel / Railway / 通用）
  DEPLOY_SUCCESS   = 'deploy_success',
  DEPLOY_FAILURE   = 'deploy_failure',
  DEPLOY_STARTED   = 'deploy_started',
  DEPLOY_CANCELED  = 'deploy_canceled',
  DEPLOYMENT_READY = 'deployment_ready',  // Vercel: 域名已就绪
  SERVICE_CRASH    = 'service_crash',     // Railway: 服务崩溃

  // 代码类（GitHub / GitLab）
  PR_MERGED        = 'pr_merged',
  PR_OPENED        = 'pr_opened',
  COMMIT_PUSHED    = 'commit_pushed',
  VERSION_RELEASED = 'version_released',
  WORKFLOW_RUN     = 'workflow_run',      // GitHub Actions 工作流完成
  PIPELINE_DONE    = 'pipeline_done',     // GitLab Pipeline 完成

  // 测试类
  TEST_PASSED      = 'test_passed',
  TEST_FAILED      = 'test_failed',

  // VS Code Chat 类
  CHAT_SESSION_END = 'chat_session_end',  // 会话结束时自动汇报
  CHAT_MANUAL      = 'chat_manual',       // 手动触发 @feishu 指令

  // 通用
  CUSTOM           = 'custom',
}
```

### 5. 密码策略模型 (PasswordPolicy)

```typescript
interface PasswordPolicy {
  minLength: number;              // 最小长度，例如8
  maxLength: number;              // 最大长度，20
  requireUppercase: boolean;      // 是否必须大写字母（已禁用）
  requireLowercase: boolean;      // 是否必须小写字母
  requireNumbers: boolean;        // 是否必须数字
  requireSpecialChars: boolean;   // 是否必须特殊字符
  specialChars: string;           // 允许的特殊字符集
}
```

---

## 功能设计

### 功能1: 用户认证与授权

#### 1.1 初始化系统

**流程:**
```
系统首次启动
    ↓
检查是否存在admin用户
    ↓
    没有 → 创建默认admin用户 (username: admin, password: admin)
    有   → 跳过
    ↓
系统就绪
```

**初始admin用户:**
- 用户名: `admin`
- 密码: `admin`
- 密码状态: 未修改 (`passwordChanged: false`)
- 角色: `admin`

#### 1.2 登录流程

**流程:**
1. 用户输入用户名和密码
2. 后端验证登录信息
3. 若密码未修改 → 进入"强制修改密码"页面
4. 若密码已修改且正确 → 进入Dashboard

**登录表单UI:**
```
┌─────────────────────────┐
│   飞书通知系统登录       │
├─────────────────────────┤
│                         │
│  用户名: [ · · · · · ]  │
│                         │
│  密码:   [ · · · · · ]  │
│                         │
│  [ 登录 ]               │
│                         │
└─────────────────────────┘
```

#### 1.3 强制修改密码页面

**客户端验证规则:**

密码必须同时满足：
- ✅ 至少包含一个小写字母 (a-z)
- ✅ 至少包含一个数字 (0-9)
- ✅ 至少包含一个特殊字符 (!@#$%^&*)
- ✅ 长度不少于8字符，不超过20个字符

**密码强度指示器:**
```
输入的密码强度:
░░░░░ 弱

实时反馈:
✓ 包含小写字母
✓ 包含数字
✗ 需要特殊字符
✓ 长度合法 (8/20)
```

**强制修改密码表单:**
```
┌──────────────────────────────┐
│  首次登录 - 强制修改密码      │
├──────────────────────────────┤
│                              │
│  新密码: [ · · · · · · · · ] │
│  确认:   [ · · · · · · · · ] │
│                              │
│  密码要求:                    │
│  □ 小写字母 (a-z)            │
│  □ 数字 (0-9)                │
│  □ 特殊字符 (!@#$%^&*)       │
│  □ 8-20 字符                 │
│                              │
│  [ 确认修改 ]  [ 退出登录 ]   │
│                              │
└──────────────────────────────┘
```

---

### 功能2: 机器人实例管理

#### 2.1 机器人列表页面

显示所有已创建的机器人实例

```
┌──────────────────────────────────────────────────────┐
│  🤖 机器人实例管理              [+ 新建]             │
├──────────────────────────────────────────────────────┤
│                                                      │
│  机器人名称        状态    最后消息    操作          │
│  ──────────────────────────────────────────────────│
│  生产部署通知      🟢 活跃  2分钟前   [✓][编辑][删除]│
│  测试验证通知      🟢 活跃  1小时前  [✓][编辑][删除]│
│  告警通知          🔴 停用  10天前   [✓][编辑][删除]│
│                                                      │
└──────────────────────────────────────────────────────┘
```

**按钮功能:**
- `[✓]` - 测试连接：发送测试通知到飞书
- `[编辑]` - 编辑机器人配置和集成
- `[删除]` - 删除机器人实例（确认提示）

#### 2.2 新建机器人

**步骤1: 基本信息**
```
┌─────────────────────────────────────┐
│  新建机器人实例                      │
├─────────────────────────────────────┤
│                                     │
│  机器人名称:  [ 生产部署通知 ]      │
│  描述:        [ 部署成功/失败通知 ] │
│  状态:        [○ 活跃  ● 停用]     │
│                                     │
│  [ 下一步 ]                         │
│                                     │
└─────────────────────────────────────┘
```

**步骤2: 飞书Webhook配置**
```
┌────────────────────────────────────────────┐
│  配置飞书Webhook地址                       │
├────────────────────────────────────────────┤
│                                            │
│  Webhook URL:                              │
│  [ 👁️ https://open.feishu.cn/... ]        │
│                                            │
│  [ 复制 ]  [ 测试连接 ]  [ 保存 ]          │
│  连接状态: ○ 未测试                       │
│                                            │
└────────────────────────────────────────────┘
```

#### 2.3 编辑机器人

可以修改：
- ✅ 机器人名称和描述
- ✅ 飞书Webhook地址
- ✅ 关联的项目集成
- ✅ 状态（启用/停用）

#### 2.4 删除机器人

**删除流程:**

1. 用户点击"删除"按钮
2. 系统显示确认对话框：
   ```
   确认删除机器人 "生产部署通知" 吗?
   
   此操作不可撤销，关联的所有集成配置也将被删除。
   
   [ 取消 ]  [ 删除 ]
   ```
3. 用户确认删除
4. 后端删除机器人及其所有关联的集成配置
5. 前端刷新列表

**删除保护:**
- 删除前需要确认
- 显示关联集成数量警告
- 删除后无法恢复

**后端API:**
```
DELETE /api/robots/{robotId}
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "message": "Robot deleted successfully"
}

Response (409):
{
  "success": false,
  "errors": ["Cannot delete robot with active integrations"]
}
```

---

### 功能3: 项目集成管理

#### 3.1 集成类型支持

| 类型 | 描述 | 集成方式 |
|------|------|---------|
| **Vercel** | 前端/全栈部署平台 | Webhook（Vercel Dashboard 配置）|
| **Railway** | 后端/服务部署平台 | Webhook（Railway Dashboard 配置）|
| **GitHub** | 代码托管 / Actions CI | Webhook（含 Secret 签名验证）|
| **GitLab** | 代码托管 / Pipeline CI | Webhook（含 Secret Token 验证）|
| **VS Code Chat** | Copilot Chat 会话汇报 | VS Code 扩展主动推送 |
| **Direct API** | 直接 API 调用 | 项目 SDK 或脚本 |
| **Custom** | 自定义集成 | 通用 Webhook |

#### 3.2 为机器人添加项目集成

**配置流程:**

```
编辑机器人
    ↓
点击"添加项目集成"
    ↓
选择项目类型 (Vercel/Railway/GitHub/GitLab/VS Code Chat/API/Custom)
    ↓
填入项目特定配置
    ↓
选择触发事件
    ↓
测试连接
    ↓
保存配置
```

---

### 功能4: 测试通知功能

#### 4.1 测试连接按钮

**位置:**
- 机器人列表页面：每个机器人行右侧的 `[✓]` 按钮
- 机器人编辑页面：Webhook配置步骤的 `[ 测试连接 ]` 按钮

**功能:**
发送一条测试通知到飞书机器人，验证Webhook连接是否正常

#### 4.2 测试通知内容

```
标题: 🧪 飞书通知系统 - 测试消息

内容:
连接测试成功！

时间: 2026-03-10 10:30:45
机器人: 生产部署通知
来自: 系统测试
```

#### 4.3 测试通知流程

```
用户点击 [✓] 测试按钮
    ↓
前端显示"测试中..."
    ↓
后端构建测试通知消息
    ↓
检查机器人配置是否有效
    ↓
调用飞书API发送消息
    ↓
    成功 → 前端显示"✅ 连接测试通过"
    失败 → 前端显示"❌ 连接失败: [错误原因]"
        可能原因:
        - Webhook地址无效
        - 飞书服务不可用
        - 网络连接失败
```

#### 4.4 API接口

```
POST /api/robots/{robotId}/test-connection
Authorization: Bearer <token>

Response (200 - 成功):
{
  "success": true,
  "message": "Test notification sent successfully",
  "timestamp": "2026-03-10T10:30:45Z"
}

Response (400 - 失败):
{
  "success": false,
  "error": "Invalid webhook URL or Feishu service unavailable",
  "details": "Connection timeout after 5s"
}
```

---

### 功能5: 项目工程集成方案

#### 5.1 集成架构

```
外部平台 (Vercel / Railway / GitHub / GitLab)
    │
    └─ Webhook 事件 → POST /api/webhook/{integrationId}
                              │
                              ├─ 验证签名/Token
                              ├─ 解析平台 Payload
                              ├─ 匹配触发事件规则
                              └─ 构建飞书卡片消息
                                         │
                          ┌──────────────┘
                          ↓
                  飞书机器人 Webhook
                  (发送卡片消息到群组)

VS Code Copilot Chat
    │
    └─ @feishu 指令触发 → VS Code 扩展
                              │
                              ├─ 读取会话上下文
                              ├─ 调用 AI API 生成摘要
                              └─ POST /api/webhook/{integrationId}
                                         │
                          ┌──────────────┘
                          ↓
                  飞书机器人 Webhook
```

#### 5.2 Vercel Webhook 集成

**在 Vercel 后台配置 Webhook：**
> Vercel Dashboard → 项目 → Settings → Webhooks → Add Webhook
> 填入本系统接收地址：`https://your-domain/api/webhook/{integrationId}`

**Vercel 推送的 Payload 格式：**
```json
{
  "type": "deployment.succeeded",
  "payload": {
    "deployment": {
      "id": "dpl_xxx",
      "url": "my-app-git-main.vercel.app",
      "name": "my-app",
      "target": "production"
    },
    "project": { "name": "my-app" },
    "team": { "slug": "my-team" }
  }
}
```

**支持的事件类型：**
- `deployment.created` — 部署已创建
- `deployment.succeeded` — 部署成功 ✅
- `deployment.error` — 部署失败 ❌
- `deployment.canceled` — 部署已取消
- `deployment.ready` — 域名就绪，可访问

---

#### 5.3 Railway Webhook 集成

**在 Railway 后台配置 Webhook：**
> Railway Dashboard → 项目 → Settings → Webhooks → Add Webhook
> 填入本系统接收地址：`https://your-domain/api/webhook/{integrationId}`

**Railway 推送的 Payload 格式：**
```json
{
  "type": "DEPLOY_SUCCESS",
  "project": { "id": "proj_xxx", "name": "my-backend" },
  "environment": { "name": "production" },
  "service": { "name": "api-server" },
  "deployment": {
    "id": "dep_xxx",
    "url": "my-backend.up.railway.app",
    "status": "SUCCESS"
  }
}
```

**支持的事件类型：**
- `DEPLOY_SUCCESS` — 部署成功 ✅
- `DEPLOY_FAILED` — 部署失败 ❌
- `DEPLOY_STARTED` — 部署开始
- `SERVICE_CRASH` — 服务崩溃 🚨
- `DOMAIN_READY` — 域名已就绪

---

#### 5.4 GitHub Webhook 集成

**在 GitHub 仓库配置 Webhook：**
> 仓库 → Settings → Webhooks → Add webhook
> Payload URL：`https://your-domain/api/webhook/{integrationId}`
> Content type：`application/json`，可设置 Secret 签名验证

**请求 Header：**
- `X-GitHub-Event`：事件名称
- `X-Hub-Signature-256`：HMAC-SHA256 签名（配置 Secret 后）

**推送事件 (`push`) Payload 关键字段：**
```json
{
  "ref": "refs/heads/main",
  "head_commit": {
    "id": "abc123",
    "message": "fix: 修复登录问题",
    "author": { "name": "张三" }
  },
  "repository": { "name": "my-app", "full_name": "org/my-app", "html_url": "https://github.com/..." },
  "pusher": { "name": "zhangsan" }
}
```

**工作流事件 (`workflow_run`) Payload 关键字段：**
```json
{
  "action": "completed",
  "workflow_run": {
    "name": "Deploy to Production",
    "status": "completed",
    "conclusion": "success",
    "head_branch": "main",
    "html_url": "https://github.com/.../actions/runs/xxx"
  }
}
```

---

#### 5.5 GitLab Webhook 集成

**在 GitLab 项目配置 Webhook：**
> 项目 → Settings → Webhooks
> URL：`https://your-domain/api/webhook/{integrationId}`
> 勾选所需事件，可设置 Secret Token

**请求 Header：**
- `X-Gitlab-Event`：`Push Hook` / `Pipeline Hook` / `Merge Request Hook`
- `X-Gitlab-Token`：Secret Token（配置后需验证）

**Pipeline 事件 Payload 关键字段：**
```json
{
  "object_kind": "pipeline",
  "project": { "name": "my-project", "web_url": "https://gitlab.com/..." },
  "object_attributes": {
    "ref": "main",
    "status": "success",
    "duration": 120
  },
  "commit": { "id": "abc123", "message": "fix: 修复问题", "author": { "name": "李四" } }
}
```

---

## 平台集成方案

> 本章节描述各平台 Webhook 的后端处理逻辑和消息标准化。

### 统一处理流程

```
接收 Webhook POST /api/webhook/{integrationId}
    │
    ├─ 1. 查询集成配置（获取 platformType + webhookSecret）
    ├─ 2. 验证请求签名（各平台方式不同）
    ├─ 3. 读取 Header 判断事件类型
    ├─ 4. 解析 Payload → 标准化为 NormalizedEvent
    ├─ 5. 匹配触发规则（triggeredEvents + notifyOn）
    └─ 6. 构建飞书卡片消息 → 发送
```

### 标准化事件结构

```typescript
interface NormalizedEvent {
  platform: string;         // 'vercel' | 'railway' | 'github' | 'gitlab'
  event: TriggerEvent;      // 标准化事件枚举
  status: 'success' | 'failure' | 'info' | 'warning';
  projectName: string;
  branch?: string;
  commitMessage?: string;
  author?: string;
  url?: string;             // 部署/提交/PR 链接
  extra?: Record<string, string>; // 平台特有字段
}
```

---

## 飞书卡片消息设计

> 所有通知统一使用飞书**交互式卡片消息**（`msg_type: "interactive"`），替代纯文本消息，以获得更好的视觉效果和可操作性。

### 卡片消息格式

```json
{
  "msg_type": "interactive",
  "card": {
    "header": {
      "title": { "tag": "plain_text", "content": "🚀 部署成功" },
      "template": "green"
    },
    "elements": [
      {
        "tag": "div",
        "text": {
          "tag": "lark_md",
          "content": "**项目**: my-app\n**分支**: main\n**提交**: fix: 修复登录问题\n**作者**: 张三"
        }
      },
      {
        "tag": "hr"
      },
      {
        "tag": "action",
        "actions": [
          {
            "tag": "button",
            "text": { "tag": "plain_text", "content": "查看部署" },
            "url": "https://my-app.vercel.app",
            "type": "primary"
          }
        ]
      }
    ]
  }
}
```

### 卡片颜色规范

| 颜色 `template` | 适用场景 |
|----------------|---------|
| `green` | 部署成功、测试通过、PR 合并 |
| `red` | 部署失败、服务崩溃、测试失败 |
| `yellow` | 部署中、状态变更、警告 |
| `blue` | 新建 PR、代码推送、信息通知 |
| `grey` | 部署取消、手动汇报 |

### 平台专属卡片模板

#### Vercel 部署成功模板
```typescript
function buildVercelSuccessCard(event: NormalizedEvent) {
  return {
    msg_type: 'interactive',
    card: {
      header: { title: { tag: 'plain_text', content: '🚀 Vercel 部署成功' }, template: 'green' },
      elements: [
        { tag: 'div', text: { tag: 'lark_md', content:
          `**项目**: ${event.projectName}\n**环境**: ${event.extra?.target ?? 'production'}\n**地址**: ${event.url}`
        }},
        { tag: 'action', actions: [{ tag: 'button', text: { tag: 'plain_text', content: '访问站点' }, url: `https://${event.url}`, type: 'primary' }] }
      ]
    }
  };
}
```

#### Railway 服务崩溃模板
```typescript
function buildRailwayCrashCard(event: NormalizedEvent) {
  return {
    msg_type: 'interactive',
    card: {
      header: { title: { tag: 'plain_text', content: '🚨 Railway 服务崩溃' }, template: 'red' },
      elements: [
        { tag: 'div', text: { tag: 'lark_md', content:
          `**服务**: ${event.extra?.serviceName}\n**环境**: ${event.extra?.environment}\n**时间**: ${new Date().toLocaleString('zh-CN')}`
        }},
        { tag: 'action', actions: [{ tag: 'button', text: { tag: 'plain_text', content: '查看日志' }, url: event.url ?? 'https://railway.app', type: 'danger' }] }
      ]
    }
  };
}
```

---

## VS Code Chat 汇报集成

> 通过 VS Code 扩展将 GitHub Copilot Chat 会话自动汇报到飞书，实现 AI 编程工作进度的团队可见性。

### 技术方案

**推荐方案（稳定）：使用 `vscode.chat.createChatParticipant()` API**

用户在 Copilot Chat 中输入 `@feishu 汇报` 触发扩展，扩展收集上下文后调用 AI 生成摘要并推送飞书。

```
用户输入: @feishu 今日工作汇报
    │
    ├─ VS Code 扩展接收请求
    ├─ 收集 chat context（用户补充的内容）
    ├─ 调用 vscode.lm API 或外部 AI（OpenAI/DeepSeek）
    │    └─ Prompt: 将以下工作内容总结为飞书汇报卡片...
    ├─ 生成结构化摘要
    └─ POST 到本系统 /api/webhook/{integrationId}
             │
             └─ 发送飞书卡片消息到群组
```

### VS Code 扩展核心代码

```typescript
// 需要 VS Code >= 1.90.0（Chat Participant API + vscode.lm API）
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  // 注册 @feishu Chat 参与者
  const participant = vscode.chat.createChatParticipant('feishu-notifier.report', handleChatRequest);
  participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'feishu-icon.png');
  context.subscriptions.push(participant);

  // 同时注册命令方式（不依赖 Chat 的手动汇报入口）
  context.subscriptions.push(
    vscode.commands.registerCommand('feishu-notifier.reportNow', reportNow)
  );
}

async function handleChatRequest(
  request: vscode.ChatRequest,
  _context: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
): Promise<vscode.ChatResult> {
  const cfg = vscode.workspace.getConfiguration('feishuNotifier');
  const webhookEndpoint = cfg.get<string>('webhookEndpoint');
  const triggerToken = cfg.get<string>('triggerToken');

  if (!webhookEndpoint || !triggerToken) {
    stream.markdown('❌ **未配置飞书集成**\n\n请在 VS Code 设置中填写以下两项：\n- `feishuNotifier.webhookEndpoint`\n- `feishuNotifier.triggerToken`\n\n> 参数来自飞书通知系统 → VS Code Chat 集成创建后的配置引导弹窗。');
    return {};
  }

  // @feishu /test 子命令
  if (request.command === 'test') {
    await postToWebhook(webhookEndpoint, triggerToken, {
      event: 'chat_manual', status: 'info',
      title: '🔔 VS Code Chat 测试通知', summary: '连接正常，飞书通知系统工作正常。',
    });
    stream.markdown('✅ **测试通知已发送！** 请检查飞书群组是否收到消息。');
    return {};
  }

  const userContent = request.prompt.trim();
  if (!userContent) {
    stream.markdown('请输入工作内容，例如：\n```\n@feishu 今日完成了登录功能的开发和单元测试\n```');
    return {};
  }

  stream.progress('正在生成工作摘要...');
  let summary = userContent;

  // 优先使用 vscode.lm（Copilot）生成摘要，无 Copilot 时直接使用原文
  try {
    const models = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
    if (models.length > 0) {
      const messages = [
        vscode.LanguageModelChatMessage.User(
          `将以下工作内容整理为简洁、专业的飞书工作汇报（中文，200字以内），` +
          `包含：主要完成事项、关键进展、待跟进问题（如有）。\n\n原始内容：\n${userContent}`
        ),
      ];
      const response = await models[0].sendRequest(messages, {}, token);
      let aiSummary = '';
      for await (const chunk of response.text) aiSummary += chunk;
      if (aiSummary.trim()) summary = aiSummary.trim();
    }
  } catch { /* AI 摘要失败，使用原文 */ }

  await postToWebhook(webhookEndpoint, triggerToken, {
    event: 'chat_manual', status: 'info', title: '📋 工作汇报', summary,
  });
  stream.markdown(`✅ **已发送到飞书！**\n\n**摘要内容：**\n\n${summary}`);
  return {};
}

async function postToWebhook(endpoint: string, token: string, payload: object): Promise<void> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Trigger-Token': token },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
```

### 扩展配置项（package.json）

```json
{
  "engines": { "vscode": "^1.90.0" },
  "contributes": {
    "chatParticipants": [
      {
        "id": "feishu-notifier.report",
        "name": "feishu",
        "description": "将工作内容汇报到飞书通知群组",
        "isSticky": false,
        "commands": [
          { "name": "test", "description": "发送测试通知到飞书，验证配置是否正确" }
        ]
      }
    ],
    "configuration": {
      "title": "飞书通知",
      "properties": {
        "feishuNotifier.webhookEndpoint": {
          "type": "string",
          "description": "Webhook 接收地址，格式：{frontendOrigin}/api/webhook/{integrationId}。注意：应使用前端 URL（如 http://localhost:5173 或生产域名）而非后端端口 3000，Vite dev server 和 nginx 均会将 /api 请求代理到后端。从集成创建后的配置引导中获取。"
        },
        "feishuNotifier.triggerToken": {
          "type": "string",
          "description": "Webhook Secret Token（从集成创建后的配置引导中获取，请妥善保存）",
          "markdownDescription": "Webhook Secret Token，即集成的 `webhookSecret`，扩展通过 `X-Trigger-Token` 请求头传入。"
        }
      }
    }
  }
}
```

### AI 摘要 API 选项

| 提供商 | 推荐模型 | 特点 |
|--------|---------|------|
| **vscode.lm**（内置）| `copilot/gpt-4o` | 无需额外费用，需 Copilot 订阅 |
| **OpenAI** | `gpt-4o-mini` | 效果好，适量付费 |
| **DeepSeek** | `deepseek-chat` | 中文效果优异，价格低廉 |

---

## API接口定义

### 认证相关

#### 登录
```
POST /api/auth/login
Content-Type: application/json

Request:
{
  "username": "admin",
  "password": "admin"
}

Response (200):
{
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "username": "admin",
    "role": "admin",
    "passwordChanged": false
  }
}

Response (需要修改密码, 200):
{
  "requirePasswordChange": true,
  "token": "jwt-token"
}
```

#### 修改密码
```
POST /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "currentPassword": "admin",
  "newPassword": "admin@123"
}

Response (200):
{
  "success": true,
  "message": "Password changed successfully"
}
```

### 机器人管理相关

#### 获取机器人列表
```
GET /api/robots
Authorization: Bearer <token>

Response (200):
[
  {
    "id": "robot-1",
    "name": "生产部署通知",
    "description": "部署成功/失败",
    "status": "active",
    "notificationCount": 42,
    "lastNotificationAt": "2026-03-10T10:30:00Z",
    "createdAt": "2026-03-10T08:00:00Z"
  }
]
```

#### 创建机器人
```
POST /api/robots
Authorization: Bearer <token>
Content-Type: application/json

Request:
{
  "name": "生产部署通知",
  "description": "部署成功/失败通知",
  "webhookUrl": "https://open.feishu.cn/open-apis/bot/v2/hook/xxx",
  "status": "active"
}

Response (201):
{
  "id": "robot-1",
  "name": "生产部署通知",
  ...
}
```

#### 删除机器人
```
DELETE /api/robots/{robotId}
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "message": "Robot deleted successfully"
}
```

#### 测试机器人连接
```
POST /api/robots/{robotId}/test-connection
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "message": "Test notification sent successfully",
  "timestamp": "2026-03-10T10:30:45Z"
}

Response (400):
{
  "success": false,
  "error": "Invalid webhook URL or Feishu service unavailable"
}
```

#### 添加项目集成
```
POST /api/robots/{robotId}/integrations
Authorization: Bearer <token>
Content-Type: application/json

Request (以 Vercel 为例):
{
  "projectName": "my-app",
  "projectType": "vercel",
  "config": {
    "webhookSecret": "optional-secret"
  },
  "triggeredEvents": ["deploy_success", "deploy_failure"],
  "notifyOn": "always"
}

Request (以 GitHub 为例):
{
  "projectName": "my-repo",
  "projectType": "github",
  "config": {
    "repoOwner": "my-org",
    "repoName": "my-repo",
    "webhookSecret": "secret-key",
    "branch": "main"
  },
  "triggeredEvents": ["commit_pushed", "workflow_run"],
  "notifyOn": "always"
}

Request (以 VS Code Chat 为例):
{
  "projectName": "vscode-chat",
  "projectType": "vscode-chat",
  "config": {
    "triggerToken": "auto-generated-token",
    "summaryAI": "deepseek",
    "aiApiKey": "sk-..."
  },
  "triggeredEvents": ["chat_manual"],
  "notifyOn": "always"
}

Response (201):
{
  "id": "integration-1",
  "robotId": "robot-1",
  "webhookReceiveUrl": "https://your-domain/api/webhook/integration-1"
}
```

---

## 实现路线图

### Phase 1: 基础认证系统 (Week 1)
- ✅ 用户模型和数据库设计
- ✅ Admin初始化和密码修改功能
- ✅ 密码强度验证（移除大写要求）
- ✅ 登录页面UI

### Phase 2: 机器人管理 (Week 2)
- ✅ 机器人CRUD操作
- ✅ 机器人列表页面
- ✅ 机器人编辑页面
- ✅ Webhook配置和测试
- ✅ 删除机器人功能

### Phase 3: 项目集成 (Week 3)
- ✅ 集成类型支持（Vercel、Railway、GitHub、GitLab、VS Code Chat、Direct API、Custom）
- ✅ 集成配置 UI（各平台专属配置面板）
- ✅ 触发事件选择（12 种标准事件）
- ✅ 测试通知功能

### Phase 4: 平台 Webhook 接入 (Week 4)
- ✅ Vercel Webhook 接收处理器（HMAC-SHA1 签名验证）
- ✅ Railway Webhook 接收处理器
- ✅ GitHub Webhook 接收处理器（HMAC-SHA256 签名验证）
- ✅ GitLab Webhook 接收处理器（Token 直接比对）
- ✅ 飞书卡片消息（交互式卡片含颜色编码）
- ✅ webhookSecret 统一字段（创建集成时自动生成）
- ✅ 触发事件列表按平台动态过滤

### Phase 5: VS Code Chat 汇报 (Week 5)
- ✅ VS Code 扩展 `@feishu` Chat 参与者（`vscode.chat.createChatParticipant`）
- ✅ 接入 `vscode.lm` API（Copilot GPT-4o，无需额外费用）
- ✅ `/test` 子命令验证连通性
- ✅ `feishu-notifier.reportNow` 命令（命令面板手动汇报，不依赖 Chat）
- 📋 外部 AI 摘要 fallback（OpenAI / DeepSeek）

### Phase 6: SDK和集成文档 (Week 6+)
- ✅ JavaScript SDK
- ✅ Python SDK
- 📋 各平台集成快速指南
- 📋 API 文档更新

---

**版本更新:**
- v1.3.1 - 2026-03-11：修正 Webhook 地址展示应使用前端 origin（window.location.origin）而非直接展示后端端口 3000；集成列表新增“📋 URL”和“🔑 Token”复制按钮；修复机器人编辑功能
- v1.3.0 - 2026-03-10：统一 webhookSecret 为集成顶层字段；更新 VS Code 扩展实现（Chat Participant + vscode.lm + reportNow 命令）；Phase 4 全部完成；Phase 5 核心完成
- v1.2.0 - 2026-03-10：移除 Jenkins，新增 Vercel / Railway / VS Code Chat 集成；新增飞书卡片消息设计；新增 VS Code Chat 汇报机制设计
- v1.1.0 - 移除密码大写字母要求，补充删除机器人和测试通知功能设计
- v1.0.0 - 初始版本
