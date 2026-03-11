import { useCallback } from 'react';
import toastService from '../services/toastService';

/**
 * useToast Hook
 * 在 React 组件中使用通知
 * 使用示例：
 *   const toast = useToast();
 *   toast.success('复制成功');
 *   toast.error('删除失败');
 */

export const useToast = () => {
  return {
    success: useCallback((message: string, duration?: number) => {
      toastService.success(message, duration);
    }, []),

    error: useCallback((message: string, duration?: number) => {
      toastService.error(message, duration);
    }, []),

    warning: useCallback((message: string, duration?: number) => {
      toastService.warning(message, duration);
    }, []),

    info: useCallback((message: string, duration?: number) => {
      toastService.info(message, duration);
    }, []),

    clear: useCallback(() => {
      toastService.clear();
    }, []),
  };
};

export default useToast;
