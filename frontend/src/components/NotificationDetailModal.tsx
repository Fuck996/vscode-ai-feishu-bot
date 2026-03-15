import React, { useMemo } from 'react';
import { CalendarDays, Clock3 } from 'lucide-react';

interface NotificationDetail {
  id?: string | number;
  title: string;
  status: 'success' | 'error' | 'warning' | 'info';
  source?: string;
  createdAt?: string;
  summary?: string;
  details?: string;
  message?: string;
  robotName?: string;
}

interface NotificationDetailModalProps {
  notification: NotificationDetail | null;
  onClose: () => void;
}

function getStatusStyle(status: NotificationDetail['status']): { header: string; soft: string; text: string; badge: string; label: string } {
  switch (status) {
    case 'success':
      return { header: '#1f883d', soft: '#edf7ee', text: '#166534', badge: '#dafbe1', label: '成功' };
    case 'error':
      return { header: '#cf222e', soft: '#fff1f2', text: '#991b1b', badge: '#ffebe9', label: '失败' };
    case 'warning':
      return { header: '#9a6700', soft: '#fff8c5', text: '#92400e', badge: '#fef3c7', label: '警告' };
    default:
      return { header: '#0969da', soft: '#eff6ff', text: '#1d4ed8', badge: '#dbeafe', label: '信息' };
  }
}

function tryParseDetails(details?: string): Array<{ key: string; value: string }> {
  if (!details) {
    return [];
  }

  try {
    const parsed = JSON.parse(details) as Record<string, unknown>;
    return Object.entries(parsed)
      .filter(([key]) => key !== 'meta')
      .map(([key, value]) => ({
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value),
      }));
  } catch {
    return [];
  }
}

export default function NotificationDetailModal({ notification, onClose }: NotificationDetailModalProps) {
  const parsedDetailItems = useMemo(() => tryParseDetails(notification?.details), [notification?.details]);

  if (!notification) {
    return null;
  }

  const statusStyle = getStatusStyle(notification.status);
  const content = notification.summary || notification.message || notification.details || '暂无内容';
  const displaySource = (notification.source || '').replace('系统消息/', '系统通知/') || '未指定';
  const createdAtText = notification.createdAt ? new Date(notification.createdAt).toLocaleString('zh-CN') : '未知时间';

  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{ width: '100%', maxWidth: '680px', maxHeight: '85vh', backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 18px 50px rgba(15, 23, 42, 0.28)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ backgroundColor: statusStyle.header, color: '#ffffff', padding: '1.25rem 1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.75rem', borderRadius: '999px', backgroundColor: 'rgba(255,255,255,0.18)', fontSize: '0.75rem', fontWeight: 600 }}>
              {statusStyle.label}
            </span>
            <span style={{ fontSize: '0.75rem', opacity: 0.92 }}>{displaySource}</span>
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, lineHeight: 1.35 }}>{notification.title}</h2>
            {notification.robotName && (
              <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8125rem', opacity: 0.92 }}>
                发送机器人：{notification.robotName}
              </p>
            )}
          </div>
        </div>

        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#f8fafc' }}>
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid #eef2f7', backgroundColor: statusStyle.soft, color: statusStyle.text, fontSize: '0.8125rem', fontWeight: 600 }}>
              消息内容
            </div>
            <div style={{ padding: '1rem', fontSize: '0.9rem', color: '#1f2937', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {content}
            </div>
          </div>

          {parsedDetailItems.length > 0 && (
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid #eef2f7', backgroundColor: '#f8fafc', color: '#475569', fontSize: '0.8125rem', fontWeight: 600 }}>
                扩展信息
              </div>
              <div style={{ padding: '0.5rem 1rem' }}>
                {parsedDetailItems.map((item) => (
                  <div key={item.key} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.75rem', padding: '0.625rem 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{item.key}</span>
                    <span style={{ fontSize: '0.8125rem', color: '#334155', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '0.9rem 1.5rem', borderTop: '1px solid #e5e7eb', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', color: '#64748b', fontSize: '0.78rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <CalendarDays size={14} color="#64748b" />
              {notification.createdAt ? new Date(notification.createdAt).toLocaleDateString('zh-CN') : '未知日期'}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Clock3 size={14} color="#64748b" />
              {createdAtText}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0.2rem 0.6rem', borderRadius: '999px', backgroundColor: statusStyle.badge, color: statusStyle.text, fontWeight: 600 }}>
              来源：{displaySource}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}