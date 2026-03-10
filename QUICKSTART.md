# 快速开始 - 5分钟上手

## 📋 前置检查

- [ ] 已安装 Node.js 16+
- [ ] 已安装 npm
- [ ] 已克隆项目到本地
- [ ] 有飞书账号和群组

---

## 🚀 本地启动 (2分钟)

### Windows 用户

```powershell
# 进入项目文件夹
cd vscode-ai-feishu-bot

# 运行启动脚本
.\scripts\start.ps1
```

### Mac/Linux 用户

```bash
cd vscode-ai-feishu-bot
bash scripts/start.sh
```

**预期输出：**
```
✓ Node.js 版本检查通过
✓ 后端依赖安装中...
✓ 前端依赖安装中...
✓ 后端已启动: http://localhost:3000
✓ 前端已启动: http://localhost:5173
```

---

## 🔑 飞书配置 (2分钟)

### 第1步：获取 Webhook URL

打开飞书 → 群组 → 群名称 → 应用 → 添加应用

搜索"自定义机器人"，添加后复制 Webhook URL：
```
https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxx...
```

### 第2步：填入项目配置

编辑 `backend/.env`：

```env
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/YOUR_URL_HERE
```

重启后端：
```powershell
# Windows: 停止旧进程，重新运行
.\scripts\start.ps1

# Linux/Mac: 停止后端 (Ctrl+C)，重新启动
npm run dev  # 在 backend 文件夹中
```

---

## ✅ 测试通知 (1分钟)

### 快速测试

在 PowerShell 中运行：

```powershell
curl -X POST http://localhost:3000/api/webhooks/test
```

**检查结果：**
- [ ] PowerShell 返回 `"success":true`
- [ ] 飞书群组收到 "🧪 Webhook 测试" 消息

如果没有收到，见本文档末尾的"故障排查"。

---

## 🎯 三种快速使用方式

### 方式 1️⃣: VSCode 扩展 (最简单 ⭐⭐⭐⭐⭐)

1. 打开 VSCode → Ctrl+, (设置)
2. 搜索 "feishu-notifier"
3. 填入 `http://localhost:3000`

使用：
```
Ctrl + Shift + F  → 输入标题和摘要 → 一键发送
```

### 方式 2️⃣: 命令行脚本 (灵活)

```bash
# 进入项目，运行通知脚本
curl -X POST http://localhost:3000/api/notify \
  -H "Content-Type: application/json" \
  -d '{"title":"部署完成","status":"success"}'
```

### 方式 3️⃣: 代码集成 (推荐用于自动化)

**Python：**
```python
from feishu_notifier import FeishuNotifier

notifier = FeishuNotifier(server_url="http://localhost:3000")
notifier.notifyDeployResult(
    project="my-ai-project",
    version="1.0.0",
    status="success"
)
```

**TypeScript/Node.js：**
```typescript
import { FeishuNotifier } from 'feishu-notifier';

const notifier = new FeishuNotifier({
  serverUrl: "http://localhost:3000"
});

await notifier.notifyDeployResult({
  project: "my-ai-project",
  status: "success"
});
```

---

## 📊 功能验证

### 后端健康检查

```powershell
curl http://localhost:3000/api/health
```

预期：`{"status":"ok"}`

### 前端仪表板

打开浏览器访问：
```
http://localhost:5173
```

应该看到：
- 📊 Dashboard 页面 - 显示统计数据
- 📜 History 页面 - 历史通知列表
- ⚙️ Settings 页面 - 服务器配置

### 获取通知历史

```powershell
curl http://localhost:3000/api/notifications
```

预期返回：之前发送的所有通知

---

## 🌐 跨项目使用

完成本地测试后，可在其他项目中使用：

### 其他 Node.js 项目

```bash
cd my-other-project
npm install feishu-notifier

# 在你的脚本中
node -e "
const {FeishuNotifier} = require('feishu-notifier');
const n = new FeishuNotifier({serverUrl: 'http://localhost:3000'});
n.notify({title: 'Test', summary: 'From other project'});
"
```

### 其他 Python 项目

```bash
pip install feishu-notifier

# 在你的脚本中
python -c "
from feishu_notifier import FeishuNotifier
n = FeishuNotifier(server_url='http://localhost:3000')
n.notify(title='Test', summary='From Python project')
"
```

### GitHub Actions

```yaml
- name: Notify Feishu
  run: |
    curl -X POST http://YOUR_SERVER/api/notify \
      -H 'Content-Type: application/json' \
      -d '{"title":"${{ job.status }}","action":"ci"}'
```

详见: [LOCAL_DEPLOYMENT_GUIDE.md](LOCAL_DEPLOYMENT_GUIDE.md) - 第 4 步

---

## 🆘 故障排查

### ❌ "Connection refused" 错误

**原因：** 后端未运行

**解决：**
```powershell
# 确保后端进程正在运行
Get-Process node  # 查看是否有 node 进程

# 如果没有，重新启动
.\scripts\start.ps1
```

### ❌ 飞书没收到通知

**原因：** Webhook URL 错误

**解决：**
```powershell
# 检查 .env 文件中的 URL
type backend\.env | findstr FEISHU

# 应该看到完整的 URL
# 如果为空或错误，编辑文件并重启后端
```

### ❌ 前端无法连接后端

**原因：** CORS 或服务器地址错误

**解决：**
```powershell
# 确保后端运行在 localhost:3000
curl http://localhost:3000/api/health

# VSCode 设置中使用正确的地址
# "feishu-notifier.serverUrl": "http://localhost:3000"
```

### ❌ VSCode 扩展不工作

**原因：** 扩展未安装或配置错误

**解决：**
1. 检查 VSCode 扩展市场是否已安装 "Feishu AI Notifier"
2. 重启 VSCode
3. 检查设置中是否填入了 serverUrl
4. 确保后端运行中

---

## 📚 更多文档

| 文档 | 用途 |
|------|------|
| [FEISHU_SETUP_GUIDE.md](FEISHU_SETUP_GUIDE.md) | 飞书配置详细指南 |
| [LOCAL_DEPLOYMENT_GUIDE.md](LOCAL_DEPLOYMENT_GUIDE.md) | 本地部署和跨项目集成 |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | 5 种生产部署方案 |
| [docs/api.md](docs/api.md) | REST API 完整参考 |
| [docs/integration-guide.md](docs/integration-guide.md) | 7 种集成方式 |

---

## ✨ 下一步建议

### 本地测试完成后：

1. **选择部署方案**
   - Docker Compose (推荐)
   - Railway (简单云部署)
   - Vercel + Lambda (无服务器)
   - 见: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

2. **集成到你的项目**
   - VSCode 快捷键 (最简单)
   - Python/Node.js SDK (灵活)
   - GitHub Actions (自动化)
   - 见: [LOCAL_DEPLOYMENT_GUIDE.md](LOCAL_DEPLOYMENT_GUIDE.md) - 第 4 步

3. **分享给团队**
   - 部署到生产服务器
   - 每个人在 VSCode 中配置 serverUrl
   - 共享使用快捷键

---

## 🎉 成功标志

✅ 后端运行无错误
✅ 前端可访问
✅ 测试通知已送达飞书
✅ VSCode 快捷键可用
✅ 其他项目可成功调用

**恭喜！你已完成所有配置！** 🚀
