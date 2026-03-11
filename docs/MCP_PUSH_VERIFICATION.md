# ✅ MCP 工作汇报推送验证指南

**版本**: v1.0.0  
**日期**: 2026-03-11  
**目的**: 验证 Copilot AI → MCP → 后端 → 飞书 的完整推送链路

---

## 🎯 推送链路架构

```
Copilot Agent
    ↓ （调用 feishu_notify 工具，基于 copilot-instructions.md）
MCP Server (stdio 模式)
    ↓ (生成 webhook 请求)
后端 API: POST /api/webhook/{integrationId}
    ↓ (验证 token，标准化事件)
飞书服务: POST {webhookUrl}
    ↓
📱 飞书群组（收到消息卡片）
```

---

## 📋 快速验证步骤

### 前置条件检查

```
✅ NAS 已部署并启动
✅ 后端 API 可访问（支持 HTTPS）
✅ 已登录应用（admin/admin）
✅ 已创建至少一个机器人
✅ 已添加至少一个集成
✅ 已配置飞书 Webhook URL
```

### 一键验证（推荐）

```powershell
# 修改脚本中的以下配置
cd d:\work\vscode-ai-feishu-bot

# 编辑 testfile/verify-mcp-push.ps1
#   $INTEGRATION_ID = "从系统中获取的集成ID"
#   $WEBHOOK_SECRET = "对应的webhook-secret"
#   $BACKEND_URL = "你的后端地址"

# 运行验证脚本
.\testfile\verify-mcp-push.ps1
```

---

## 🔍 获取集成配置信息（重要！）

推送验证需要以下信息。按以下步骤获取：

### 步骤 1: 获取集成 ID 和 Webhook Secret

#### 方式 A：从前端 UI 获取（推荐）

```
1. 访问 http://你的NAS_IP:45173
2. 登录：admin / admin
3. 左侧导航 → 机器人管理
4. 选择一个机器人 → 点击 🔗 集成 按钮
5. 选择要测试的集成，点击"编辑"或"查看"
6. 在集成详情页找到：
   - 集成 ID: <长 UUID>
   - Webhook Secret: <长随机字符串>
   
7. 复制这两个值到验证脚本
```

#### 方式 B：从 SSH 直接读取（仅 NAS）

```bash
# SSH 连接到 NAS
ssh admin@你的NAS_IP

# 进入应用目录
cd /volume1/docker-app/vscode-ai-feishu-bot

# 查看数据库文件（JSON 格式）
cat backend/data/notifications.db

# 在输出中找到 integrations 段落，获取：
# "id": "xxx"           ← 这是集成 ID
# "webhookSecret": "yyy" ← 这是 webhook secret
```

---

## 🧪 测试场景

### 场景 1: 验证后端 Webhook 接收

**检查内容**: 后端是否正确接收并处理推送

```powershell
# 运行验证脚本的第 5 步
# 脚本会自动发送一条测试推送

# 验证通过标志：
# - 返回 HTTP 200
# - 返回的 JSON 包含 "success": true
# - 包含 notificationId 字段
```

**预期输出**: 
```
✅ 测试推送已发送
   响应代码: HTTP 200
✅ 后端成功处理推送
   通知ID: 123456
```

---

### 场景 2: 验证飞书消息接收

**检查内容**: 飞书是否正确收到并显示消息

```
1. 打开包含机器人的飞书群
2. 查看最新消息（应该看到来自机器人的卡片）
3. 验证内容是否为测试推送内容：
   - 标题: 🧪 MCP 推送验证测试
   - 内容: ✅ 验证 MCP 推送链路
```

**预期结果**:
- ✅ 消息正确显示
- ✅ 消息格式正确（卡片形式）
- ✅ 包含 ✅/🔧/📝 符号格式化

---

### 场景 3: 验证完整的 Copilot 推送

**检查内容**: Copilot 完成任务后是否能自动推送

```
1. 在 Copilot Chat 中输入任务：
   "帮我创建一个简单的 hello-world 函数"

2. 等待 Copilot 完成任务

3. 观察是否有飞书消息推送（通常在任务完成后 2-5 秒）

4. 在飞书群中查看机器人是否发送了工作总结卡片
```

**预期结果**:
- ✅ Copilot 完成后自动发送推送
- ✅ 推送内容符合 ✅/🔧/📝 格式
- ✅ 飞书可立即收到消息

---

## ❌ 常见问题排查

### ❌ "后端连接失败"

**症状**: 连接无法建立

```
验证脚本输出: ❌ 无法连接到后端服务
错误信息: SSL certificate problem (或类似)

可能原因：
1. 后端地址错误
2. 后端服务未启动
3. 防火墙阻止
4. SSL 证书问题
```

**解决方案**:
```bash
# SSH 到 NAS 检查容器状态
ssh admin@你的NAS_IP
cd /volume1/docker-app/vscode-ai-feishu-bot

# 1. 检查容器运行状态
docker-compose -f docker-compose.synology.yml ps

# 预期输出：
# NAME                  STATUS
# feishu-bot-backend    Up

# 2. 如容器已停止，重启
docker-compose -f docker-compose.synology.yml restart backend

# 3. 查看后端日志
docker-compose -f docker-compose.synology.yml logs backend | tail -50

# 4. 确认后端是否监听
docker-compose -f docker-compose.synology.yml exec backend \
  netstat -an | grep 3000 || ss -an | grep 3000
```

---

### ❌ "集成配置错误 / 集成未找到"

**症状**: 验证脚本找不到指定的集成

```
验证脚本输出: ❌ 未找到指定的集成
              集成 ID: xxx-xxx-xxx

可能原因：
1. 集成 ID 错误或复制不完整
2. 集成已被删除
3. 集成属于其他机器人或用户
```

**解决方案**:
```
1. 确保集成 ID 是完整的 UUID（不是截断的）
2. 从应用中重新复制（确认不要手动修改）
3. 检查是否使用了错误的机器人的集成
4. 如不确定，创建一个新的集成来测试
```

---

### ❌ "Webhook 调用失败 / Token 无效"

**症状**: 推送发送失败

```
验证脚本输出: ❌ 测试推送失败
             错误: Unauthorized (401) 或 Forbidden (403)

可能原因：
1. Webhook token 错误或过期
2. 集成已禁用
3. Token 发生变化
```

**解决方案**:
```
1. 从应用中重新获取 webhook secret（可能已改变）
2. 检查集成状态是否为"激活"
3. 尝试重新创建集成获取新的 token
4. 检查后端日志中的详细错误信息

# SSH 查看后端日志
docker-compose logs backend | grep -i "webhook\|token\|unauthorized"
```

---

### ❌ "消息未到达飞书 / 飞书无反应"

**症状**: 推送已发送但飞书群中没有出现

```
验证脚本输出: ✅ 测试推送已发送
             ✅ 后端成功处理推送
（但飞书没有收到）

可能原因：
1. 飞书 Webhook URL 错误或过期
2. 机器人已被删除或禁用
3. 飞书 API 返回错误
4. 网络问题
```

**解决方案**:
```bash
# 1. 检查飞书 Webhook 配置
# 登录应用 → 机器人管理 → 查看 Webhook URL

# 2. 测试飞书 Webhook（从 PowerShell）
$feishuBody = @{
    text = "🧪 测试消息"
} | ConvertTo-Json

Invoke-WebRequest `
  -Uri "https://open.feishu.cn/open-apis/bot/v2/hook/你的webhook-id" `
  -Method POST `
  -ContentType "application/json; charset=utf-8" `
  -Body $feishuBody

# 3. 检查后端飞书调用日志
# SSH 到 NAS
docker-compose logs backend | grep -i "feishu\|push"

# 预期输出：
# [INFO] Sending to Feishu: ...
# [INFO] Feishu response: 200
```

---

### ❌ "Copilot 推送不工作"

**症状**: Copilot 完成任务后没有自动推送

```
可能原因：
1. MCP 未成功连接到 VS Code
2. FEISHU_MCP_TOKEN 环境变量未设置
3. MCP 服务器 URL 不正确
4. 后端 MCP 接口未启动
```

**解决方案**:
```powershell
# 1. 检查环境变量
$env:FEISHU_MCP_TOKEN
# 应该返回一个长字符串，不是空或 null

# 2. 如未设置，需要设置（永久）
[System.Environment]::SetEnvironmentVariable('FEISHU_MCP_TOKEN', '你的token', 'User')

# 3. 重启 VS Code
# Ctrl+Shift+P → Developer: Reload Window

# 4. 检查 MCP 配置
cat .\.vscode\mcp.json | ConvertFrom-Json

# 5. 在 VS Code 中查看 MCP 连接状态
# Ctrl+Shift+P → "MCP" 搜索相关命令（如果有 extension）

# 6. 查看 vs code 的 MCP 日志（开发者工具）
# Help → Toggle Developer Tools → Console 标签
```

---

## 📊 验证清单

| 检查项 | 应检查内容 | 实际状态 | 备注 |
|--------|----------|--------|------|
| **后端连接** | 能访问后端 URL | ✅/❌ | 状态码 ___ |
| **用户认证** | admin/admin 登录成功 | ✅/❌ | 获得有效 token 否 |
| **集成获取** | 能读取集成配置 | ✅/❌ | 集成名称 ___ |
| **Webhook 调用** | 测试推送发送成功 | ✅/❌ | 通知 ID ___ |
| **飞书接收** | 飞书群收到消息 | ✅/❌ | 收到时间 ___ |
| **MCP 配置** | MCP 环境变量已设置 | ✅/❌ | Token 是否存在 |
| **Copilot 推送** | 完成任务后自动推送 | ✅/❌ | 最后一次推送时间 ___ |

---

## 💡 验证成功的标志

✅ **完整的推送链路验证通过**:
1. 后端服务正常运行
2. 集成配置正确加载
3. Webhook endpoint 格式正确
4. 测试推送成功发送
5. 飞书正确接收消息
6. MCP 配置完整
7. Copilot 任务完成自动推送

✅ **飞书消息符合格式**:
- 包含 ✅/🔧/📝 符号
- 标题清晰明确
- 内容格式化为列表项
- 时间戳准确

✅ **系统响应时间合理**:
- 后端响应 < 2 秒
- 飞书接收 < 5 秒
- Copilot 推送 < 10 秒

---

## 🚀 使用验证脚本

### 准备工作

1. **获取必要的信息**
   ```
   □ 后端地址（HTTPS URL）
   □ 集成 ID（从应用复制）
   □ Webhook Secret（从应用复制）
   □ 测试用户名：admin
   □ 测试密码：admin
   ```

2. **修改验证脚本**
   ```powershell
   # 编辑 testfile/verify-mcp-push.ps1
   # 修改顶部配置变量：
   
   $BACKEND_URL = "实际的后端地址"
   $INTEGRATION_ID = "集成ID"
   $WEBHOOK_SECRET = "webhook-secret"
   ```

3. **运行验证**
   ```powershell
   cd d:\work\vscode-ai-feishu-bot
   .\testfile\verify-mcp-push.ps1
   ```

### 验证输出解读

```
✅ 标记 = 检查通过，功能正常
❌ 标记 = 检查失败，需要修复
⚠️  标记 = 警告，可能有问题

脚本会自动提供修复建议
```

---

## 📝 相关文档

- **完整系统设计**: [docs/DESIGN_DOCUMENT.md](../docs/DESIGN_DOCUMENT.md)
- **MCP 实现细节**: [.github/copilot-instructions.md](../.github/copilot-instructions.md)
- **Webhook 实现**: [backend/src/webhook.ts](../backend/src/webhook.ts)
- **飞书集成**: [backend/src/feishu.ts](../backend/src/feishu.ts)

---

## 🆘 需要帮助？

1. **查看详细日志**
   ```bash
   # SSH 到 NAS
   docker-compose -f docker-compose.synology.yml logs backend -f
   ```

2. **重启推送服务**
   ```bash
   docker-compose -f docker-compose.synology.yml restart backend
   ```

3. **重置测试环境**
   ```bash
   # 删除所有测试数据（谨慎使用！）
   rm backend/data/notifications.db
   docker-compose restart backend
   ```

4. **查看完整验证流程**
   - 见本文档的"快速验证步骤"和"验证清单"

---

**祝验证顺利！** 🎉

