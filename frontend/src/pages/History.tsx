import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  status: 'success' | 'error' | 'warning' | 'info';
  robotName: string;
  source: string;
  createdAt: string;
  message?: string;
}

interface Robot {
  id: string;
  name: string;
}

const History: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [robots, setRobots] = useState<Robot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRobot, setFilterRobot] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 获取通知列表
      const notificationsResponse = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        const list = notificationsData.notifications || (Array.isArray(notificationsData) ? notificationsData : []);
        setNotifications(list);
      }

      // 获取机器人列表
      const robotsResponse = await fetch('/api/robots', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      if (robotsResponse.ok) {
        const robotsData = await robotsResponse.json();
        setRobots(robotsData.data || (Array.isArray(robotsData) ? robotsData : []));
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load notification history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'success':
        return '✅ 成功';
      case 'error':
        return '❌ 失败';
      case 'warning':
        return '⚠️ 警告';
      case 'info':
        return 'ℹ️ 信息';
      default:
        return status;
    }
  };

  const getUniqueSources = (): string[] => {
    const sources = new Set(notifications.map(n => n.source));
    return Array.from(sources);
  };

  const filteredNotifications = notifications.filter(n => {
    if (filterStatus && n.status !== filterStatus) return false;
    if (filterRobot && n.robotName !== filterRobot) return false;
    if (filterSource && n.source !== filterSource) return false;
    return true;
  });

  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', paddingBottom: '2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '2rem', color: '#1f2937' }}>
          通知历史
        </h1>

        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '1rem', borderRadius: '0.5rem', marginBottom: '2rem' }}>
            {error}
          </div>
        )}

        {/* 筛选条件 */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', background: 'white', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>状态</label>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
            >
              <option value="">全部</option>
              <option value="success">✅ 成功</option>
              <option value="error">❌ 失败</option>
              <option value="warning">⚠️ 警告</option>
              <option value="info">ℹ️ 信息</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>机器人</label>
            <select
              value={filterRobot}
              onChange={(e) => { setFilterRobot(e.target.value); setCurrentPage(1); }}
              style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
            >
              <option value="">全部</option>
              {robots.map(robot => (
                <option key={robot.id} value={robot.name}>{robot.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>来源</label>
            <select
              value={filterSource}
              onChange={(e) => { setFilterSource(e.target.value); setCurrentPage(1); }}
              style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
            >
              <option value="">全部</option>
              {getUniqueSources().map(source => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 通知列表 */}
        <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#1f2937' }}>所有通知</h2>
            <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>共 {filteredNotifications.length} 条</span>
          </div>
          <div style={{ overflowX: 'auto', padding: '1.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb' }}>
                <tr>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#6b7280', borderBottom: '1px solid #e5e7eb', width: '18%' }}>时间</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#6b7280', borderBottom: '1px solid #e5e7eb', width: '25%' }}>标题</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#6b7280', borderBottom: '1px solid #e5e7eb', width: '12%' }}>状态</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#6b7280', borderBottom: '1px solid #e5e7eb', width: '18%' }}>机器人</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#6b7280', borderBottom: '1px solid #e5e7eb', width: '12%' }}>来源</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#6b7280', borderBottom: '1px solid #e5e7eb', width: '15%' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {paginatedNotifications.length > 0 ? (
                  paginatedNotifications.map((notification) => (
                    <tr key={notification.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#374151' }}>
                        {new Date(notification.createdAt).toLocaleString('zh-CN')}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#374151' }}>{notification.title}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#374151' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          backgroundColor: notification.status === 'success' ? '#d1fae5' :
                                           notification.status === 'error' ? '#fee2e2' :
                                           notification.status === 'warning' ? '#fef3c7' : '#dbeafe',
                          color: notification.status === 'success' ? '#047857' :
                                 notification.status === 'error' ? '#dc2626' :
                                 notification.status === 'warning' ? '#d97706' : '#1e40af',
                        }}>
                          {getStatusLabel(notification.status)}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#374151' }}>{notification.robotName}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#374151' }}>{notification.source}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                        <button
                          style={{
                            padding: '0.375rem 0.75rem',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          详情
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                      暂无通知记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '0.5rem 0.75rem',
                    border: '1px solid #d1d5db',
                    backgroundColor: currentPage === 1 ? '#f3f4f6' : 'white',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem',
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      border: '1px solid #d1d5db',
                      backgroundColor: currentPage === page ? '#3b82f6' : 'white',
                      color: currentPage === page ? 'white' : '#374151',
                      cursor: 'pointer',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem',
                    }}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '0.5rem 0.75rem',
                    border: '1px solid #d1d5db',
                    backgroundColor: currentPage === totalPages ? '#f3f4f6' : 'white',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem',
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default History;
