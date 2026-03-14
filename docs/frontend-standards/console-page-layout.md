# 控制台型页面布局规范
**版本：** v1.0.0 | **更新时间：** 2026-03-15 | **内容：** 初稿，基于 Services.tsx 实现提炼，覆盖服务卡片、呼吸灯、实时日志面板的设计规范

---

## 概述

"控制台型页面"指以**运行状态监控 + 实时日志**为核心的管理页，典型实例为**服务管理页（Services.tsx）**。

此类页面的核心特征：

- 展示多个可操作实体（服务、进程）的实时状态
- 包含动态刷新的实时日志/输出流面板
- 配色深沉（日志区使用深色背景）
- 通过动画（呼吸灯、旋转加载器）传达实时状态

---

## 1. 整体布局结构

### 规范

控制台页面无左侧菜单，采用**全宽单栏竖向流式布局**：

```tsx
<div style={{ backgroundColor: '#f6f8fa', minHeight: '100vh', paddingBottom: '2rem' }}>
  <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>

    {/* 错误提示条（可选） */}
    {error && <ErrorBanner message={error} />}

    {/* 服务卡片列表 */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
      {services.map(service => <ServiceCard key={service.id} service={service} />)}
    </div>

    {/* 实时日志面板（固定在底部区域） */}
    <LogPanel />

  </div>
</div>
```

**与普通列表页的差异：**
- 页面背景色 `#f6f8fa`（略冷于普通页的 `#f3f4f6`）
- 无 `PageTitle` 组件（页面由卡片标题和面板标题自成层级）
- 服务卡片之间 `gap: 1rem`（比普通列表更紧凑）

---

## 2. 服务状态卡片

### 2.1 卡片容器

卡片为横向宽条形式，使用 flex 横向布局，分为 4 个区域：

```
[ 左侧标识带（状态色） | 中间：名称+描述 | 右侧：统计数据 | 操作按钮 ]
```

```tsx
<div style={{
  background: 'white',
  borderRadius: '0.75rem',       /* 控制台卡片圆角略大，0.75rem */
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  overflow: 'hidden',
  display: 'flex',
  transition: 'all 0.2s',
}}>
```

**hover 微浮效果：**
```tsx
onMouseEnter={e => {
  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
  e.currentTarget.style.transform = 'translateY(-1px)';
}}
onMouseLeave={e => {
  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
  e.currentTarget.style.transform = 'translateY(0)';
}}
```

> 控制台卡片的 hover 使用 `translateY(-1px)` 微抬效果，比普通表格行更有立体感，传达「可交互实体」的视觉反馈。

### 2.2 左侧状态标识带

标识带宽度固定（`minWidth: 160px`），使用渐变色背景，颜色随服务状态变化：

```tsx
<div style={{
  background: getStatusColor(service.status),
  color: 'white',
  padding: '1.25rem 1.5rem',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '160px',
  gap: '0.75rem',
  flexShrink: 0,
}}>
```

**状态渐变色映射：**

| 状态 | 渐变色 | 语义 |
|------|--------|------|
| `running` | `linear-gradient(135deg, #10b981, #059669)` | 绿色，健康运行 |
| `stopped` | `linear-gradient(135deg, #6b7280, #4b5563)` | 灰色，已停用 |
| `error` | `linear-gradient(135deg, #ef4444, #dc2626)` | 红色，异常 |
| 默认 | `linear-gradient(135deg, #3b82f6, #2563eb)` | 蓝色，未知 |

渐变方向统一为 `135deg`（左上→右下）。

### 2.3 呼吸灯（Pulse 动画）

标识带内的状态指示点在 `running` 状态下显示呼吸灯动画：

```tsx
{/* 状态徽章容器 */}
<div style={{
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.375rem',
  background: 'rgba(255,255,255,0.2)',   /* 磨砂玻璃感 */
  padding: '0.25rem 0.75rem',
  borderRadius: '1rem',
  fontSize: '0.75rem',
  fontWeight: 600,
  whiteSpace: 'nowrap',
}}>
  {/* 呼吸灯圆点 */}
  <span style={{
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.9)',
    animation: service.status === 'running' ? 'pulse 2s infinite' : 'none',
    flexShrink: 0,
  }} />
  {getStatusLabel(service.status)}
</div>
```

**呼吸灯 keyframes 定义：**

```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.5; }
}
```

**使用规则：**

| 规则 | 说明 |
|------|------|
| 仅 `running` 状态激活 | `stopped`/`error` 状态不播放，使用 `animation: 'none'` |
| 周期 2s，无限循环 | `pulse 2s infinite` |
| 颜色为白色半透明 | 显示在彩色背景上，圆点为 `rgba(255,255,255,0.9)` |
| 尺寸固定 6×6px | 过大会喧宾夺主；过小则难以察觉 |
| 动画方式用 opacity | 不用 scale/transform，避免影响布局 |

> **设计意图**：呼吸灯在彩色标识带内，视觉上属于状态徽章的一部分，而非独立悬浮点。opacity 呼吸而非大小呼吸，更贴合"持续运行中"的平静感。

### 2.4 中间信息区

服务名称、类型标签、描述文本纵向排列，布局自由伸展（`flex: 1`）：

```tsx
<div style={{ padding: '1.25rem 1.5rem', flex: 1, borderRight: '1px solid #f3f4f6', minWidth: 0 }}>
  {/* 主标题 */}
  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', marginBottom: '0.25rem' }}>
    {service.name}
  </div>
  {/* 类型标签（灰色小字） */}
  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
    {service.type}
  </div>
  {/* 描述 */}
  <p style={{ fontSize: '0.8125rem', color: '#6b7280', lineHeight: 1.5, margin: 0 }}>
    {service.description}
  </p>
</div>
```

**错误内联提示块**（仅 `error` 状态显示）：

```tsx
<div style={{
  marginTop: '0.75rem',
  padding: '0.5rem 0.75rem',
  backgroundColor: '#fef2f2',
  borderRadius: '0.375rem',
  borderLeft: '3px solid #ef4444',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
}}>
  <SceneIcon name="warning" size={18} title="服务异常" />
  <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>{service.lastError}</span>
</div>
```

### 2.5 右侧统计数据区

横向并排多个数字指标，每项居中对齐：

```tsx
<div style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '2rem', borderRight: '1px solid #f3f4f6', flexShrink: 0 }}>
  {service.stats.map((stat, idx) => (
    <div key={idx} style={{ textAlign: 'center', minWidth: '60px' }}>
      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem', whiteSpace: 'nowrap' }}>
        {stat.label}
      </div>
      <div style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1f2937', lineHeight: 1.2 }}>
        {stat.value}
      </div>
    </div>
  ))}
</div>
```

**数字样式规范：**
- 数值字号：`1.375rem`（22px），fontWeight 700
- 标签字号：`0.75rem`，颜色 `#9ca3af`
- 同区域内 items 间距：`gap: 2rem`

**定时倒计时块**（仅 `isScheduled` 服务显示）：

```tsx
<div style={{
  textAlign: 'center',
  minWidth: '80px',
  padding: '0.5rem',
  backgroundColor: '#f0f9ff',
  borderRadius: '0.375rem',
  borderLeft: '3px solid #3b82f6',
}}>
  <div style={{ fontSize: '0.7rem', color: '#1e40af', fontWeight: 600, marginBottom: '0.125rem' }}>下次运行</div>
  <div style={{ fontSize: '0.8rem', color: '#0284c7', fontWeight: 500 }}>{formatCountdown(...)}</div>
</div>
```

### 2.6 操作按钮区

平铺排列，按钮宽度由内容决定（`whiteSpace: nowrap`）：

```tsx
<div style={{ padding: '1.25rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
```

**主操作按钮（停止/启动，颜色随状态变化）：**
```tsx
background: service.status === 'running' ? '#ef4444' : '#3b82f6'
```

**次操作按钮（重启，描边样式）：**
```tsx
border: '1px solid #3b82f6', background: 'white', color: '#3b82f6'
```

**禁用态（操作进行中）：**
```tsx
opacity: operatingServiceId === service.id ? 0.5 : 1
cursor: operatingServiceId === service.id ? 'not-allowed' : 'pointer'
```

---

## 3. 实时日志面板

### 3.1 面板容器

日志面板位于服务卡片列表下方，使用白色卡片包裹：

```tsx
<div style={{
  background: 'white',
  borderRadius: '0.75rem',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  padding: '1.5rem',
}}>
```

### 3.2 面板头部

包含标题（左）和刷新控制按钮（右）：

```tsx
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
  {/* 标题 + 条数徽章 */}
  <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
    <SceneIcon name="history" size={24} title="实时日志" />
    <span>实时日志</span>
    {/* 条数徽章 */}
    {activeLogs.length > 0 && (
      <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', background: '#f3f4f6', padding: '0.125rem 0.5rem', borderRadius: '1rem' }}>
        {activeLogs.length} 条
      </span>
    )}
  </div>

  {/* 自动刷新切换按钮 */}
  <button style={{
    padding: '0.375rem 0.75rem',
    border: '1px solid #d1d5db',
    background: autoRefresh ? '#dbeafe' : 'white',
    color: autoRefresh ? '#1e40af' : '#6b7280',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 500,
  }}>
    {autoRefresh ? '自动刷新' : '暂停刷新'}
  </button>
</div>
```

**条数徽章规范：**条数为 0 时不显示（条件渲染）；圆形胶囊样式，背景 `#f3f4f6`，字色 `#6b7280`。

### 3.3 深色终端日志区

核心日志输出区域使用**深色背景**（终端风格）：

```tsx
<div style={{
  background: '#1f2937',              /* 深灰黑底 */
  color: '#10b981',                   /* 默认绿色文字（终端绿） */
  fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
  fontSize: '0.75rem',
  padding: '1rem',
  borderRadius: '0.375rem',
  maxHeight: '600px',
  overflowY: 'auto',
  lineHeight: 1.6,
}}>
```

**日志行颜色语义：**

| 元素 | 颜色 | 说明 |
|------|------|------|
| 时间戳 `[timestamp]` | `#9ca3af` | 浅灰，降低视觉权重 |
| 级别 `[INFO]` | `#60a5fa` | 蓝色，一般日志 |
| 级别 `[WARN]` | `#fbbf24` | 黄色，警告 |
| 级别 `[ERROR]` | `#f87171` | 红色，错误 |
| 服务名称 `[service]` | `#fbbf24` | 黄色，与 WARN 用同色 |
| 来源徽章 `[来源:x/y]` | `#34d399` | 绿色，人工触发来源 |
| 机器人徽章 `[机器人:x]` | `#22d3ee` | 青色，机器人来源 |
| 集成徽章 `[集成:x]` | `#c4b5fd` | 紫色，集成来源 |
| 日志正文 | `#10b981` | 终端绿（默认文字色） |

> **选色原则**：使用亮度较高的饱和色（非纯白），在深色背景上保持可读性，同时用色相区分不同来源/级别，方便快速扫读。

### 3.4 过滤下拉框

日志区上方有服务过滤器，使用原生 `<select>` 元素，样式与全局输入框一致：

```tsx
<select style={{
  padding: '0.5rem 0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
  backgroundColor: 'white',
  cursor: 'pointer',
  color: '#1f2937',
  fontFamily: 'inherit',
}}>
```

**focus 状态（通过 `<style>` 注入）：**
```css
select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
```

---

## 4. 加载状态页

控制台页面在初始加载时展示**全屏加载遮罩**（非骨架屏），包含旋转 spinner + 提示文字 + 底部状态栏：

```tsx
<div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f3f4f6' }}>
  {/* 居中 spinner */}
  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1.5rem' }}>
    <div style={{
      width: '60px', height: '60px',
      border: '4px solid #e5e7eb',
      borderTop: '4px solid #3b82f6',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    }} />
    <p style={{ fontSize: '1rem', color: '#6b7280', fontWeight: 500 }}>加载服务中...</p>
  </div>

  {/* 底部状态栏 */}
  <div style={{ padding: '1.5rem', borderTop: '1px solid #e5e7eb', backgroundColor: 'white', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
    正在加载服务列表，请稍候...
  </div>
</div>
```

**旋转 keyframes 定义：**
```css
@keyframes spin {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

**规范：**
- spinner 尺寸 60px，边框 4px，底色 `#e5e7eb`，转动色 `#3b82f6`
- 周期 1s，`linear`（匀速旋转，不使用 ease-in-out）
- 底部状态栏为独立白色条，提供上下文说明

---

## 5. 动画汇总

控制台页面使用两种动画，通过 `<style>` 标签注入（JSX inline keyframes）：

```tsx
<style>{`
  @keyframes spin {
    0%   { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.5; }
  }
`}</style>
```

| 动画名 | 用途 | 时长 | 曲线 | 触发条件 |
|--------|------|------|------|---------|
| `spin` | 加载旋转器 | 1s | `linear` | 页面初始加载 |
| `pulse` | 呼吸灯（运行中状态点） | 2s | 默认（ease） | `service.status === 'running'` |

**禁止使用的动画：**
- `bounce`、`wobble`：过于活泼，不适合系统监控场景
- `fadeIn`/`slideIn`：服务卡片无进入动画，避免列表刷新时的视觉跳动

---

## 6. 自动刷新机制规范

控制台页面通常需要定期自动刷新数据：

```tsx
// 每 5 秒自动刷新日志
const logInterval = setInterval(() => {
  if (autoRefresh) fetchLogs();
}, 5000);
```

**规范：**
- 刷新间隔：日志 **5 秒**，服务状态可随日志一并刷新或按需刷新
- 用户可切换「自动刷新/暂停刷新」，切换后立即生效
- 组件卸载时必须 `clearInterval`（`useEffect` cleanup）
- 刷新期间不显示 loading 状态，静默更新（避免闪烁）

---

## 7. 使用检查清单

新建控制台型页面时，逐项检查：

- [ ] 页面背景色 `#f6f8fa`（略冷于普通页）
- [ ] 服务卡片为横向宽条，圆角 `0.75rem`，有 `translateY(-1px)` hover 微浮
- [ ] 左侧标识带宽度 `minWidth: 160px`，使用渐变色（映射表见第 2.2 节）
- [ ] `running` 状态有呼吸灯：6px 圆点 `pulse 2s infinite opacity`
- [ ] 非 `running` 状态呼吸灯 `animation: 'none'`
- [ ] 日志区背景 `#1f2937`，字体 `monospace`，默认字色终端绿 `#10b981`
- [ ] 日志行使用语义配色（时间戳灰、级别蓝/黄/红、来源绿/青/紫）
- [ ] `<style>` 标签内定义 `spin` 和 `pulse` keyframes
- [ ] 自动刷新逻辑使用 `setInterval` + `clearInterval`（cleanup）
- [ ] 全屏加载态：60px spinner + 底部状态栏，spinner 颜色 `#3b82f6`
