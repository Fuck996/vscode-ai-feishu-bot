# 群晖 Docker 离线部署（网络受限解决方案）

**适用场景**：群晖无法直接访问 GitHub Container Registry（被代理/防火墙拦截）

---

## 方案 A：本地构建 + 群晖加载（推荐）

### 步骤 1：在本地（Windows）构建镜像

在项目根目录执行：

```bash
# 后端镜像
cd backend
docker build -t fuck996/feishu-bot-backend:0.1.0 .
cd ../frontend
docker build -f Dockerfile.prod -t fuck996/feishu-bot-frontend:0.1.0 .
```

### 步骤 2：导出镜像

```bash
# export 为 tar 文件
docker save -o feishu-bot-backend.tar fuck996/feishu-bot-backend:0.1.0
docker save -o feishu-bot-frontend.tar fuck996/feishu-bot-frontend:0.1.0

# 文件大小约 500MB-1GB，可用 U 盘或网络传输到群晖
```

### 步骤 3：在群晖加载镜像

```bash
# SSH 到群晖
cd /volume1/docker/feishu-bot

# 传输 tar 文件到群晖后，执行：
docker load -i feishu-bot-backend.tar
docker load -i feishu-bot-frontend.tar

# 验证
docker images | grep feishu-bot
```

### 步骤 4：修改 compose 文件

编辑 `docker-compose.synology.yml`，改为使用本地镜像：

```yaml
services:
  backend:
    image: fuck996/feishu-bot-backend:0.1.0  # 改为本地镜像名
    # ... 其他配置
  
  frontend:
    image: fuck996/feishu-bot-frontend:0.1.0  # 改为本地镜像名
    # ... 其他配置
```

### 步骤 5：启动应用

```bash
cd /volume1/docker/feishu-bot
docker compose -f docker-compose.synology.yml up -d
```

---

## 方案 B：本地 Dockerfile 直接部署

如果群晖有网络但需要自定义构建：

```bash
# 在群晖上创建文件夹
mkdir -p /volume1/docker/feishu-bot/backend-src
mkdir -p /volume1/docker/feishu-bot/frontend-src

# 将项目代码上传到这两个目录
# 然后在 compose 中使用 build 指令

# docker-compose.synology.yml
services:
  backend:
    build:
      context: ./backend-src
      dockerfile: Dockerfile
    # ... 其他配置
  
  frontend:
    build:
      context: ./frontend-src
      dockerfile: Dockerfile.prod
    # ... 其他配置
```

然后：
```bash
docker compose -f docker-compose.synology.yml up -d --build
```

---

## 方案 C：配置群晖 Docker 代理（如果代理可配置）

群晖控制面板 → 系统设置 → 网络 → HTTP 代理：

- 取消代理勾选，或
- 配置代理不拦截 `*.ghcr.io`

然后重试 `docker compose pull`

---

## 验证成功

```bash
# 查看容器运行状态
docker ps | grep feishu-bot

# 查看后端日志
docker logs feishu-bot-backend

# 测试连接
curl http://localhost:3000/api/version
```

---

## 故障排查

**Q：镜像加载后 size 很小（几 MB），启动报错**
- A：tar 文件可能损坏。需要重新导出

**Q：compose up 后容器立即退出**
- A：查看日志 `docker logs feishu-bot-backend`，检查环境变量或数据卷权限

**Q：传输 tar 文件很慢**
- A：可用 U 盘或群晖 NFS 共享加速
