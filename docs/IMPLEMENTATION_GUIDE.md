# 前端功能架构方案与实现指南

**文档版本:** 1.1.0  
**最后更新:** 2026-03-10  
**状态:** 设计完成，待开发

---

## 📋 文档导航

本项目包含以下核心文档：

1. **[DESIGN_DOCUMENT.md](DESIGN_DOCUMENT.md)** - 完整的系统设计文档
   - 系统架构图
   - 数据模型定义
   - 功能详细设计
   - API接口规范

2. **[TEST_CASES.md](TEST_CASES.md)** - 全面的测试用例集
   - 单元测试用例
   - 集成测试用例
   - 端到端测试用例
   - 性能测试用例
   - 安全性测试用例

3. **本文档** - 实现指南和快速参考

---

## 🎯 核心功能总体设计

### 功能1: 用户认证系统

```
┌─────────────────────────────┐
│  登录页面                   │
│  username | password | 登录 │
└────────────┬────────────────┘
             │ (验证)
             ↓
      ┌──────────────┐
      │ 密码是否修改? │
      └──┬───────────┘
        ├─ No  → 强制修改密码页
        │  (密码强度验证)
        │  ✓ a-z 小写字母
        │  ✓ 0-9 数字
        │  ✓ Special chars (!@#$%^&*)
        │  ✓ 长度 8-20 字符
        │
        └─ Yes → Dashboard页
               (展示机器人列表和统计)
```

**数据库Schema建议:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user'),
  password_changed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP,
  
  INDEX(username)
);
```

---

### 功能2: 机器人实例管理

```
机器人列表
├─ 机器人1 (活跃)
│  ├─ 名称、描述
│  ├─ 最后通知时间
│  ├─ 统计信息
│  └─ 操作 [✓测试] [编辑] [删除]
│
├─ 机器人2 (停用)
│  └─ ...
│
└─ [+ 新建机器人]
```

**工作流:**

```
新建机器人
    ↓
Step 1: 填入基本信息 (name, description, status)
    ↓
Step 2: 配置飞书Webhook (验证URL有效性)
    ↓
Step 3: 测试连接 (发送测试通知)
    ↓
Step 4: 添加项目集成 (可选)
    ↓
保存到数据库
    ↓
展示在列表中
```

---

### 功能3: 项目集成 - 4大集成方案

#### 方案A: 直接API调用（最灵活）

```
项目代码
  ↓
导入SDK/HTTP库
  ↓
调用: POST /api/notify
{
  "title": "...",
  "summary": "...",
  "status": "success|error|warning|info",
  "action": "deploy|build|test|...",
  "details": {...}
}
  ↓
后端记录 + 发送到飞书
  ↓
飞书群组显示通知
```

**示例 (Node.js):**
```javascript
const axios = require('axios');

async function deploySuccess(version) {
  const result = await axios.post('http://localhost:3000/api/notify', {
    title: 'Deployment Complete',
    summary: `Version ${version} deployed successfully`,
    status: 'success',
    action: 'deploy',
    details: {
      timestamp: new Date().toISOString(),
      url: 'https://github.com/...'
    }
  });
  
  return result.data;
}

deploySuccess('v1.2.0').catch(err => console.error(err));
```

#### 方案B: Jenkins集成

```
Jenkins Job
  ↓ (构建完成)
Post-build Action
  ↓ (调用URL)
通知系统的Webhook接收端点
  ↓
后端匹配机器人配置 + 发送到飞书
```

**Jenkins Pipeline示例:**

```groovy
pipeline {
    agent any
    
    environment {
        NOTIFY_URL = 'http://localhost:3000/api/notify'
    }
    
    stages {
        stage('Deploy') {
            steps {
                sh '''
                    npm run deploy || {
                        curl -X POST ${NOTIFY_URL} \
                          -H "Content-Type: application/json" \
                          -d '{"title":"Deploy Failed","status":"error"}'
                        exit 1
                    }
                    
                    curl -X POST ${NOTIFY_URL} \
                      -H "Content-Type: application/json" \
                      -d '{"title":"Deploy Success","status":"success"}'
                '''
            }
        }
    }
}
```

#### 方案C: GitHub Actions集成

```
GitHub仓库
  ↓ (push/PR/release)
GitHub Actions Workflow
  ↓ (jobs完成)
curl调用通知系统
```

**.github/workflows/notify.yml:**
```yaml
name: Send Notification

on:
  push:
    branches: [main]

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Notify Success
        run: |
          curl -X POST http://localhost:3000/api/notify \
            -H "Content-Type: application/json" \
            -d '{
              "title": "GitHub Action",
              "summary": "Build passed",
              "status": "success",
              "action": "build"
            }'
```

#### 方案D: 自定义Webhook（最简单）

任何系统只要能发HTTP POST请求，都可以集成。

---

## 🗄️ 数据模型关键字段

### User 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| username | String | 用户名（唯一） |
| password_hash | String | bcrypt加密后的密码 |
| role | Enum | admin \| user |
| password_changed | Boolean | 初次登录标记 |
| created_at | DateTime | 创建时间 |

### Robot 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| name | String | 机器人名称 |
| webhook_url_encrypted | String | 加密的飞书Webhook |
| status | Enum | active \| inactive |
| owner_id | UUID | 创建人ID |
| notification_count | Int | 通知数量统计 |
| created_at | DateTime | 创建时间 |

### Integration 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| robot_id | UUID | 关联到哪个机器人 |
| project_type | Enum | jenkins \| github \| gitlab \| api |
| config_encrypted | String | 加密的项目配置 |
| trigger_events | JSON | 触发事件列表 |
| created_at | DateTime | 创建时间 |

---

## 🔐 密码策略实现

### 验证规则

```typescript
function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors = [];
  
  // 长度检查
  if (password.length < 8) errors.push("至少8个字符");
  if (password.length > 20) errors.push("最多20个字符");
  
  // 字符类型检查
  if (!/[a-z]/.test(password)) errors.push("需要小写字母a-z");
  if (!/[0-9]/.test(password)) errors.push("需要数字0-9");
  if (!/[!@#$%^&*]/.test(password)) errors.push("需要特殊字符!@#$%^&*");
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// 有效密码示例
✅ admin@123     ✅ pass#999    ✅ pwd2026$
❌ admin123      ❌ admin      ❌ pass1

// 字符数边界
✅ pass@1234567  (13字符)
✅ pass@123456890 (15字符)
❌ pass@123456890123456 (21字符，超过限制)
```

---

## 🚀 集成实现步骤

### 步骤1: 前端创建机器人

1. 登录管理系统
2. 进入"机器人管理"
3. 点击"新建"
4. 填入基本信息：名称、Webhook、状态
5. 保存

### 步骤2: 在项目中集成

**直接API方案:**

```bash
export NOTIFY_API=http://localhost:3000

curl -X POST $NOTIFY_API/api/notify \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Build Success",
    "status": "success",
    "action": "build"
  }'
```

**使用SDK:**

```bash
npm install @feishu-notifier/sdk

# 在代码中
import { NotifyClient } from '@feishu-notifier/sdk';
const client = new NotifyClient({ apiUrl: 'http://localhost:3000' });
await client.notify({
  title: 'Deployment Complete',
  status: 'success'
});
```

### 步骤3: 验证集成

1. 触发项目中的集成事件
2. 检查飞书群组
3. 应该收到通知
4. 前端Dashboard中查看统计信息更新

---

## 📊 项目集成方案对比

| 方案 | 难度 | 灵活性 | 适用场景 |
|------|------|--------|---------|
| 直接API | ⭐ | ⭐⭐⭐⭐⭐ | 任何项目 |
| Jenkins | ⭐⭐ | ⭐⭐⭐ | Jenkins用户 |
| GitHub | ⭐⭐ | ⭐⭐⭐⭐ | GitHub用户 |
| GitLab | ⭐⭐ | ⭐⭐⭐⭐ | GitLab用户 |
| 自定义 | ⭐⭐⭐ | ⭐⭐ | 特殊需求 |

---

## 📁 前端项目结构规划

```
frontend/
├── src/
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── ForceChangePassword.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Robots/
│   │   │   ├── list.tsx
│   │   │   ├── create.tsx
│   │   │   ├── edit.tsx
│   │   │   └── integrations.tsx
│   │   └── Admin/
│   │
│   ├── components/
│   │   ├── Layout.tsx
│   │   ├── Navbar.tsx
│   │   ├── PasswordStrengthMeter.tsx
│   │   └── ...
│   │
│   ├── services/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   └── storage.ts
│   │
│   ├── types/
│   │   └── index.ts
│   │
│   └── utils/
│       ├── validation.ts
│       ├── encryption.ts
│       └── ...
│
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

---

## ✅ 开发检查清单

### Phase 1: 认证系统 (Week 1)

- [ ] 创建User表和API端点
- [ ] 实现初始化admin用户逻辑
- [ ] 开发登录组件和页面
- [ ] 实现密码强度验证函数
- [ ] 开发强制修改密码流程
- [ ] 编写单元测试
- [ ] 编写集成测试
- [ ] 验证JWT token管理

### Phase 2: 机器人管理 (Week 2)

- [ ] 创建Robot表和API
- [ ] 开发机器人列表页面
- [ ] 开发新建机器人向导
- [ ] 实现编辑机器人功能
- [ ] 添加Webhook URL加密存储
- [ ] 实现测试连接功能
- [ ] 编写测试用例
- [ ] 添加统计信息展示
- [ ] 实现删除机器人功能

### Phase 3: 项目集成 (Week 3)

- [ ] 创建Integration表
- [ ] 支持多种projectType
- [ ] 开发集成配置UI
- [ ] 实现触发事件选择
- [ ] 编写SDK示例代码
- [ ] 编写文档和示例

### Phase 4: 测试与优化 (Week 4)

- [ ] 运行所有测试用例
- [ ] 性能测试和优化
- [ ] 安全审计
- [ ] 用户体验优化
- [ ] 文档完善

---

## 🔗 相关参考

- [完整设计文档](DESIGN_DOCUMENT.md)
- [测试用例完整集](TEST_CASES.md)
- [后端API文档](api.md)
- [系统架构](architecture.md)

---

## 注意事项

**密码安全:**
- 使用bcrypt加密，成本因子≥12
- 所有Webhook URL使用AES-256加密存储
- API调用时使用HTTPS
- 实现API速率限制

**多用户支持:**
- Phase 1仅支持超级管理员
- Phase 5会添加普通用户和权限管理

**数据持久化:**
- 当前开发使用JSON文件存储
- 生产环境推荐使用PostgreSQL + Redis缓存

---

**版本更新:**
- v1.1.0 - 更新密码验证规则（移除大写字母要求）、补充测试通知设计、删除机器人功能
- v1.0.0 - 初始版本

**Last Updated:** 2026-03-10
