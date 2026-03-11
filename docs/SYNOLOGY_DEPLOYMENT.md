# 群晖 NAS Docker 部署指南

**版本：** v1.0.0 | **更新时间：** 2026-03-11

---

## 📋 前置条件

- ✅ 群晖 NAS（DSM 7.2+）
- ✅ 已安装 **Container Manager**（群晖官方应用市场可下载）
- ✅ SSH 终端访问权限（可选但推荐）
- ✅ 飞书机器人 Webhook URL

---

## 🚀 快速部署（3 行命令）

### 1. 准备部署文件

在群晖上创建目录：
```bash
mkdir -p /volume1/docker/feishu-bot
cd /volume1/docker/feishu-bot
```

### 2. 创建配置文件

创建文件 `.env`，复制以下内容：

```env
# 飞书机器人 Webhook URL（必须，从飞书群组 → 机器人 → 获取）
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/你的webhook-id

# JWT 签名密钥（必须，可任意字符串）
JWT_SECRET=your-secret-key-12345

# 前端访问端口（可选，默认 8080）
APP_PORT=8080
```

### 3. 复制 Docker Compose 文件

将项目中的 `docker-compose.synology.yml` 复制到 `/volume1/docker/feishu-bot/`

### 4. 启动应用

```bash
cd /volume1/docker/feishu-bot
docker compose -f docker-compose.synology.yml pull
docker compose -f docker-compose.synology.yml up -d
```

### 5. 验证运行

```bash
docker ps | grep feishu-bot
```

看到两个容器（backend + frontend）说明启动成功 ✅

---

## 🔗 访问应用

打开浏览器：
```
http://你的群晖IP:8080
```

**初始凭证：**
- 用户名：`admin`
- 密码：`admin`
- ⚠️ 首次登录会强制修改密码

---

## 🛠️ 常见问题排查

### Q1: 容器启动失败，显示"镜像拉取失败"
**原因：** GitHub Container Registry 拉取超时或无网络访问

**解决：**
```bash
# 检查网络连接
ping github.com

# 增加拉取超时时间
docker compose -f docker-compose.synology.yml pull --no-parallel
```

### Q2: 后端容器异常退出
**检查日志：**
```bash
docker logs feishu-bot-backend
```

常见原因：
- ❌ `FEISHU_WEBHOOK_URL` 未设置或格式错误
- ❌ `JWT_SECRET` 非 UTF-8 编码
- ❌ `.env` 文件编码不是 UTF-8（群晖建议用 SSH 创建）

**修复：**
```bash
# 删除容器
docker compose -f docker-compose.synology.yml down

# 编辑 .env（用 nano 编辑）
nano .env

# 重新启动
docker compose -f docker-compose.synology.yml up -d
```

### Q3: 访问 `http://IP:8080` 无响应
**检查：**
```bash
# 查看前端容器是否运行
docker ps

# 查看前端日志
docker logs feishu-bot-frontend

# 检查防火墙
# 群晖 → 控制面板 → 安全 → 防火墙 → 开放 8080 端口
```

### Q4: 数据丢失（容器重建后数据消失）
确保配置文件中的 `volumes` 部分正确：
```yaml
volumes:
  feishu-data:
    driver: local
```

这会自动在群晖本地创建数据卷，容器重建时数据安全保存。

---

## 📦 更新版本

收到新版本发布或需要更新时：

```bash
cd /volume1/docker/feishu-bot
docker compose -f docker-compose.synology.yml pull
docker compose -f docker-compose.synology.yml up -d
```

Docker 会自动重新拉取镜像并重启容器。

---

## 🔄 完全重置（如需清空数据）

```bash
# 停止并删除容器和数据
docker compose -f docker-compose.synology.yml down -v

# 删除镜像（可选）
docker rmi ghcr.io/Fuck996/feishu-bot-backend:latest
docker rmi ghcr.io/Fuck996/feishu-bot-frontend:latest

# 重新部署
docker compose -f docker-compose.synology.yml pull
docker compose -f docker-compose.synology.yml up -d
```

---

## 📊 监控和维护

### 查看实时日志
```bash
# 后端日志
docker logs -f feishu-bot-backend

# 前端日志
docker logs -f feishu-bot-frontend

# 合并日志
docker compose -f docker-compose.synology.yml logs -f
```

### 检查资源占用
```bash
docker stats feishu-bot-backend feishu-bot-frontend
```

### 健康检查状态
```bash
docker inspect feishu-bot-backend | grep -A 10 '"Health"'
```

---

## 🔐 安全建议

1. **更改初始密码** - 首次登录立即修改 admin 密码
2. **使用强 JWT 密钥** - 建议 32+ 字符复杂密码
3. **定期备份** - 群晖 NAS 设置中配置自动备份 `/volume1/docker/feishu-bot`
4. **关闭不必要的端口** - 只在群晖防火墙中开放 8080 端口

---

## 📞 故障反馈

如遇到部署问题，请收集以下信息：

```bash
# 1. 系统信息
uname -a

# 2. Docker 版本
docker --version

# 3. 容器状态
docker ps -a

# 4. 错误日志（最近 50 行）
docker logs --tail 50 feishu-bot-backend
docker logs --tail 50 feishu-bot-frontend

# 5. 网络测试
curl -I http://localhost:3000/api/version
```

提供这些信息可以更快诊断问题。

---

## 📚 相关文档

- [项目 GitHub](https://github.com/Fuck996/feishu-bot)
- [集成管理指南](./integration-guide.md)
- [API 文档](./api.md)
