# 快速操作指南

## 🚀 快速启动

### 方式1：使用启动脚本（推荐）

**Windows (CMD)**:
```batch
.\start-system.bat
```

**Windows (PowerShell)**:
```powershell
.\start-system.ps1
```

**效果**:
- 自动安装依赖（如需要）
- 清理占用的端口
- 启动后端 (3000) 和前端 (5173)
- 自动打开浏览器

### 方式2：手动启动

**启动后端**:
```bash
cd backend
npm run dev
# 输出: Server running at http://localhost:3000
```

**启动前端**（新窗口）:
```bash
cd frontend
npm run dev
# 输出: Local: http://localhost:5173
```

---

## 📱 使用系统

### 1. 打开应用
在浏览器访问: **http://localhost:5173**

你会看到登录页面，页脚显示版本号：
```
© 2026 飞书AI通知系统. 所有权利保留. | 前端 v1.0.0 | 后端 v1.0.0
```

### 2. 首次登录

**使用默认凭证**:
- 用户名: `admin`
- 密码: `admin`

点击"登录"按钮

### 3. 修改密码

首次登录后，系统要求修改密码页面出现。

**密码要求**:
- ✅ 长度: 8-20字符
- ✅ 包含小写字母 (a-z)
- ✅ 包含数字 (0-9)
- ✅ 包含特殊字符 (!@#$%^&*)

**示例强密码**: `Admin@2026`

密码设置后，自动进入仪表板。

### 4. 仪表板 (首页)

显示系统概览：
- 通知统计
- 机器人数量
- 最近活动

### 5. 机器人管理

**导航**: 点击侧边栏的"🤖 机器人"

#### 5.1 查看机器人列表
- 显示所有已创建的机器人
- 可看状态（活跃/停用）
- 最后消息时间

#### 5.2 创建新机器人
1. 点击"+ 新建"按钮
2. 填写机器人信息：
   - **名称**: 如"生产部署通知"
   - **描述**: 可选
   - **飞书Webhook URL**: 从飞书获取
3. 点击"保存"

**飞书Webhook URL获取步骤**:
1. 打开飞书群组
2. 机器人 → 添加机器人
3. 选择"自定义机器人"
4. 复制 Webhook URL

#### 5.3 测试机器人
- 在机器人列表，点击"✓ 测试"按钮
- 系统发送测试通知到飞书
- 如连接成功，飞书群组能收到测试消息

####5.4 编辑机器人
- 点击"编辑"按钮
- 修改配置
- 保存更改

#### 5.5 删除机器人
- 点击"删除"按钮
- 确认删除
- 机器人从列表移除

### 6. 发送通知到飞书

#### 方式1：通过API调用（开发者）

**Bash脚本**:
```bash
curl -X POST http://localhost:3000/api/notify \
  -H "Content-Type: application/json" \
  -d '{
    "title": "部署成功",
    "summary": "项目v1.0.0已部署到生产环境",
    "status": "success",
    "action": "deploy"
  }'
```

**Node.js**:
```javascript
const axios = require('axios');

axios.post('http://localhost:3000/api/notify', {
  title: '构建完成',
  summary: '项目构建成功',
  status: 'success',
  action: 'build'
});
```

**Python**:
```python
import requests

requests.post('http://localhost:3000/api/notify', json={
    'title': '测试通过',
    'summary': '所有测试用例通过',
    'status': 'success',
    'action': 'test'
})
```

#### 方式2：通过Jenkins集成

在 `Jenkinsfile` 中添加：
```groovy
stage('Notify') {
    steps {
        sh '''
            curl -X POST http://localhost:3000/api/notify \
              -H "Content-Type: application/json" \
              -d '{
                "title": "Jenkins Build",
                "summary": "Build completed",
                "status": "success"
              }'
        '''
    }
}
```

### 7. 查看历史记录

**导航**: 点击侧边栏的"📜 历史"

- 显示所有通知记录
- 按时间排序
- 可按状态过滤

### 8. 系统设置

**导航**: 点击侧边栏的"⚙️ 设置"

- 修改系统配置
- 管理机器人集成
- 查看日志

### 9. 登出

点击右上角的"🚪 退出"按钮回到登录页面

---

## 🔧 常见操作

### 更改API服务器地址

如果后端运行在不同主机/端口：

**前端配置** (`frontend/.env` 或 `.env.local`):
```env
VITE_API_URL=http://your-backend:3000
```

然后重启前端:
```bash
cd frontend
npm run dev
```

### 重置系统

清除所有数据（谨慎操作）:
```bash
# 删除数据库文件
rm backend/data/notifications.db

# 或 Windows
del backend\data\notifications.db

# 重启后端，数据库会自动重新初始化
cd backend
npm run dev
```

### 查看数据库内容

数据库文件位置: `backend/data/notifications.db`

是一个JSON文件，可以用文本编辑器打开：
```json
{
  "users": [...],
  "robots": [...],
  "notifications": [...],
  "nextId": 1,
  "lastUpdated": "2026-03-10T..."
}
```

### 检查服务状态

**后端是否运行**:
```bash
netstat -ano | findstr :3000
# 应该显示 LISTENING 状态
```

**前端是否运行**:
```bash
netstat -ano | findstr :5173
# 应该显示 LISTENING 状态
```

### 查看日志

**后端日志**: 后端窗口显示实时日志
**前端日志**: 浏览器开发者控制台 (F12)

---

## ⚠️ 故障排查

### 问题1: "连接被拒绝" 或 "无法连接到服务器"

**原因**: 后端服务没有运行

**解决**:
```bash
# 检查进程
netstat -ano | findstr :3000

# 如果没有听，启动后端
cd backend && npm run dev
```

### 问题2: CORS 错误

**原因**: 前端和后端跨域请求配置问题

**解决**: 
1. 检查后端 CORS 配置
2. 验证 API URL 是否正确
3. 重启两个服务

### 问题3: 页面一直加载中

**原因**: 前端无法连接后端，或网络超时

**解决**:
1. 打开浏览器开发者工具 (F12)
2. 检查 Network 标签中的请求
3. 确认后端是否运行

### 问题4: 登录后页面空白

**原因**: 可能是组件加载失败或权限问题

**解决**:
1. 检查浏览器控制台错误
2. 清除本地存储: `localStorage.clear()`
3. 刷新页面
4. 重新登录

### 问题5: 数据未保存

**原因**: 数据库权限或磁盘空间不足

**解决**:
1. 检查 `backend/data` 目录权限
2. 检查磁盘空间
3. 查看后端日志中的错误

---

## 📊 性能优化

### 生产环境部署

使用 Docker Compose 部署（统一端口45173）:
```bash
docker-compose build
docker-compose up -d
```

访问: **http://localhost:45173**

### 性能建议

1. **后端**:
   - 使用真实数据库（不是JSON文件）
   - 启用数据库连接池
   - 配置适当的超时和重试

2. **前端**:
   - 启用代码分割
   - 配置 CDN
   - 优化图片資源

3. **网络**:
   - 使用反向代理（Nginx）
   - 启用 GZIP 压缩
   - 配置 HTTPS/SSL

---

##  📚 更多资源

- [API文档](./docs/api.md)
- [系统架构设计](./docs/DESIGN_DOCUMENT.md)
- [Docker部署指南](./DOCKER_DEPLOYMENT.md)
- [API验证报告](./API_VERIFICATION_REPORT.md)

---

## 🆘 获取帮助

如遇到问题：
1. 查看本指南的故障排查部分
2. 检查 GitHub Issues
3. 查看系统日志
4. 联系技术支持团队

---

**最后更新**: 2026-03-10  
**版本**: 1.0.0
