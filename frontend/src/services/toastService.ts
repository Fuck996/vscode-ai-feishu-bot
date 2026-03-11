/**
 * 全局 Toast 通知服务
 * 可在任何地方调用，不需要 React hooks
 * 使用示例：
 *   toastService.success('复制成功');
 *   toastService.error('网络错误');
 *   toastService.warning('即将关闭');
 *   toastService.info('请稍候');
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number; // ms，0 表示不自动关闭
}

type ToastListener = (toasts: Toast[]) => void;

class ToastService {
  private toasts: Toast[] = [];
  private listeners: Set<ToastListener> = new Set();

  /**
   * 订阅通知变化
   */
  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 通知所有监听者
   */
  private notify() {
    this.listeners.forEach(listener => listener([...this.toasts]));
  }

  /**
   * 添加通知
   */
  private add(message: string, type: ToastType, duration: number = 3000): string {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const toast: Toast = { id, message, type, duration };
    
    this.toasts.push(toast);
    this.notify();

    // 自动移除
    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }

    return id;
  }

  /**
   * 移除通知
   */
  remove(id: string): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.notify();
  }

  /**
   * 清空所有通知
   */
  clear(): void {
    this.toasts = [];
    this.notify();
  }

  /**
   * 获取当前所有通知
   */
  getAll(): Toast[] {
    return [...this.toasts];
  }

  // ───── 便捷方法 ─────

  success(message: string, duration?: number): string {
    return this.add(message, 'success', duration);
  }

  error(message: string, duration?: number): string {
    return this.add(message, 'error', duration);
  }

  warning(message: string, duration?: number): string {
    return this.add(message, 'warning', duration);
  }

  info(message: string, duration?: number): string {
    return this.add(message, 'info', duration);
  }
}

export const toastService = new ToastService();
export default toastService;
