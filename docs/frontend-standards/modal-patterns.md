# 弹窗组件规范
**版本：** v1.1.0 | **更新时间：** 2026-03-14 | **内容：** 补充标题颜色/颜文字/关闭按钮规范；MCP配置引导改蓝色风格；复制按钮禁止颜文字

---

## 概述

本规范基于飞书 AI 通知系统前端实践，对项目中所有弹窗（Modal）进行分类定义，并总结页面结构、关闭机制、视觉样式等可复用规范。

弹窗分为三类，其关闭方式与交互意图密切相关：

| 类型 | 典型场景 | 是否可点背景关闭 |
|------|----------|-----------------|
| 数据录入弹窗 | 新建/编辑用户、机器人 | ❌ 禁止 |
| 向导型弹窗 | 多步骤配置集成 | ✅ 允许 |
| 结果展示弹窗 | 操作成功 + 配置引导 | ❌ 禁止（含关键信息） |

---

## 一、数据录入弹窗（Data Entry Modal）

### 定义

用户在弹窗内填写表单字段（input、textarea、select 等）时使用。由于用户操作过程中存在误触背景的风险，**必须禁止点击背景关闭**。

### 现有实例

- `Settings.tsx` → 新建/编辑用户弹窗（`userModal`）
- `Robots.tsx` → 编辑机器人弹窗（`isEditRobotModalOpen`）
- `Robots.tsx` → 新建机器人弹窗（`isAddRobotModalOpen`）

### 关闭机制

**唯一合法关闭入口**：
1. 头部右侧的 ✕ 按钮
2. 底部的「取消」按钮

**禁止**在外层遮罩 `div` 上注册 `onClick` 关闭，**禁止**在内层卡片 `div` 上对应地注册 `stopPropagation`。

```tsx
// ✅ 正确结构
<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
  <div style={{ background: 'white', borderRadius: '0.5rem',
    boxShadow: '0 20px 25px rgba(0,0,0,0.15)', width: '100%', maxWidth: '480px' }}>
    {/* 内容 */}
  </div>
</div>

// ❌ 错误写法（已废弃）
<div onClick={() => setModal(false)}>               {/* 遮罩层绑定 onClick */}
  <div onClick={e => e.stopPropagation()}>          {/* 内层阻止冒泡 */}
```

### 结构规范

```tsx
{isModalOpen && (
  <div style={{
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  }}>
    <div style={{
      background: 'white',
      borderRadius: '0.5rem',
      boxShadow: '0 20px 25px rgba(0,0,0,0.15)',
      width: '100%',
      maxWidth: '480px',        // 简单表单用 480px
    }}>

      {/* 头部区域 */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>
          弹窗标题
        </h2>
        <button onClick={onClose} style={{
          background: 'none', border: 'none',
          fontSize: '1.25rem', cursor: 'pointer', color: '#6b7280',
        }}>✕</button>
      </div>

      {/* 内容区域 */}
      <div style={{ padding: '1.5rem' }}>
        {/* 表单字段 */}
      </div>

      {/* 底部按钮区 */}
      <div style={{
        padding: '1rem 1.5rem',
        borderTop: '1px solid #e5e7eb',
        display: 'flex', gap: '0.75rem', justifyContent: 'flex-end',
      }}>
        <button onClick={onClose} style={{
          padding: '0.5rem 1.25rem',
          background: '#e5e7eb', color: '#374151',
          border: 'none', borderRadius: '0.375rem',
          cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
        }}>取消</button>
        <button onClick={onSubmit} style={{
          padding: '0.5rem 1.25rem',
          background: '#3b82f6', color: 'white',
          border: 'none', borderRadius: '0.375rem',
          cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
        }}>确认</button>
      </div>

    </div>
  </div>
)}
```

### 尺寸规范

| 场景 | maxWidth |
|------|----------|
| 简单表单（2列以内） | `480px` |
| 复杂表单/多字段 | `560px` |
| 多步骤向导 | 见第二章 |

---

## 二、向导型弹窗（Wizard Modal）

### 定义

引导用户分步完成复杂配置的弹窗。每步内容差异较大，整体为「流程型」而非「一次性提交型」。允许用户点背景取消整个流程（视为「放弃操作」而非误触）。

### 现有实例

- `Integrations.tsx` → 添加/编辑集成弹窗（`IntegrationModal`）

### 关闭机制

使用 `onMouseDown` + `e.target === e.currentTarget` 判断，**不使用 `onClick`**；内层卡片用 `ref` + `onMouseDown = e.stopPropagation()` 隔离。

使用 `onMouseDown` 而非 `onClick` 的原因：`onClick` 会把鼠标按下（在卡片内）然后拖拽到背景释放的操作也判定为关闭，存在误触；`onMouseDown` 则只在遮罩层上按下时才触发，更精准。

```tsx
// ✅ 正确写法
const modalRef = useRef<HTMLDivElement>(null);

<div
  style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50,
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    padding: '2rem 1rem', overflowY: 'auto' }}
  onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
>
  <div
    ref={modalRef}
    style={{ background: 'white', borderRadius: '0.5rem',
      boxShadow: '0 20px 25px rgba(0,0,0,0.15)',
      width: '100%', maxWidth: '580px', margin: 'auto' }}
    onMouseDown={e => e.stopPropagation()}
  >
    {/* 内容 */}
  </div>
</div>
```

### 步骤指示条

向导型弹窗在头部下方显示步骤进度条：

```tsx
{/* 步骤指示条 */}
<div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f3f4f6',
  display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
  {[1, 2, 3].map((s, i) => {
    const isDone = s < currentStep;
    const isActive = s === currentStep;
    return (
      <React.Fragment key={s}>
        {i > 0 && (
          <div style={{ flex: 1, height: '2px',
            background: isDone ? '#3b82f6' : '#e5e7eb', minWidth: '20px' }} />
        )}
        <div style={{
          width: '24px', height: '24px', borderRadius: '50%',
          background: isDone || isActive ? '#3b82f6' : '#e5e7eb',
          color: isDone || isActive ? 'white' : '#9ca3af',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.75rem', fontWeight: 700,
        }}>
          {isDone ? '✓' : s}
        </div>
      </React.Fragment>
    );
  })}
</div>
```

### 尺寸规范

| 场景 | maxWidth | overflowY |
|------|----------|-----------|
| 多步骤向导 | `580px` | 外层 `overflowY: 'auto'` |

---

## 三、结果展示弹窗（Result Display Modal）

### 定义

操作成功后展示结果数据（如密钥、配置信息）的弹窗。这类弹窗含有「仅此一次」的关键信息（如 Webhook Secret），**禁止点击背景关闭**，避免用户未记录就误关弹窗。

### 现有实例

- `Integrations.tsx` → 集成创建成功 / 配置引导弹窗（`CreatedGuideModal`）

### 关闭机制

仅通过头部 ✕ 按钮关闭，遮罩层不注册任何点击事件。

```tsx
// ✅ 正确结构
<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
  zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '1.5rem' }}>
  <div style={{ background: 'white', borderRadius: '0.75rem',
    boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
    width: '100%', maxWidth: '560px', maxHeight: '90vh', overflow: 'auto' }}>
    {/* 内容 */}
  </div>
</div>
```

### 头部色彩规范

结果展示弹窗的头部背景根据状态使用彩色标识（区别于普通弹窗的白色头部）：

| 场景 | 背景色 | 标题颜色 | 副标题颜色 |
|------|--------|----------|-----------|
| 成功创建 | `#f0fdf4`（绿） | `#1f2937`（黑） | `#059669` |
| 查看说明 | `#eef2ff`（蓝紫） | `#1f2937`（黑） | `#6366f1` |

---

## 四、zIndex 层级体系

| 层级 | 值 | 使用场景 |
|------|----|----------|
| 下拉菜单 / Popover | `9999` | 表格行操作菜单、筛选器下拉 |
| 嵌套弹窗（结果展示） | `60` | 在已有弹窗上叠加展示的第二层弹窗 |
| 主弹窗（向导 / 编辑） | `50` | 页面级主弹窗（Robots、Integrations） |
| 全局弹窗 | `1000` | 跨页面使用的通用弹窗（Settings UserModal） |

> **原则**：嵌套弹窗（在弹窗上弹出的弹窗）zIndex 必须高于父弹窗；`9999` 仅用于不与弹窗叠加的浮层元素。

---

## 五、共同样式规范

### 遮罩层

```tsx
{
  position: 'fixed',
  inset: 0,                              // 等价于 top/left/right/bottom 均为 0
  background: 'rgba(0,0,0,0.5)',         // 标准遮罩
  // 或 rgba(0,0,0,0.55) 用于深色遮罩（结果弹窗）
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,                            // 见层级体系
}
```

### 弹窗卡片

```tsx
{
  background: 'white',
  borderRadius: '0.5rem',                // 小圆角（数据录入）
  // 或 borderRadius: '0.75rem'          // 大圆角（结果展示）
  boxShadow: '0 20px 25px rgba(0,0,0,0.15)',
  // 或 boxShadow: '0 25px 50px rgba(0,0,0,0.2)'  // 加深版
  width: '100%',
  maxWidth: '480px',                     // 见尺寸规范
}
```

### 头部区域

```tsx
{
  padding: '1.25rem 1.5rem',
  borderBottom: '1px solid #e5e7eb',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}
```

- 标题：`fontSize: '1.125rem', fontWeight: 600, color: '#1f2937'`（一律用黑色，即使头部背景是彩色）
- 标题文字：**禁止**在标题文字前加颜文字（emoji）
- ✕ 按钮：`fontSize: '1.25rem', color: '#6b7280'`，hover 变 `#1f2937`

### 底部按钮区

```tsx
{
  padding: '1rem 1.5rem',
  borderTop: '1px solid #e5e7eb',
  display: 'flex',
  gap: '0.75rem',
  justifyContent: 'flex-end',           // 按钮靠右
}
```

| 按钮 | background | color |
|------|-----------|-------|
| 取消 | `#e5e7eb` | `#374151` |
| 主操作 | `#3b82f6` | `white` |
| 主操作（禁用） | `#3b82f6` + `opacity: 0.6` | white |
| 主操作（hover） | `#2563eb` | white |
| 关闭（结果/引导弹窗） | `#e5e7eb` | `#374151` |

> **原则**：关闭按钮与取消按钮采用相同的灰色样式，无论是弹窗内探、还是底部独立展示的关闭按钮。

---

## 六、Label 与复制按钮规范

### Label 标签
- **禁止在 label 文字前加颜文字**：`接收地址`、`Webhook Secret` 等加频闪烁的 label 不加 emoji
- 如需视觉强调，可用颜色区分（如 `color: '#dc2626'`）

### 复制按钮
- 未复制状态：**纯文字 `复制`**，不加 emoji
- 已复制状态：`✓ 已复制`（成功符 `✓` 不算 emoji，可保留）
- 按钮内的 emoji（`📋`、`✅` 等）均不允许使用

---

## 七、MCP 引导块样式规范

`VscodeChatMcpGuide` 组件内嵌在配置引导弹窗中，展示 MCP 环境变量、远端配置等内容。展示风格应与其他平台配置步骤保持一致（蓝色系列）。

| 属性 | 值 |
|------|-----|
| 容器背景 | `#dbeafe` |
| 容器边框 | `#bfdbfe` |
| 区块标题颜色 | `#1e40af` |
| 说明文字颜色 | `#1d4ed8` |
| 复制按钮背景 | `#3b82f6`（统一蓝色，与其他复制按钮一致）|
| 底部提示条 | `background: '#dbeafe'`, `color: '#1e40af'` |

区块标题文字：**禁止加颜文字**（如 `MCP 远端配置`，不能写成 `🤖 MCP 远端配置`）。

---

## 八、各类型对比汇总

| 对比项 | 数据录入弹窗 | 向导型弹窗 | 结果展示弹窗 |
|--------|------------|-----------|------------|
| 点击背景关闭 | ❌ 禁止 | ✅ 允许 | ❌ 禁止 |
| 关闭事件 | 无（遮罩无事件） | `onMouseDown` + target 判断 | 无（遮罩无事件） |
| 内层 stopPropagation | ❌ 不需要 | ✅ `onMouseDown` 阻止 | ❌ 不需要 |
| maxWidth | 480px | 580px | 560px |
| 头部样式 | 白色 | 白色 | 彩色（状态相关） |
| ✕ 按钮 | ✅ 有 | ✅ 有 | ✅ 有 |
| 取消按钮 | ✅ 有 | ✅ 有（底部） | ❌ 通常无 |
| zIndex | 1000 / 50 | 50 | 60 |
| overflow 滚动 | 卡片内 `overflow: auto` | 外层 `overflowY: auto` | 卡片内 `overflow: auto` |

---

## 九、历史问题记录

### 误触关闭 Bug（已修复）

**问题描述**：Settings.tsx 与 Robots.tsx 的数据录入弹窗在遮罩层注册了 `onClick` 关闭处理，内层卡片用 `stopPropagation` 拦截，但用户在输入框之间切换焦点/点击时，有时会因鼠标落在卡片外边缘而触发关闭。

**修复版本**：v1.3.49

**修复方案**：移除遮罩层 `onClick`，同时移除内层卡片的 `stopPropagation`（不再需要）。弹窗只能通过 ✕ 和取消按钮关闭。

**涉及文件**：
- `frontend/src/pages/Settings.tsx` — UserModal
- `frontend/src/pages/Robots.tsx` — EditRobotModal、AddRobotModal
