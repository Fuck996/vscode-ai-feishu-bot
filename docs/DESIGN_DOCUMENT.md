# 飞书AI通知系统 - 前端功能设计文档

**版本:** 1.1.0  
**状态:** 设计完成  
**最后更新:** 2026-03-10

---

## 📋 目录

1. [系统架构](#系统架构)
2. [数据模型](#数据模型)
3. [功能设计](#功能设计)
4. [工程项目集成方案](#工程项目集成方案)
5. [API接口定义](#api接口定义)
6. [实现路线图](#实现路线图)

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
    │  后端 API       │ │ 项目 SDK   │ │ 工程项目      │
    │  (Node.js)      │ │ (CLI/库)   │ │ (Jenkins等)   │
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
  projectType: 'jenkins' | 'github' | 'gitlab' | 'custom' | 'api'; // 项目类型
  
  // 连接配置（根据projectType不同而异）
  config: IntegrationConfig;         // 项目特定配置
  
  // 通知规则
  triggeredEvents: TriggerEvent[];   // 触发事件类型
  notifyOn: 'success' | 'failure' | 'always' | 'changes'; // 什么时候通知
  
  // 模板
  messageTemplate?: string;          // 自定义消息模板
  
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

// 项目类型特定配置
type IntegrationConfig = 
  | JenkinsConfig
  | GitHubConfig
  | GitLabConfig
  | CustomWebhookConfig
  | DirectAPIConfig;

interface JenkinsConfig {
  jenkinsUrl: string;
  jobName: string;
  username: string;
  apiToken: string;
}

interface GitHubConfig {
  repoOwner: string;
  repoName: string;
  events: string[]; // push, pull_request, release等
  branch?: string;
}

interface GitLabConfig {
  baseUrl: string;
  projectId: string;
  accessToken: string;
  events: string[];
}

interface CustomWebhookConfig {
  description: string;
  customHeaders?: Record<string, string>;
}

interface DirectAPIConfig {
  apiEndpoint: string;
  method: 'webhook' | 'polling';
  pollingInterval?: number; // 秒
}
```

### 4. 触发事件模型 (TriggerEvent)

```typescript
enum TriggerEvent {
  BUILD_SUCCESS = 'build_success',
  BUILD_FAILURE = 'build_failure',
  DEPLOY_SUCCESS = 'deploy_success',
  DEPLOY_FAILURE = 'deploy_failure',
  TEST_PASSED = 'test_passed',
  TEST_FAILED = 'test_failed',
  VERSION_RELEASED = 'version_released',
  PR_MERGED = 'pr_merged',
  COMMIT_PUSHED = 'commit_pushed',
  CUSTOM = 'custom',
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
| **Jenkins** | CI/CD流水线 | Webhook或API轮询 |
| **GitHub** | 代码托管 | Webhook |
| **GitLab** | 代码托管 | Webhook |
| **Direct API** | 直接API调用 | 项目SDK或脚本 |
| **Custom** | 自定义集成 | 通用Webhook |

#### 3.2 为机器人添加项目集成

**配置流程:**

```
编辑机器人
    ↓
点击"添加项目集成"
    ↓
选择项目类型 (Jenkins/GitHub/GitLab/API/Custom)
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
开发者工程项目
    │
    ├─ CI/CD流水线 (Jenkins/GitHub Actions等)
    │    │
    │    └─ 构建完成 → 调用通知API
    │
    ├─ Webhook配置
    │    │
    │    └─ 事件触发 → 发送到前端定义的Webhook
    │
    └─ SDK/CLI集成
         │
         └─ 编程调用通知服务

         所有方式 ↓
           
    飞书通知系统API
    (localhost:3000)
    
         ↓
    
    验证机器人配置 → 获取飞书Webhook地址
    
         ↓
    
    发送到飞书 → 通知展示在群组
```

#### 5.2 集成方法1: 直接API调用

**JavaScript/Node.js:**
```javascript
const axios = require('axios');

async function notifyDeployment(status, details) {
  const response = await axios.post('http://localhost:3000/api/notify', {
    title: 'Production Deployment',
    summary: `Deployment ${status}`,
    status: status === 'success' ? 'success' : 'error',
    action: 'deploy',
    details: {
      version: details.version,
      timestamp: new Date().toISOString(),
      ...details
    }
  });
  return response.data;
}

notifyDeployment('success', { version: 'v1.2.0' });
```

**Python:**
```python
import requests
import json

def notify_deployment(status, details):
    payload = {
        "title": "Production Deployment",
        "summary": f"Deployment {status}",
        "status": "success" if status == "success" else "error",
        "action": "deploy",
        "details": details
    }
    
    response = requests.post(
        'http://localhost:3000/api/notify',
        json=payload
    )
    return response.json()

notify_deployment('success', {'version': 'v1.2.0'})
```

**Bash脚本:**
```bash
#!/bin/bash

curl -X POST http://localhost:3000/api/notify \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Production Deployment",
    "summary": "Deployment success",
    "status": "success",
    "action": "deploy",
    "details": {
      "version": "v1.2.0",
      "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
    }
  }'
```

#### 5.3 集成方法2: Jenkins Pipeline

```groovy
pipeline {
    agent any
    
    environment {
        NOTIFY_URL = 'http://localhost:3000/api/notify'
        SERVICE_NAME = 'my-api-service'
    }
    
    stages {
        stage('Deploy') {
            steps {
                echo 'Deploying...'
                sh '''
                    npm run deploy || {
                        curl -X POST ${NOTIFY_URL} \
                          -H "Content-Type: application/json" \
                          -d '{
                            "title": "部署失败",
                            "summary": "'${SERVICE_NAME}' 部署失败",
                            "status": "error",
                            "action": "deploy"
                          }'
                        exit 1
                    }
                    
                    curl -X POST ${NOTIFY_URL} \
                      -H "Content-Type: application/json" \
                      -d '{
                        "title": "部署成功",
                        "summary": "'${SERVICE_NAME}' 部署成功",
                        "status": "success",
                        "action": "deploy"
                      }'
                '''
            }
        }
    }
}
```

#### 5.4 集成方法3: GitHub Actions

```yaml
name: Deployment Notification

on:
  deployment_status:
    types: [created, updated]

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Send Notification
        run: |
          curl -X POST http://localhost:3000/api/notify \
            -H "Content-Type: application/json" \
            -d '{
              "title": "GitHub Deployment",
              "summary": "Repository ${{ github.repository }} deployed",
              "status": "${{ job.status }}",
              "action": "deploy"
            }'
```

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

Request:
{
  "projectName": "api-service",
  "projectType": "jenkins",
  "config": {
    "jenkinsUrl": "http://jenkins.example.com",
    "jobName": "deploy-prod",
    "username": "jenkins-user",
    "apiToken": "token"
  },
  "triggeredEvents": ["DEPLOY_SUCCESS", "DEPLOY_FAILURE"],
  "notifyOn": "always"
}

Response (201):
{
  "id": "integration-1",
  "robotId": "robot-1",
  ...
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
- ✅ 集成类型支持（Jenkins、GitHub等）
- ✅ 集成配置UI
- ✅ 触发事件选择
- ✅ 测试通知功能

### Phase 4: SDK和文档 (Week 4)
- ✅ JavaScript SDK
- ✅ Python SDK
- ✅ 集成文档
- ✅ API文档

### Phase 5: 高级功能 (Week 5+)
- ✅ 权限管理（角色和权限）
- ✅ 用户管理
- ✅ 消息历史统计
- ✅ 审计日志
- ✅ 通知模板

---

**版本更新:**
- v1.1.0 - 移除密码大写字母要求，补充删除机器人和测试通知功能设计
- v1.0.0 - 初始版本
