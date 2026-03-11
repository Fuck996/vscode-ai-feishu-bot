# 系统级通知组件使用指南

## 概述

飞书AI通知系统实现了一个可复用的系统级通知组件，支持全局消息提示、操作反馈等场景。通知组件自动显示在屏幕右上角，支持自动消失和手动关闭。

## 组件架构

### 核心文件

- **`services/toastService.ts`** - 通知服务（可在任何地方调用）
- **`components/ToastContainer.tsx`** - 通知显示组件（已在 App.tsx 中安装）
- **`hooks/useToast.ts`** - React Hook 封装

## 使用方式

### 方式1：在 React 组件中使用 Hook（推荐）

```typescript
import { useToast } from '../hooks/useToast';

function MyComponent() {
  const toast = useToast();

  return (
    <button onClick={() => toast.success('复制成功')}>
      复制
    </button>
  );
}
```

### 方式2：直接调用通知服务（任何地方）

```typescript
import toastService from '../services/toastService';

// 成功
toastService.success('新建成功');
toastService.success('编辑成功', 3000);

// 失败
toastService.error('网络错误');
toastService.error('删除失败，请重试');

// 警告
toastService.warning('即将关闭');

// 信息
toastService.info('请稍候...');

// 手动指定持续时间（毫秒）
toastService.success('操作完成', 2000);  // 2秒后自动关闭

// 永不自动关闭
toastService.info('重要提示', 0);

// 清空所有通知
toastService.clear();
```

## 支持的事件类型

根据项目需求，以下事件已实现：

### ✅ 成功类

```typescript
toast.success('复制成功');
toast.success('新建成功');      // 创建机器人/集成/项目
toast.success('编辑成功');      // 更新配置
toast.success('删除成功');      // 删除资源
toast.success('测试消息发送成功');  // MCP 工具测试
toast.success('机器人已启用');  // 开启机器人
toast.success('机器人已停用');  // 关闭机器人
```

### ❌ 错误类

```typescript
toast.error('网络错误');
toast.error('网络连接失败');
toast.error('操作失败');
toast.error('加载失败，请重试');
```

### ⚠️ 警告类

```typescript
toast.warning('操作即将执行');
toast.warning('数据将被删除');
```

### ℹ️ 信息类

```typescript
toast.info('加载中...');
toast.info('处理中，请稍候');
```

## 集成示例

### 示例1：Robots 页面 - 机器人启用/禁用

```typescript
import { useToast } from '../hooks/useToast';

const handleToggleRobot = async (robotId: string, newStatus: 'active' | 'inactive') => {
  const toast = useToast();
  
  try {
    // 发送请求
    const response = await fetch(`/api/robots/${robotId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    if (response.ok) {
      // 根据状态显示不同的成功消息
      if (newStatus === 'active') {
        toast.success('机器人已启用');
      } else {
        toast.success('机器人已停用');
      }
    } else {
      toast.error('操作失败，请重试');
    }
  } catch (error) {
    toast.error('网络错误');
  }
};
```

### 示例2：复制操作

```typescript
const handleCopy = (text: string) => {
  const toast = useToast();
  
  navigator.clipboard.writeText(text).then(() => {
    toast.success('复制成功');
  }).catch(() => {
    toast.error('复制失败');
  });
};
```

### 示例3：表单提交

```typescript
const handleCreateRobot = async (formData: RobotForm) => {
  const toast = useToast();
  
  try {
    // 显示加载状态
    toast.info('创建中...');
    
    const response = await fetch('/api/robots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (response.ok) {
      toast.success('新建成功');
      // 刷新列表或导航
    } else {
      toast.error('创建失败');
    }
  } catch (error) {
    toast.error('网络错误');
  }
};
```

### 示例4：删除操作确认后

```typescript
const handleDeleteRobot = async (robotId: string) => {
  const toast = useToast();
  
  if (!confirm('确定要删除此机器人吗？')) {
    return;
  }

  try {
    const response = await fetch(`/api/robots/${robotId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      toast.success('删除成功');
      // 刷新列表
    } else {
      toast.error('删除失败');
    }
  } catch (error) {
    toast.error('网络错误，删除失败');
  }
};
```

## 自定义选项

### 持续时间

所有方法都支持自定义显示时间（毫秒）：

```typescript
toast.success('快速消失', 1000);    // 1秒后自动关闭
toast.error('默认时间', 3000);      // 3秒（默认）
toast.info('永不自动关闭', 0);      // 0表示不自动关闭
```

### 手动关闭

用户可以点击通知右侧的 ✕ 按钮手动关闭，或任何地方点击通知卡片。

## 设计特性

### 外观

- **位置**：屏幕右上角，固定
- **Z-index**：9999（确保在最上层）
- **动画**：从右侧滑入，平滑过渡
- **尺寸**：280px ~ 420px 宽度（自适应）

### 交互

- **自动消失**：默认3秒后自动关闭
- **手动关闭**：点击 ✕ 按钮或通知卡片本身
- **鼠标悬停**：透明度增加，表示可交互
- **多个通知**：支持堆叠显示，间距0.75rem

### 颜色标准

| 类型 | 背景色 | 边框色 | 文字色 | 图标 |
|------|--------|--------|--------|------|
| 成功 | `#dcfce7` | `#86efac` | `#166534` | ✅ |
| 错误 | `#fee2e2` | `#fca5a5` | `#991b1b` | ❌ |
| 警告 | `#fef3c7` | `#fcd34d` | `#92400e` | ⚠️ |
| 信息 | `#dbeafe` | `#93c5fd` | `#1e40af` | ℹ️ |

## 响应式设计

通知组件在所有屏幕大小上都能正常显示：

- 超小屏幕：通知宽度自动调整到可用宽度
- 右上角边距始终保持 1rem
- 支持多个通知堆叠显示

## 可复用性

该组件设计用于快速集成到其他项目：

1. **复制文件**：
   - `services/toastService.ts`
   - `components/ToastContainer.tsx`
   - `hooks/useToast.ts`

2. **在 App.tsx 中导入**：
   ```typescript
   import ToastContainer from './components/ToastContainer';
   
   // 在 Router 内添加
   <Router>
     <AppContent />
     <ToastContainer />
   </Router>
   ```

3. **在组件中使用**：
   ```typescript
   import { useToast } from './hooks/useToast';
   // 或
   import toastService from './services/toastService';
   ```

无需额外配置即可在新项目中使用！

## 常见问题

### Q：如何在非 React 代码中调用？
A：直接导入 `toastService`：
```typescript
import toastService from './services/toastService';
toastService.success('消息');
```

### Q：通知能否手动移除？
A：可以，使用返回的 ID：
```typescript
const id = toastService.success('消息');
toastService.remove(id);
```

### Q：能否禁用自动关闭？
A：可以，设置 `duration: 0`：
```typescript
toastService.info('重要提示', 0);
```

### Q：能否修改位置？
A：修改 `ToastContainer.tsx` 中的样式：
```typescript
top: '1rem',      // 修改顶部距离
right: '1rem',    // 修改右侧距离
```

### Q：通知样式能否自定义？
A：修改 `getColors()` 函数的颜色值。

## 最佳实践

1. **保持消息简洁**：避免长文本
2. **使用正确的类型**：选择适当的状态（成功/失败/警告）
3. **不滥用通知**：避免过度提示
4. **异步操作提示**：长时间操作时显示加载状态
5. **一致命名**：使用统一的操作描述（"新建成功"而非"已创建"）
