import React, { useEffect, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock3, MoreHorizontal, Search } from 'lucide-react';
import authService from '../services/auth';

interface Notification {
  id: string;
  title: string;
  status: 'success' | 'error' | 'warning' | 'info';
  robotName?: string;
  source: string;
  createdAt: string;
  message?: string;
  summary?: string;
  details?: string;
  action?: string;
}

const STATUS_OPTIONS: Array<{ value: string; label: string; color: string; bg: string }> = [
  { value: 'success', label: '成功', color: '#1a7f37', bg: '#dcfce7' },
  { value: 'error',   label: '失败', color: '#cf222e', bg: '#fee2e2' },
  { value: 'warning', label: '警告', color: '#9a6700', bg: '#fef3c7' },
  { value: 'info',    label: '信息', color: '#0969da', bg: '#dbeafe' },
];

interface ActionMenuState {
  notificationId: string;
  top: number;
  left: number;
}

const History: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [openActionMenu, setOpenActionMenu] = useState<ActionMenuState | null>(null);
  const [openFilterMenu, setOpenFilterMenu] = useState<'status' | 'robot' | null>(null);
  const [filterSearch, setFilterSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [robotFilter, setRobotFilter] = useState<string[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [titleSearch, setTitleSearch] = useState('');
  const itemsPerPage = 10;

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!openActionMenu && !openFilterMenu) return undefined;
    const handler = () => { setOpenActionMenu(null); setOpenFilterMenu(null); };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [openActionMenu, openFilterMenu]);

  useEffect(() => { setCurrentPage(1); }, [statusFilter, robotFilter]);

  const openActionMenuAt = (event: React.MouseEvent<HTMLButtonElement>, notificationId: string) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setOpenActionMenu(current => {
      if (current?.notificationId === notificationId) return null;
      return { notificationId, top: rect.bottom + 8, left: rect.right - 132 };
    });
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authService.fetchWithAuth('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || (Array.isArray(data) ? data : []));
      }
    } catch {
      setError('加载通知历史失败');
    } finally {
      setLoading(false);
    }
  };

  const getNotificationStatusStyle = (status: Notification['status']) => {
    const opt = STATUS_OPTIONS.find(s => s.value === status);
    return opt ? { color: opt.color, backgroundColor: opt.bg } : { color: '#374151', backgroundColor: '#f3f4f6' };
  };

  const getStatusText = (status: Notification['status']): string => {
    const opt = STATUS_OPTIONS.find(s => s.value === status);
    return opt ? opt.label : status;
  };

  const formatDate = (createdAt: string) => {
    const d = new Date(createdAt);
    return {
      date: d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }),
      time: d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
    };
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'success': return '#1a7f37';
      case 'error': return '#cf222e';
      case 'warning': return '#9a6700';
      default: return '#0969da';
    }
  };

  const allRobotNames = [...new Set(notifications.map(n => n.robotName).filter(Boolean))] as string[];

  const displayedNotifications = notifications.filter(n => {
    if (titleSearch.trim() && !n.title.toLowerCase().includes(titleSearch.toLowerCase())) return false;
    if (statusFilter.length > 0 && !statusFilter.includes(n.status)) return false;
    if (robotFilter.length > 0 && !robotFilter.includes(n.robotName || '')) return false;
    return true;
  });

  const totalPages = Math.ceil(displayedNotifications.length / itemsPerPage);
  const paginatedNotifications = displayedNotifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const renderFilterDropdown = (type: 'status' | 'robot') => {
    const isStatus = type === 'status';
    const label = isStatus ? '状态' : '机器人';
    const activeFilters = isStatus ? statusFilter : robotFilter;
    const options = isStatus ? STATUS_OPTIONS.map(o => o.value) : allRobotNames;
    const filteredOptions = options.filter(opt => {
      const displayLabel = isStatus ? (STATUS_OPTIONS.find(s => s.value === opt)?.label || opt) : opt;
      return filterSearch === '' || displayLabel.toLowerCase().includes(filterSearch.toLowerCase());
    });
    const hasActive = activeFilters.length > 0;

    return (
      <div key={type} style={{ position: 'relative', display: 'inline-block' }} onClick={e => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => { setOpenFilterMenu(openFilterMenu === type ? null : type); setFilterSearch(''); }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', fontSize: '0.8125rem', fontWeight: 500, color: hasActive ? '#0969da' : '#57606a', backgroundColor: hasActive ? '#dbeafe' : '#f6f8fa', border: `1px solid ${hasActive ? '#0969da' : '#d0d7de'}`, borderRadius: '0.375rem', cursor: 'pointer' }}
        >
          {label}
          {hasActive && (
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#0969da', color: 'white', fontSize: '0.6rem', fontWeight: 700 }}>
              {activeFilters.length}
            </span>
          )}
          <ChevronDown size={13} />
        </button>
        {openFilterMenu === type && (
          <div style={{ position: 'absolute', top: 'calc(100% + 0.375rem)', right: 0, minWidth: '200px', backgroundColor: '#ffffff', border: '1px solid #d0d7de', borderRadius: '0.75rem', boxShadow: '0 16px 32px rgba(31, 35, 40, 0.15)', zIndex: 30, overflow: 'hidden' }}>
            <div style={{ padding: '0.625rem 1rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1f2328' }}>{isStatus ? '按状态筛选' : '按机器人筛选'}</span>
              {hasActive && (
                <button type="button" onClick={() => isStatus ? setStatusFilter([]) : setRobotFilter([])} style={{ fontSize: '0.75rem', color: '#0969da', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>清除</button>
              )}
            </div>
            <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#f6f8fa', border: '1px solid #d0d7de', borderRadius: '0.375rem', padding: '0.3rem 0.6rem' }}>
                <Search size={13} color="#57606a" />
                <input type="text" placeholder="搜索..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} style={{ border: 'none', background: 'none', outline: 'none', fontSize: '0.8125rem', color: '#1f2328', width: '100%' }} />
              </div>
            </div>
            <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
              {filteredOptions.length === 0 ? (
                <div style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: '#6b7280', textAlign: 'center' }}>暂无匹配项</div>
              ) : filteredOptions.map(opt => {
                const isSelected = activeFilters.includes(opt);
                const displayLabel = isStatus ? (STATUS_OPTIONS.find(s => s.value === opt)?.label || opt) : opt;
                const statusOpt = isStatus ? STATUS_OPTIONS.find(s => s.value === opt) : null;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      if (isStatus) setStatusFilter(prev => prev.includes(opt) ? prev.filter(s => s !== opt) : [...prev, opt]);
                      else setRobotFilter(prev => prev.includes(opt) ? prev.filter(r => r !== opt) : [...prev, opt]);
                    }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', border: 'none', backgroundColor: isSelected ? '#f0f6ff' : 'transparent', cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = '#f6f8fa'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <span style={{ width: '14px', height: '14px', border: `1.5px solid ${isSelected ? '#0969da' : '#d0d7de'}`, borderRadius: '3px', backgroundColor: isSelected ? '#0969da' : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {isSelected && <span style={{ width: '8px', height: '8px', backgroundColor: 'white', borderRadius: '1px', display: 'block' }} />}
                    </span>
                    {statusOpt && <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: statusOpt.color, flexShrink: 0 }} />}
                    <span style={{ fontSize: '0.8125rem', color: '#1f2328' }}>{displayLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f6f8fa' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ width: '60px', height: '60px', border: '4px solid #e5e7eb', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: '1rem', color: '#6b7280', fontWeight: 500 }}>加载中...</p>
        </div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f6f8fa', minHeight: '100vh', paddingBottom: '2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '1rem', borderRadius: '0.5rem', marginBottom: '2rem' }}>{error}</div>
        )}

        {/* 消息名称搜索框 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', border: '1px solid #d0d7de', borderRadius: '2rem', backgroundColor: 'white', width: '240px' }}>
            <Search size={14} color="#57606a" />
            <input
              type="text"
              placeholder="搜索消息名称"
              value={titleSearch}
              onChange={e => { setTitleSearch(e.target.value); setCurrentPage(1); }}
              style={{ border: 'none', outline: 'none', fontSize: '0.8125rem', width: '100%', color: '#24292f', backgroundColor: 'transparent' }}
            />
          </div>
        </div>

        {/* 通知历史表格 */}
        <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1f2328' }}>通知历史</span>
              <span style={{ fontSize: '0.8125rem', color: '#656d76' }}>共 {displayedNotifications.length} 条</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {renderFilterDropdown('status')}
              {renderFilterDropdown('robot')}
              {(statusFilter.length > 0 || robotFilter.length > 0) && (
                <button
                  type="button"
                  onClick={() => { setStatusFilter([]); setRobotFilter([]); }}
                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem', color: '#cf222e', backgroundColor: '#fff0f0', border: '1px solid #ffcdd2', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: 500 }}
                >
                  清除筛选
                </button>
              )}
            </div>
          </div>

          <div style={{ overflowX: 'auto', padding: '0 1.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <tbody>
                {paginatedNotifications.length > 0 ? (
                  paginatedNotifications.map(notification => {
                    const statusStyle = getNotificationStatusStyle(notification.status);
                    const { date, time } = formatDate(notification.createdAt);
                    return (
                      <tr key={notification.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        {/* 标题 + 来源 */}
                        <td style={{ padding: '1rem 0.75rem', fontSize: '0.875rem', width: '260px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: 0 }}>
                            <span
                              style={{ color: '#1f2328', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer', textDecoration: 'none' }}
                              onMouseEnter={e => { e.currentTarget.style.color = '#0969da'; e.currentTarget.style.textDecoration = 'underline'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = '#1f2328'; e.currentTarget.style.textDecoration = 'none'; }}
                              onClick={() => setSelectedNotification(notification)}
                            >
                              {notification.title}
                            </span>
                            <span style={{ color: '#656d76', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {(notification.source || '').replace('系统消息/', '系统通知/') || '—'}
                            </span>
                          </div>
                        </td>
                        {/* 状态 */}
                        <td style={{ padding: '1rem 0.75rem', fontSize: '0.875rem', textAlign: 'center' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.7rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, lineHeight: 1, color: statusStyle.color, backgroundColor: statusStyle.backgroundColor }}>
                            {getStatusText(notification.status)}
                          </span>
                        </td>
                        {/* 日期 + 时间 + 操作菜单 */}
                        <td style={{ padding: '1rem 1.5rem 1rem 0.75rem', width: '220px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'left' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#374151', fontSize: '0.8125rem', fontWeight: 500 }}>
                                <CalendarDays size={14} color="#57606a" /><span>{date}</span>
                              </span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#656d76', fontSize: '0.75rem' }}>
                                <Clock3 size={14} color="#57606a" /><span>{time}</span>
                              </span>
                            </div>
                            <div style={{ display: 'inline-flex' }} onClick={e => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={(event) => openActionMenuAt(event, notification.id)}
                                style={{ width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #d0d7de', borderRadius: '0.5rem', backgroundColor: '#ffffff', color: '#57606a', cursor: 'pointer' }}
                                aria-label="更多操作"
                              >
                                <MoreHorizontal size={16} />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                      {statusFilter.length > 0 || robotFilter.length > 0 ? '无匹配结果，请调整筛选条件' : '暂无通知记录'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.125rem', margin: '1rem 0', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.625rem', border: 'none', backgroundColor: 'transparent', color: currentPage === 1 ? '#8c959f' : '#0969da', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', borderRadius: '0.375rem', fontSize: '0.8125rem', fontWeight: 500, opacity: currentPage === 1 ? 0.7 : 1 }}
                  onMouseEnter={e => { if (currentPage !== 1) e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <ChevronLeft size={15} />上一页
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    style={{ width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: currentPage === page ? 'none' : '1px solid transparent', backgroundColor: currentPage === page ? '#0969da' : 'transparent', color: currentPage === page ? 'white' : '#1f2328', cursor: 'pointer', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: currentPage === page ? 600 : 400 }}
                    onMouseEnter={e => { if (currentPage !== page) e.currentTarget.style.border = '1px solid #d0d7de'; }}
                    onMouseLeave={e => { if (currentPage !== page) e.currentTarget.style.border = '1px solid transparent'; }}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.625rem', border: 'none', backgroundColor: 'transparent', color: currentPage === totalPages ? '#8c959f' : '#0969da', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', borderRadius: '0.375rem', fontSize: '0.8125rem', fontWeight: 500, opacity: currentPage === totalPages ? 0.7 : 1 }}
                  onMouseEnter={e => { if (currentPage !== totalPages) e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  下一页<ChevronRight size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 通知详情模态框 */}
      {/* 三点菜单浮层（fixed 定位）*/}
      {openActionMenu ? (
        <div
          style={{
            position: 'fixed',
            top: openActionMenu.top,
            left: openActionMenu.left,
            minWidth: '132px',
            padding: '0.4rem',
            backgroundColor: '#ffffff',
            border: '1px solid #d0d7de',
            borderRadius: '0.75rem',
            boxShadow: '0 12px 28px rgba(31, 35, 40, 0.12)',
            zIndex: 9999,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              const n = notifications.find(x => x.id === openActionMenu.notificationId);
              if (n) setSelectedNotification(n);
              setOpenActionMenu(null);
            }}
            style={{ width: '100%', textAlign: 'left', padding: '0.55rem 0.75rem', border: 'none', borderRadius: '0.5rem', backgroundColor: '#ffffff', color: '#1f2328', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f6f8fa'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
          >
            查看
          </button>
        </div>
      ) : null}

      {selectedNotification && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onMouseDown={e => { if (e.target === e.currentTarget) setSelectedNotification(null); }}
        >
          <div
            style={{ backgroundColor: 'white', borderRadius: '0.75rem', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ backgroundColor: getStatusColor(selectedNotification.status), padding: '1.5rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 'bold' }}>{selectedNotification.title}</h2>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', opacity: 0.9 }}>{getStatusText(selectedNotification.status)}</p>
              </div>
            </div>
            <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>来源</label>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>{(selectedNotification.source || '').replace('系统消息/', '系统通知/') || '未指定'}</p>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>详细内容</label>
                <div style={{ fontSize: '0.875rem', color: '#374151', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word', backgroundColor: '#f9fafb', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #e5e7eb' }}>
                  {selectedNotification.summary || selectedNotification.details || selectedNotification.message || '暂无内容'}
                </div>
              </div>
              {selectedNotification.details && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>更多详情</label>
                  <div style={{ fontSize: '0.875rem', color: '#374151', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word', backgroundColor: '#f9fafb', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #e5e7eb' }}>
                    {selectedNotification.details}
                  </div>
                </div>
              )}
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                🕐 {new Date(selectedNotification.createdAt || '').toLocaleString('zh-CN')}
              </span>
              <button
                onClick={() => setSelectedNotification(null)}
                style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
