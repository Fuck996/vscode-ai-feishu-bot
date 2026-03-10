# Docker 部署指南

## 生产部署配置

### 系统架构
```
外部访问 (45173)
    ↓
Nginx (前端容器:3000)
    ├─ 静态文件 (/*)
    └─ API 反向代理 (/api → backend:3000)
    ↓
后端 (内部:3000, 不暴露外部端口)
```

### 启动步骤

#### 1. 环境变量配置
创建 `.env.production` 文件：
```env
FEISHU_WEBHOOK_URL=your_feishu_webhook_url
JWT_SECRET=your_secure_jwt_secret
CORS_ORIGIN=*
```

#### 2. 构建和启动容器
```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

#### 3. 访问应用
- **前端地址**: http://localhost:45173
- **API 基础 URL**: http://localhost:45173/api
  - 版本接口: `GET /api/version`
  - 登录接口: `POST /api/auth/login`
  - 机器人列表: `GET /api/robots`

### 容器网络
- 网络名称: `feishu-net`
- 后端服务地址 (内部): `http://backend:3000`
- 前端 Nginx 地址 (内部): `http://localhost:3000`

### 持久化存储
- 后端数据库: `./backend/data:/app/data`
- 自动备份建议: 定期备份 `backend/data/notifications.db`

### 健康检查
后端服务包含健康检查配置:
- 检查端点: `http://localhost:3000/api/health`
- 检查间隔: 30 秒
- 超时时间: 10 秒

### 环境变量说明

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `FEISHU_WEBHOOK_URL` | 飞书机器人 Webhook URL | 必需 |
| `JWT_SECRET` | JWT 签名密钥 | `change-me-in-production` |
| `CORS_ORIGIN` | CORS 允许来源 | `*` |
| `NODE_ENV` | 环境 | `production` |

### 故障排查

#### 容器启动失败
```bash
# 查看详细日志
docker-compose logs backend
docker-compose logs frontend

# 重新构建镜像
docker-compose build --no-cache
```

#### 端口占用
```bash
# 查看占用进程
netstat -ano | findstr :45173

# 修改端口在 docker-compose.yml
# ports:
#   - "YOUR_PORT:3000"
```

#### 数据库错误
```bash
# 清除数据库并重新初始化
rm backend/data/notifications.db
docker-compose restart backend
```

### 性能优化建议
1. 前端 Nginx 启用 gzip 压缩 (已配置)
2. 后端 Node 使用 pm2 或 supervisor 进程管理
3. 定期清理旧数据库记录
4. 使用专业级数据库替换 JSON 文件存储（生产环境）

### 生产部署最佳实践
1. **使用反向代理** (Nginx/HAProxy): 已通过前端 Nginx 实现
2. **SSL 证书**: 在前端 Nginx 添加 HTTPS 配置
3. **日志收集**: 使用 ELK/Splunk 等日志系统
4. **监控告警**: 配置容器监控和告警规则
5. **备份策略**: 定期备份数据库文件
6. **版本管理**: 保留 docker-compose.yml 的版本控制

### 版本信息
- 前端版本: 1.0.0
- 后端版本: 1.0.0 (通过 `/api/version` 端点获取)
- Docker Compose: v3.8
- Node: 18-alpine
- Nginx: alpine

---

**最后更新**: 2026-03-10
**维护者**: AI Feishu Bot 项目
