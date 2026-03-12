# 飞书AI通知系统 v1.3.0 发布说明

**发布日期**: 2026-03-12  
**版本**: v1.3.0  
**前后端版本同步**: v1.3.0

---

## 🎉 新增功能

### 1️⃣ **审计日志功能** (仅管理员可访问)
- ✅ 后端 `/api/audit` 端点实现（GET、用户过滤、资源类型过滤）
- ✅ 数据库 AuditLog 模型：支持操作记录、资源追踪、变更日志
- ✅ 管理员专属权限验证
- **API 端点**:
  - `GET /api/audit` - 获取所有审计日志（需管理员权限）
  - `GET /api/audit/user/:userId` - 获取特定用户的操作记录（需管理员权限）

### 2️⃣ **UI 优化与改进**

#### ADVANCED_PREVIEW.html 菜单改革
- ✅ 菜单项替换："🔔 飞书通知配置" → "🔑 密码找回设置"
- ✅ 用户管理表格重构：
  - 移除"邮箱"列（可选项）
  - 新增"通知数"列（自动统计）
  - 角色信息调整到用户名行显示
  - 统计信息显示在角色列后

#### 新建用户表单简化
- ✅ 移除邮箱字段（非必需）
- ✅ 保留用户名、昵称、密码、角色选择

### 3️⃣ **Dashboard 和 History 一致性修复**

#### Dashboard 通知详情
- ✅ "查看"按钮现在显示 Feishu 卡片样式的模态框
- ✅ 与 History 页面保持视觉一致
- ✅ 支持颜色主题：✅ 成功(绿)/❌ 失败(红)/⚠️ 警告(黄)/ℹ️ 信息(蓝)

#### History 按钮统一
- ✅ "详情"按钮改名为"查看"
- ✅ 保持与 Dashboard 的操作一致性

---

## 📊 完成的需求清单

| 需求ID | 类型 | 优先级 | 标题 | 完成版本 |
|--------|------|--------|------|----------|
| REQ-F10 | 需求 | 🔴 紧急 | 审计日志功能 | v1.3.0 |
| REQ-011 | 优化 | 🔴 紧急 | UI优化 - 用户管理表格 | v1.3.0 |
| REQ-012 | 优化 | 🔴 紧急 | UI优化 - 菜单替换 | v1.3.0 |
| REQ-013 | 优化 | 🟡 中等 | Dashboard和History一致性 | v1.3.0 |

---

## 🗂️ 文件变更

### 后端 (Backend)
- ✅ `src/database.ts` - 新增 AuditLog 接口与 CRUD 操作
- ✅ `src/routes/audit.ts` - 新增审计日志 API 路由（管理员专属）
- ✅ `src/server.ts` - 注册 `/api/audit` 路由

### 前端 (Frontend)  
- ✅ `src/pages/Dashboard.tsx` - Feishu 卡片模态框、状态颜色、按钮改名
- ✅ `src/pages/History.tsx` - "详情" → "查看"、Notification 接口补充
- ✅ `UI_PREVIEW/ADVANCED_PREVIEW.html` - 菜单改革、表格优化、表单简化

### 配置与文档
- ✅ `backend/package.json` - 版本更新 1.2.0 → 1.3.0
- ✅ `frontend/package.json` - 版本更新 1.2.0 → 1.3.0
- ✅ `docs/REQUIREMENTS.md` - 需求标记更新、版本记录更新
- ✅ `backend/src/server.ts` - API 版本端点更新

---

## 🚀 主要改进

1. **数据安全与追踪**
   - 完整的操作审计日志系统
   - 仅管理员可访问敏感操作记录
   - 支持按用户、资源类型、操作类型过滤

2. **用户界面优化**
   - 去除不必要的邮箱字段
   - 添加通知数统计
   - 菜单导航更加明确

3. **体验一致性**
   - Dashboard 和 History 的通知详情查看方式统一
   - 减少用户学习成本
   - 更好的视觉一致性

---

## 📋 升级指南

### 对于现有用户

1. **备份数据**
   ```
   cp data/notifications.db data/notifications.db.backup
   ```

2. **更新代码**
   ```
   git pull origin main
   git checkout v1.3.0
   ```

3. **安装依赖**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

4. **构建项目**
   ```bash
   cd backend && npm run build
   cd ../frontend && npm run build
   ```

5. **启动服务**
   ```bash
   # 后端
   cd backend && npm start
   
   # 前端（新终端）
   cd frontend && npm run dev
   ```

6. **验证安装**
   - 访问 http://localhost:5173
   - 登录后进入"高级设置" → "审计日志"查看操作记录

---

## ⚙️ 已知问题与限制

- 审计日志功能仅 v1.3.0+ 可用
- 旧版本升级后需重新登录才能看到新菜单
- 邮箱字段已在新版本中移除，现有数据仍保留但不再可编辑

---

## 🔄 向下兼容性

- ✅ 数据库完全兼容 v1.2.0
- ✅ API 端点保持向后兼容
- ⚠️ UI 界面有变更，建议清空浏览器缓存

---

## 📞 获取帮助

- 🐛 报告 Bug: [GitHub Issues](https://github.com/Fuck996/vscode-ai-feishu-bot/issues)
- 💬 讨论建议: [GitHub Discussions](https://github.com/Fuck996/vscode-ai-feishu-bot/discussions)
- 📖 查看文档: `/docs` 目录

---

**感谢使用！** 希望新版本能为您带来更好的体验。

**Release Date**: 2 March 2026  
**Build Status**: ✅ Production Ready
