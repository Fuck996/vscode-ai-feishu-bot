# Docker Compose 快速部署指南

**版本：** v1.0.0 | **更新时间：** 2026-03-11 14:30:00 | **内容：** 简化的容器化部署

> 本文档说明如何使用 Docker Compose 在本地或 NAS 上快速启动项目。

---

## 🚀 快速开始

### 前置要求
- Docker & Docker Compose 已安装
- `.env` 文件已配置（参考 `.env.example`）

### 启动
```bash
docker-compose up -d
```

**服务地址**：
- 🖥️ **前端**：http://localhost:5173
- 🔌 **后端 API**：http://localhost:3000/api
- 📊 **后端版本**：http://localhost:3000/api/version

### 停止
```bash
docker-compose down
```

### 查看日志
```bash
docker-compose logs -f backend     # 后端日志
docker-compose logs -f frontend    # 前端日志
```

---

## 📋 服务架构

```
User Reverse Proxy (your own)
  ↓
  Docker Host (your machine / NAS)
  ├─ Backend (port 3000)
  └─ Frontend (port 5173)
    ├─ Internal Nginx
    └─ Proxy to Backend (http://backend:3000)
```

### 为什么移除独立 Nginx 容器？

| 方案 | Nginx 容器 | 用户反代 |
|------|----------|---------|
| ❌ 之前 | ✓ 复杂，添加资源占用 | ✗ 需支持 HTTPS 模板 |
| ✅ 现在 | ✗ 前端自带转发 | ✓ 你已有反代服务 |

**简化优势**：
- 减少容器数量 → 降低 NAS 资源占用
- 移除 44 行配置
- 前端自带的 Nginx 已足够处理 API 转发
- 符合你的部署现实：国内 IP 的 80/443 被屏蔽，需自己的反代

---

## 🔧 环境配置

### 必填项
```bash
# .env 文件

# 后端访问地址（用于 MCP 生成 webhook endpoint）
# 开发: http://localhost:3000
# 生产: 你的反代 URL (如 https://yourdomain.com)
BACKEND_URL=http://localhost:3000

# 飞书相关
JWT_SECRET=your-strong-secret-here
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/...
```

### 可选项
```bash
NODE_ENV=production
PORT=3000
CORS_ORIGIN=*
LOG_LEVEL=info
```

---

## 🌐 生产部署（使用反代）

前端和后端都只需暴露给你的反代即可。反代负责：

1. **HTTPS 终止** → SSL/TLS 加密
2. **请求转发**：
   - `yourdomain.com/api/*` → `http://localhost:3000`
   - `yourdomain.com/*` → `http://localhost:5173`
3. **速率限制** → 在反代层实现

**配置示例（Nginx）**：
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    # 后端 API
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_http_version 1.1;
    }
    
    # 前端
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 📊 资源限制（NAS 优化）

```yaml
# docker-compose.yml 中已配置
backend:
  deploy:
    resources:
      limits:
        memory: 512M
        cpus: '0.5'

frontend:
  deploy:
    resources:
      limits:
        memory: 256M
        cpus: '0.25'
```

适用于 Synology NAS 等资源受限环境。可在 `.env` 中覆盖。

---

## 🐛 故障排除

### 前端无法访问后端

**症状**：登录页报 CORS 错误或 Network Error

**原因**：前端的 Nginx 转发失败

**检查**：
```bash
# 进入前端容器
docker exec -it feishu-bot-frontend /bin/sh

# 测试后端连接
wget http://backend:3000/api/version
```

**解决**：确保 `.env` 中的 BACKEND_URL 正确设置

### 后端无法启动

```bash
docker-compose logs backend | head -50
```

常见原因：
- JWT_SECRET 未设置
- 数据文件夹权限问题（`./data` 需要写入权限）

### 端口已被占用

```bash
# macOS/Linux
lsof -i :5173
lsof -i :3000

# Windows
netstat -ano | findstr :5173
```

---

## 💾 数据持久化

```yaml
volumes:
  backend-data:
    driver: local
```

- 数据保存在 Docker 卷 `backend-data`（通常在 `/var/lib/docker/volumes`）
- 容器删除后数据保留
- NAS 部署时可映射到 NAS 共享文件夹

---

## 🔐 安全检查清单

- [ ] JWT_SECRET 已改为强密码（50+ 字符）
- [ ] BACKEND_URL 指向正确的外部地址
- [ ] 反代已启用 HTTPS（SSL/TLS）
- [ ] CORS_ORIGIN 限制为具体域名（生产环境）
- [ ] 防火墙只放通反代的入站流量

---

## 📚 相关文档

- [完整设计文档](docs/DESIGN_DOCUMENT.md)
- [安全审查](SECURITY_AUDIT.md)
- [Synology NAS 部署指南](NAS_DEPLOYMENT_GUIDE.md)
