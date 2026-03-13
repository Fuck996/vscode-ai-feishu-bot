import React, { useEffect, useState } from 'react';
import toastService, { Toast, ToastType } from '../services/toastService';
import SceneIcon, { SceneIconName } from './SceneIcon';

/**
 * Toast 显示组件
 * 显示全局系统通知，固定在右上角
 * 可在任何页面使用：<ToastContainer />
 */

const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    // 订阅通知变化
    const unsubscribe = toastService.subscribe(setToasts);
    return unsubscribe;
  }, []);

  const getIcon = (type: ToastType): SceneIconName => {
    switch (type) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
    }
  };

  const getColors = (type: ToastType) => {
    switch (type) {
      case 'success':
        return {
          bg: '#dcfce7',
          border: '#86efac',
          text: '#166534',
          icon: '#22c55e',
        };
      case 'error':
        return {
          bg: '#fee2e2',
          border: '#fca5a5',
          text: '#991b1b',
          icon: '#ef4444',
        };
      case 'warning':
        return {
          bg: '#fef3c7',
          border: '#fcd34d',
          text: '#92400e',
          icon: '#f59e0b',
        };
      case 'info':
        return {
          bg: '#dbeafe',
          border: '#93c5fd',
          text: '#1e40af',
          icon: '#3b82f6',
        };
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => {
        const colors = getColors(toast.type);
        return (
          <div
            key={toast.id}
            style={{
              marginBottom: '0.75rem',
              pointerEvents: 'auto',
              animation: 'slideIn 0.3s ease-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.875rem 1rem',
                backgroundColor: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: '0.5rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                minWidth: '320px',
                maxWidth: '480px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onClick={() => toastService.remove(toast.id)}
            >
              <SceneIcon name={getIcon(toast.type)} size={24} title="通知类型" />
              <div
                style={{
                  flex: 1,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: colors.text,
                  lineHeight: 1.4,
                  wordBreak: 'break-word',
                }}
              >
                {toast.message}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toastService.remove(toast.id);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.text,
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  opacity: 0.6,
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.6';
                }}
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(480px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default ToastContainer;
