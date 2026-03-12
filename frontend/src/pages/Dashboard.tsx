import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import authService from '../services/auth';

interface Notification {
  id: string;
  title: string;
  status: 'success' | 'error' | 'warning' | 'info';
  source: string;
  createdAt: string;
  message?: string;
}

interface Robot {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  lastMessage?: string;
  messageCount: number;
}

interface Stats {
  total: number;
  success: number;
  failed: number;
  warning: number;
  info: number;
  activeRobots: number;
  todayTotal: number;
  todaySuccess: number;
  todayFailed: number;
  todayWarning: number;
  todayInfo: number;
}

const Dashboard: React.FC = () => {
  
  const [stats, setStats] = useState<Stats>({
    total: 0,
    success: 0,
    failed: 0,
    warning: 0,
    info: 0,
    activeRobots: 0,
    todayTotal: 0,
    todaySuccess: 0,
    todayFailed: 0,
    todayWarning: 0,
    todayInfo: 0,
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [robots, setRobots] = useState<Robot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | '7days' | '30days' | 'all'>('7days');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const getTimeRangeStartDate = (range: string): Date => {
    const now = new Date();
    switch (range) {
      case 'today':
        now.setHours(0, 0, 0, 0);
        return now;
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        weekAgo.setHours(0, 0, 0, 0);
        return weekAgo;
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        monthAgo.setHours(0, 0, 0, 0);
        return monthAgo;
      case '7days':
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        return sevenDaysAgo;
      case '30days':
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);
        return thirtyDaysAgo;
      case 'all':
      default:
        return new Date(0);
    }
  };

  const calculateTodayStats = (notifications: Notification[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let todayTotal = 0;
    let todaySuccess = 0;
    let todayFailed = 0;
    let todayWarning = 0;
    let todayInfo = 0;

    notifications.forEach(notification => {
      const notificationDate = new Date(notification.createdAt);
      notificationDate.setHours(0, 0, 0, 0);
      
      if (notificationDate.getTime() === today.getTime()) {
        todayTotal++;
        switch (notification.status) {
          case 'success':
            todaySuccess++;
            break;
          case 'error':
            todayFailed++;
            break;
          case 'warning':
            todayWarning++;
            break;
          case 'info':
            todayInfo++;
            break;
        }
      }
    });

    return { todayTotal, todaySuccess, todayFailed, todayWarning, todayInfo };
  };

  const filterNotificationsByTimeRange = (notifications: Notification[]): Notification[] => {
    const startDate = getTimeRangeStartDate(timeRange);
    return notifications.filter(n => new Date(n.createdAt) >= startDate);
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 获取通知列表
      const notificationsResponse = await authService.fetchWithAuth('/api/notifications');
      
      let notificationsData: Notification[] = [];
      if (notificationsResponse.ok) {
        const data = await notificationsResponse.json();
        notificationsData = data.notifications || (Array.isArray(data) ? data : []);
        setNotifications(notificationsData);
      }

      // 按时间范围过滤通知
      const filteredNotifications = filterNotificationsByTimeRange(notificationsData);

      // 获取机器人列表
      let robotsList: Robot[] = [];
      const robotsResponse = await authService.fetchWithAuth('/api/robots');
      if (robotsResponse.ok) {
        const robotsData = await robotsResponse.json();
        robotsList = robotsData.data || robotsData.robots || (Array.isArray(robotsData) ? robotsData : []);
        setRobots(robotsList);
      }

      // 计算统计数据（基于过滤后的通知）
      const total = filteredNotifications.length;
      const success = filteredNotifications.filter(n => n.status === 'success').length;
      const failed = filteredNotifications.filter(n => n.status === 'error').length;
      const warning = filteredNotifications.filter(n => n.status === 'warning').length;
      const info = filteredNotifications.filter(n => n.status === 'info').length;
      const activeRobots = robotsList.filter((r: Robot) => r.status === 'active').length;

      // 计算今天的数据
      const todayStats = calculateTodayStats(notificationsData);

      setStats({
        total,
        success,
        failed,
        warning,
        info,
        activeRobots,
        ...todayStats,
      });
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const openNotificationDetail = (notification: Notification) => {
    setSelectedNotification(notification);
  };

  const closeNotificationDetail = () => {
    setSelectedNotification(null);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'success':
        return '#10b981'; // 绿色
      case 'error':
        return '#ef4444'; // 红色
      case 'warning':
        return '#f59e0b'; // 黄色
      case 'info':
      default:
        return '#3b82f6'; // 蓝色
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

  const testRobot = async (robotId: string) => {
    try {
      const response = await fetch(`/api/robots/${robotId}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        alert('测试通知已发送');
        fetchDashboardData();
      } else {
        alert('测试失败');
      }
    } catch (err) {
      console.error('Failed to test robot:', err);
      alert('发送测试通知失败');
    }
  };

  const deleteRobot = async (robotId: string, robotName: string) => {
    if (!confirm(`确定要删除机器人 "${robotName}" 吗？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/robots/${robotId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      if (response.ok) {
        alert('机器人已删除');
        fetchDashboardData();
      } else {
        alert('删除失败');
      }
    } catch (err) {
      console.error('Failed to delete robot:', err);
      alert('删除机器人失败');
    }
  };

  const paginatedNotifications = notifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(notifications.length / itemsPerPage);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#f3f4f6'
      }}>
        {/* 主加载区域 */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          {/* 旋转加载器 */}
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
          </div>
          <p style={{ fontSize: '1rem', color: '#6b7280', fontWeight: 500 }}>加载中...</p>
        </div>

        {/* 固定页脚 */}
        <div style={{
          padding: '1.5rem',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: 'white',
          textAlign: 'center',
          color: '#9ca3af',
          fontSize: '0.875rem'
        }}>
          正在初始化系统数据，请稍候...
        </div>

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', paddingBottom: '2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
            仪表板
          </h1>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setTimeRange('today')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: timeRange === 'today' ? '#3b82f6' : '#e5e7eb',
                color: timeRange === 'today' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              今天
            </button>
            <button
              onClick={() => setTimeRange('7days')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: timeRange === '7days' ? '#3b82f6' : '#e5e7eb',
                color: timeRange === '7days' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              最近7天
            </button>
            <button
              onClick={() => setTimeRange('month')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: timeRange === 'month' ? '#3b82f6' : '#e5e7eb',
                color: timeRange === 'month' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              本月
            </button>
            <button
              onClick={() => setTimeRange('all')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: timeRange === 'all' ? '#3b82f6' : '#e5e7eb',
                color: timeRange === 'all' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              全部
            </button>
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '1rem', borderRadius: '0.5rem', marginBottom: '2rem' }}>
            {error}
          </div>
        )}

        {/* 统计卡片 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* 通知总数 */}
          <div style={{ background: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'; }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>📊 通知总数</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>{stats.total}</div>
            <div style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: 500 }}>📈 +{stats.todayTotal} 今天</div>
          </div>

          {/* 成功通知 */}
          <div style={{ background: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'; }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>✅ 成功通知</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>{stats.success}</div>
            <div style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: 500 }}>📈 +{stats.todaySuccess} 今天</div>
          </div>

          {/* 失败通知 */}
          <div style={{ background: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'; }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>❌ 失败通知</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>{stats.failed}</div>
            <div style={{ fontSize: '0.875rem', color: '#ef4444', fontWeight: 500 }}>📈 +{stats.todayFailed} 今天</div>
          </div>

          {/* 警告通知 */}
          <div style={{ background: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'; }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>⚠️ 警告通知</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>{stats.warning}</div>
            <div style={{ fontSize: '0.875rem', color: '#d97706', fontWeight: 500 }}>📈 +{stats.todayWarning} 今天</div>
          </div>

          {/* 信息通知 */}
          <div style={{ background: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'; }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>📝 汇报通知</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>{stats.info}</div>
            <div style={{ fontSize: '0.875rem', color: '#1e40af', fontWeight: 500 }}>📈 +{stats.todayInfo} 今天</div>
          </div>

          {/* 活跃机器人 */}
          <div style={{ background: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'; }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>🤖 活跃机器人</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>{stats.activeRobots}</div>
            <div style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: 500 }}>✅ 已启用</div>
          </div>
        </div>

        {/* 最近通知记录 */}
        <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', marginBottom: '2rem', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#1f2937' }}>最近通知记录</h2>
          </div>
          <div style={{ overflowX: 'auto', padding: '1.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb' }}>
                <tr>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>时间</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>标题</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>状态</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>来源</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>操作</th>
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
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#374151' }}>{notification.source}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                        <button
                          onClick={() => openNotificationDetail(notification)}
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
                          查看
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
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

        {/* 活跃机器人 */}
        <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#1f2937' }}>活跃机器人</h2>
          </div>
          <div style={{ overflowX: 'auto', padding: '1.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f9fafb' }}>
                <tr>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>机器人名称</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>状态</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>最后消息</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>消息数</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {robots.length > 0 ? (
                  robots.map((robot) => (
                    <tr key={robot.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#374151' }}>{robot.name}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#374151' }}>
                        <span style={{ color: robot.status === 'active' ? '#10b981' : '#6b7280', fontWeight: 600 }}>
                          {robot.status === 'active' ? '🟢 活跃' : '🔴 离线'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#374151' }}>{robot.lastMessage || '未发送'}</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#374151' }}>{robot.messageCount}条</td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => testRobot(robot.id)}
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
                            测试
                          </button>
                          <button
                            style={{
                              padding: '0.375rem 0.75rem',
                              backgroundColor: '#e5e7eb',
                              color: '#374151',
                              border: 'none',
                              borderRadius: '0.25rem',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => deleteRobot(robot.id, robot.name)}
                            style={{
                              padding: '0.375rem 0.75rem',
                              backgroundColor: '#f3f4f6',
                              color: '#ef4444',
                              border: 'none',
                              borderRadius: '0.25rem',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                      暂无机器人
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 通知详情模态框 - 飞书卡片风格 */}
      {selectedNotification && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={closeNotificationDetail}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }} onClick={(e) => e.stopPropagation()}>
            {/* 模态框头部 - 飞书卡片风格 */}
            <div style={{
              backgroundColor: getStatusColor(selectedNotification.status),
              padding: '1.5rem',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <span style={{ fontSize: '1.5rem' }}>
                {getStatusLabel(selectedNotification.status)[0]}
              </span>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 'bold' }}>
                  {selectedNotification.title}
                </h2>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', opacity: 0.9 }}>
                  {getStatusLabel(selectedNotification.status)}
                </p>
              </div>
            </div>

            {/* 模态框内容区 */}
            <div style={{
              padding: '1.5rem',
              flex: 1,
              overflowY: 'auto'
            }}>
              {/* 基本信息 */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                    来源
                  </label>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>
                    {selectedNotification.source || '未指定'}
                  </p>
                </div>
              </div>

              {/* 主要内容 */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                  详细内容
                </label>
                <div style={{
                  fontSize: '0.875rem',
                  color: '#374151',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  backgroundColor: '#f9fafb',
                  padding: '0.75rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #e5e7eb'
                }}>
                  {((selectedNotification as unknown) as Record<string, string>).summary || ((selectedNotification as unknown) as Record<string, string>).message || selectedNotification.title || '暂无内容'}
                </div>
              </div>
            </div>

            {/* 模态框底部 - 飞书风格时间戳 */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                🕐 {new Date(selectedNotification.createdAt || '').toLocaleString('zh-CN')}
              </span>
              <button
                onClick={closeNotificationDetail}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
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

export default Dashboard;
