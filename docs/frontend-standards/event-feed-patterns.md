# 事件流型列表规范
**版本：** v1.0.0 | **更新时间：** 2026-03-15 | **内容：** 初稿，基于 Settings.tsx 审计日志实现提炼，覆盖事件流布局、操作徽章、图标圆、时间戳等设计规范

---

## 概述

"事件流型列表"（Event Feed）是本系统中与管理型表格并列的第二种列表形式，典型实例为**设置页-审计日志（Settings.tsx）**。

### 与管理型表格的本质区别

| 特征 | 管理型表格（table-patterns.md） | 事件流型列表（本文档） |
|------|-------------------------------|----------------------|
| HTML 结构 | `<table>` + `<thead>` + `<tbody>` | `<div>` flex 布局，无列头 |
| 数据语义 | "可管理的实体"（机器人、用户、集成） | "已发生的事件"（操作记录、日志） |
| 主轴 | ID / 名称 | 时间（倒序） |
| 操作 | 有 CRUD 按钮（编辑、删除） | 只读，无操作按钮 |
| 排列方式 | 固定列宽、多列横排 | 单条竖排，信息密度变化 |
| 视觉锚点 | 列头对齐 | 圆形图标 + 颜色系统 |

> **命名说明**：虽然用户习惯上会称之为"日志表格"，在技术实现和规范层面应使用"事件流"命名，以区分 HTML `<table>` 结构。日常交流两者混用均可接受。

---

## 1. 整体容器结构

事件流使用与管理型表格相同的白色卡片容器：

```tsx
<div style={{
  background: 'white',
  borderRadius: '0.5rem',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  overflow: 'hidden',
}}>
  {/* 标题栏 */}
  <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>操作记录</span>
    {/* 右侧：筛选器 */}
  </div>

  {/* 条目列表区，内边距仅左右（由条目自己定义上下） */}
  <div style={{ padding: '0.5rem 1.5rem' }}>
    {items.map(item => <FeedItem key={item.id} item={item} />)}

    {/* 分页控件 */}
    <div style={{ padding: '1rem 0', borderTop: '1px solid #e5e7eb' }}>...</div>
  </div>
</div>
```

**关键差异（对比管理型表格）：**
- 条目区内边距：左右 `1.5rem`，上下 `0.5rem`（条目行内自定义 padding）
- 无 `overflowX: auto` 包裹（无需横向滚动）
- 无 `minWidth` 约束

---

## 2. 单条事件项结构

每条事件记录由三部分横向排列：**圆形图标** + **内容区** + **时间戳**。

```tsx
<div style={{
  display: 'flex',
  alignItems: 'flex-start',    /* 顶部对齐，允许内容区多行展开 */
  gap: '1rem',
  padding: '0.875rem 0',
  borderBottom: '1px solid #f3f4f6',
}}>
  {/* 1. 圆形图标 */}
  <div style={{
    width: 32, height: 32,
    borderRadius: '50%',
    background: actionColor + '20',   /* 10% 透明度背景 */
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,                    /* 禁止压缩 */
    color: actionColor,
  }}>
    <SceneIcon name={actionIcon} size={16} inheritColor />
  </div>

  {/* 2. 内容区 */}
  <div style={{ flex: 1, minWidth: 0 }}>
    {/* 第一行：操作徽章 + 资源类型 */}
    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1f2937' }}>
      <span style={{                  /* 操作徽章，见第3章 */
        padding: '0.15rem 0.5rem',
        borderRadius: '0.25rem',
        background: actionColor + '20',
        color: actionColor,
        fontWeight: 600,
        fontSize: '0.8rem',
        marginRight: '0.5rem',
      }}>
        {actionLabel}
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', verticalAlign: 'middle' }}>
        <SceneIcon name={resourceIcon} size={13} />
        {resourceLabel}
      </span>
    </div>
    {/* 第二行：操作描述 */}
    <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.125rem' }}>
      {description}
    </div>
    {/* 第三行：执行用户 */}
    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
      用户：{username}
    </div>
  </div>

  {/* 3. 时间戳 */}
  <div style={{ fontSize: '0.75rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>
    {new Date(createdAt).toLocaleString('zh-CN')}
  </div>
</div>
```

---

## 3. 操作类型颜色系统

事件流的颜色以**操作行为**为语义核心，所有颜色应用均基于 `actionColor`：

### 3.1 操作颜色映射表

| 操作 action | 中文标签 | 颜色值 | 语义 |
|-------------|---------|--------|------|
| `create` | 创建 | `#10b981` | 绿色，积极新增 |
| `start` | 启动 | `#10b981` | 绿色，同"创建" |
| `login` | 登录 | `#3b82f6` | 蓝色，身份认证 |
| `update` | 更新 | `#f59e0b` | 黄色，中性变更 |
| `change_password` | 修改密码 | `#f59e0b` | 黄色，同"更新" |
| `reset_password` | 重置密码 | `#f59e0b` | 黄色，同"更新" |
| `logout` | 登出 | `#f59e0b` | 黄色，状态变更 |
| `delete` | 删除 | `#ef4444` | 红色，不可逆删除 |
| `stop` | 关闭 | `#ef4444` | 红色，同"删除" |
| 默认 | — | `#6b7280` | 灰色，未知操作 |

### 3.2 颜色的三处使用

相同 `actionColor` 用于三个地方，保持视觉一致：

```tsx
// 圆形图标容器背景 = 颜色 + 'ff' 截取前6位 + '20'（10%透明度）
background: actionColor + '20'

// 图标本身颜色
color: actionColor  // + inheritColor prop

// 操作徽章
background: actionColor + '20'  // 背景同圆形图标
color: actionColor               // 文字为实色
```

---

## 4. 操作徽章设计

操作徽章（Action Badge）显示操作类型标签，与管理型表格中的状态 Badge **有意区分**：

```tsx
<span style={{
  padding: '0.15rem 0.5rem',
  borderRadius: '0.25rem',   /* 方形圆角，非胶囊 */
  background: actionColor + '20',
  color: actionColor,
  fontWeight: 600,
  fontSize: '0.8rem',
}}>
  {actionLabel}
</span>
```

**与管理型表格状态 Badge 的差异：**

| 特征 | 事件流操作徽章 | 管理型表格状态 Badge |
|------|--------------|---------------------|
| borderRadius | `0.25rem`（方角） | `9999px`（完整胶囊） |
| 尺寸 | `padding: 0.15rem 0.5rem` | `padding: 0.2rem 0.625rem` |
| 语义颜色来源 | 操作行为（create/delete…） | 实体状态（active/inactive…） |

> **为什么区分？** 状态 Badge 描述"现在是什么状态"（持续的），操作徽章描述"做了什么动作"（一次性的）。方角 vs 胶囊的视觉差异强化了这两种语义的不同。

---

## 5. 圆形图标设计

圆形图标是事件流的视觉主锚点，尺寸固定 32×32px：

```tsx
<div style={{
  width: 32,
  height: 32,
  borderRadius: '50%',
  background: actionColor + '20',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  color: actionColor,
}}>
  <SceneIcon name={actionIcon} size={16} inheritColor />
</div>
```

**操作图标映射：**

| 操作 | 图标名 |
|------|--------|
| `create` | `add` |
| `delete` | `error` |
| `login` / `logout` / `change_password` / `reset_password` | `key` |
| `update` | `settings` |
| `start` | `robot` |
| `stop` | `service` |
| 默认 | `audit` |

**资源类型图标映射（第一行右侧）：**

| 资源类型 | 图标名 | 中文标签 |
|---------|--------|---------|
| `user` | `user` | 用户 |
| `robot` | `robot` | 机器人 |
| `integration` | `integration` | 集成 |
| `service` | `service` | 服务 |
| `notification` | `notification` | 通知 |
| `system` | `settings` | 系统 |

资源类型图标在第一行以 `size={13}` 显示，比操作图标（16px）小，视觉重量低于圆形图标。

---

## 6. 标题栏与筛选器

### 6.1 标题栏结构

```tsx
<div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <span style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>操作记录</span>
  {/* 右侧：筛选器 select */}
</div>
```

事件流标题栏**无添加按钮**（只读），只可能有筛选或导出控件。

### 6.2 资源类型筛选器

使用原生 `<select>` 放在标题栏右侧，与日志面板的过滤器样式一致：

```tsx
<select
  value={filterAuditType}
  onChange={e => { setFilterAuditType(e.target.value); setAuditPage(1); }}
  style={{
    padding: '0.4rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    background: 'white',
  }}
>
  <option value="">所有类型</option>
  <option value="user">用户操作</option>
  <option value="robot">机器人操作</option>
  <option value="integration">集成操作</option>
  <option value="service">服务操作</option>
</select>
```

**筛选重置规则**：切换筛选器时必须同步将页码 `setAuditPage(1)` 重置为第 1 页，防止空页。

---

## 7. 内容区文字信息层级

内容区的三行文字体现严格的视觉层级：

| 层级 | 行内容 | 字号 | 颜色 | fontWeight |
|------|--------|------|------|-----------|
| 主标题行 | 操作徽章 + 资源类型 | `0.875rem` | `#1f2937` | 500 |
| 描述行 | 操作详情文本 | `0.8rem` | `#6b7280` | 400 |
| 元数据行 | 执行用户 | `0.75rem` | `#9ca3af` | 400 |
| 时间戳（独立右列） | 时间 | `0.75rem` | `#9ca3af` | 400 |

> 三行文字逐级变浅（`#1f2937` → `#6b7280` → `#9ca3af`），视觉重量递减，引导扫读顺序。

---

## 8. 分页控件

与管理型表格分页规范相同，使用上下文感知禁用状态：

```tsx
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0' }}>
  {/* 左：页码信息（事件流比管理型表格多显示总条数） */}
  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
    第 {auditPage} / {auditTotalPages} 页，共 {filteredLogs.length} 条
  </span>
  {/* 右：翻页按钮 */}
  <div style={{ display: 'flex', gap: '0.5rem' }}>
    <button disabled={page === 1} style={{ padding: '0.375rem', background: page === 1 ? '#e5e7eb' : '#3b82f6', color: page ===1 ? '#9ca3af' : 'white', ... }}>
      <ChevronLeft size={16} />
    </button>
    <button disabled={page === totalPages} style={{ ... }}>
      <ChevronRight size={16} />
    </button>
  </div>
</div>
```

**与管理型表格分页的差异：**  
左侧文字中额外显示**总条数**（`共 N 条`），因为事件流记录数量是管理员关心的审计信息，而管理型表格通常在标题栏已显示条数。

---

## 9. 空状态与加载状态

```tsx
{/* 加载中 */}
{loading && (
  <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>加载中...</div>
)}

{/* 空状态 */}
{!loading && items.length === 0 && (
  <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>暂无审计日志</div>
)}
```

空状态文字居中，颜色 `#6b7280`，`padding: 2rem`。无需图标（事件流的空状态概率较低，不需要强调引导）。

---

## 10. 使用场景边界

### 适合使用事件流型列表的场景

- 系统操作审计日志
- 通知发送历史（只读回溯）
- 用户活动记录
- 任何**以时间为主轴**、**不可修改**、**每条记录是独立事件**的列表

### 不适合的场景（应改用管理型表格）

- 有编辑/删除操作的列表（机器人、集成、用户管理）
- 需要列头排序的数据
- 每列含义需要对齐展示的多字段实体

---

## 11. 使用检查清单

新建事件流型列表时，逐项检查：

- [ ] 使用 `<div>` flex 布局，**不使用** `<table>` 元素
- [ ] 圆形图标 32×32px，背景色为操作色 + `'20'`
- [ ] 图标使用 `inheritColor` prop，颜色与圆形容器一致
- [ ] 操作徽章使用 `borderRadius: '0.25rem'`（方角，非胶囊）
- [ ] 内容区三行文字颜色依次为 `#1f2937` / `#6b7280` / `#9ca3af`
- [ ] 时间戳右对齐，`whiteSpace: 'nowrap'`
- [ ] 条目间以 `borderBottom: '1px solid #f3f4f6'` 分隔
- [ ] 有筛选器时，切换后同步重置页码为 1
- [ ] 分页左侧显示总条数
- [ ] 空状态文字居中，`padding: 2rem`，颜色 `#6b7280`
