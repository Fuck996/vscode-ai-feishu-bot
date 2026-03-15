import React, { useState, useEffect } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock3, MoreHorizontal, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/auth';
import NotificationDetailModal from '../components/NotificationDetailModal';
import StatusBadge from '../components/StatusBadge';
import SceneIcon from '../components/SceneIcon';

interface Notification {
  id: string;
  title: string;
  status: 'success' | 'error' | 'warning' | 'info';
  source: string;
  createdAt: string;
  summary?: string;
  message?: string;
  details?: string;
  action?: string;
  robotName?: string;
}

interface Robot {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  lastMessageTime?: string;
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

const STATUS_OPTIONS: Array<{ value: string; label: string; color: string; bg: string }> = [
  { value: 'success', label: '成功', color: '#1a7f37', bg: '#dcfce7' },
  { value: 'error', label: '失败', color: '#cf222e', bg: '#fee2e2' },
  { value: 'warning', label: '警告', color: '#9a6700', bg: '#fef3c7' },
  { value: 'info', label: '信息', color: '#0969da', bg: '#dbeafe' },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState<Stats>({
    total: 0, success: 0, failed: 0, warning: 0, info: 0, activeRobots: 0,
    todayTotal: 0, todaySuccess: 0, todayFailed: 0, todayWarning: 0, todayInfo: 0,
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [robots, setRobots] = useState<Robot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | '7days' | '30days' | 'all'>('7days');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [robotMenuPos, setRobotMenuPos] = useState<{ id: string; top: number; left: number } | null>(null);
  const [notifMenuPos, setNotifMenuPos] = useState<{ id: string; top: number; left: number } | null>(null);
  const [openFilterMenu, setOpenFilterMenu] = useState<'status' | 'robot' | 'robotStatus' | null>(null);
  const [filterSearch, setFilterSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [robotFilter, setRobotFilter] = useState<string[]>([]);
  const [robotStatusFilter, setRobotStatusFilter] = useState<string[]>([]);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, robotFilter, timeRange]);

  useEffect(() => {
    if (!robotMenuPos && !notifMenuPos && !openFilterMenu) return undefined;
    const handle = () => {
      setRobotMenuPos(null);
      setNotifMenuPos(null);
      setOpenFilterMenu(null);
    };
    window.addEventListener('click', handle);
    return () => window.removeEventListener('click', handle);
  }, [robotMenuPos, notifMenuPos, openFilterMenu]);

  const getTimeRangeStartDate = (range: string): Date => {
    const now = new Date();
    switch (range) {
      case 'today':
        now.setHours(0, 0, 0, 0);
        return now;
      case 'week':
      case '7days': {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        d.setHours(0, 0, 0, 0);
        return d;
      }
      case 'month': {
        const d = new Date(now);
        d.setMonth(d.getMonth() - 1);
        d.setHours(0, 0, 0, 0);
        return d;
      }
      case '30days': {
        const d = new Date(now);
        d.setDate(d.getDate() - 30);
        d.setHours(0, 0, 0, 0);
        return d;
      }
      case 'all':
      default:
        return new Date(0);
    }
  };

  const calculateTodayStats = (notifs: Notification[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let todayTotal = 0, todaySuccess = 0, todayFailed = 0, todayWarning = 0, todayInfo = 0;
    notifs.forEach(n => {
      const d = new Date(n.createdAt);
      d.setHours(0, 0, 0, 0);
      if (d.getTime() === today.getTime()) {
        todayTotal++;
        if (n.status === 'success') todaySuccess++;
        else if (n.status === 'error') todayFailed++;
        else if (n.status === 'warning') todayWarning++;
        else if (n.status === 'info') todayInfo++;
      }
    });
    return { todayTotal, todaySuccess, todayFailed, todayWarning, todayInfo };
  };

  const filterNotificationsByTimeRange = (notifs: Notification[]): Notification[] => {
    const startDate = getTimeRangeStartDate(timeRange);
    return notifs.filter(n => new Date(n.createdAt) >= startDate);
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const notificationsResponse = await authService.fetchWithAuth('/api/notifications?limit=10000');
      let notificationsData: Notification[] = [];
      if (notificationsResponse.ok) {
        const data = await notificationsResponse.json();
        notificationsData = data.notifications || (Array.isArray(data) ? data : []);
        setNotifications(notificationsData);
      }

      const filteredNotifications = filterNotificationsByTimeRange(notificationsData);

      let robotsList: Robot[] = [];
      const robotsResponse = await authService.fetchWithAuth('/api/robots');
      if (robotsResponse.ok) {
        const robotsData = await robotsResponse.json();
        robotsList = robotsData.data || robotsData.robots || (Array.isArray(robotsData) ? robotsData : []);
        robotsList = robotsList.map(robot => {
          const robotNotifications = notificationsData.filter(n => n.robotName === robot.name);
          const messageCount = robotNotifications.length;
          let lastMessageTime: string | undefined = undefined;
          if (robotNotifications.length > 0) {
            const sorted = [...robotNotifications].sort((a, b) =>
              new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
            );
            lastMessageTime = sorted[0].createdAt;
          }
          return { ...robot, messageCount, lastMessageTime };
        });
        setRobots(robotsList);
      }

      const total = filteredNotifications.length;
      const success = filteredNotifications.filter(n => n.status === 'success').length;
      const failed = filteredNotifications.filter(n => n.status === 'error').length;
      const warning = filteredNotifications.filter(n => n.status === 'warning').length;
      const info = filteredNotifications.filter(n => n.status === 'info').length;
      const activeRobots = robotsList.filter((r: Robot) => r.status === 'active').length;
      const todayStats = calculateTodayStats(notificationsData);
      setStats({ total, success, failed, warning, info, activeRobots, ...todayStats });
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const openNotificationDetail = (notification: Notification) => setSelectedNotification(notification);
  const closeNotificationDetail = () => setSelectedNotification(null);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#3b82f6';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'success': return '成功';
      case 'error': return '失败';
      case 'warning': return '警告';
      case 'info': return '信息';
      default: return status;
    }
  };

  const getNotificationStatusStyle = (status: Notification['status']) => {
    switch (status) {
      case 'success': return { color: '#1a7f37', backgroundColor: '#dcfce7' };
      case 'error': return { color: '#cf222e', backgroundColor: '#fee2e2' };
      case 'warning': return { color: '#9a6700', backgroundColor: '#fef3c7' };
      default: return { color: '#0969da', backgroundColor: '#dbeafe' };
    }
  };

  const formatNotificationDate = (createdAt: string) => {
    const date = new Date(createdAt);
    return {
      date: date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }),
      time: date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
    };
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
      if (response.ok) { alert('测试通知已发送'); fetchDashboardData(); }
      else alert('测试失败');
    } catch (err) {
      console.error('Failed to test robot:', err);
      alert('发送测试通知失败');
    }
  };

  const deleteRobot = async (robotId: string, robotName: string) => {
    if (!confirm(`确定要删除机器人 "${robotName}" 吗？`)) return;
    try {
      const response = await fetch(`/api/robots/${robotId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (response.ok) { alert('机器人已删除'); fetchDashboardData(); }
      else alert('删除失败');
    } catch (err) {
      console.error('Failed to delete robot:', err);
      alert('删除机器人失败');
    }
  };

  // 计算过滤后的显示通知
  const timeFilteredNotifications = filterNotificationsByTimeRange(notifications);
  const displayedNotifications = timeFilteredNotifications.filter(n => {
    if (statusFilter.length > 0 && !statusFilter.includes(n.status)) return false;
    if (robotFilter.length > 0 && !robotFilter.includes(n.robotName || '')) return false;
    return true;
  });
  const paginatedNotifications = displayedNotifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(displayedNotifications.length / itemsPerPage);

  // 机器人列表按状态筛选
  const filteredRobots = robots.filter(r => robotStatusFilter.length === 0 || robotStatusFilter.includes(r.status));

  // 所有机器人名称（用于筛选下拉）
  const allRobotNames = [...new Set(
    notifications.map(n => n.robotName).filter((r): r is string => Boolean(r))
  )];

  // GitHub 风格筛选下拉框
  const renderFilterDropdown = (type: 'status' | 'robot') => {
    const isStatus = type === 'status';
    const label = isStatus ? '状态' : '机器人';
    const activeFilters = isStatus ? statusFilter : robotFilter;
    const options = isStatus ? STATUS_OPTIONS.map(o => o.value) : allRobotNames;
    const filteredOptions = options.filter(opt => {
      const displayLabel = isStatus
        ? STATUS_OPTIONS.find(s => s.value === opt)?.label || opt
        : opt;
      return filterSearch === '' || displayLabel.toLowerCase().includes(filterSearch.toLowerCase());
    });
    const hasActive = activeFilters.length > 0;

    return (
      <div key={type} style={{ position: 'relative', display: 'inline-block' }} onClick={e => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => {
            setOpenFilterMenu(openFilterMenu === type ? null : type);
            setFilterSearch('');
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.375rem 0.75rem',
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: hasActive ? '#0969da' : '#57606a',
            backgroundColor: hasActive ? '#dbeafe' : '#f6f8fa',
            border: `1px solid ${hasActive ? '#0969da' : '#d0d7de'}`,
            borderRadius: '0.375rem',
            cursor: 'pointer',
          }}
        >
          {label}
          {hasActive && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '16px', height: '16px', borderRadius: '50%',
              backgroundColor: '#0969da', color: 'white',
              fontSize: '0.6rem', fontWeight: 700,
            }}>
              {activeFilters.length}
            </span>
          )}
          <ChevronDown size={13} />
        </button>
        {openFilterMenu === type && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 0.375rem)',
            right: 0,
            minWidth: '200px',
            backgroundColor: '#ffffff',
            border: '1px solid #d0d7de',
            borderRadius: '0.75rem',
            boxShadow: '0 16px 32px rgba(31, 35, 40, 0.15)',
            zIndex: 30,
            overflow: 'hidden',
          }}>
            {/* 下拉头部 */}
            <div style={{ padding: '0.625rem 1rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1f2328' }}>
                {isStatus ? '按状态筛选' : '按机器人筛选'}
              </span>
              {hasActive && (
                <button
                  type="button"
                  onClick={() => isStatus ? setStatusFilter([]) : setRobotFilter([])}
                  style={{ fontSize: '0.75rem', color: '#0969da', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  清除
                </button>
              )}
            </div>
            {/* 搜索框 */}
            <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#f6f8fa', border: '1px solid #d0d7de', borderRadius: '0.375rem', padding: '0.3rem 0.6rem' }}>
                <Search size={13} color="#57606a" />
                <input
                  type="text"
                  placeholder="搜索..."
                  value={filterSearch}
                  onChange={e => setFilterSearch(e.target.value)}
                  style={{ border: 'none', background: 'none', outline: 'none', fontSize: '0.8125rem', color: '#1f2328', width: '100%' }}
                />
              </div>
            </div>
            {/* 选项列表 */}
            <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
              {filteredOptions.length === 0 ? (
                <div style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: '#6b7280', textAlign: 'center' }}>
                  暂无匹配项
                </div>
              ) : (
                filteredOptions.map(opt => {
                  const isSelected = activeFilters.includes(opt);
                  const displayLabel = isStatus ? STATUS_OPTIONS.find(s => s.value === opt)?.label || opt : opt;
                  const statusOpt = isStatus ? STATUS_OPTIONS.find(s => s.value === opt) : null;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        if (isStatus) {
                          setStatusFilter(prev => prev.includes(opt) ? prev.filter(s => s !== opt) : [...prev, opt]);
                        } else {
                          setRobotFilter(prev => prev.includes(opt) ? prev.filter(r => r !== opt) : [...prev, opt]);
                        }
                      }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.5rem 1rem', border: 'none',
                        backgroundColor: isSelected ? '#f0f6ff' : 'transparent',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <div style={{
                        width: '15px', height: '15px', borderRadius: '0.25rem', flexShrink: 0,
                        border: `1px solid ${isSelected ? '#0969da' : '#d0d7de'}`,
                        backgroundColor: isSelected ? '#0969da' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isSelected && <span style={{ color: 'white', fontSize: '0.55rem', fontWeight: 700, lineHeight: 1 }}>✓</span>}
                      </div>
                      {statusOpt && (
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: statusOpt.color, flexShrink: 0 }} />
                      )}
                      <span style={{ fontSize: '0.8125rem', color: '#1f2328', fontWeight: isSelected ? 600 : 400 }}>
                        {displayLabel}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f3f4f6' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ width: '60px', height: '60px', border: '4px solid #e5e7eb', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ fontSize: '1rem', color: '#6b7280', fontWeight: 500 }}>加载中...</p>
        </div>
        <div style={{ padding: '1.5rem', borderTop: '1px solid #e5e7eb', backgroundColor: 'white', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
          正在初始化系统数据，请稍候...
        </div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f6f8fa', minHeight: '100vh', paddingBottom: '2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '1rem', borderRadius: '0.5rem', marginBottom: '2rem' }}>
            {error}
          </div>
        )}

        {/* 时间范围筛选 - 统计卡片上方右对齐 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.375rem', marginBottom: '1.25rem' }}>
          {([
            { value: 'today' as const, label: '今天' },
            { value: '7days' as const, label: '最近7天' },
            { value: 'month' as const, label: '本月' },
            { value: 'all' as const, label: '全部' },
          ]).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTimeRange(value)}
              style={{
                padding: '0.3rem 0.75rem',
                backgroundColor: timeRange === value ? '#0969da' : '#eaeef2',
                color: timeRange === value ? 'white' : '#57606a',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 500,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 统计卡片 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* 通知总数 */}
          <div style={{ background: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#656d76', fontWeight: 500 }}>
                <SceneIcon name="notification" size={16} title="通知总数" /><span>通知总数</span>
              </span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>{stats.total}</div>
            <div style={{ fontSize: '0.875rem', color: '#1a7f37', fontWeight: 500 }}>今日新增 +{stats.todayTotal}</div>
          </div>

          {/* 成功通知 */}
          <div style={{ background: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#656d76', fontWeight: 500 }}>
                <SceneIcon name="success" size={16} title="成功通知" /><span>成功通知</span>
              </span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>{stats.success}</div>
            <div style={{ fontSize: '0.875rem', color: '#1a7f37', fontWeight: 500 }}>今日新增 +{stats.todaySuccess}</div>
          </div>

          {/* 失败通知 */}
          <div style={{ background: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#656d76', fontWeight: 500 }}>
                <SceneIcon name="error" size={16} title="失败通知" /><span>失败通知</span>
              </span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>{stats.failed}</div>
            <div style={{ fontSize: '0.875rem', color: '#cf222e', fontWeight: 500 }}>今日新增 +{stats.todayFailed}</div>
          </div>

          {/* 警告通知 */}
          <div style={{ background: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#656d76', fontWeight: 500 }}>
                <SceneIcon name="warning" size={16} title="警告通知" /><span>警告通知</span>
              </span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>{stats.warning}</div>
            <div style={{ fontSize: '0.875rem', color: '#9a6700', fontWeight: 500 }}>今日新增 +{stats.todayWarning}</div>
          </div>

          {/* 信息通知 */}
          <div style={{ background: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#656d76', fontWeight: 500 }}>
                <SceneIcon name="info" size={16} title="信息通知" /><span>信息通知</span>
              </span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>{stats.info}</div>
            <div style={{ fontSize: '0.875rem', color: '#0969da', fontWeight: 500 }}>今日新增 +{stats.todayInfo}</div>
          </div>

          {/* 活跃机器人 */}
          <div style={{ background: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#656d76', fontWeight: 500 }}>
                <SceneIcon name="robot" size={16} title="活跃机器人" /><span>活跃机器人</span>
              </span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>{stats.activeRobots}</div>
            <div style={{ fontSize: '0.875rem', color: '#1a7f37', fontWeight: 500 }}>当前已启用</div>
          </div>
        </div>

        {/* 活跃机器人 */}
        <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1f2328' }}>活跃机器人</span>
              <span style={{ fontSize: '0.8125rem', color: '#656d76' }}>共 {filteredRobots.length} 个</span>
            </div>
            {/* GitHub 风格状态筛选按钮 */}
            <div style={{ position: 'relative', display: 'inline-block' }} onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setOpenFilterMenu(openFilterMenu === 'robotStatus' ? null : 'robotStatus')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.375rem 0.75rem', fontSize: '0.8125rem', fontWeight: 500,
                  color: robotStatusFilter.length > 0 ? '#0969da' : '#57606a',
                  backgroundColor: robotStatusFilter.length > 0 ? '#dbeafe' : '#f6f8fa',
                  border: `1px solid ${robotStatusFilter.length > 0 ? '#0969da' : '#d0d7de'}`,
                  borderRadius: '0.375rem', cursor: 'pointer',
                }}
              >
                状态
                {robotStatusFilter.length > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#0969da', color: 'white', fontSize: '0.6rem', fontWeight: 700 }}>
                    {robotStatusFilter.length}
                  </span>
                )}
                <ChevronDown size={13} />
              </button>
              {openFilterMenu === 'robotStatus' && (
                <div style={{ position: 'absolute', top: 'calc(100% + 0.375rem)', right: 0, minWidth: '160px', backgroundColor: '#ffffff', border: '1px solid #d0d7de', borderRadius: '0.75rem', boxShadow: '0 16px 32px rgba(31, 35, 40, 0.15)', zIndex: 30, overflow: 'hidden' }}>
                  <div style={{ padding: '0.625rem 1rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1f2328' }}>按状态筛选</span>
                    {robotStatusFilter.length > 0 && (
                      <button type="button" onClick={() => setRobotStatusFilter([])} style={{ fontSize: '0.75rem', color: '#0969da', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>清除</button>
                    )}
                  </div>
                  {([{ value: 'active', label: '启用' }, { value: 'inactive', label: '禁用' }] as const).map(opt => {
                    const isSelected = robotStatusFilter.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setRobotStatusFilter(prev => prev.includes(opt.value) ? prev.filter(s => s !== opt.value) : [...prev, opt.value])}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', border: 'none', backgroundColor: isSelected ? '#f0f6ff' : 'transparent', cursor: 'pointer', textAlign: 'left' }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = '#f6f8fa'; }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <div style={{ width: '15px', height: '15px', borderRadius: '0.25rem', flexShrink: 0, border: `1px solid ${isSelected ? '#0969da' : '#d0d7de'}`, backgroundColor: isSelected ? '#0969da' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isSelected && <span style={{ color: 'white', fontSize: '0.6rem', fontWeight: 900 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: '0.8125rem', color: '#1f2328' }}>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <tbody>
                {filteredRobots.length > 0 ? (
                  filteredRobots.map(robot => {
                    const robotDateTime = robot.lastMessageTime
                      ? formatNotificationDate(robot.lastMessageTime)
                      : null;
                    return (
                      <tr key={robot.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        {/* 名称 + 条数合并列 */}
                        <td style={{ padding: '0.875rem 1.5rem', width: '260px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              <SceneIcon name="robotMessage" size={16} title={robot.name} style={{ flexShrink: 0 }} />
                              <span
                                style={{ fontWeight: 600, color: '#1f2328', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer', textDecoration: 'none' }}
                                onMouseEnter={e => { e.currentTarget.style.color = '#0969da'; e.currentTarget.style.textDecoration = 'underline'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = '#1f2328'; e.currentTarget.style.textDecoration = 'none'; }}
                                onClick={() => navigate(`/robots/${robot.id}/integrations`)}
                              >{robot.name}</span>
                            </span>
                            <span style={{ color: '#656d76', fontSize: '0.75rem', paddingLeft: '1.5rem', whiteSpace: 'nowrap' }}>
                              {robot.messageCount ?? 0} 条记录
                            </span>
                          </div>
                        </td>
                        {/* 状态：启用 / 禁用 */}
                        <td style={{ padding: '0.875rem 0.75rem', textAlign: 'center' }}>
                          <StatusBadge
                            tone={robot.status === 'active' ? 'active' : 'inactive'}
                            label={robot.status === 'active' ? '启用' : '禁用'}
                          />
                        </td>
                        {/* 日期 + 时间 + 操作菜单 */}
                        <td style={{ padding: '0.875rem 1.5rem 0.875rem 0.75rem', width: '220px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'left' }}>
                              {robotDateTime ? (
                                <>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#374151', fontSize: '0.8125rem', fontWeight: 500 }}>
                                    <CalendarDays size={14} color="#57606a" /><span>{robotDateTime.date}</span>
                                  </span>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#656d76', fontSize: '0.75rem' }}>
                                    <Clock3 size={14} color="#57606a" /><span>{robotDateTime.time}</span>
                                  </span>
                                </>
                              ) : (
                                <span style={{ color: '#9ca3af', fontSize: '0.8125rem' }}>未发送</span>
                              )}
                            </div>
                            <span style={{ color: '#e5e7eb', fontSize: '1rem', flexShrink: 0 }}>|</span>
                            <div onClick={e => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setRobotMenuPos(robotMenuPos?.id === robot.id ? null : { id: robot.id, top: rect.bottom + 6, left: rect.right - 140 });
                                }}
                                style={{ width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: '0.5rem', backgroundColor: '#ffffff', color: '#57606a', cursor: 'pointer' }}
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
                      暂无机器人
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 最近通知记录 */}
        <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1f2328' }}>最近通知记录</span>
              <span style={{ fontSize: '0.8125rem', color: '#656d76' }}>共 {displayedNotifications.length} 条</span>
            </div>
            {/* GitHub 风格筛选按钮组 */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {renderFilterDropdown('status')}
              {renderFilterDropdown('robot')}
              {(statusFilter.length > 0 || robotFilter.length > 0) && (
                <button
                  type="button"
                  onClick={() => { setStatusFilter([]); setRobotFilter([]); }}
                  style={{ fontSize: '0.8125rem', color: '#cf222e', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0.375rem', borderRadius: '0.25rem' }}
                >
                  清除筛选
                </button>
              )}
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <tbody>
                {paginatedNotifications.length > 0 ? (
                  paginatedNotifications.map((notification) => {
                    const statusStyle = getNotificationStatusStyle(notification.status);
                    const { date, time } = formatNotificationDate(notification.createdAt);
                    return (
                      <tr key={notification.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', width: '260px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: 0 }}>
                            <span
                              style={{ color: '#1f2328', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer', textDecoration: 'none' }}
                              onMouseEnter={e => { e.currentTarget.style.color = '#0969da'; e.currentTarget.style.textDecoration = 'underline'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = '#1f2328'; e.currentTarget.style.textDecoration = 'none'; }}
                              onClick={() => openNotificationDetail(notification)}
                            >
                              {notification.title}
                            </span>
                            <span style={{ color: '#656d76', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {notification.source || '—'}
                            </span>
                          </div>
                        </td>

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
                            <span style={{ color: '#e5e7eb', fontSize: '1rem', flexShrink: 0 }}>|</span>
                            <div onClick={e => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setNotifMenuPos(notifMenuPos?.id === notification.id ? null : { id: notification.id, top: rect.bottom + 6, left: rect.right - 120 });
                                }}
                                style={{ width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: '0.5rem', backgroundColor: '#ffffff', color: '#57606a', cursor: 'pointer' }}
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
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.125rem', margin: '1rem 1.5rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.625rem', border: 'none', backgroundColor: 'transparent', color: currentPage === 1 ? '#8c959f' : '#0969da', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', borderRadius: '0.375rem', fontSize: '0.8125rem', fontWeight: 500, opacity: currentPage === 1 ? 0.7 : 1 }}
                  onMouseEnter={e => { if (currentPage !== 1) e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <ChevronLeft size={15} />
                  上一页
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    style={{ width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: currentPage === page ? 'none' : '1px solid transparent', backgroundColor: currentPage === page ? '#0969da' : 'transparent', color: currentPage === page ? 'white' : '#1f2328', cursor: 'pointer', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: currentPage === page ? 600 : 400 }}
                    onMouseEnter={e => { if (currentPage !== page) { e.currentTarget.style.border = '1px solid #d0d7de'; } }}
                    onMouseLeave={e => { if (currentPage !== page) { e.currentTarget.style.border = '1px solid transparent'; } }}
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
                  下一页
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {robotMenuPos && (
        <div
          style={{ position: 'fixed', top: robotMenuPos.top, left: robotMenuPos.left, minWidth: '140px', padding: '0.4rem', backgroundColor: '#ffffff', border: '1px solid #d0d7de', borderRadius: '0.75rem', boxShadow: '0 12px 28px rgba(31, 35, 40, 0.12)', zIndex: 9999 }}
          onClick={e => e.stopPropagation()}
        >
          {([
            { label: '测试', color: '#1f2328', action: () => { testRobot(robotMenuPos.id); setRobotMenuPos(null); } },
            { label: '集成', color: '#1f2328', action: () => { navigate('/integrations'); setRobotMenuPos(null); } },
            { label: '编辑', color: '#1f2328', action: () => { navigate('/robots'); setRobotMenuPos(null); } },
            { label: '删除', color: '#cf222e', action: () => { const r = robots.find(rb => rb.id === robotMenuPos.id); if (r) deleteRobot(r.id, r.name); setRobotMenuPos(null); } },
          ] as const).map(item => (
            <button
              key={item.label}
              type="button"
              onClick={item.action}
              style={{ width: '100%', textAlign: 'left', padding: '0.55rem 0.75rem', border: 'none', borderRadius: '0.5rem', backgroundColor: '#ffffff', color: item.color, cursor: 'pointer', fontSize: '0.875rem', fontWeight: item.label === '删除' ? 400 : 500 }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = item.label === '删除' ? '#fff0f0' : '#f6f8fa'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {notifMenuPos && (
        <div
          style={{ position: 'fixed', top: notifMenuPos.top, left: notifMenuPos.left, minWidth: '120px', padding: '0.4rem', backgroundColor: '#ffffff', border: '1px solid #d0d7de', borderRadius: '0.75rem', boxShadow: '0 12px 28px rgba(31, 35, 40, 0.12)', zIndex: 9999 }}
          onClick={e => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => { const n = notifications.find(x => x.id === notifMenuPos.id); if (n) openNotificationDetail(n); setNotifMenuPos(null); }}
            style={{ width: '100%', textAlign: 'left', padding: '0.55rem 0.75rem', border: 'none', borderRadius: '0.5rem', backgroundColor: '#ffffff', color: '#1f2328', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f6f8fa'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
          >
            查看
          </button>
        </div>
      )}

      <NotificationDetailModal notification={selectedNotification} onClose={closeNotificationDetail} />
    </div>
  );
};

export default Dashboard;
