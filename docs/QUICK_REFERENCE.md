# 快速开始 - Phase 1 完成后

## 🚀 启动应用

### 1. 启动后端
```bash
cd backend
npm install    # 首次仅需 (已安装 jsonwebtoken, bcrypt)
npm run dev    # 监听 http://localhost:3000
```

### 2. 启动前端 (新终端)
```bash
cd frontend
npm install    # 首次仅需
npm run dev    # 监听 http://localhost:5176
```

### 3. 浏览器访问
打开浏览器访问: **http://localhost:5176**

---

## 🔐 登录凭证

**首次登录 (强制改密)**
- 用户名: `admin`
- 密码: `admin`
- 登录后会跳转到强制改密页面

**新密码要求** (必须满足全部)
- ✓ 8-20 字符
- ✓ 包含小写字母 (a-z)
- ✓ 包含数字 (0-9)
- ✓ 包含特殊字符 (!@#$%^&*)

**示例新密码**: `NewPass@123`

---

## 📊 使用流程

### 登录流程
```
1. 访问 http://localhost:5176
   ↓ (自动重定向)
2. 进入登录页面 (/login)
   输入: admin / admin
   ↓
3. 验证成功 → 跳转到强制改密页面
   ↓
4. 输入新密码并确认
   ↓
5. 成功 → 跳转到仪表板 (/dashboard)
```

### 仪表板导航
登录成功后，顶部导航栏显示:
- **仪表板** - 统计信息 (总通知数、成功/错误/警告/信息统计)
- **🤖 机器人** - 管理飞书机器人 (测试连接、删除)
- **历史** - 查看通知历史记录
- **设置** - 应用设置
- **退出登录** - 注销并返回登录页面

---

## 🤖 机器人管理页面

### 功能说明

#### ✓ 测试连接按钮
- 发送测试通知到飞书 Webhook
- 需要先在飞书创建机器人并获取 Webhook URL
- 仅在机器人状态为"活跃"时可用

#### ✗ 删除按钮
- 删除机器人实例 (有确认对话框)
- 删除后无法恢复

#### [+ 新建机器人]
- 创建新的机器人 (TODO: Phase 2 实现)

---

## 🔧 开发相关

### 项目结构
```
vscode-ai-feishu-bot/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts          # 认证 API
│   │   │   ├── robots.ts        # 机器人管理 API
│   │   │   └── webhook.ts       # 飞书 Webhook 处理
│   │   ├── database.ts          # 数据库服务
│   │   ├── server.ts            # Express 服务器
│   │   └── config.ts            # 配置文件
│   ├── data/
│   │   └── notifications.db     # JSON 数据库
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── ForceChangePassword.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Robots.tsx
│   │   │   ├── History.tsx
│   │   │   └── Settings.tsx
│   │   ├── services/
│   │   │   └── auth.ts          # 认证 API 客户端
│   │   ├── utils/
│   │   │   └── validation.ts    # 密码验证工具
│   │   ├── styles/
│   │   │   └── auth.css         # 认证页面样式
│   │   ├── App.tsx              # 路由配置
│   │   └── main.tsx
│   └── package.json
│
└── docs/
    ├── DESIGN_DOCUMENT.md        # 设计规范
    ├── PHASE1_AUTH_STATUS.md     # 详细状态报告
    └── PHASE1_COMPLETION_SUMMARY.md  # 完成总结
```

### 编译和构建

**后端编译:**
```bash
cd backend
npm run build    # 输出到 dist/
npm start        # 运行编译后的版本
```

**前端编译:**
```bash
cd frontend
npm run build    # 输出到 dist/
npm run preview  # 本地预览
```

### 环境变量

**后端 (.env或环境变量)**
```
PORT=3000
HOST=localhost
NODE_ENV=development
JWT_SECRET=dev-secret-key
DATABASE_PATH=./data/notifications.db
CORS_ORIGIN=*
FEISHU_WEBHOOK_URL=https://open.feishu.cn/...
```

**前端 (frontend/.env.local)**
```
VITE_API_URL=http://localhost:3000
```

### API 测试

**使用 PowerShell 测试登录:**
```powershell
$body = @{
    username = 'admin'
    password = 'admin'
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri 'http://localhost:3000/api/auth/login' `
    -Method Post -Body $body -ContentType 'application/json' -UseBasicParsing

$response.Content | ConvertFrom-Json | ConvertTo-Json
```

**使用 cURL 测试:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

---

## 🐛 常见问题排查

### 问题1: 端口已被占用
**症状**: `Error: listen EADDRINUSE: address already in use ::1:3000`

**解决**:
```bash
# 杀死占用 3000 端口的进程
netstat -ano | findstr ":3000"
taskkill /PID <PID> /F

# 或改变端口
PORT=3001 npm run dev
```

### 问题2: 前端连接不上后端
**症状**: 登录提交无响应或报网络错误

**检查项**:
1. 后端是否启动 (http://localhost:3000 可访问?)
2. CORS 配置是否正确
3. `frontend/.env.local` 中的 `VITE_API_URL` 是否正确
4. 浏览器控制台错误信息

### 问题3: 密码验证不通过
**症状**: 修改密码时"确认修改"按钮无法点击

**原因**: 密码不满足以下要求:
- 长度不是 8-20 字符
- 缺少小写字母、数字或特殊字符
- 两次输入不匹配

**检查密码是否包含**:
- [x] 最少 8 个字符
- [x] 最多 20 个字符
- [x] 至少一个小写字母 (a-z)
- [x] 至少一个数字 (0-9)
- [x] 至少一个特殊字符 (!@#$%^&*)

### 问题4: 数据库损坏
**症状**: 数据丢失或无法读取

**解决**: 删除数据库文件后重启 (会自动重新初始化)
```bash
rm backend/data/notifications.db
npm run dev  # 重启后端，会自动创建新数据库和 admin 用户
```

---

## 📈 Session 完成情况

本会话完成的工作:
- ✅ 用户认证系统 (100%)
  - 登录/登出
  - 强制密码修改
  - JWT Token 管理
  - 受保护路由

- ✅ 机器人管理 (80%)
  - 列表页面
  - 测试连接
  - 删除功能
  - 创建/编辑 (框架完成)

- ✅ 前后端集成
  - API 端点 (7 个)
  - 路由配置
  - 认证中间件

- ✅ 编译和构建
  - TypeScript: 0 errors
  - 两个应用都能正常启动

---

## 🎯 下一步计划

### 立即可做 (Phase 2)
1. **手动 UAT** - 完整用户流程测试
2. **创建机器人表单** - 新建和编辑功能
3. **真实 Feishu 集成** - 使用真实 Webhook URL 测试
4. **多用户支持** - 用户注册和权限管理

### 中期计划
5. **通知历史改进** - 搜索、筛选、详情查看
6. **项目集成** - CI/CD Webhook 接收
7. **性能优化** - 数据库迁移、缓存
8. **安全加固** - 密码加密 (bcrypt)、HTTPS、速率限制

---

## 📚 参考文档

- [设计文档](./DESIGN_DOCUMENT.md) - 完整系统设计
- [Phase 1 状态报告](./PHASE1_AUTH_STATUS.md) - 详细实现细节
- [完成总结](./PHASE1_COMPLETION_SUMMARY.md) - 成果总结

---

**最后更新**: 2026-03-10 16:00 UTC+8  
**版本**: Phase 1 完成

