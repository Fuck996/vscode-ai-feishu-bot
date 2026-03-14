# 整体页面布局规范
**版本：** v1.3.0 | **更新时间：** 2026-03-14 | **内容：** 新增功能性按钮规范（Ch.17）

---

## 概述

本规范基于飞书 AI 通知系统前端实践，描述了 `App.tsx` 中 `MainLayout` 组件所实现的整体页面结构，以及各区域的样式与行为规范。

布局实现采用 **CSS class（Tailwind + 手写 CSS）+ React inline style 混合**方式，外层骨架用 Tailwind class，品牌/导航细节用手写 CSS class，页脚等小区域用 inline style。

---

## 1. 整体页面结构

### 规范

页面分为**三层竖向堆叠**：导航栏 → 主内容 → 页脚，整体撑满视口高度。

```tsx
<div className="flex flex-col bg-gray-50" style={{ minHeight: '100vh' }}>
  {/* 导航栏 */}
  <nav className="github-topbar"> ... </nav>

  {/* 主内容 */}
  <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
    {children}
  </main>

  {/* 页脚 */}
  <footer style={{ marginTop: '1.5rem', paddingBottom: '1.5rem' }}>
    ...
  </footer>
</div>
```

- 背景色：`bg-gray-50`（`#f3f4f6`）
- `minHeight: '100vh'` 保证内容较少时页脚仍贴底

---

## 2. 导航栏规范

### 整体样式

导航栏固定在页面顶部（非 `position: fixed`，为文档流内顶部元素），始终可见。

```css
.github-topbar {
  background: #ffffff;
  border-bottom: 1px solid #d0d7de;
  padding: 0 2rem;           /* 两侧内边距，≤1100px 时缩为 1rem */
}

.github-topbar__inner {
  display: grid;
  grid-template-columns: 1fr auto 1fr;  /* 左：品牌 | 中：导航项 | 右：用户信息 */
  align-items: center;
  gap: 1rem;
  min-height: 4rem;          /* ≤1100px 时导航项高度缩为 3.5rem */
}
```

### 三列布局原则

| 区域 | 样式 | 内容 |
|------|------|------|
| 左（`1fr`） | `flex-shrink: 0`，自然宽度 | 系统品牌（logo + 标题） |
| 中（`auto`） | 居中展示，内容自适应宽度 | 导航菜单项列表 |
| 右（`1fr justify-self: end`） | 推至最右 | 用户信息区 |

---

## 3. 系统品牌区（左）

### 规范

- 品牌区为可点击按钮，点击跳转 `/dashboard`
- 由 **SceneIcon（size 30）+ 品牌标题** 横向排列构成

```tsx
<button
  type="button"
  className="github-topbar__brand"
  onClick={() => navigate('/dashboard')}
  title="CortexFlow"
>
  <SceneIcon name="brand" size={30} title="CortexFlow" />
  <span className="github-topbar__brand-title">CortexFlow</span>
</button>
```

```css
.github-topbar__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  color: #1f2328;
  background: transparent;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
}

.github-topbar__brand-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #57606a;            /* 灰色，次于深色主文字 */
}
```

---

## 4. 导航菜单区（中）

### 规范

导航项横向排列，居中对齐；每个项目为 `button` 元素，使用 `SceneIcon`（size 18）+ 文字标签。

```css
.github-topbar__links {
  display: flex;
  align-items: stretch;
  gap: 0.25rem;
  justify-content: center;
}

/* 单个导航项 */
.github-nav-item {
  display: inline-flex;
  align-items: stretch;
  justify-content: center;
  height: 4rem;
  padding: 0 0.1rem;
  border: none;
  background: transparent;
  color: #57606a;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}
```

### 内容容器（用于 hover/active 背景圆角）

```css
.github-nav-item__content {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 0.85rem 0.95rem;
  border-radius: 0.5rem 0.5rem 0 0;   /* 上圆角，底部平 */
}
```

### 交互状态

| 状态 | 文字颜色 | 背景 | 底部指示器 |
|------|---------|------|-----------|
| 默认 | `#57606a` | 透明 | 隐藏 |
| hover | `#0969da` | `#ddf4ff`（content 区） | 隐藏 |
| 激活（当前页） | `#0969da`，`font-weight: 700` | 透明 | 蓝色 `3px` 圆角线 |
| 激活 + hover | `#0969da`，`font-weight: 700` | `#ddf4ff`（content 区） | 蓝色 `3px` 圆角线 |

> **注意**：`.is-active` 的 CSS specificity 高于 `:hover`，因此需要单独声明 `.github-nav-item.is-active:hover .github-nav-item__content` 来补回 hover 背景，否则激活态 hover 不会有视觉反馈。

```css
/* 激活状态底部指示器 */
.github-nav-item__indicator {
  position: absolute;
  left: 0;      /* 与 .github-nav-item__content 左边缘对齐 */
  right: 0;     /* 与 .github-nav-item__content 右边缘对齐，宽度等于高亮块 */
  bottom: 0;
  height: 3px;
  border-radius: 999px 999px 0 0;
  background: transparent;
}

.github-nav-item.is-active .github-nav-item__indicator {
  background: #0969da;
}
```

> **注意**：指示器用 `left: 0; right: 0` 而非内缩值，确保蓝线宽度与高亮背景块完全一致。`transform: scaleX(0.92)` 用于默认态（不可见时的占位缩放），激活后 `scaleX(1)` 恢复全宽。

### 激活判断逻辑

```ts
const isActive = (matchPaths: string[]) => {
  return matchPaths.some(
    path => normalizedPath === path || normalizedPath.startsWith(`${path}/`)
  );
};
```

- `normalizedPath`：将根路径 `/` 标准化为 `/dashboard`
- 支持子路由匹配：`/robots` 激活下仍匹配 `/robots/123/integrations`

### 导航项配置

```ts
const NAVIGATION_ITEMS: NavigationItem[] = [
  { path: '/dashboard', matchPaths: ['/dashboard'], label: '仪表板', icon: 'dashboard' },
  { path: '/robots',    matchPaths: ['/robots'],    label: '机器人', icon: 'robot' },
  { path: '/history',   matchPaths: ['/history'],   label: '历史',   icon: 'history' },
  { path: '/services',  matchPaths: ['/services'],  label: '服务',   icon: 'service', adminOnly: true },
  { path: '/settings',  matchPaths: ['/settings'],  label: '设置',   icon: 'settings' },
];
```

- `adminOnly: true` 的项目仅在 `user.role === 'admin'` 时渲染

---

## 5. 用户信息区（右）

### 规范

用户信息区显示当前登录用户的头像图标和昵称，无退出按钮（退出操作在设置页进行）。

```tsx
{user && (
  <div className="github-topbar__actions">
    <span className="github-topbar__user">
      <span aria-hidden="true" className="github-topbar__avatar">👤</span>
      <span>{userNickname || user.username}</span>
    </span>
  </div>
)}
```

```css
.github-topbar__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #57606a;
  font-size: 0.875rem;
  flex-shrink: 0;
  justify-self: end;         /* 推至 grid 右侧 */
}

.github-topbar__user {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
```

### 昵称获取逻辑

```ts
// 优先显示后端返回的昵称，fallback 到用户名
const response = await authService.fetchWithAuth('/api/users/me');
setUserNickname(data.nickname || user?.username || '');
```

---

## 6. 主内容区规范

### 规范

- Tailwind 限宽：`max-w-7xl`（1280px）
- 水平居中：`mx-auto`
- 响应式内边距：`px-4 sm:px-6 lg:px-8`（16px / 24px / 32px）
- 顶部内边距：`py-8`（32px）
- 页面内容以 `children` 插槽渲染，各页面负责自身的页面标题和内容

```tsx
<main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
  {children}
</main>
```

---

## 7. 页面标题组件（PageTitle）

各页面在内容区顶部使用 `<PageTitle>` 组件统一渲染页面标题。

### Props

```ts
interface PageTitleProps {
  icon: SceneIconName;    // 左侧图标
  title: string;          // 主标题
  description?: string;   // 副标题（可选）
  actions?: React.ReactNode; // 右侧操作区（可选，通常放主操作按钮）
}
```

### 样式规范

```tsx
// 布局：左右分列，顶对齐，可换行
<div style={{
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '1rem',
  flexWrap: 'wrap',
  marginBottom: '2rem',   // 与下方卡片留出间距
}}>
  {/* 左：图标 + 标题 + 描述 */}
  <div style={{ minWidth: 0 }}>
    <h1 style={{
      margin: 0,
      fontSize: '1.875rem',  // 30px
      fontWeight: 700,
      color: '#1f2328',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      lineHeight: 1.2,
    }}>
      <SceneIcon name={icon} size={34} title={title} inheritColor />
      <span>{title}</span>
    </h1>
    {description && (
      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#656d76', lineHeight: 1.5 }}>
        {description}
      </p>
    )}
  </div>

  {/* 右：操作区 */}
  {actions && (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
      {actions}
    </div>
  )}
</div>
```

### 排版比例

| 元素 | fontSize | fontWeight | color |
|------|---------|------------|-------|
| 主标题（h1） | `1.875rem` | 700 | `#1f2328` |
| 副标题 | `0.875rem` | 400 | `#656d76` |
| 标题图标 | `34px`（SceneIcon） | — | 继承色（`inheritColor`） |

---

## 8. 页脚规范

### 规范

- 与主内容同宽（`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`）
- 外边距：`marginTop: '1.5rem', paddingBottom: '1.5rem'`
- 文字：`font-size: 0.7rem`，`color: #9ca3af`，水平居中
- 内容格式：`© 年份 品牌名. All rights reserved. | System v{backendVersion} | Updated: {当前日期时间}`

```tsx
<footer style={{ marginTop: '1.5rem', paddingBottom: '1.5rem' }}>
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <p className="github-footer__text text-center text-gray-400" style={{ fontSize: '0.7rem' }}>
      © 2026 CortexFlow. All rights reserved. | System v{backendVersion} | Updated: {timestamp}
    </p>
  </div>
</footer>
```

- `backendVersion` 通过 `GET /api/version` 异步获取，默认值 `'unknown'`，失败时显示 `'error'`
- 时间戳用 `new Date().toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })`，**必须加 `hour12: false`** 保持 24 小时制；示例输出：`03/14/2026, 14:30`
- 页脚全部使用英文，不使用中文文案

---

## 9. 认证页面（无布局框架）

### 规范

登录页、强制修改密码页、忘记密码页**不使用 MainLayout**，自行实现居中卡片布局，无导航栏和页脚。

```tsx
// AppContent 中的路由分叉逻辑
const isAuthPage =
  location.pathname === '/login' ||
  location.pathname === '/force-change-password' ||
  location.pathname === '/forgot-password';

if (isAuthPage) {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/force-change-password" element={<ForceChangePassword />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
    </Routes>
  );
}
```

认证页通常采用全屏居中卡片布局，白色卡片 + 阴影，宽度约 `360~420px`，背景与主区域相同（`bg-gray-50`）。

---

## 10. 响应式断点

| 断点 | 变化 |
|------|------|
| `≤ 1100px` | 导航栏内边距 `2rem → 1rem`；inner grid 改为 `auto 1fr auto`；导航项高度 `4rem → 3.5rem` |
| `≤ 640px` | 品牌标题字号 `1.25rem → 1rem`；actions 区折叠 |

---

## 11. 应用初始化

应用挂载时验证本地存储中的 token，无效则清除并跳转登录页；验证期间显示加载态。

```tsx
// 加载态
<div className="app-loading">
  <div className="app-loading__text">加载中...</div>
</div>
```

```css
.app-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f3f4f6;
}

.app-loading__text {
  font-size: 18px;
  color: #6b7280;
}
```

Token 验证逻辑：

```ts
if (authService.isAuthenticated()) {
  const verifyResult = await authService.verify();
  if (!verifyResult.success) {
    authService.logout();  // 清除无效 token
  }
}
setIsInitialized(true);
```

---

## 12. 全局数据展示规范

以下规则适用于所有页面的数据渲染，不限于表格。

### 12.1 数字格式

- **必须使用阿拉伯数字**（0, 1, 2, 100），不使用中文数字（零、一、百）
- 数量、计数、百分比一律阿拉伯数字

```tsx
// ✅ 正确
<span>共 {count} 个</span>
<span>{robot.messageCount ?? 0} 条记录</span>

// ❌ 错误
<span>共零个</span>
```

### 12.2 零值与空值

| 情况 | 显示 | 说明 |
|------|------|------|
| 数值为 `0` | `0` | 有明确语义，不能省略 |
| 数值为 `null` / `undefined` | `—`（em dash） | 表示「无数据」 |
| 字符串为空 `''` | `—` | 同上 |
| 对象/数组不存在 | `—` 或专属空状态 | 视场景用空状态组件 |

```tsx
// ✅ 零值显示 0，不是 -
<span>{robot.messageCount ?? 0} 条记录</span>

// ✅ 空值显示 —
<span>{notification.source || '—'}</span>

// ❌ 错误：把 0 显示成 - 或空
<span>{robot.messageCount || '-'}</span>  // 当 messageCount=0 时显示 '-'
```

> `??`（nullish coalescing）只在 `null`/`undefined` 时触发，不影响 `0`；`||` 在 `0`/`''`/`false` 时也触发，**不要用 `||` 来兜底数值字段**。

### 12.3 时间格式

- **时间统一使用 24 小时制**，不使用 AM/PM
- 日期格式：`YYYY/MM/DD`（`zh-CN` locale）
- 时间格式：`HH:mm:ss` 或 `HH:mm`

```ts
// ✅ 24 小时制
date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
// 输出：14:30:00

// ✅ 页脚时间戳（英文 locale）
new Date().toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
// 输出：03/14/2026, 14:30

// ❌ 默认 en-US 未指定 hour12 会输出 AM/PM
new Date().toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' })
// 输出：02:30 PM ← 错误
```

### 12.4 页脚文案语言

页脚版权和系统信息一律使用**英文**，不使用中文。

```
// ✅ 正确格式
© 2026 CortexFlow. All rights reserved. | System v1.3.47 | Updated: 03/14/2026, 14:30

// ❌ 错误
© 2026 CortexFlow 版权所有 | 系统版本 v1.3.47
```

---

## 13. 页面加载态规范

### 规范

- **触发条件**：异步数据请求期间（`loading === true`）渲染加载页，替换整个页面内容
- 加载完成后直接渲染正常页面，不做淡入过渡
- 背景色与主区域一致：`#f3f4f6`

### 结构

```
外层容器（height: 100vh, flex column）
  ├── 加载区（flex: 1，居中）
  │     ├── 旋转圆圈（spinner）
  │     └── 加载文字
  └── 底部提示栏（可选）
```

### 实现规范

```tsx
if (loading) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: '#f3f4f6',
    }}>
      {/* 主加载区域 */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1.5rem',
      }}>
        {/* Spinner */}
        <div style={{
          width: '60px',
          height: '60px',
          border: '4px solid #e5e7eb',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        {/* 提示文字 */}
        <p style={{ fontSize: '1rem', color: '#6b7280', fontWeight: 500 }}>
          加载中...
        </p>
      </div>

      {/* 可选：底部提示栏 */}
      <div style={{
        padding: '1.5rem',
        borderTop: '1px solid #e5e7eb',
        backgroundColor: 'white',
        textAlign: 'center',
        color: '#9ca3af',
        fontSize: '0.875rem',
      }}>
        正在获取数据，请稍候...
      </div>

      {/* 动画关键帧，写在 JSX 内以避免全局污染 */}
      <style>{`
        @keyframes spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
```

### 关键数值

| 属性 | 值 |
|------|----|
| Spinner 尺寸 | `60px × 60px` |
| Spinner 边框 | `4px solid #e5e7eb`（静态）/ `4px solid #3b82f6`（顶部动态） |
| 动画时长 | `1s linear infinite` |
| 提示文字 | `1rem`，`color: #6b7280`，`fontWeight: 500` |
| 背景色 | `#f3f4f6` |

### 状态变量模式

```ts
const [loading, setLoading] = useState(true);   // 初始为 true，进入页面即触发加载
const [error, setError] = useState<string | null>(null);

const fetchData = async () => {
  try {
    setLoading(true);
    setError(null);
    // ... 请求逻辑
  } catch (err) {
    setError('网络错误，请稍后重试');
  } finally {
    setLoading(false);   // 无论成功/失败都结束加载
  }
};

useEffect(() => { fetchData(); }, []);  // 组件挂载时触发
```

---

## 14. 系统内部通知（Toast）规范

本项目使用统一的 `toastService` 单例 + `ToastContainer` 组件实现系统内部通知。

### 14.1 架构概述

```
toastService（单例，services/toastService.ts）
  ├── 维护 toasts[] 状态
  ├── 通过 subscribe/notify 发布-订阅模式驱动 UI
  └── 暴露 .success() / .error() / .warning() / .info() 便捷方法

ToastContainer（components/ToastContainer.tsx）
  ├── 挂载在 App 根组件，全局唯一
  ├── 订阅 toastService，同步渲染当前 toasts[]
  └── 固定在 bottom-right（不影响页面布局）
```

### 14.2 使用方法

```ts
// 任意页面/组件中直接导入使用，无需 props 传递
import toastService from '../services/toastService';

// 四种类型
toastService.success('机器人已创建');          // 绿色
toastService.error('请输入机器人名称');        // 红色
toastService.warning('即将超出配额');          // 黄色
toastService.info('正在同步数据...');          // 蓝色

// 自定义持续时间（ms），0 = 不自动关闭
toastService.success('操作成功', 5000);
toastService.error('严重错误，需手动关闭', 0);
```

### 14.3 适用场景

| 场景 | Toast 类型 | 示例 |
|------|-----------|------|
| 创建/保存成功 | `success` | `'机器人已创建'` |
| 更新成功 | `success` | `'设置已保存'` |
| 删除成功 | `success` | `'集成已删除'` |
| 表单校验失败 | `error` | `'请输入有效的 URL'` |
| 接口请求失败 | `error` | `'网络错误，请稍后重试'` |
| 操作已执行但有风险 | `warning` | `'即将关闭'` |
| 纯告知性提示 | `info` | `'测试通知已发送'` |

**不适合 Toast 的场景：**

- 页面级数据加载失败 → 用页面内 `error` 状态 + 内联错误提示
- 需要用户确认的操作 → 用 `window.confirm()` 或 Modal
- 需要长期显示的系统状态 → 用 Banner 组件或页面顶部提示栏

### 14.4 组件实现规范

**位置**：`position: fixed`，`bottom: 1rem`，`right: 1rem`，`zIndex: 9999`

**自动关闭**：默认 `duration = 3000ms`（3 秒），通过 `setTimeout` + `toastService.remove(id)` 实现

**手动关闭**：点击整个 toast 卡片或右侧 ✕ 按钮均可关闭

**动画**：从右侧滑入（`translateX(480px) → 0`），`0.3s ease-out`

**四种颜色规范：**

| 类型 | 背景 | 边框 | 文字 | 图标色 |
|------|------|------|------|-------|
| `success` | `#dcfce7` | `#86efac` | `#166534` | `#22c55e` |
| `error` | `#fee2e2` | `#fca5a5` | `#991b1b` | `#ef4444` |
| `warning` | `#fef3c7` | `#fcd34d` | `#92400e` | `#f59e0b` |
| `info` | `#dbeafe` | `#93c5fd` | `#1e40af` | `#3b82f6` |

**卡片尺寸**：`minWidth: 320px`，`maxWidth: 480px`，`padding: 0.875rem 1rem`，`borderRadius: 0.5rem`

### 14.5 全局挂载

`ToastContainer` 挂载在 `App` 根组件 router 外侧，确保全局唯一且不受路由切换影响：

```tsx
// App.tsx 最外层
return (
  <Router>
    <AppContent />
    <ToastContainer />   {/* 全局唯一，挂载在此 */}
  </Router>
);
```

---

## 15. Emoji 使用规范

### 15.1 设计原则

本系统的 Emoji 定位为**功能性辅助符号**，不作装饰用途：

- **用于增强信息语义**，让用户一眼区分状态/类型（如 ✅ 成功 / ❌ 失败 / ⚠️ 警告）
- **不用于标题和导航**：页面标题、菜单项、表格列头禁止使用 Emoji
- **稀疏原则**：同一屏幕中同类 Emoji 出现不超过 3 个；同一卡片中不超过 2 个

### 15.2 允许使用的场景

| 场景 | 推荐 Emoji | 示例文本 |
|------|-----------|----------|
| 操作成功 Toast | ✅ | `✅ 保存成功` |
| 操作失败 Toast | ❌ | `❌ 请求失败` |
| 警告提示（内联） | ⚠️ | `⚠️ 此操作不可撤销` |
| 信息提示（内联） | ℹ️ | `ℹ️ 该字段为只读` |
| 日志/汇报正文条目 | ✅ 🔧 📝 | MCP 推送结果汇报 |
| 空状态页面引导文案 | 🔍 📭 | `🔍 暂无匹配结果` |

### 15.3 禁止使用的场景

- 页面 `<h1>`/`<h2>` 标题
- 导航菜单项文本（侧边栏菜单、顶部导航）
- 表头、列标签、字段标签
- 按钮文字
- 表格单元格（状态徽章已用颜色编码，不必再加 Emoji）

### 15.4 汇报摘要（MCP 专用）约定

飞书通知 MCP 的推送摘要遵循固定三符号体系，**不属于 UI Emoji**，由 MCP server 侧格式化，无需在前端代码中复用：

```
✅  已完成的事项
🔧  修改/改进内容
📝  补充说明与注意事项
```

---

## 16. 整体视觉美术风格规范

### 16.1 设计语言定位

CortexFlow 系统采用 **GitHub-Style 轻量企业风**，参考 GitHub 的信息密度与色彩系统，结合飞书业务通知场景做了简化。

整体风格特征：
- **简洁、克制**：无重底色大标题，不过度装饰
- **低对比度分割**：区域边界用浅灰 border（`#e5e7eb`）而非深色分割线
- **文字主导**：以文字信息为核心，图标仅作辅助识别
- **蓝色系主题**：主色调 `#0969da`（GitHub Blue），沿导航与交互状态一致应用

### 16.2 配色规范

#### 主色调

| 用途 | 颜色值 | 说明 |
|------|--------|------|
| 主操作/激活色 | `#0969da` | 按钮、链接、激活高亮 |
| 激活背景 | `#ddf4ff` | 菜单激活背景、hover 背景 |
| 主色深（border） | `#1e40af` | 激活竖线、focus ring |

#### 文字色阶

| 层级 | 颜色值 | 适用场景 |
|------|--------|---------|
| 主标题 | `#1f2937` | 页面主标题、列表主文字 |
| 正文 | `#374151` | 普通内容文字 |
| 辅助文字 | `#57606a` | 菜单默认色、次要字段 |
| 占位/禁用 | `#9ca3af` | placeholder、disabled |
| 微弱提示 | `#d1d5db` | 分隔线辅助色 |

#### 背景色阶

| 用途 | 颜色值 | 说明 |
|------|--------|------|
| 页面底色 | `#f3f4f6` | `bg-gray-50` |
| 卡片/面板 | `#ffffff` | 白底，1px shadow |
| 卡片头部 | `#f9fafb` | 略深于白底 |
| 表格斑马纹 | `#f9fafb` | 偶数行 |
| 警告背景 | `#fef3c7` | 黄色提示块 |
| 错误背景 | `#fee2e2` | 红色提示块 |

### 16.3 阴影与圆角

全系统采用统一的**卡片阴影**和**圆角**：

```css
/* 卡片阴影 */
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

/* 标准圆角（卡片、输入框、Badge） */
border-radius: 0.5rem;   /* 8px，卡片 */
border-radius: 0.375rem; /* 6px，按钮、输入框 */
border-radius: 9999px;   /* 全圆，Badge/Tag */
```

禁止使用：
- 大半径圆角（>12px）用于方形容器
- 多层嵌套阴影（同一视觉层级内只用一层 shadow）

### 16.4 图标使用规范

图标库：**lucide-react**（全系统唯一图标库）

**尺寸规范：**

| 使用场景 | 尺寸 | 示例 |
|---------|------|------|
| 导航栏图标 | 18px | `<Icon size={18}` |
| 菜单项图标 | 16px | `<Icon size={16}` |
| 按钮内图标 | 16px | 与按钮文字同行 |
| 表格行操作图标 | 14px | 操作按钮组 |
| Toast 状态图标 | 16px | Toast 最左侧 |
| 页面空状态大图标 | 48px | 空状态插图替代 |

**描边粗细规范：**

```tsx
// 默认粗细（大多数场景）
<Icon size={16} />

// 需要视觉上更轻的场景（密码输入框 eye 图标、空状态插图）
<Icon size={16} strokeWidth={1.5} />

// 禁止在正式 UI 中使用 strokeWidth < 1.5 或 > 2
```

**颜色规范：**

- **不直接传 color prop**，通过 `inheritColor`（`SceneIcon`）或外层 `color` CSS 属性继承
- 菜单中图标颜色随文字颜色联动（激活/hover 时同变蓝色）
- 禁止在同一菜单中混用不同颜色图标

### 16.5 字体规范

系统无自定义字体，使用浏览器/操作系统默认字体栈（`system-ui`），通过 Tailwind 默认 `font-sans` 继承。

**字号阶梯（rem）：**

| 用途 | 字号 | fontWeight |
|------|------|-----------|
| 页面主标题（PageTitle） | 1.5rem | 700 |
| 卡片标题 | 1rem | 600 |
| 正文 / 表格内容 | 0.875rem | 400 |
| 辅助文字 / 标签 | 0.8rem | 400 |
| 分组标题（全大写） | 0.75rem | 700 |
| 微小提示 | 0.75rem | 400 |

**禁止：**
- 同一段落内混用超过 2 个字号
- 使用 `<h1>` 作为卡片内部标题（应使用 `<span>` + fontWeight: 600）

### 16.6 间距体系

基于 `0.25rem`（4px）网格：

```
0.25rem = 4px   微间距（图标与文字间）
0.5rem  = 8px   同组内元素间距
0.75rem = 12px  紧凑内边距
1rem    = 16px  标准内边距（卡片内 table cell）
1.25rem = 20px  松散内边距（菜单项）
1.5rem  = 24px  卡片 padding / section 间距
2rem    = 32px  页面顶部 padding
```

### 16.7 交互动画

交互状态切换使用 **0.15s ease** 过渡，避免生硬跳变：

```css
transition: background-color 0.15s ease, color 0.15s ease;
```

- **hover 过渡**：所有菜单项、按钮均应有颜色/背景过渡
- **页面切换**：无动画（路由切换不加 fade，保持响应速度）
- **Modal 出现**：不使用复杂进入动画，`opacity 0.2s` 即可
- **禁止**：`transform scale`缩放动画用于内容容器

---

## 17. 功能性按钮规范

### 17.1 主操作按钮（新建 / 添加）

用于表格标题栏右侧的主操作，如「新建机器人」「添加集成」「新建用户」。

**样式标准：**

```tsx
<button
  style={{
    padding: '0.375rem 0.875rem',
    backgroundColor: '#1f883d',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.8125rem',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  }}
>
  ＋ 新建XXX
</button>
```

| 属性 | 值 | 说明 |
|------|----|------|
| `backgroundColor` | `#1f883d` | GitHub 绿，全系统统一 |
| `padding` | `0.375rem 0.875rem` | 与筛选 pill 等高对齐 |
| `fontSize` | `0.8125rem` | 与筛选 pill 文字等大 |
| `fontWeight` | `500` | 中等粗细，不用 600/700 |
| `borderRadius` | `0.375rem` | 与筛选 pill 一致 |
| `border` | `none` | 无边框 |
| hover 效果 | **不加** onMouseEnter/Leave | 颜色足够深，无需 hover 变色 |

### 17.2 次要操作按钮（取消 / 关闭）

用于 Modal 底部的取消动作。

```tsx
<button
  style={{
    padding: '0.5rem 1.25rem',
    backgroundColor: '#e5e7eb',
    color: '#374151',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
  }}
>
  取消
</button>
```

### 17.3 危险操作按钮（删除 / 退出）

用于需要用户确认的破坏性操作。

```tsx
<button
  style={{
    padding: '0.5rem 1.25rem',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
  }}
>
  删除
</button>
```

### 17.4 通用提交按钮（保存 / 创建）

用于表单提交、Modal 确认。

```tsx
<button
  style={{
    padding: '0.5rem 1.25rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
  }}
>
  保存
</button>
```

### 17.5 禁止事项

- ❌ 主操作按钮与筛选 pill 混用 `padding`（主按钮固定 `0.375rem 0.875rem`）
- ❌ 同一表格标题栏放置多个主操作按钮（只允许一个）
- ❌ 主操作按钮添加 hover 颜色变化（`#1f883d` 本身已足够显眼）
- ❌ 使用 `fontWeight: 600/700` 加粗主操作按钮文字（统一 500）

