# 🐳 容器化部署指南 - Synology NAS 专版

**版本**: v1.1.0  
**更新日期**: 2026-03-11  
**支持系统**: Synology DSM 7.x+

---

## 📋 快速导航

1. **开发环境** - 本地 Docker Compose 测试
2. **生产环境** - 优化的容器配置
3. **Synology 部署** - 完整的群晖指南
4. **故障排除** - 常见问题解决

---

## 🚀 一、本地开发环境

### 1.1 前提条件

```bash
# 系统要求
- Docker Desktop 或 Docker CE >= 20.10
- Docker Compose >= 1.29
- 磁盘空间 >= 1GB
- 内存 >= 2GB

# 验证安装
docker --version
docker-compose --version
```

### 1.2 启动开发环境

```bash
# 克隆项目
git clone <your-repo>
cd vscode-ai-feishu-bot

# 设置环境变量
cp .env.example .env

# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 访问应用
HTTP: http://localhost
HTTPS: https://localhost (自签名证书会被浏览器警告)
```

### 1.3 停止和清理

```bash
# 停止服务
docker-compose stop

# 删除容器（保留数据）
docker-compose down

# 删除容器和数据（完全清理）
docker-compose down -v
```

---

## 🏗️ 二、生产环境配置

### 2.1 安全加固清单

```bash
# 1. 生成强 JWT 密钥
JWT_SECRET=$(openssl rand -base64 32)
echo "JWT_SECRET=$JWT_SECRET" >> .env

# 2. 限制 CORS 源
CORS_ORIGIN=https://yourdomain.com  # 改为实际域名

# 3. 创建 SSL 证书（测试用自签名，生产用 Let's Encrypt）
mkdir -p nginx/certs
cd nginx/certs

# 自签名证书（有效期 365 天）
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/CN=yourdomain.com/O=YourOrg/C=CN"

cd ../..
```

### 2.2 启动生产环境

```bash
# 构建镜像（使用官方镜像加快速度）
docker-compose build --no-cache

# 后台启动
docker-compose up -d

# 验证服务状态
docker-compose ps

# 查看后端日志
docker-compose logs backend

# 健康检查
curl http://localhost/health
```

### 2.3 更新应用

```bash
# 拉取最新代码
git pull origin main

# 重新构建镜像
docker-compose build

# 重启服务
docker-compose up -d

# 验证
docker-compose ps
```

---

## 🔧 三、Synology NAS 部署详细指南

### 3.1 前置准备

#### 步骤 1: 启用 NAS 的 Docker 套件

```
控制面板 → 套件中心
  ↓
搜索 "Docker"
  ↓
安装 Docker
  ↓
启动
```

#### 步骤 2: 创建共享文件夹

```
文件站 → 新增共享文件夹
  
共享文件夹名称: docker-app
位置: /volume1 (选择可用磁盘)
权限: 所有用户读写
描述: Docker 应用存储
```

#### 步骤 3: 获取管理员权限

```
提升 docker 权限
- SSH 连接到 NAS
- 执行: sudo usermod -aG docker $USER
```

### 3.2 上传项目到 NAS

#### 方式 A: 使用 NAS 文件管理器

```
1. 在电脑上打包项目
   tar -czf feishu-bot.tar.gz vscode-ai-feishu-bot/

2. File Station 上传
   /volume1/docker-app/feishu-bot.tar.gz

3. SSH 解压
   ssh admin@192.168.1.100
   cd /volume1/docker-app
   tar -xzf feishu-bot.tar.gz
   cd vscode-ai-feishu-bot
```

#### 方式 B: 使用 Git (推荐)

```bash
# SSH 连接到 NAS
ssh admin@192.168.1.100

# 克隆项目
mkdir -p /volume1/docker-app
cd /volume1/docker-app
git clone https://github.com/yourusername/vscode-ai-feishu-bot.git
cd vscode-ai-feishu-bot

# 配置环境变量
nano .env

# 按以下填充内容（保存：Ctrl+O → Enter → Ctrl+X）:
```

### 3.3 配置 NAS 环境

编辑 `.env` 文件配置:

```bash
# 基础配置
NODE_ENV=production
PORT=3001
JWT_SECRET=$(openssl rand -base64 32)  # 生成强密钥
CORS_ORIGIN=https://192.168.1.100:443,https://yourdomain.com
DATABASE_PATH=/app/data/notifications.db
LOG_LEVEL=info

# NAS 特定
NAS_HOSTNAME=192.168.1.100
BACKUP_PATH=/volume1/backup/feishu-bot
```

### 3.4 生成 SSL 证书 (可选但推荐)

#### 选项 1: Synology 内置证书 (推荐)

```
控制面板 → 安全 → 证书
  ↓
new → 导入证书 (如果有)
或
新增 → 自签名证书
  
Common Name: 192.168.1.100 (或 yourdomain.com)
Days: 365
```

然后复制到项目:

```bash
# SSH 连接
ssh admin@192.168.1.100

# 复制证书
sudo cp /usr/syno/etc/ssl/ssl_cert/* /volume1/docker-app/feishu-bot/nginx/certs/

# 修复权限
sudo chown -R nobody:root /volume1/docker-app/feishu-bot/nginx/certs/
sudo chmod 600 /volume1/docker-app/feishu-bot/nginx/certs/key.pem
```

#### 选项 2: Let's Encrypt (需要域名)

```bash
# 安装 certbot
docker run --rm -it \
  -v /volume1/docker-app/feishu-bot/nginx/certs:/etc/letsencrypt \
  certbot/certbot certonly --standalone \
  -d yourdomain.com \
  --email your-email@example.com

# 证书位置
/etc/letsencrypt/live/yourdomain.com/
  ├── cert.pem
  ├── key.pem
  └── ...
```

### 3.5 启动应用

```bash
# SSH 连接到 NAS
ssh admin@192.168.1.100

# 进入项目目录
cd /volume1/docker-app/feishu-bot

# 启动 Docker Compose
docker-compose up -d

# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx
```

### 3.6 配置 NAS 防火墙

```
控制面板 → 安全 → 防火墙
  ↓
新增规则:
  
规则名: feishu-bot-http
操作: 允许
协议: TCP
端口: 80
  
规则名: feishu-bot-https
操作: 允许
协议: TCP
端口: 443
```

### 3.7 访问应用

```
本地访问:
  HTTP:  http://192.168.1.100
  HTTPS: https://192.168.1.100 (浏览器可能警告自签名证书)

远程访问 (需要配置动态DNS):
  HTTPS: https://yourdomain.com
```

### 3.8 数据备份

#### 自动备份(推荐)

```
控制面板 → 定时任务 → 新增
  
任务类型: 系统脚本
任务名: feishu-bot-backup
计划: 每天 02:00
  
脚本:
#!/bin/bash
BACKUP_DIR=/volume1/backup/feishu-bot
BACKUP_DATE=$(date +%Y%m%d)
mkdir -p "$BACKUP_DIR"

# 备份数据库
docker cp feishu-bot-backend:/app/data/notifications.db \
  "$BACKUP_DIR/notifications_$BACKUP_DATE.db"

# 保留最近 7 天的备份
find "$BACKUP_DIR" -name "*.db" -mtime +7 -delete
```

#### 手动备份

```bash
# SSH 连接
ssh admin@192.168.1.100

# 创建备份目录
mkdir -p /volume1/backup/feishu-bot

# 备份数据库
docker cp feishu-bot-backend:/app/data/notifications.db \
  /volume1/backup/feishu-bot/notifications_$(date +%Y%m%d_%H%M%S).db

# 传回本地
scp -r admin@192.168.1.100:/volume1/backup/feishu-bot ~/backups/
```

---

## 🔍 四、监控和维护

### 4.1 查看容器资源使用

```bash
# 实时监控
docker stats

# 容器日志
docker-compose logs backend -f

# 系统信息
docker-compose exec backend df -h /app/data
docker-compose exec backend du -sh /app/data
```

### 4.2 数据库管理

```bash
# 查看数据库大小
docker-compose exec backend wc -l /app/data/notifications.db

# 备份数据库
docker-compose exec backend cp /app/data/notifications.db \
  /app/data/notifications_backup.db

# 导出为 JSON
docker-compose exec backend cat /app/data/notifications.db > backup.json
```

### 4.3 更新应用

```bash
# 更新代码
git pull origin main

# 重新构建镜像
docker-compose build --no-cache

# 重启服务
docker-compose down
docker-compose up -d

# 验证
docker-compose ps
curl http://localhost/health
```

### 4.4 常见运维命令

```bash
# 清理无用镜像（谨慎）
docker system prune -a

# 查看网络
docker network ls
docker network inspect feishu-net

# 进入容器调试
docker-compose exec backend sh
docker-compose exec backend npm run dev

# 重启单个服务
docker-compose restart backend
```

---

## ⚠️ 五、故障排除

### 问题 1: 无法访问应用

```bash
# 检查容器是否运行
docker-compose ps

# 查看日志
docker-compose logs backend
docker-compose logs nginx

# 检查端口是否被占用
netstat -tulpn | grep LISTEN

# 重启服务
docker-compose down
docker-compose up -d
```

### 问题 2: 数据库写入失败

```bash
# 检查磁盘空间
df -h /volume1

# 检查文件权限
ls -la /volume1/docker-app/feishu-bot/backend/data/

# 修复权限
docker-compose exec backend chmod 777 /app/data
```

### 问题 3: SSL 证书过期

```bash
# 检查证书有效期
openssl x509 -in nginx/certs/cert.pem -text -noout | grep "Not After"

# 更新证书（Let's Encrypt）
docker run --rm -it \
  -v /volume1/docker-app/feishu-bot/nginx/certs:/etc/letsencrypt \
  certbot/certbot renew

# 重启 Nginx
docker-compose restart nginx
```

### 问题 4: 前端白屏

```bash
# 检查 API 是否可用
curl http://localhost/api/version

# 查看前端日志
docker-compose logs frontend

# 检查 API 地址配置
docker-compose exec frontend env | grep VITE_API_URL
```

---

## 🚀 六、我能否帮你直接部署到 NAS?

### ❌ 我不能直接部署

**原因**:
1. 我无法直接访问你的 NAS 系统
2. 你的 NAS 在内网，我无法建立网络连接
3. NAS 上没有我可以使用的远程执行环境

### ✅ 我可以提供的支持

1. **完整的部署脚本** ✓  
   我已为你准备了所有配置文件

2. **一键启动脚本** (可选)  
   我可以编写 bash/powershell 脚本自动化部署

3. **远程指导** ✓  
   提供详细的故障排除建议

4. **自动化工具** ✓  
   配置监控和备份脚本

### 📋 部署清单

使用以下步骤在你的 NAS 上独立完成部署：

- [ ] SSH 连接到 NAS (管理员账号)
- [ ] 上传项目文件到 `/volume1/docker-app`
- [ ] 配置 `.env` 文件
- [ ] 运行 `docker-compose up -d`
- [ ] 访问 `https://192.168.1.100` 验证
- [ ] 配置备份任务

### 🆘 需要帮助时

如果部署期间遇到问题，请提供：

1. **错误日志**
   ```bash
   docker-compose logs backend > error.log
   ```

2. **系统信息**
   ```bash
   docker ps
   docker-compose ps
   df -h
   free -m
   ```

3. **具体错误信息**
   - 完整的错误文本
   - 执行的命令
   - 预期结果 vs 实际结果

我会根据你提供的信息帮助排查问题。

---

## 📞 支持和反馈

遇到问题？

1. 检查上面的"故障排除"部分
2. 查看 [SECURITY_AUDIT.md](SECURITY_AUDIT.md) 了解安全配置
3. 提交 GitHub Issues 描述问题

---

## 📚 参考链接

- [Docker 官方文档](https://docs.docker.com/)
- [Synology Docker 指南](https://kb.synology.com/en-us/DSM/help/Docker)
- [Nginx 官方文档](https://nginx.org/en/docs/)
- [Let's Encrypt 申请指南](https://letsencrypt.org/)

**祝部署顺利！** 🎉
