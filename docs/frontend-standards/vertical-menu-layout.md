# 竖向菜单页面布局规范
**版本：** v1.1.0 | **更新时间：** 2026-03-15 | **内容：** 修正激活态背景色规范：与导航栏一致，激活不高亮，hover 才高亮

---

## 概述

"竖向菜单页"指左侧固定宽度竖向导航菜单 + 右侧内容区的双栏布局，典型实例为**设置页（Settings.tsx）**。

此类页面与主内容列表页（仅有顶部 PageTitle + 表格）不同，适用于：

- 有多个独立功能域需切换展示的管理页
- 各内容域之间无数据依赖，可独立渲染
- 功能分组清晰，适合按角色/权限分组显示部分菜单项

---

## 1. 整体布局结构

### 规范

使用 **CSS Grid（220px + 1fr）** 双栏布局，左侧菜单面板宽度固定，右侧自适应。

```tsx
{/* 外层容器：页面背景 + padding */}
<div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', paddingBottom: '2rem' }}>
  {/* 内容限宽区 */}
  <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>

    {/* 页面标题（PageTitle 组件，放在外层，不受双栏影响） */}
    <PageTitle title="设置" />

    {/* 双栏区 */}
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.5rem' }}>

      {/* 左侧菜单面板（规范见第2章） */}
      <aside> ... </aside>

      {/* 右侧内容区（规范见第3章） */}
      <main> ... </main>

    </div>
  </div>
</div>
```

**关键尺寸：**

| 参数 | 值 |
|------|----|
| 菜单面板宽度 | `220px` |
| 双栏间距 | `1.5rem` |
| 内容限宽 | `1400px` |
| 页面外边距（左右） | `2rem` |
| 页脚空白 | `paddingBottom: 2rem` |

---

## 2. 左侧菜单面板

### 2.1 面板容器

```tsx
<div style={{
  background: 'white',
  borderRadius: '0.5rem',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  overflow: 'hidden',       /* 必须：确保圆角内容裁剪 */
  height: 'fit-content',    /* 不拉伸至右侧内容高度 */
}}>
```

### 2.2 菜单分组标题

菜单项可分组，每组有一个全大写的灰色分组标题作视觉分隔：

```tsx
<div style={{
  padding: '0.75rem 1.25rem',
  fontSize: '0.75rem',
  fontWeight: 700,
  color: '#9ca3af',
  textTransform: 'uppercase',
  borderBottom: '1px solid #f3f4f6',
  background: '#f9fafb',
}}>
  个人设置
</div>
```

分组标题**不可点击**，仅作视觉分组用。

### 2.3 菜单项样式函数

菜单项通过 `menuItemStyle(key)` 函数动态计算 inline style，接受当前菜单 key 以判断激活态：

```tsx
const menuItemStyle = (key: string): React.CSSProperties => ({
  padding: '0.875rem 1.25rem',
  cursor: 'pointer',
  borderLeft: activeMenu === key ? '3px solid #1e40af' : '3px solid transparent',
  fontSize: '0.875rem',
  color: activeMenu === key ? '#0969da' : '#57606a',
  backgroundColor: activeMenu === key ? '#ddf4ff' : 'transparent',
  fontWeight: activeMenu === key ? 600 : 400,
  borderBottom: '1px solid #f3f4f6',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  transition: 'background-color 0.15s ease, color 0.15s ease',
});
```

### 2.4 菜单项三态规范

与顶部导航栏完全一致：**激活态不显示背景高亮，hover 才显示高亮**。

| 状态 | 背景色 | 文字色 | 左边框 | fontWeight |
|------|--------|--------|--------|-----------|
| 默认 | `transparent` | `#57606a` | `transparent`（3px 占位） | 400 |
| hover | `#ddf4ff` | `#0969da` | `transparent` | 400 |
| 激活 | `transparent` | `#0969da` | `3px solid #1e40af` | 600 |
| 激活 + hover | `#ddf4ff` | `#0969da` | `3px solid #1e40af` | 600 |

> **设计原则（参照顶部导航栏）**：激活状态通过**左侧竖线 + 颜色 + fontWeight** 传达，背景高亮只属于 hover 交互反馈，不作为激活标识。这与 `.github-nav-item.is-active { background: transparent }` 的导航栏规则完全一致。

### 2.5 Hover 实现方式（内联样式方案）

由于没有外部 CSS 文件，hover 通过 `onMouseEnter`/`onMouseLeave` 直接操作 DOM 元素 style。

关键规则：
- `onMouseEnter`：**无条件**设置 hover 背景和颜色（激活项悬停也应显示 hover 背景）
- `onMouseLeave`：背景恢复 `transparent`；颜色根据当前激活状态决定——激活项恢复 `#0969da`，非激活项恢复 `#57606a`

```tsx
<div
  style={menuItemStyle('account-settings')}
  onClick={() => setActiveMenu('account-settings')}
  onMouseEnter={e => {
    e.currentTarget.style.backgroundColor = '#ddf4ff';
    e.currentTarget.style.color = '#0969da';
  }}
  onMouseLeave={e => {
    e.currentTarget.style.backgroundColor = 'transparent';
    // 恢复颜色时需判断当前是否为激活项
    e.currentTarget.style.color = activeMenu === 'account-settings' ? '#0969da' : '#57606a';
  }}
>
  <SceneIcon name="key" size={16} title="账户信息" inheritColor />
  账户信息
</div>
```

> **与之前版本的差异**：旧版 `onMouseEnter` 中有 `if (activeMenu !== key)` 守卫，导致激活项悬停时无法显示 hover 背景。正确做法是移除此守卫，并在 `onMouseLeave` 中按激活状态分别恢复颜色。

### 2.6 按权限显示菜单项

管理员专属的菜单项组需用 `isAdmin` 条件渲染，放在独立的 `<>` Fragment 中：

```tsx
{isAdmin && (
  <>
    <div style={groupHeaderStyle}>高级管理</div>
    <div style={menuItemStyle('users')} onClick={() => setActiveMenu('users')}
      onMouseEnter={...} onMouseLeave={...}>
      <SceneIcon name="users" size={16} title="用户管理" inheritColor />
      用户管理
    </div>
    {/* 更多管理项 */}
  </>
)}
```

---

## 3. 右侧内容区

### 3.1 内容区根结构

```tsx
<div>  {/* 无额外 padding，由卡片组件内部定义 */}

  {/* 账户信息 section */}
  {activeMenu === 'account-settings' && (
    <div>
      {/* 内容卡片... */}
    </div>
  )}

  {/* 用户管理 section（仅管理员） */}
  {activeMenu === 'users' && isAdmin && (
    <div>...</div>
  )}

</div>
```

### 3.2 禁止在内容区顶部放大标题

**❌ 错误做法：**
```tsx
{activeMenu === 'account-settings' && (
  <div>
    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', ... }}>账户信息</h1>
    <p style={{ color: '#6b7280' }}>管理个人账户…</p>
    {/* 内容 */}
  </div>
)}
```

**✅ 正确做法：**  
内容区顶部**没有独立 h1 标题**，页面层级信息由：
1. 左侧菜单项激活状态（已传达当前 section 名称）
2. 内容区第一个卡片的 **卡片标题**（`<span fontWeight:600>`）

传达，无需重复大标题。

### 3.3 内容卡片结构

每个功能块用统一的白色卡片包裹：

```tsx
<div style={{
  background: 'white',
  borderRadius: '0.5rem',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  marginBottom: '1.5rem',
}}>
  {/* 卡片头部 */}
  <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb' }}>
    <span style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>个人信息</span>
  </div>

  {/* 卡片内容 */}
  <div style={{ padding: '1.5rem' }}>
    {/* 表单字段、统计数据等 */}
  </div>
</div>
```

**卡片间距**：相邻卡片间 `marginBottom: 1.5rem`

---

## 4. 状态管理

### 4.1 activeMenu 状态

使用 TypeScript **字面量联合类型**约束菜单 key，避免魔法字符串：

```tsx
const [activeMenu, setActiveMenu] = useState<'account-settings' | 'users' | 'audit'>('account-settings');
```

默认激活第一个菜单项（`'account-settings'`）。

### 4.2 后备处理

当用户通过 url 直接访问但 `activeMenu` 不在可选范围时（如角色降级后 `users` 菜单项消失），应在内容区渲染 fallback 或自动切换到默认项：

```tsx
// 角色变更后的保护性回退（示例）
useEffect(() => {
  if (!isAdmin && (activeMenu === 'users' || activeMenu === 'audit')) {
    setActiveMenu('account-settings');
  }
}, [isAdmin]);
```

---

## 5. 菜单图标规范

- **图标库**：`lucide-react`，通过 `SceneIcon` wrapper 使用
- **尺寸**：`size={16}`（固定，所有菜单项一致）
- **颜色**：使用 `inheritColor` prop，与菜单文字颜色联动
- **每个菜单项只放一个图标**，图标在文字左侧
- **图标描述**：`title` 属性设置同菜单文字，提升 a11y

```tsx
<SceneIcon name="key" size={16} title="账户信息" inheritColor />
```

---

## 6. 可访问性规范

- 菜单项使用 `<div>` + `onClick` 而非 `<button>` 是现有代码约定，如重构须补充以下属性：
  ```tsx
  role="menuitem"
  tabIndex={0}
  onKeyDown={e => e.key === 'Enter' && setActiveMenu(key)}
  aria-selected={activeMenu === key}
  ```
- 当前实现（Settings.tsx v1.3.48+）仅保证鼠标可访问，键盘导航为改进项

---

## 7. 使用检查清单

新建竖向菜单页时，逐项检查：

- [ ] 页面底色 `#f3f4f6`，内容限宽 `1400px`
- [ ] Grid 左侧宽度 `220px`，间距 `1.5rem`
- [ ] 菜单面板有 `overflow: hidden` + `height: fit-content`
- [ ] `menuItemStyle` 函数包含三态颜色（默认/hover/激活）
- [ ] hover 通过 `onMouseEnter/Leave` 实现，有激活态保护判断
- [ ] `SceneIcon` 使用 `inheritColor` prop
- [ ] 管理员菜单项用 `isAdmin` 条件渲染
- [ ] 内容区顶部**无** `<h1>` 大标题和描述段落
- [ ] 每个功能块用白色卡片包裹，卡片内用 `<span fontWeight:600>` 作小标题
- [ ] `activeMenu` 类型为字面量联合类型，有默认值
