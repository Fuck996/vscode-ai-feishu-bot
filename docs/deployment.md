# 部署指南

## 前置条件

- Node.js 16+ 或 Docker 20+
- 飞书企业/团队（获取 Webhook URL）
- Git

## 方案选择

根据你的需求选择合适的部署方案：

| 方案 | 难度 | 成本 | 可用性 | 推荐度 |
|-----|------|------|--------|--------|
| 本地部署 | ⭐ | 免费 | 开发中 | ⭐⭐⭐⭐ |
| Docker | ⭐⭐ | 免费 | 高 | ⭐⭐⭐⭐⭐ |
| Railway | ⭐⭐ | 免费/月5$ | 高 | ⭐⭐⭐⭐ |
| Vercel + Lambda | ⭐⭐⭐ | 免费/按用量 | 中 | ⭐⭐⭐ |
| Replit | ⭐ | 免费 | 中 | ⭐⭐⭐ |

---

## 方案 A：本地 Docker 部署（推荐）

### 步骤 1：克隆项目

```bash
git clone https://github.com/你的用户名/vscode-ai-feishu-bot.git
cd vscode-ai-feishu-bot
```

### 步骤 2：配置环境变量

```bash
cp backend/.env.example .env
```

编辑 `.env` 文件：

```env
# 必须配置：飞书 Webhook URL
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/YOUR_WEBHOOK_ID

# 其他可选的配置
JWT_SECRET=your-secure-random-key-here
PORT=3000
CORS_ORIGIN=*
```

### 步骤 3：启动服务

```bash
docker-compose up -d
```

验证服务：

```bash
# 检查服务状态
docker-compose ps

# 后端健康检查
curl http://localhost:3000/api/health

# 前端访问
# 打开浏览器访问 http://localhost:5173
```

### 步骤 4：获取飞书 Webhook URL

1. 打开飞书开发者后台
2. 创建应用，选择"机器人"
3. 获取 Webhook 地址
4. 填入 `.env` 文件

---

## 方案 B：Railway 部署（全免费）

### 步骤 1：注册和授权

1. 访问 [railway.app](https://railway.app)
2. 使用 GitHub 账号登录
3. 授权 Railway 访问你的仓库

### 步骤 2：创建项目

1. 点击 "New Project"
2. 选择 "Deploy from GitHub"
3. 选择你的仓库
4. 通过 railway.json 配置

创建 `railway.json`：

```json
{
  "build": {
    "builder": "dockerfile"
  },
  "deploy": {
    "numReplicas": 1
  },
  "jobs": {
    "backend": {
      "dockerfile": "backend/Dockerfile"
    },
    "frontend": {
      "dockerfile": "frontend/Dockerfile.prod"
    }
  }
}
```

### 步骤 3：配置环境变量

在 Railway 仪表板中设置：

```
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/YOUR_ID
JWT_SECRET=your-secret-key
DATABASE_URL=sqlite://./data/notifications.db
```

### 步骤 4：部署

```bash
# 推送到 GitHub，Railway 会自动部署
git push origin main
```

访问应用 URL（Railway 会显示）

---

## 方案 C：Vercel + AWS Lambda

### 步骤 1：前端部署到 Vercel

```bash
npm install -g vercel
cd frontend
vercel
```

### 步骤 2：后端部署到 Lambda

使用 Serverless Framework：

```bash
npm install -g serverless
npm install --save-dev serverless-offline serverless-plugin-tracing

# 配置 serverless.yml
# ...

serverless deploy
```

### 步骤 3：连接前后端

在前端设置 Lambda 函数 URL 作为 API 端点

---

## 方案 D：Replit 部署（最简单）

### 步骤 1：导入项目

1. 访问 [replit.com](https://replit.com)
2. 点击 "Create Repl"
3. 选择 "Import from GitHub"
4. 输入你的仓库 URL

### 步骤 2：配置 .replit

```
run = "cd backend && npm install && npm run dev"
```

### 步骤 3：设置环境变量

点击锁图标，添加环境变量：

```
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/YOUR_ID
```

### 步骤 4：运行

点击 "Run" 按钮

Replit 会生成公开 URL

---

## 方案 E：本地运行（开发模式）

### 后端启动

```bash
cd backend

# 安装依赖
npm install

# 创建环境文件
cp .env.example .env

# 编辑 .env，填入飞书 Webhook URL
vim .env

# 启动开发服务器
npm run dev
```

后端运行在 `http://localhost:3000`

### 前端启动（新终端）

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端运行在 `http://localhost:5173`

---

## 常见问题

### Q: 如何获取飞书 Webhook URL？

A: 
1. 登录飞书开发者后台 (https://open.feishu.cn)
2. 创建应用 → 选择机器人
3. 配置权限 (消息发送)
4. 获取 Webhook 地址
5. 填入环境变量

### Q: 如何测试连接？

A:
```bash
# 在前端设置页面点击"测试连接"
# 或使用 curl

curl http://your-server/api/health
```

### Q: 数据存储在哪里？

A: 
- 本地/Docker: SQLite 文件 (`./data/notifications.db`)
- 云端: 根据部署方案而定
- 建议定期备份 SQLite 文件

### Q: 如何升级？

A:
```bash
# 拉取最新代码
git pull origin main

# 重启服务
docker-compose restart

# 或手动重启
npm run build && npm start
```

### Q: 支持 HTTPS 吗？

A: 是的
- Railway/Vercel: 自动提供 HTTPS
- 本地/自建: 配置反向代理 (Nginx) 支持 HTTPS

---

## 生产环境检查清单

- [ ] 设置强 JWT_SECRET
- [ ] 配置 CORS_ORIGIN 为具体域名
- [ ] 启用 HTTPS
- [ ] 配置备份策略
- [ ] 监控日志
- [ ] 设置告警
- [ ] 定期更新依赖
- [ ] 测试灾难恢复

---

## 性能优化

### 数据库优化

```sql
-- 创建索引提高查询速度
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

### 缓存策略

```javascript
// 前端缓存统计数据（10秒）
const CACHE_DURATION = 10000;
```

### 负载均衡

使用多个实例配合负载均衡器

---

## 故障排查

### 1. 连接超时

```bash
# 检查服务器是否运行
docker-compose ps

# 检查日志
docker-compose logs backend
```

### 2. 飞书消息未发送

- 验证 Webhook URL
- 检查网络连接
- 查看后端日志

### 3. 前端无法访问

- 检查前端服务状态
- 查看 VITE_API_URL 配置
- 检查 CORS 设置

---

## 监控和维护

### 日志查看

```bash
# Docker logs
docker-compose logs -f backend
docker-compose logs -f frontend

# 本地运行
tail -f data/logs.log
```

### 性能监控

```javascript
// 在代码中添加性能指标
console.time('api-call');
// ... 代码 ...
console.timeEnd('api-call');
```

### 自动备份

```bash
# 添加定时任务 (crontab)
0 2 * * * /scripts/backup.sh
```

---

## 安全加固

1. **定期更新依赖**
   ```bash
   npm audit fix
   npm update
   ```

2. **配置防火墙**
   ```bash
   # 只允许必要的端口
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw allow 3000
   ```

3. **监控异常请求**
   ```javascript
   // 在中间件中记录可疑活动
   ```

4. **备份敏感数据**
   - 定期备份 SQLite 数据库
   - 保存配置文件副本

---

## 支持

- 文档: 见项目 README
- Issues: GitHub Issues
- 讨论: GitHub Discussions
