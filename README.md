# VSCode AI 飞书机器人通知系统

一个完整的解决方案，用于通过 Webhook 向飞书机器人发送 AI 工作结果总结（拉取、推送、部署等），包含跨工程调用、VSCode 扩展集成和简易管理前端。

## 📋 项目组成

```
vscode-ai-feishu-bot/
├── backend/                    # 后端服务（Node.js + Express）
│   ├── src/
│   │   ├── server.ts          # 主服务器入口
│   │   ├── webhook.ts         # Webhook 处理
│   │   ├── feishu.ts          # 飞书 API 集成
│   │   ├── logger.ts          # 日志系统
│   │   └── config.ts          # 配置管理
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── docker-compose.yml
├── frontend/                   # 管理前端（React）
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── AlarmHistory.tsx
│   │   │   └── Settings.tsx
│   │   ├── pages/
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── index.tsx
│   ├── package.json
│   ├── Dockerfile.prod
│   └── tsconfig.json
├── vscode-extension/           # VSCode 扩展
│   ├── src/
│   │   ├── extension.ts        # 扩展入口
│   │   ├── feishuNotifier.ts   # 飞书通知器
│   │   ├── commands.ts         # 命令注册
│   │   └── config.ts           # 扩展配置
│   ├── package.json
│   ├── tsconfig.json
│   └── vsc-extension-quickstart.md
├── sdk/                        # 跨工程 SDK（可选）
│   ├── typescript/
│   │   ├── dist/
│   │   ├── src/
│   │   └── package.json
│   └── python/
│       ├── feishu_notifier/
│       └── setup.py
├── docs/
│   ├── architecture.md         # 架构设计
│   ├── deployment.md           # 部署指南
│   ├── integration-guide.md    # 集成指南
│   └── api.md                  # API 文档
├── scripts/
│   ├── deploy.sh              # 部署脚本
│   └── setup.sh               # 初始化脚本
├── docker-compose.yml          # 完整部署配置
├── .env.example
└── .gitignore
```

## 🎯 核心功能

### 1. 后端服务
- ✅ Webhook 接收 AI 工作结果
- ✅ 飞书机器人消息推送
- ✅ 消息队列（可选）
- ✅ 数据持久化（SQLite/MongoDB）
- ✅ 日志管理
- ✅ 健康检查

### 2. VSCode 扩展
- ✅ 一键发送通知命令
- ✅ 快捷菜单集成
- ✅ 工作区日志上传
- ✅ 配置管理面板
- ✅ 快快捷键支持

### 3. 管理前端
- ✅ 通知历史查看
- ✅ 消息搜索过滤
- ✅ 配置管理
- ✅ 统计分析面板
- ✅ 机器人管理

### 4. 跨工程集成
- ✅ 开放 REST API
- ✅ SDK（TypeScript/Python）
- ✅ Webhook 标准格式
- ✅ 认证与授权

## 🚀 快速开始

### 前置条件
- Node.js 16+
- Docker & Docker Compose（可选）
- 飞书创建应用获取 Webhook URL

### 1. 环境配置
```bash
cd vscode-ai-feishu-bot
cp .env.example .env
# 编辑 .env，填入飞书 Webhook URL
```

### 2. 后端启动
```bash
cd backend
npm install
npm run dev
```

### 3. 前端启动
```bash
cd frontend
npm install
npm run dev
```

### 4. 访问应用
打开浏览器访问：**http://localhost:5176**

#### 🔐 初始登录凭证
首次启动时，后端会自动在控制台输出初始账户信息：

**用户名:** `admin`  
**密码:** `admin`

> ⚠️ **重要:** 首次登录后会强制要求修改密码，请立即设置强密码！

新密码要求：
- 长度: 8-20 字符
- 必须包含: 小写字母、数字、特殊字符 (!@#$%^&*)

例：`NewPass@123`

### 5. VSCode 扩展开发
```bash
cd vscode-extension
npm install
npm run watch
# F5 启动调试
```

## 📦 免费部署方案

### 方案 A：使用 Railway.app（可选免费层）
- 部署 Node.js 后端
- 部署 React 前端
- 数据库使用 SQLite 本地存储

### 方案 B：使用 Vercel + AWS Lambda
- Vercel：部署前端
- AWS Lambda（免费层）：无服务器后端
- DynamoDB：免费层数据存储

### 方案 C：使用 Replit（完全免费）
- 部署整个项目
- 无需信用卡
- 支持 Node.js

### 方案 D：自托管（Docker）
- 本地 VPS（如阿里云、腾讯云学生套餐）
- Docker Compose 一键部署
- 内含 SQLite 数据库

**推荐**：方案 A（Railway）或 D（自托管） - 功能完整，易于配置

## 🔧 跨工程调用示例

### 方式 1：HTTP REST API
```bash
curl -X POST http://your-server/api/notify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "部署完成",
    "summary": "项目 my-app v1.2.0 部署成功",
    "status": "success",
    "details": {
      "action": "deploy",
      "branch": "main",
      "commit": "abc123",
      "duration": 180
    }
  }'
```

### 方式 2：SDK 调用（TypeScript）
```typescript
import { FeishuNotifier } from '@feishu-bot/sdk';

const notifier = new FeishuNotifier({
  webhookUrl: process.env.FEISHU_WEBHOOK_URL,
  serverUrl: 'http://your-server'
});

await notifier.notifyPullResult({
  repository: 'my-repo',
  branch: 'main',
  status: 'success',
  summary: 'Pulled 10 commits'
});
```

### 方式 3：SDK 调用（Python）
```python
from feishu_notifier import FeishuNotifier

notifier = FeishuNotifier(
    webhook_url=os.getenv('FEISHU_WEBHOOK_URL'),
    server_url='http://your-server'
)

notifier.notify_deploy_result(
    service='my-service',
    status='success',
    summary='Deployed v1.2.0 to production'
)
```

### 方式 4：VSCode 扩展集成
在任何 VSCode 工作区执行命令：
```
Ctrl+Shift+P -> Feishu: Send Notification
```

## 🔐 安全性

- ✅ 环境变量管理敏感信息
- ✅ JWT 认证
- ✅ CORS 限制
- ✅ Rate Limiting
- ✅ 输入验证

## 📊 API 端点

| 方法 | 路由 | 说明 |
|------|------|------|
| POST | `/api/notify` | 发送通知 |
| GET | `/api/notifications` | 查询历史 |
| GET | `/api/stats` | 统计数据 |
| POST | `/api/webhooks/test` | 测试 Webhook |
| GET | `/api/health` | 健康检查 |

## 📚 文档

- [详细架构设计](./docs/architecture.md)
- [部署指南](./docs/deployment.md)
- [集成指南](./docs/integration-guide.md)
- [API 文档](./docs/api.md)

## 🛠️ 开发

### 项目结构说明
- **backend**：TypeScript + Express + SQLite
- **frontend**：React + TypeScript + Vite
- **vscode-extension**：VSCode Extension API
- **sdk**：SDK 库（可选）

### 本地开发
```bash
# 安装所有依赖
npm run install:all

# 运行测试
npm run test

# 构建生产版本
npm run build:all
```

## 📝 环境变量

参考 `.env.example`，需要配置：

```env
# 飞书配置
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/xxx

# 服务器配置
PORT=3000
NODE_ENV=development

# 认证
JWT_SECRET=your-secret-key

# 数据库
DATABASE_URL=sqlite://./data/db.sqlite
```

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request

---

**开始构建**：查看 [deployment.md](./docs/deployment.md) 获取详细部署指南
