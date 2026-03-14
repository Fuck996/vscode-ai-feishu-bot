# 认证页面规范
**版本：** v1.0.0 | **更新时间：** 2026-03-14 | **内容：** 初版，覆盖登录页、强制修改密码页、忘记密码页三种认证页面的完整规范

---

## 概述

本规范描述项目中三个认证相关页面的设计与实现规范，均位于 `frontend/src/pages/` 下，共享 `frontend/src/styles/auth.css` 样式文件。

| 页面 | 路由 | 文件 | 触发条件 |
|------|------|------|---------|
| 登录页 | `/login` | `Login.tsx` | 未登录时的入口 |
| 强制改密页 | `/force-change-password` | `ForceChangePassword.tsx` | 首次登录且账号需要修改密码 |
| 忘记密码页 | `/forgot-password` | `ForgotPassword.tsx` | 点击"忘记密码？"链接 |

---

## 1. 共享基础样式（auth.css）

### 1.1 全屏背景容器

认证页面均使用相同的全屏背景，深色渐变 + 两个彩色光源球：

```css
.auth-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background:
    radial-gradient(circle at 18% 18%, rgba(59, 130, 246, 0.28), transparent 30%),  /* 左上蓝色 */
    radial-gradient(circle at 82% 22%, rgba(34, 197, 94, 0.18), transparent 26%),   /* 右上绿色 */
    linear-gradient(145deg, #071a2f 0%, #10335f 52%, #0f766e 100%);                 /* 深海色基底 */
  padding: 20px;
}
```

### 1.2 卡片容器

```css
.auth-card {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.45);
  border-radius: 20px;
  box-shadow: 0 24px 80px rgba(3, 16, 36, 0.32);
  backdrop-filter: blur(16px);
  padding: 36px 32px;
  max-width: 392px;      /* 忘记密码页使用 420px */
  width: 100%;
  animation: slideUp 0.3s ease-out;   /* 从下往上淡入 */
}
```

- 卡片入场动画：`slideUp`，`translateY(20px) → 0`，`opacity: 0 → 1`，`0.3s ease-out`

### 1.3 页头区域

每个认证页都有统一的页头，包含图标、标题、可选副标题：

```tsx
<div className="auth-header">
  <div className="auth-header-visual">
    <SceneIcon name="..." size={72} title="..." />
  </div>
  <h1>页面标题</h1>
  <p>副标题（可选）</p>
</div>
```

```css
.auth-header {
  text-align: center;
  margin-bottom: 24px;
}

.auth-header h1 {
  font-size: 28px;       /* 移动端 20px */
  margin: 0;
  color: #1f2937;
  letter-spacing: 0.02em;
}
```

**各页面图标对照：**

| 页面 | SceneIcon name | size |
|------|---------------|------|
| 登录页 | `brand` | 72 |
| 强制改密页 | `key` | 72 |
| 忘记密码页 | `key` | 72 |

### 1.4 表单通用样式

```css
.auth-form { display: flex; flex-direction: column; gap: 18px; }

.form-group { display: flex; flex-direction: column; gap: 8px; }

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-group input {
  padding: 12px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.92);
}

.form-group input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
}

.form-group input:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
  color: #9ca3af;
}
```

### 1.5 错误消息

```css
.error-message {
  padding: 12px;
  background-color: #fee2e2;
  color: #991b1b;
  border-radius: 6px;
  font-size: 14px;
  border-left: 4px solid #dc2626;   /* 左侧红色竖线强调 */
}
```

### 1.6 提交按钮

```css
/* 主按钮：蓝-青渐变 */
.submit-button {
  padding: 12px 16px;
  background: linear-gradient(135deg, #2563eb 0%, #0891b2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.submit-button:hover:not(:disabled) {
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.28);
  transform: translateY(-1px);    /* 轻微上浮 */
}

.submit-button:disabled {
  background-color: #d1d5db;
  cursor: not-allowed;
  color: #9ca3af;
}
```

### 1.7 响应式

| 断点 | 变化 |
|------|------|
| `≤ 600px` | 卡片 `padding: 36px 32px → 30px 20px`；标题缩小到 `20px` |

---

## 2. 密码输入框（带眼睛切换）

### 规范

- 密码输入框用 `.password-input-wrapper`（`position: relative`）包裹输入框和眼睛按钮
- 眼睛按钮绝对定位在输入框右侧（`right: 10px, padding: 4px 8px`）
- 眼睛图标使用 `lucide-react` 的 `Eye`/`EyeOff`，**`strokeWidth={1.5}`**（默认 2 太粗）
- 输入框右侧留出 `padding-right: 40px` 避免文字与按钮重叠
- 按钮设置 `tabIndex={-1}` 使其不参与 Tab 键焦点顺序
- 按钮设置 `aria-label="显示密码"` / `"隐藏密码"` 保证无障碍访问

```tsx
<div className="password-input-wrapper">
  <input
    type={showPassword ? 'text' : 'password'}
    placeholder="输入密码"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    autoComplete="current-password"
  />
  <button
    type="button"
    className="password-toggle"
    onClick={() => setShowPassword(!showPassword)}
    tabIndex={-1}
    aria-label={showPassword ? '隐藏密码' : '显示密码'}
  >
    {showPassword ? (
      <EyeOff className="w-4 h-4" strokeWidth={1.5} />
    ) : (
      <Eye className="w-4 h-4" strokeWidth={1.5} />
    )}
  </button>
</div>
```

```css
.password-toggle {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s;
}

.password-toggle:hover:not(:disabled) { opacity: 0.7; }
.password-toggle:disabled { cursor: not-allowed; opacity: 0.5; }
```

---

## 3. 登录页（Login.tsx）

### 3.1 特点

- 系统标识：**`CortexFlow`**（品牌名），图标 `brand`，size 72
- 表单字段：`用户名` + `密码`（带切换可见性）
- 底部"忘记密码？"链接，右对齐

### 3.2 布局结构

```
auth-container
└── auth-card
    ├── auth-header    （图标 + "CortexFlow" 标题）
    └── auth-form
        ├── error-message?
        ├── form-group  （用户名）
        ├── form-group  （密码 + 眼睛按钮）
        ├── submit-button（"登录" / "登录中..."）
        └── 忘记密码链接（右对齐，文字按钮样式）
```

### 3.3 忘记密码链接样式

```tsx
<div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
  <button
    type="button"
    onClick={() => navigate('/forgot-password')}
    style={{
      background: 'none', border: 'none',
      color: '#3b82f6', cursor: 'pointer',
      fontSize: '0.875rem', textDecoration: 'underline',
    }}
  >
    忘记密码？
  </button>
</div>
```

### 3.4 跳转逻辑

```ts
if (response.success) {
  if (response.requiresPasswordChange) {
    navigate('/force-change-password');   // 首次登录需要改密
  } else {
    navigate('/dashboard');
  }
}
```

---

## 4. 强制改密页（ForceChangePassword.tsx）

### 4.1 触发条件

首次登录且账号被标记 `requiresPasswordChange`，由登录页自动跳转，用户无法跳过。

### 4.2 布局结构

```
auth-card
├── auth-header  （key 图标 + "首次登录 - 强制修改密码" + 副标题）
└── auth-form
    ├── error-message?
    ├── form-group （新密码 + 眼睛）
    ├── form-group （确认密码 + 眼睛 + 不一致提示）
    ├── password-strength-section?（有输入时才显示）
    ├── auth-buttons
    │   ├── submit-button  （"确认修改" / 禁用条件：!canSubmit）
    │   └── logout-button  （"退出登录"）
    └── auth-footer  （密码要求说明 + 成功跳转提示）
```

### 4.3 密码强度指示器

- **触发**：`newPassword.length > 0` 时显示
- **强度等级**：`weak / fair / good / strong`，对应进度条宽度 `25% / 50% / 75% / 100%`

```ts
const strengthColors = {
  weak:   '#ef4444',   // 红
  fair:   '#f97316',   // 橙
  good:   '#eab308',   // 黄
  strong: '#22c55e',   // 绿
};
```

**进度条结构：**

```css
.strength-bar { width: 100%; height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; }
.strength-fill { height: 100%; transition: width 0.3s ease, background-color 0.3s ease; }
```

### 4.4 密码要求检查项

- 小写字母 (a-z)
- 数字 (0-9)
- 特殊字符 (!@#$%^&*)
- 长度 8-20 字符

每项用 `✓` / `✗` 前缀 + `met`（绿 `#059669`）/ `unmet`（灰 `#6b7280`）CSS class。

### 4.5 提交条件

```ts
const canSubmit = passwordValidation.isValid && passwordsMatch && newPassword.length > 0;
```

### 4.6 次要按钮（退出登录）

```css
.logout-button {
  background-color: #f8fafc;
  color: #334155;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
}
.logout-button:hover:not(:disabled) { background-color: #e2e8f0; }
```

---

## 5. 忘记密码页（ForgotPassword.tsx）

### 5.1 三步流程

```
步骤 1（输入用户名）→ 步骤 2（输入验证码）→ 步骤 3（设置新密码）
```

### 5.2 步骤指示器

横向排列三个圆形步骤节点 + 两段连接线。

```tsx
// 节点颜色
background: s < step ? '#10b981' : s === step ? '#3b82f6' : '#e5e7eb'
//          已完成（绿）          当前（蓝）        未到达（灰）

// 连接线
background: s < step ? '#10b981' : '#e5e7eb'
//          已完成（绿）            未完成（灰）
```

节点尺寸：`28px × 28px`，圆形，`fontSize: 0.75rem`，`fontWeight: 700`

已完成节点显示 `✓`，当前/未来节点显示步骤序号。

### 5.3 各步骤内容

| 步骤 | 关键字段 | 特殊处理 |
|------|---------|---------|
| 1 | 用户名输入框 + 说明 Banner | 蓝色 info banner 提示飞书发送方式 |
| 2 | 用户名（只读）+ 验证码 | 验证码输入框居中、大字号（1.25rem）、字间距（0.25rem），仅允许数字（`replace(/\D/g, '')`），最长 6 位；提交条件：`code.length === 6` |
| 3 | 新密码 + 确认密码 | 最小长度 6（忘记密码页不启用完整强度校验）；有输入且不一致时显示红色文字提示 |

### 5.4 说明 Banner（步骤 1）

```tsx
<div style={{
  background: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: '0.375rem',
  padding: '0.75rem',
  fontSize: '0.8rem',
  color: '#1e40af',
  display: 'flex',
  alignItems: 'center',
  gap: '0.625rem',
}}>
  <SceneIcon name="info" size={22} title="提示" />
  <span>系统将通过您账户配置的飞书机器人发送6位验证码</span>
</div>
```

### 5.5 成功消息

```tsx
<div style={{
  background: '#d1fae5',
  color: '#047857',
  padding: '0.75rem',
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
}}>
  {successMsg}
</div>
```

### 5.6 成功后跳转

步骤 3 完成后 `setTimeout(() => navigate('/login'), 2000)`，2 秒后自动跳转登录页。

---

## 6. 样式常量速查表

| 元素 | 关键样式 |
|------|---------|
| 卡片背景 | `rgba(255,255,255,0.96)`，`borderRadius: 20px` |
| 标题字号 | `28px`（移动端 `20px`） |
| 图标大小 | `72px` |
| 输入框 padding | `12px 14px` |
| 输入框圆角 | `10px` |
| 输入框焦点环 | `0 0 0 4px rgba(37,99,235,0.12)` |
| 提交按钮渐变 | `linear-gradient(135deg, #2563eb 0%, #0891b2 100%)` |
| 提交按钮 hover 阴影 | `0 10px 24px rgba(37,99,235,0.28)` |
| 眼睛图标线条粗细 | `strokeWidth={1.5}` |
| 错误框左边线 | `4px solid #dc2626` |
