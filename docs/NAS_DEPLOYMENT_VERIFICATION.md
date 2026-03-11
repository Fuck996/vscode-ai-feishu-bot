# ✅ NAS 部署验证清单

**版本**: v1.0.0  
**日期**: 2026-03-11  
**用途**: 验证 Synology NAS 部署是否正常运行

---

## 📋 快速验证步骤

### 方案 A：使用自动化验证脚本（推荐）✨

```powershell
# 在你的本地 Windows 机器上运行（不是 NAS）
cd d:\work\vscode-ai-feishu-bot
.\testfile\verify-nas-deployment.ps1

# 需要修改前 3 个变量：
#   $NAS_IP = "你的NAS内网IP"              # 例如: 192.168.1.100
#   $APP_PORT = "应用端口"                # 默认: 45173
#   $BACKEND_PORT = "后端端口"             # 默认: 3000
```

**预期输出**：✅ 所有验证通过

---

### 方案 B：手动验证步骤

#### 1️⃣ **检查容器运行状态** (在 NAS 上执行)

```bash
# SSH 登录 NAS
ssh admin@192.168.1.100

# 进入部署目录
cd /volume1/docker-app/vscode-ai-feishu-bot

# 查看容器状态
docker-compose -f docker-compose.synology.yml ps

# 预期输出：
# NAME                  STATUS
# feishu-bot-backend    Up (healthy)
# feishu-bot-frontend   Up
```

**✅ 通过标准**：所有容器状态为 `Up`

---

#### 2️⃣ **检查后端日志** (查看是否有错误)

```bash
# 查看实时日志
docker-compose -f docker-compose.synology.yml logs -f backend

# 预期输出样本：
# backend | [INFO] Server running on http://0.0.0.0:3000
# backend | [INFO] Database connection established
# backend | [INFO] All routes initialized
```

**✅ 通过标准**：
- 没有红色错误信息
- 看到 `Server running` 消息
- 看到 `Database connection` 消息

---

#### 3️⃣ **检查网络连接**

```bash
# 从本地 Windows 机器测试（PowerShell）
Test-Connection -ComputerName 192.168.1.100 -Count 1

# 预期：获得延迟时间，不报错
```

**✅ 通过标准**：ping 通畅，延迟 < 100ms

---

#### 4️⃣ **测试前端页面访问**

```
使用浏览器访问：
http://192.168.1.100:45173

（如改过端口，替换 45173 为你设置的端口）
```

**✅ 通过标准**：
- 页面正常加载（不是空白）
- 看到登录表单
- 能正常输入用户名/密码

---

#### 5️⃣ **测试登录功能**

```
填入默认凭证：
  用户名: admin
  密码: admin

点击登录
```

**✅ 通过标准**：
- 成功进入 Dashboard
- 看到"机器人列表"页面
- 右上角显示用户名 "admin"

---

#### 6️⃣ **测试 API 端点** (从本地 Windows 执行)

```powershell
# 测试登录 API
$uri = "http://192.168.1.100:45173/api/auth/login"
$body = @{
    username = "admin"
    password = "admin"
} | ConvertTo-Json

Invoke-WebRequest -Uri $uri -Method POST -Body $body -ContentType "application/json"

# 预期响应：
# StatusCode: 200
# json 包含 token 字段
```

**✅ 通过标准**：HTTP 200 + 返回有效 token

---

#### 7️⃣ **检查数据库**

```bash
# SSH 进入 NAS
ssh admin@192.168.1.100

# 检查数据库文件
ls -la /volume1/docker-app/vscode-ai-feishu-bot/backend/data/

# 预期输出：
# notifications.db   (> 1KB 文件大小)
```

**✅ 通过标准**：
- `notifications.db` 文件存在
- 文件大小 > 1KB

---

#### 8️⃣ **检查环境变量配置**

```bash
# SSH 进入 NAS
ssh admin@192.168.1.100

cd /volume1/docker-app/vscode-ai-feishu-bot

# 查看 .env 文件
cat .env

# 检查以下字段是否存在：
# PORT=3001 或 PORT=3000
# NODE_ENV=production
# JWT_SECRET=<有值>
# DATABASE_PATH=/app/data/notifications.db
# LOG_LEVEL=info
```

**✅ 通过标准**：
- JWT_SECRET 已设置（不是默认值）
- FEISHU_WEBHOOK_URL 已配置（如需飞书集成）
- 其他关键环境变量已填充

---

## 🔧 常见问题排查

### ❌ "无法连接到 http://192.168.1.100:45173"

**可能原因和解决方案**：

```bash
# 1. 检查容器是否运行
docker-compose -f docker-compose.synology.yml ps

# 2. 检查端口是否正确
# 编辑 .env，确认 APP_PORT=45173（如果修改过）

# 3. 防火墙阻止？
# NAS 侧防火墙规则 → 允许端口 45173

# 4. 重启容器
docker-compose -f docker-compose.synology.yml restart frontend

# 5. 查看前端日志
docker-compose -f docker-compose.synology.yml logs frontend
```

---

### ❌ "登录失败 / 密码错误"

**可能原因和解决方案**：

```bash
# 1. 检查默认账号是否已修改
# 默认账号应该是 admin/admin

# 2. 如已修改，使用修改后的凭证登录

# 3. 重置密码（删除数据库重新初始化）
rm backend/data/notifications.db
docker-compose -f docker-compose.synology.yml down
docker-compose -f docker-compose.synology.yml up -d
# 等待 30 秒后，数据库自动初始化，使用 admin/admin 登录
```

---

### ❌ "后端 API 返回 503 / 500 错误"

**可能原因和解决方案**：

```bash
# 1. 查看详细错误日志
docker-compose -f docker-compose.synology.yml logs backend

# 2. 检查数据库是否损坏
ls -l backend/data/notifications.db

# 3. 如数据库损坏，删除重建
rm backend/data/notifications.db
docker-compose -f docker-compose.synology.yml restart backend

# 4. 检查数据库路径权限
docker-compose -f docker-compose.synology.yml exec backend \
  ls -la /app/data/
```

---

### ❌ "中文乱码 / 飞书消息显示错误"

**可能原因和解决方案**：

```bash
# 检查 UTF-8 编码设置
docker-compose -f docker-compose.synology.yml logs backend | head -20

# 如已在后端配置（已修复），应该显示中文正确

# 如仍有问题，查看：
# - docs/ENCODING_FIX_REPORT.md
# - backend 的 locale 环境变量
```

---

## 📊 验证结果记录表

| 检查项 | 应检查内容 | 实际状态 | 备注 |
|--------|-----------|--------|------|
| **网络连接** | NAS 可 ping | ✅/❌ | 延迟 ___ ms |
| **前端访问** | 浏览器 http://IP:PORT | ✅/❌ | 页面是否正常加载 |
| **登录测试** | admin / admin | ✅/❌ | 是否进入 Dashboard |
| **后端 API** | GET /api/health | ✅/❌ | HTTP 状态码 ___ |
| **用户信息** | GET /api/users/me | ✅/❌ | 返回用户名 ___ |
| **机器人列表** | GET /api/robots | ✅/❌ | 机器人数量 ___ |
| **数据库** | notifications.db 存在 | ✅/❌ | 文件大小 ___ KB |
| **环境变量** | JWT_SECRET 已设置 | ✅/❌ | 是否加密 |
| **容器状态** | docker-compose ps | ✅/❌ | 所有容器 Up 否 |
| **日志检查** | 后端无错误日志 | ✅/❌ | 是否有红色错误 |

---

## ✨ 完整验证命令集合 (NAS 侧 SSH 执行)

```bash
# 一键获取完整状态
cd /volume1/docker-app/vscode-ai-feishu-bot

echo "=== 1. 容器状态 ==="
docker-compose -f docker-compose.synology.yml ps

echo -e "\n=== 2. 后端健康日志 ==="
docker-compose -f docker-compose.synology.yml logs backend | tail -20

echo -e "\n=== 3. 数据库检查 ==="
ls -lh backend/data/notifications.db

echo -e "\n=== 4. 环境变量检查 ==="
grep -E "JWT_SECRET|NODE_ENV|FEISHU" .env || echo "未配置"

echo -e "\n=== 5. 网络配置 ==="
docker-compose -f docker-compose.synology.yml config | grep -A 5 "ports:"

echo -e "\n=== 6. 磁盘空间 ==="
df -h /volume1 | head -2

echo -e "\n=== 7. 内存使用 ==="
free -h 2>/dev/null || vm_stat | head -5

echo "✅ 检查完成"
```

---

## 🎯 常见检查结果解读

### ✅ "所有容器都是 Up"
→ 应用已正常启动

### ⚠️ "容器状态为 Exited"
→ 容器异常退出，查看日志找原因

### ✅ "HTTP 200 + 返回 token"
→ 后端 API 正常工作

### ❌ "HTTP 401 / 403"
→ 认证失败，检查凭证

### ✅ "日志显示中文内容"
→ UTF-8 编码配置正确

### ⚠️ "日志中大量 [WARN]"
→ 可能有配置问题，但不影响使用

---

## 🚀 下一步

验证完成后，可以执行：

1. **关闭本地服务器**
   ```bash
   # 在本地 Windows 或其他本地终端
   docker-compose down
   # 或直接关闭 Docker Desktop
   ```

2. **配置飞书机器人**
   - 进入 NAS 上的应用
   - Dashboard → 机器人管理 → 创建新机器人
   - 添加飞书 Webhook URL

3. **设置集成和触发规则**
   - 点击机器人的 "🔗 集成" 按钮
   - 选择集成类型（Jenkins、GitHub、自定义等）
   - 配置触发事件规则

4. **定期备份**
   ```bash
   # 每周备份一次数据库
   cp backend/data/notifications.db /volume1/backup/notifications.db.$(date +%Y%m%d)
   ```

---

## 📞 需要帮助？

- 查看完整文档：`docs/SYNOLOGY_DEPLOYMENT.md`
- 查看 API 文档：`docs/DESIGN_DOCUMENT.md`
- 查看编码问题：`docs/ENCODING_FIX_REPORT.md`
- 联系支持或提交 Issue

