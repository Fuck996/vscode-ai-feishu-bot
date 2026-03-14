# 表格组件规范
**版本：** v1.4.0 | **更新时间：** 2026-03-14 | **内容：** §6 三点按钮去除外边框；§6 补充分割线放置规则（时间与三点之间，集成表时间与 toggle 之间）

---

## 概述

本规范基于飞书 AI 通知系统前端实践，总结了机器人管理、集成管理、通知历史等页面中表格的共同模式，提取为可复用的设计与编码规范。

本项目表格全部使用原生 HTML `<table>` + React inline style 实现，不依赖 CSS 框架。

---

## 1. 整体布局结构

### 规范

- 表格外层容器为白色卡片（`background: white`，`borderRadius: '0.5rem'`，`boxShadow`）
- 卡片顶部有一个**标题栏（header bar）**，包含标题、计数、操作按钮、筛选器
- 表格使用 `overflowX: 'auto'` 包裹，支持横向滚动
- `table` 设置 `width: '100%'`、`borderCollapse: 'collapse'`、`minWidth`（根据列数决定，通常 700~900px）
- 无 `<thead>`，只用 `<tbody>`（标题折叠在 header bar 里），行间用底边框分隔

### 假代码示例

```tsx
// 外层页面容器
<div style={{ backgroundColor: '#f6f8fa', minHeight: '100vh', paddingBottom: '2rem' }}>
  <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>

    {/* 表格卡片 */}
    <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>

      {/* === 标题栏 === */}
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1f2328' }}>标题</span>
          <span style={{ fontSize: '0.8125rem', color: '#656d76' }}>共 N 个</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* 操作按钮、筛选器 */}
        </div>
      </div>

      {/* === 表格区域 === */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '820px' }}>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                {/* 各列 */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  </div>
</div>
```

---

## 2. 标题栏（Header Bar）规范

### 规范

- 左侧：**标题文字**（`fontSize: '0.9375rem'`, `fontWeight: 700`, `color: '#1f2328'`）+ **计数**（`fontSize: '0.8125rem'`, `color: '#656d76'`），两者 `gap: '0.625rem'`
- 右侧：**主操作按钮**（绿色 `#1f883d` 或 `#10b981`）+ 筛选器 pill
- 标题栏和表格区域之间用 `borderBottom: '1px solid #e5e7eb'` 分隔
- 标题栏 padding：`1rem 1.5rem`

### 主操作按钮样式

```tsx
<button style={{
  padding: '0.375rem 0.875rem',
  backgroundColor: '#1f883d',
  color: 'white',
  border: 'none',
  borderRadius: '0.375rem',
  cursor: 'pointer',
  fontSize: '0.8125rem',
  fontWeight: 500,
}}>
  + 新建
</button>
```

---

## 3. 列宽分配规范

### 规范

- **第一列（主内容列）**：设置固定 `width`（通常 `240~280px`），左侧 `paddingLeft: '1.5rem'` 与标题栏文字对齐
- **中间单值列**（如状态列）：**不设 `width`**，由浏览器自动填充剩余空间；配合 `textAlign: 'center'` 使内容居中——这是中间列内容居中对齐的正确实现方式，固定左右列后自动撑满剩余宽度
- **中间多标签列**（如集成类型列）：设置固定 `width`（`280px` 以上），使多个标签能在同一行优先排列，空间不足时才换行
- **最后操作列**：设置固定 `width`（通常 `200~240px`），`textAlign: 'right'`，右侧 `paddingRight: '1.5rem'`
- 表格加 `tableLayout: 'fixed'`，配合各列固定宽度防止列宽因内容变化而抖动

### 三列表（中间状态列自动居中）——以活跃机器人表为准

```tsx
<table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
  <tbody>
    <tr>
      {/* 第一列：固定 260px，左内边距 1.5rem 对齐标题 */}
      <td style={{ padding: '0.875rem 1.5rem', width: '260px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1f2328' }}>名称</span>
          <span style={{ fontSize: '0.75rem', color: '#656d76' }}>N 条记录</span>
        </div>
      </td>

      {/* 中间列：不设 width，剩余空间自动填充；textAlign: center 使徽章居中 */}
      <td style={{ padding: '0.875rem 0.75rem', textAlign: 'center' }}>
        <StatusBadge tone="active" label="启用" />
      </td>

      {/* 最后列：固定 220px，右对齐 */}
      <td style={{ padding: '0.875rem 1.5rem 0.875rem 0.75rem', width: '220px', textAlign: 'right' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* 时间 + 三点菜单 */}
        </div>
      </td>
    </tr>
  </tbody>
</table>
```

### 多标签列（固定宽度 + flexWrap）——以机器人管理表为准

```tsx
{/* 中间多标签列：固定 280px，flex + wrap */}
<td style={{ padding: '0.875rem 0.75rem', width: '280px' }}>
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
    {types.map(type => (
      <span key={type} style={{ ...badgeStyle, ...TYPE_COLORS[type] }}>
        {TYPE_LABELS[type]}
      </span>
    ))}
  </div>
</td>
```

---

## 4. 数据行规范

### 规范

- 行间距用底边框：`borderBottom: '1px solid #f3f4f6'`（比标题栏分隔线更浅）
- 主内容文字：`fontSize: '0.875rem'`, `fontWeight: 600`, `color: '#1f2328'`
- 辅助文字：`fontSize: '0.75rem'`, `color: '#656d76'`
- 竖向排列时 `flexDirection: 'column'`，`gap: '0.25rem'`
- 可点击的主标题：hover 时变蓝（`#0969da`）并显示下划线，用 `onMouseEnter`/`onMouseLeave` 实现

### 假代码示例

```tsx
<td style={{ padding: '0.875rem 0.75rem 0.875rem 1.5rem' }}>
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
    {/* 可点击主标题 */}
    <span
      style={{ fontWeight: 600, color: '#1f2328', fontSize: '0.875rem', cursor: 'pointer' }}
      onMouseEnter={e => { e.currentTarget.style.color = '#0969da'; e.currentTarget.style.textDecoration = 'underline'; }}
      onMouseLeave={e => { e.currentTarget.style.color = '#1f2328'; e.currentTarget.style.textDecoration = 'none'; }}
      onClick={() => navigate(`/detail/${item.id}`)}
    >
      {item.name}
    </span>
    {/* 辅助信息 */}
    <span style={{ color: '#656d76', fontSize: '0.75rem' }}>{item.count} 条记录</span>
  </div>
</td>
```

---

## 5. 标签/徽章（Badge）规范

### 5.1 彩色类型徽章

用于展示项目类型、集成类型等有语义颜色的标签。

**形态规范：**
- `display: 'inline-block'`
- `padding: '0.2rem 0.6rem'`
- `borderRadius: '0.375rem'`（圆角矩形，不是胶囊）
- `fontSize: '0.78rem'`, `fontWeight: 600`
- 颜色用 `background`（浅底色）+ `color`（深前景色）组合，不使用 border

**颜色映射表（8 种平台）：**

```ts
const TYPE_COLORS: Record<string, React.CSSProperties> = {
  vercel:       { background: '#f0fdf4', color: '#166534' },  // 绿
  railway:      { background: '#fef2f2', color: '#991b1b' },  // 红
  github:       { background: '#e0f2fe', color: '#0c4a6e' },  // 蓝
  gitlab:       { background: '#fce7f3', color: '#9d174d' },  // 粉
  'vscode-chat':{ background: '#ede9fe', color: '#4c1d95' },  // 紫
  api:          { background: '#dbeafe', color: '#1e40af' },  // 靛蓝
  custom:       { background: '#f3f4f6', color: '#374151' },  // 灰
  synology:     { background: '#fff7ed', color: '#9a3412' },  // 橙
};
```

**使用示例：**

```tsx
const badgeStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.2rem 0.6rem',
  borderRadius: '0.375rem',
  fontSize: '0.78rem',
  fontWeight: 600,
  whiteSpace: 'nowrap',   // 标签内文字不换行
};

<span style={{ ...badgeStyle, ...TYPE_COLORS[item.type] }}>
  {TYPE_LABELS[item.type]}
</span>
```

### 5.2 状态徽章（胶囊型）

用于展示成功/失败/警告/信息等语义状态。

**形态规范：**
- `borderRadius: '999px'`（完全圆角胶囊）
- `padding: '0.25rem 0.7rem'`
- `fontSize: '0.75rem'`, `fontWeight: 600`

```tsx
const STATUS_COLORS = {
  success: { color: '#1a7f37', backgroundColor: '#dcfce7' },
  error:   { color: '#cf222e', backgroundColor: '#fee2e2' },
  warning: { color: '#9a6700', backgroundColor: '#fef3c7' },
  info:    { color: '#0969da', backgroundColor: '#dbeafe' },
};

<span style={{
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.25rem 0.7rem',
  borderRadius: '999px',
  fontSize: '0.75rem',
  fontWeight: 600,
  lineHeight: 1,
  ...STATUS_COLORS[item.status],
}}>
  {STATUS_LABELS[item.status]}
</span>
```

### 5.3 标签云（多标签横向排列）

用于一个单元格内展示多个标签，如集成类型列、事件列。

**规范：**
- 容器用 `display: 'flex'`, `flexWrap: 'wrap'`, `gap: '0.3rem'`
- 每个标签设置 `whiteSpace: 'nowrap'` 防止标签内部换行
- 列宽给足（`280px` 以上），让多个标签优先在同一行显示，空间不足才换行
- 空状态显示 `暂无…`（`color: '#9ca3af'`, `fontSize: '0.75rem'`）

```tsx
// 列宽：280px
<td style={{ padding: '0.875rem 0.75rem', width: '280px' }}>
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
    {items.length === 0 ? (
      <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>暂无集成</span>
    ) : items.map(type => (
      <span key={type} style={{ ...badgeStyle, ...TYPE_COLORS[type] }}>
        {TYPE_LABELS[type]}
      </span>
    ))}
  </div>
</td>
```

### 5.4 事件标签（小胶囊，红/绿语义）

用于展示触发事件，成功类为绿，失败类为红。

```tsx
// 判断语义颜色
const isError = ev.includes('failure') || ev.includes('failed');

<span style={{
  background: isError ? '#fef2f2' : '#f0fdf4',
  color: isError ? '#991b1b' : '#166534',
  padding: '0.125rem 0.5rem',
  borderRadius: '9999px',
  fontSize: '0.7rem',
  fontWeight: 500,
}}>
  {label}
</span>
```

---

## 6. 操作列规范（右对齐）

最右列统一使用 `textAlign: 'right'`，内部使用 `display: 'inline-flex'` + `alignItems: 'center'` + `gap` 横向排列控件。

### 标准控件排列顺序（从左到右）

```
时间信息 | 分隔竖线 | 状态开关 | 三点菜单
```

### 时间信息

日期和时间竖排，日期用 `CalendarDays` 图标，时间用 `Clock3` 图标（来自 `lucide-react`）。

**日期时间格式标准**（与 Dashboard 保持一致）：
- **日期**：`toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })` → 例如 `2025/03/14`
- **时间**：`toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })` → 例如 `09:30:00`

```tsx
const dt = new Date(someISOString);
const dateStr = dt.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
const timeStr = dt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
```

```tsx
<div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#374151', fontSize: '0.8125rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
    <CalendarDays size={12} color="#57606a" />
    <span>{date}</span>
  </span>
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#656d76', fontSize: '0.72rem' }}>
    <Clock3 size={12} color="#57606a" />
    <span>{time}</span>
  </span>
</div>
```

### 分隔线

分割线放置规则：
- **时间 → 三点菜单**：时间信息块与三点菜单之间放分割线（适用于：活跃机器人表、最近通知记录表、通知历史表、所有用户表）
- **时间 → 启停开关**：若操作列同时有 toggle 和三点菜单，分割线放在时间信息块与 toggle 之间，toggle 与三点之间**不加**分割线（适用于：集成表）
- **机器人管理表**（无时间列）：无需分割线

```tsx
<span style={{ color: '#e5e7eb', fontSize: '1rem', flexShrink: 0 }}>|</span>
```

### 状态开关（Toggle Switch）

```tsx
// 封装为独立组件 ToggleSwitch
interface ToggleSwitchProps {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}

function ToggleSwitch({ checked, disabled, onChange }: ToggleSwitchProps) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      style={{
        width: '36px', height: '20px',
        backgroundColor: checked ? '#10b981' : '#cbd5e1',
        borderRadius: '10px',
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: 'none', padding: 0,
        transition: 'background-color 0.2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        width: '16px', height: '16px',
        backgroundColor: 'white',
        borderRadius: '8px',
        position: 'absolute',
        top: '2px',
        left: checked ? '18px' : '2px',
        transition: 'left 0.2s',
      }} />
    </button>
  );
}
```

### 三点菜单按钮

三点菜单按钮**不加外边框**（`border: 'none'`），保持简洁。

```tsx
<button
  type="button"
  onClick={e => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    // 菜单定位：按钮右侧对齐，向下展开
    setMenuPos({ top: rect.bottom + 6, left: rect.right - 132 });
  }}
  style={{
    width: '32px', height: '32px',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    border: 'none',
    borderRadius: '0.5rem',
    backgroundColor: '#ffffff',
    color: '#57606a',
    cursor: 'pointer',
  }}
>
  <MoreHorizontal size={16} />
</button>
```

### 三点菜单浮层（fixed 定位）

```tsx
// 用 fixed 定位避免被 overflow: hidden 的祖先截断
{menuPos && (
  <div
    style={{
      position: 'fixed',
      top: menuPos.top,
      left: menuPos.left,
      minWidth: '132px',
      padding: '0.4rem',
      backgroundColor: '#ffffff',
      border: '1px solid #d0d7de',
      borderRadius: '0.75rem',
      boxShadow: '0 12px 28px rgba(31, 35, 40, 0.12)',
      zIndex: 9999,
    }}
    onClick={e => e.stopPropagation()}
  >
    {menuItems.map(item => (
      <button
        key={item.label}
        type="button"
        onClick={item.action}
        style={{
          width: '100%', textAlign: 'left',
          padding: '0.45rem 0.75rem',
          border: 'none', borderRadius: '0.5rem',
          backgroundColor: 'transparent',
          color: item.danger ? '#cf222e' : '#1f2328',
          cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
        }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f6f8fa'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        {item.label}
      </button>
    ))}
  </div>
)}
```

---

## 7. 筛选器规范（Filter Pills）

### 规范

- 筛选按钮为 pill 形态（`borderRadius: '0.375rem'`，有边框）
- 未激活：灰底（`#f6f8fa`），灰边框（`#d0d7de`），灰字（`#57606a`）
- 激活：蓝底（`#dbeafe`），蓝边框（`#0969da`），蓝字（`#0969da`），`fontWeight: 600`
- 激活态显示数量徽章（`16px` 圆形，深蓝底白字）
- 下拉菜单固定定位在按钮下方：`top: 'calc(100% + 0.375rem)'`, `right: 0`
- 下拉菜单宽度最小 `160px`，有搜索框时 `200px`

### 假代码示例

```tsx
function FilterPill({ label, activeCount, isOpen, onClick }: FilterPillProps) {
  const hasActive = activeCount > 0;
  return (
    <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
      <button
        type="button"
        onClick={onClick}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
          padding: '0.375rem 0.75rem',
          fontSize: '0.8125rem', fontWeight: hasActive ? 600 : 500,
          color: hasActive ? '#0969da' : '#57606a',
          backgroundColor: hasActive ? '#dbeafe' : '#f6f8fa',
          border: `1px solid ${hasActive ? '#0969da' : '#d0d7de'}`,
          borderRadius: '0.375rem', cursor: 'pointer',
        }}
      >
        {label}
        {hasActive && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '16px', height: '16px', borderRadius: '50%',
            backgroundColor: '#0969da', color: 'white',
            fontSize: '0.6rem', fontWeight: 700,
          }}>
            {activeCount}
          </span>
        )}
        <ChevronDown size={13} />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 0.375rem)', right: 0,
          minWidth: '160px', backgroundColor: '#ffffff',
          border: '1px solid #d0d7de', borderRadius: '0.75rem',
          boxShadow: '0 16px 32px rgba(31, 35, 40, 0.15)', zIndex: 30,
          overflow: 'hidden',
        }}>
          {/* 下拉内容 */}
        </div>
      )}
    </div>
  );
}
```

### 下拉菜单溢出裁切问题

**规范：筛选器 pill（及其下拉菜单）必须放置在 header bar 中，不能放置在 `overflowX: 'auto'` 的表格容器内。**

表格外层容器使用 `overflowX: 'auto'` 支持横向滚动，而 CSS `overflow` 会同时约束子元素的 `overflow: visible`，导致 `position: 'absolute'` 的下拉菜单被裁切。将筛选器放在 header bar（不含 overflow 限制的正常流容器）中，`position: 'absolute'` + `zIndex: 30` 即可正常展开。

若确需在滚动容器内放置弹出层（如行内三点菜单），参见第 6 章「三点菜单浮层」——改用 `position: 'fixed'` + `getBoundingClientRect()` 动态计算坐标，完全绕开 overflow 裁切。

```
筛选器 pill   → header bar（无 overflow 限制）→ position: absolute ✅
三点菜单浮层  → 表格行内（祖先有 overflow: auto）→ position: fixed ✅
```

---

## 8. 空状态规范

### 两种空态

1. **完全无数据**：引导性文字 + 简短说明
2. **筛选后无结果**：提示调整筛选条件

```tsx
// 完全无数据
<tr>
  <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
    <p>暂无数据</p>
    <p style={{ marginTop: '0.5rem' }}>点击"新建"添加第一条记录</p>
  </td>
</tr>

// 筛选后无结果
<tr>
  <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
    无匹配结果，请调整筛选条件
  </td>
</tr>
```

---

## 9. 排版比例速查表

| 用途         | fontSize        | fontWeight | color     |
|-------------|----------------|------------|-----------|
| 卡片标题      | `0.9375rem`     | 700        | `#1f2328` |
| 计数/副标题   | `0.8125rem`     | 400        | `#656d76` |
| 行主标题      | `0.875rem`      | 600        | `#1f2328` |
| 行辅助文字    | `0.75rem`       | 400        | `#656d76` |
| 行次级辅助    | `0.72rem`       | 400        | `#9ca3af` |
| 类型徽章      | `0.78rem`       | 600        | 随类型颜色 |
| 状态徽章      | `0.75rem`       | 600        | 随状态颜色 |
| 事件标签      | `0.7rem`        | 500        | 随语义颜色 |
| 操作按钮      | `0.8125rem`     | 500        | white     |
| 三点菜单项    | `0.875rem`      | 500        | `#1f2328` |
| 日期文字      | `0.8125rem`     | 500        | `#374151` |
| 时间文字      | `0.72~0.75rem`  | 400        | `#656d76` |

---

## 10. 行级对齐约定

- 所有 `<td>` 默认 `verticalAlign: 'middle'`（在公共样式常量 `tdStyle` 中设置）
- 图标与文字同行时用 `display: 'inline-flex'`, `alignItems: 'center'`, `gap: '0.3~0.4rem'`
- 第一列与最后一列的 `paddingLeft` / `paddingRight` 统一为 `1.5rem`，保持与卡片边缘的视觉距离

### 公共样式常量（文件末尾统一声明）

```ts
// 放置在组件文件末尾，与组件定义隔离
const tdStyle: React.CSSProperties = {
  padding: '0.875rem 0.75rem',
  verticalAlign: 'middle',
};

const typeBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.2rem 0.6rem',
  borderRadius: '0.375rem',
  fontSize: '0.78rem',
  fontWeight: 600,
  whiteSpace: 'nowrap',
};
```

---

---

## 11. 分页组件规范

### 规范

- **触发条件**：`totalPages > 1` 时才渲染，0/1 页时完全隐藏
- **位置**：表格底部，与表格内容同一卡片内，上方用 `borderTop: '1px solid #e5e7eb'` 分隔，`margin: '1rem 0'`
- **对齐方式**：整体水平居中（`justifyContent: 'center'`）
- **组成**：「上一页」按钮 → 页码按钮列表 → 「下一页」按钮
- **当前页高亮**：蓝底（`#0969da`）白字，无边框
- **非当前页**：透明底，深色字（`#1f2328`），hover 时显示浅灰边框（`1px solid #d0d7de`）
- **禁用态**（首页/末页）：灰字（`#8c959f`），`opacity: 0.7`，`cursor: 'not-allowed'`
- 每页条数固定为常量（本项目 `itemsPerPage = 10`），不提供动态切换

### 逻辑

```ts
const itemsPerPage = 10;
const totalPages = Math.ceil(items.length / itemsPerPage);
const paginatedItems = items.slice(
  (currentPage - 1) * itemsPerPage,
  currentPage * itemsPerPage
);

// 切换筛选条件时重置到第 1 页
useEffect(() => { setCurrentPage(1); }, [filter]);
```

### 假代码示例

```tsx
{totalPages > 1 && (
  <div style={{
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    gap: '0.125rem', margin: '1rem 0',
    paddingTop: '1rem', borderTop: '1px solid #e5e7eb',
  }}>
    {/* 上一页 */}
    <button
      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
      disabled={currentPage === 1}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
        padding: '0.375rem 0.625rem', border: 'none', borderRadius: '0.375rem',
        backgroundColor: 'transparent',
        color: currentPage === 1 ? '#8c959f' : '#0969da',
        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
        fontSize: '0.8125rem', fontWeight: 500,
        opacity: currentPage === 1 ? 0.7 : 1,
      }}
      onMouseEnter={e => { if (currentPage !== 1) e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      <ChevronLeft size={15} />上一页
    </button>

    {/* 页码列表 */}
    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
      <button
        key={page}
        onClick={() => setCurrentPage(page)}
        style={{
          width: '32px', height: '32px',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          border: currentPage === page ? 'none' : '1px solid transparent',
          backgroundColor: currentPage === page ? '#0969da' : 'transparent',
          color: currentPage === page ? 'white' : '#1f2328',
          cursor: 'pointer', borderRadius: '0.375rem',
          fontSize: '0.875rem', fontWeight: currentPage === page ? 600 : 400,
        }}
        onMouseEnter={e => { if (currentPage !== page) e.currentTarget.style.border = '1px solid #d0d7de'; }}
        onMouseLeave={e => { if (currentPage !== page) e.currentTarget.style.border = '1px solid transparent'; }}
      >
        {page}
      </button>
    ))}

    {/* 下一页 */}
    <button
      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
      disabled={currentPage === totalPages}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
        padding: '0.375rem 0.625rem', border: 'none', borderRadius: '0.375rem',
        backgroundColor: 'transparent',
        color: currentPage === totalPages ? '#8c959f' : '#0969da',
        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
        fontSize: '0.8125rem', fontWeight: 500,
        opacity: currentPage === totalPages ? 0.7 : 1,
      }}
      onMouseEnter={e => { if (currentPage !== totalPages) e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      下一页<ChevronRight size={15} />
    </button>
  </div>
)}
```

> **注意**：页码按钮列表直接渲染所有页码，适合页数较少（< 20）的场景。若页数过多，需引入省略号（`...`）截断逻辑，本项目暂未涉及。

---

## 12. 模态框（Modal）规范

本项目存在两种 Modal 形态：**表单型**（新建/编辑）和**详情型**（只读展示）。

### 12.1 通用结构规范

```
遮罩层（fixed 全屏，半透明黑）
  └── 内容面板（白色卡片，居中）
         ├── 头部（标题 + 关闭按钮）
         ├── 内容区（滚动）
         └── 底部操作栏（按钮组）
```

**关键尺寸：**

| 属性 | 值 |
|------|-----|
| 最大宽度（表单型） | `450px` |
| 最大宽度（详情型） | `600px` |
| 宽度 | `width: '90%'`（响应式） |
| 最大高度 | `maxHeight: '90vh'`（表单型）或 `80vh`（详情型） |
| 内容区 | `overflow: 'auto'`（表单型）或 `overflowY: 'auto'`（详情型） |
| 圆角 | `borderRadius: '0.5rem'`（表单型）或 `'0.75rem'`（详情型） |
| 阴影 | `boxShadow: '0 20px 25px rgba(0,0,0,0.15)'` |

**关闭方式：**
- 点击遮罩关闭：遮罩层绑定 `onClick`（表单型）或 `onMouseDown`（详情型，防止内部选文时误关）
- 内容面板阻止冒泡：`onClick={e => e.stopPropagation()}`
- 右上角 `✕` 按钮

**遮罩层样式（固定）：**

```tsx
<div
  style={{
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 50,  // 详情型用 1000 避免被其他浮层遮挡
  }}
  onClick={() => setOpen(false)}
>
```

### 12.2 头部规范

- padding：`1.5rem`
- 底部分隔线：`borderBottom: '1px solid #e5e7eb'`
- 标题：`fontSize: '1.25rem'`, `fontWeight: 600`, `color: '#1f2937'`, `margin: 0`，前缀 emoji 表达语义
- 关闭按钮：无边框无背景，`fontSize: '1.5rem'`，灰色（`#6b7280`），hover 变深（`#1f2937`）

```tsx
{/* 头部 */}
<div style={{
  padding: '1.5rem',
  borderBottom: '1px solid #e5e7eb',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
}}>
  <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>
    🤖 标题文字
  </h2>
  <button
    onClick={() => setOpen(false)}
    style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280', padding: '0.25rem 0.5rem' }}
    onMouseEnter={e => (e.currentTarget.style.color = '#1f2937')}
    onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
  >
    ✕
  </button>
</div>
```

**详情型（彩色头部）变体：**

详情型头部用状态颜色（如 `#1a7f37` 绿色）作背景，白色文字，营造强视觉区分：

```tsx
<div style={{ backgroundColor: getStatusColor(item.status), padding: '1.5rem', color: 'white' }}>
  <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 'bold' }}>{item.title}</h2>
  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', opacity: 0.9 }}>{statusText}</p>
</div>
```

### 12.3 表单区规范

- 内容区 padding：`1.5rem`
- 每个表单组 `marginBottom: '1.5rem'`

**提示文字（info banner）：**

```tsx
<div style={{
  backgroundColor: '#dbeafe', color: '#1e40af',
  padding: '0.75rem', borderRadius: '0.375rem',
  marginBottom: '1.5rem', fontSize: '0.875rem', lineHeight: '1.5',
}}>
  💡 <strong>提示：</strong> 辅助说明文字
</div>
```

**错误提示（error banner）：**

```tsx
{error && (
  <div style={{
    backgroundColor: '#fee2e2', color: '#dc2626',
    padding: '0.75rem', borderRadius: '0.375rem',
    marginBottom: '1.5rem', fontSize: '0.875rem',
  }}>
    ❌ {error}
  </div>
)}
```

**表单字段标准结构：**

```tsx
<div style={{ marginBottom: '1.5rem' }}>
  {/* label */}
  <label style={{
    display: 'block', fontWeight: 500,
    fontSize: '0.875rem', color: '#1f2937', marginBottom: '0.5rem',
  }}>
    字段名称 <span style={{ color: '#ef4444' }}>*</span>  {/* 必填红星 */}
  </label>

  {/* input */}
  <input
    type="text"
    style={{
      width: '100%', padding: '0.5rem',
      border: '1px solid #d1d5db', borderRadius: '0.375rem',
      fontSize: '0.875rem', boxSizing: 'border-box',
      fontFamily: 'inherit',  // URL 类型改用 'monospace'
    }}
  />

  {/* 辅助说明 */}
  <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
    辅助说明文字
  </p>
</div>
```

**多行文本（textarea）特殊样式：**

```tsx
<textarea style={{
  width: '100%', padding: '0.5rem',
  border: '1px solid #d1d5db', borderRadius: '0.375rem',
  fontSize: '0.875rem', boxSizing: 'border-box',
  fontFamily: 'inherit',
  minHeight: '80px',
  resize: 'none',  // 禁止用户拖拽调整大小
}} />
```

### 12.4 底部操作栏规范

- padding：`1.5rem`，上方 `borderTop: '1px solid #e5e7eb'`
- 按钮右对齐（`justifyContent: 'flex-end'`），gap `0.75rem`
- 按钮顺序：**取消（灰）** 在左，**主操作（彩色）** 在右

**取消按钮：**
```tsx
<button
  onClick={() => setOpen(false)}
  style={{
    padding: '0.5rem 1.5rem', borderRadius: '0.375rem', border: 'none',
    backgroundColor: '#e5e7eb', color: '#374151',
    cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
  }}
  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#d1d5db')}
  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#e5e7eb')}
>
  取消
</button>
```

**主操作按钮（含 loading 态）：**
```tsx
<button
  onClick={handleSubmit}
  disabled={isSubmitting}
  style={{
    padding: '0.5rem 1.5rem', borderRadius: '0.375rem', border: 'none',
    backgroundColor: '#10b981',  // 新建用绿色；编辑用蓝色 #3b82f6
    color: 'white',
    cursor: isSubmitting ? 'not-allowed' : 'pointer',
    fontSize: '0.875rem', fontWeight: 500,
    opacity: isSubmitting ? 0.6 : 1,
  }}
  onMouseEnter={e => { if (!isSubmitting) e.currentTarget.style.backgroundColor = '#059669'; }}
  onMouseLeave={e => { if (!isSubmitting) e.currentTarget.style.backgroundColor = '#10b981'; }}
>
  {isSubmitting ? '提交中...' : '✓ 确认'}
</button>
```

**颜色约定：**

| 操作类型 | 主操作按钮色 | Hover 色 |
|---------|------------|---------|
| 新建    | `#10b981`（绿）| `#059669` |
| 编辑/保存 | `#3b82f6`（蓝）| `#2563eb` |
| 危险操作 | `#ef4444`（红）| `#dc2626` |

### 12.5 详情型只读弹窗

详情型弹窗用于查看记录详情，无可编辑表单。结构更简洁：

```tsx
{selectedItem && (
  <div
    style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
    onMouseDown={e => { if (e.target === e.currentTarget) setSelectedItem(null); }}
  >
    <div
      style={{ backgroundColor: 'white', borderRadius: '0.75rem', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      onClick={e => e.stopPropagation()}
    >
      {/* 彩色头部 */}
      <div style={{ backgroundColor: statusColor, padding: '1.5rem', color: 'white' }}>
        <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 'bold' }}>{selectedItem.title}</h2>
        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', opacity: 0.9 }}>{statusText}</p>
      </div>

      {/* 正文（可滚动） */}
      <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
        {/* 键值对字段 */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
            字段名称
          </label>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>
            {selectedItem.fieldValue || '未指定'}
          </p>
        </div>

        {/* 代码/长文本区块 */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
            详细内容
          </label>
          <div style={{
            fontSize: '0.875rem', color: '#374151', lineHeight: '1.6',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            backgroundColor: '#f9fafb', padding: '0.75rem',
            borderRadius: '0.375rem', border: '1px solid #e5e7eb',
          }}>
            {selectedItem.content}
          </div>
        </div>
      </div>

      {/* 底部栏：时间戳左、关闭按钮右 */}
      <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          🕐 {new Date(selectedItem.createdAt).toLocaleString('zh-CN')}
        </span>
        <button
          onClick={() => setSelectedItem(null)}
          style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
        >
          关闭
        </button>
      </div>
    </div>
  </div>
)}
```

---

## 13. 搜索框规范

### 规范

- **位置**：表格卡片**外部右上角**，`display: 'flex', justifyContent: 'flex-end'`；底部留 `marginBottom: '1.25rem'` 与卡片间距
- **形态**：胶囊形（`borderRadius: '2rem'`），白色背景，带边框（`1px solid #d0d7de'`）
- **内部结构**：搜索图标（`Search` from `lucide-react`, `size={14}`, `color="#57606a"`）+ `<input>`，水平排列，`gap: '0.5rem'`
- **宽度**：固定宽度（`220px` 单字段，`240px` 多字段时稍宽），不随焦点伸缩
- **input 样式**：无边框无轮廓，透明背景，`fontSize: '0.8125rem'`，`width: '100%'`

### 与筛选器的区别

| | 搜索框 | 筛选器 pill |
|---|---|---|
| 位置 | 卡片外，右上角 | 卡片内，标题栏右侧 |
| 形态 | 胶囊，常驻展开 | 矩形按钮，点击下拉 |
| 功能 | 文字模糊搜索 | 枚举值精确筛选 |
| 状态变化 | 无激活态样式 | 激活时蓝色高亮 |

### 假代码示例

```tsx
{/* 搜索框：卡片外右上角 */}
<div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
  <div style={{
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.4rem 0.75rem',
    border: '1px solid #d0d7de',
    borderRadius: '2rem',
    backgroundColor: 'white',
    width: '220px',
  }}>
    <Search size={14} color="#57606a" />
    <input
      type="text"
      placeholder="搜索名称"
      value={searchQuery}
      onChange={e => {
        setSearchQuery(e.target.value);
        setCurrentPage(1);  // 搜索时重置分页
      }}
      style={{
        border: 'none', outline: 'none',
        fontSize: '0.8125rem', width: '100%',
        color: '#24292f', backgroundColor: 'transparent',
      }}
    />
  </div>
</div>
```

### 搜索逻辑约定

- 搜索范围：仅对**主标题字段**做模糊匹配（`toLowerCase().includes()`），不搜索辅助字段
- 实时过滤：`onChange` 直接过滤，不需要防抖（数据量小，全在前端）
- 清空恢复：输入框清空即恢复全量显示，无需额外「清除」按钮
- 分页重置：任何搜索输入都触发 `setCurrentPage(1)`

```ts
// 过滤逻辑
const displayed = items.filter(item =>
  searchQuery.trim() === '' ||
  item.name.toLowerCase().includes(searchQuery.toLowerCase())
);
```
