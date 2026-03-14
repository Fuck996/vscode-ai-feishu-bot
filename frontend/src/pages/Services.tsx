import React, { useEffect, useState, useCallback, useRef } from 'react';
import SceneIcon, { SceneIconName } from '../components/SceneIcon';
import authService from '../services/auth';

interface Service {
  id: string;
  name: string;
  type: string;
  icon: string;
  description: string;
  status: 'running' | 'stopped' | 'error';
  associatedIntegrations: number;
  stats: {
    label: string;
    value: string;
  }[];
  lastError?: string;
  uptime?: string;
  isScheduled?: boolean;
  nextRunTime?: string;
}

interface Log {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  service?: string;
  user?: {
    id: string;
    username: string;
    nickname?: string;
    displayName: string;
  };
  robot?: {
    id: string;
    name: string;
  };
  integration?: {
    id: string;
    name: string;
    type: string;
  };
}

interface TimeCountdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getServiceIconName(service: Service): SceneIconName {
  const fingerprint = `${service.id} ${service.name} ${service.type}`.toLowerCase();

  if (fingerprint.includes('mcp') || fingerprint.includes('vscode')) {
    return 'vscode';
  }

  if (fingerprint.includes('通知') || fingerprint.includes('webhook') || fingerprint.includes('push')) {
    return 'notification';
  }

  return 'service';
}

function getLogBadges(log: Log): Array<{ key: string; text: string; color: string }> {
  const badges: Array<{ key: string; text: string; color: string }> = [];

  if (log.user?.displayName && log.robot?.name) {
    badges.push({
      key: 'owner',
      text: `[来源:${log.user.displayName}/${log.robot.name}]`,
      color: '#34d399',
    });
  } else if (log.user?.displayName) {
    badges.push({
      key: 'user',
      text: `[用户:${log.user.displayName}]`,
      color: '#34d399',
    });
  } else if (log.robot?.name) {
    badges.push({
      key: 'robot',
      text: `[机器人:${log.robot.name}]`,
      color: '#22d3ee',
    });
  }

  if (log.integration?.name) {
    badges.push({
      key: 'integration',
      text: `[集成:${log.integration.name}]`,
      color: '#c4b5fd',
    });
  }

  return badges;
}

const Services: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<'overview' | 'ai-report'>('overview');
  const [services, setServices] = useState<Service[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLogs, setActiveLogs] = useState<Log[]>([]);
  const [selectedService, setSelectedService] = useState<string>('全部');
  const [countdowns, setCountdowns] = useState<Record<string, TimeCountdown>>({});
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [operatingServiceId, setOperatingServiceId] = useState<string | null>(null);
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const logPanelRef = useRef<HTMLDivElement>(null);

  // 菜单项样式函数
  const menuItemStyle = (key: string): React.CSSProperties => ({
    padding: '0.875rem 1.25rem',
    cursor: 'pointer',
    borderLeft: activeMenu === key ? '3px solid #1e40af' : '3px solid transparent',
    fontSize: '0.875rem',
    color: activeMenu === key ? '#0969da' : '#57606a',
    backgroundColor: hoveredMenu === key ? '#ddf4ff' : 'transparent',
    fontWeight: activeMenu === key ? 600 : 400,
    borderBottom: '1px solid #f3f4f6',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'background-color 0.15s ease, color 0.15s ease',
  });

  useEffect(() => {
    fetchServices();
    fetchLogs();
    
    // 每 5 秒自动刷新日志
    const logInterval = setInterval(() => {
      if (autoRefresh) fetchLogs();
    }, 5000);

    // 倒计时更新
    const countdownInterval = setInterval(() => {
      updateCountdowns();
    }, 1000);

    return () => {
      clearInterval(logInterval);
      clearInterval(countdownInterval);
    };
  }, [autoRefresh]);

  useEffect(() => {
    if (selectedService === '全部') {
      setActiveLogs(logs);
    } else {
      setActiveLogs(logs.filter(log => log.service === selectedService));
    }
  }, [selectedService, logs]);

  // 计算倒计时
  const updateCountdowns = useCallback(() => {
    const newCountdowns: Record<string, TimeCountdown> = {};
    services.forEach(service => {
      if (service.isScheduled && service.nextRunTime) {
        const nextRun = new Date(service.nextRunTime).getTime();
        const now = Date.now();
        const diff = nextRun - now;

        if (diff > 0) {
          newCountdowns[service.id] = {
            days: Math.floor(diff / (1000 * 60 * 60 * 24)),
            hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
            minutes: Math.floor((diff / (1000 * 60)) % 60),
            seconds: Math.floor((diff / 1000) % 60),
          };
        }
      }
    });
    setCountdowns(newCountdowns);
  }, [services]);

  useEffect(() => {
    updateCountdowns();
  }, [services, updateCountdowns]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authService.fetchWithAuth('/api/services');
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      }
    } catch (err) {
      console.error('Failed to fetch services:', err);
      setError('获取服务列表失败');
      // 模拟数据用于演示
      const now = new Date();
      const nextMCP = new Date(now.getTime() + 3600 * 1000);
      setServices([
        {
          id: 'mcp-service',
          name: 'MCP 工作汇报服务',
          type: 'Model Context Protocol',
          icon: '📋',
          description: 'VS Code Copilot 工作汇报中间件，自动将任务总结发送到飞书群组',
          status: 'running',
          associatedIntegrations: 1,
          stats: [
            { label: '关联集成', value: '1' },
            { label: '今日调用', value: '24' },
            { label: '运行时间', value: '服务中' },
          ],
          isScheduled: false,
          uptime: '服务中',
        },
        {
          id: 'notification-service',
          name: '通知中枢',
          type: '飞书消息推送',
          icon: '🔔',
          description: '负责将所有通知推送到飞书群组，监控通知推送状态',
          status: 'error',
          associatedIntegrations: 5,
          stats: [
            { label: '关联集成', value: '5' },
            { label: '失败数', value: '8' },
            { label: '重试次数', value: '3 / 3' },
            { label: '最后错误', value: '401 Auth' },
          ],
          isScheduled: false,
          lastError: 'Webhook 返回 401: Unauthorized',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await authService.fetchWithAuth('/api/services/logs');
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  };

  const handleServiceAction = async (action: string, serviceId: string) => {
    try {
      setOperatingServiceId(serviceId);
      const response = await authService.fetchWithAuth(`/api/services/${serviceId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (response.ok) {
        alert(`操作成功`);
        fetchServices();
      } else {
        alert('操作失败');
      }
    } catch (err) {
      console.error('Service action failed:', err);
      alert('执行操作失败');
    } finally {
      setOperatingServiceId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'linear-gradient(135deg, #10b981, #059669)';
      case 'stopped':
        return 'linear-gradient(135deg, #6b7280, #4b5563)';
      case 'error':
        return 'linear-gradient(135deg, #ef4444, #dc2626)';
      default:
        return 'linear-gradient(135deg, #3b82f6, #2563eb)';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'running':
        return '运行中';
      case 'stopped':
        return '已停用';
      case 'error':
        return '异常';
      default:
        return status;
    }
  };

  const formatCountdown = (cd: TimeCountdown | undefined) => {
    if (!cd) return '';
    if (cd.days > 0) return `${cd.days}天 ${cd.hours}小时`;
    if (cd.hours > 0) return `${cd.hours}小时 ${cd.minutes}分`;
    return `${cd.minutes}分 ${cd.seconds}秒`;
  };

  const getServiceNames = () => {
    const names = logs.map(l => l.service).filter(Boolean);
    return ['全部', ...Array.from(new Set(names))];
  };

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
            animation: 'spin 1s linear infinite'
          }}>
          </div>
          <p style={{ fontSize: '1rem', color: '#6b7280', fontWeight: 500 }}>加载服务中...</p>
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
          正在加载服务列表，请稍候...
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
        {/* 页面标题 */}
        <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1f2937', marginBottom: '2rem' }}>
          服务管理
        </div>

        {/* 双栏布局 */}
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.5rem' }}>
          {/* 左侧菜单面板 */}
          <aside style={{
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            height: 'fit-content',
          }}>
            {/* 菜单项：服务总览 */}
            <div
              style={menuItemStyle('overview')}
              onClick={() => setActiveMenu('overview')}
              onMouseEnter={() => setHoveredMenu('overview')}
              onMouseLeave={() => setHoveredMenu(null)}
            >
              <SceneIcon name="service" size={16} title="服务总览" inheritColor />
              服务总览
            </div>

            {/* 菜单项：AI汇报 */}
            <div
              style={menuItemStyle('ai-report')}
              onClick={() => setActiveMenu('ai-report')}
              onMouseEnter={() => setHoveredMenu('ai-report')}
              onMouseLeave={() => setHoveredMenu(null)}
            >
              <SceneIcon name="history" size={16} title="AI汇报" inheritColor />
              AI汇报
            </div>
          </aside>

          {/* 右侧内容区 */}
          <main>
            {/* 服务总览内容 */}
            {activeMenu === 'overview' && (
              <div>
                {error && (
                  <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '1rem', borderRadius: '0.5rem', marginBottom: '2rem' }}>
                    {error}
                  </div>
                )}

        {/* 服务卡片列表 - 横向宽条形式 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          {services.map((service) => (
            <div
              key={service.id}
              style={{
                background: 'white',
                borderRadius: '0.75rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                overflow: 'hidden',
                display: 'flex',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* 左侧彩色标识带 */}
              <div
                style={{
                  background: getStatusColor(service.status),
                  color: 'white',
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '160px',
                  gap: '0.75rem',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    background: 'rgba(255,255,255,0.2)',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '1rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.9)',
                      animation: service.status === 'running' ? 'pulse 2s infinite' : 'none',
                      flexShrink: 0,
                    }}
                  />
                  {getStatusLabel(service.status)}
                </div>
              </div>

              {/* 中间：名称 + 描述 */}
              <div style={{ padding: '1.25rem 1.5rem', flex: 1, borderRight: '1px solid #f3f4f6', minWidth: 0 }}>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', marginBottom: '0.25rem' }}>
                  {service.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
                  {service.type}
                </div>
                <p style={{ fontSize: '0.8125rem', color: '#6b7280', lineHeight: 1.5, margin: 0 }}>
                  {service.description}
                </p>

                {/* 错误提示 */}
                {service.status === 'error' && service.lastError && (
                  <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', backgroundColor: '#fef2f2', borderRadius: '0.375rem', borderLeft: '3px solid #ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <SceneIcon name="warning" size={18} title="服务异常" />
                    <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>{service.lastError}</span>
                  </div>
                )}
              </div>

              {/* 右侧统计数据 */}
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '2rem', borderRight: '1px solid #f3f4f6', flexShrink: 0 }}>
                {service.stats.map((stat, idx) => (
                  <div key={idx} style={{ textAlign: 'center', minWidth: '60px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem', whiteSpace: 'nowrap' }}>
                      {stat.label}
                    </div>
                    <div style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1f2937', lineHeight: 1.2 }}>
                      {stat.value}
                    </div>
                  </div>
                ))}

                {/* 定时倒计时 */}
                {service.isScheduled && countdowns[service.id] && (
                  <div style={{ textAlign: 'center', minWidth: '80px', padding: '0.5rem', backgroundColor: '#f0f9ff', borderRadius: '0.375rem', borderLeft: '3px solid #3b82f6' }}>
                    <div style={{ fontSize: '0.7rem', color: '#1e40af', fontWeight: 600, marginBottom: '0.125rem' }}>
                      下次运行
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#0284c7', fontWeight: 500 }}>
                      {formatCountdown(countdowns[service.id])}
                    </div>
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              <div style={{ padding: '1.25rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
                <button
                  disabled={operatingServiceId === service.id}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    background: service.status === 'running' ? '#ef4444' : '#3b82f6',
                    color: 'white',
                    borderRadius: '0.375rem',
                    cursor: operatingServiceId === service.id ? 'not-allowed' : 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    opacity: operatingServiceId === service.id ? 0.5 : 1,
                    whiteSpace: 'nowrap',
                  }}
                  onClick={() => handleServiceAction(
                    service.status === 'running' ? 'stop' : 'start',
                    service.id
                  )}
                >
                  {service.status === 'running' ? '停止' : '启动'}
                </button>

                <button
                  disabled={operatingServiceId === service.id}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid #3b82f6',
                    background: 'white',
                    color: '#3b82f6',
                    borderRadius: '0.375rem',
                    cursor: operatingServiceId === service.id ? 'not-allowed' : 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    opacity: operatingServiceId === service.id ? 0.5 : 1,
                    whiteSpace: 'nowrap',
                  }}
                  onClick={() => handleServiceAction('restart', service.id)}
                >
                  重启
                </button>

              </div>
            </div>
          ))}
        </div>

        {/* 日志面板 */}
        <div ref={logPanelRef} style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <SceneIcon name="history" size={24} title="实时日志" />
              <span>实时日志</span>
              {activeLogs.length > 0 && (
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', background: '#f3f4f6', padding: '0.125rem 0.5rem', borderRadius: '1rem' }}>
                  {activeLogs.length} 条
                </span>
              )}
            </div>
            <button
              style={{
                padding: '0.375rem 0.75rem',
                border: '1px solid #d1d5db',
                background: autoRefresh ? '#dbeafe' : 'white',
                color: autoRefresh ? '#1e40af' : '#6b7280',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 500,
              }}
              onClick={() => setAutoRefresh(!autoRefresh)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = autoRefresh ? '#bfdbfe' : '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = autoRefresh ? '#dbeafe' : 'white';
              }}
            >
              {autoRefresh ? '自动刷新' : '暂停刷新'}
            </button>
          </div>

          {/* 服务选择器 - 下拉框 */}
          <div style={{ marginBottom: '1rem' }}>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                backgroundColor: 'white',
                cursor: 'pointer',
                color: '#1f2937',
                fontFamily: 'inherit',
              }}
            >
              {getServiceNames().map((name) => (
                <option key={name} value={name}>
                  {name === '全部' ? '全部服务' : name}
                </option>
              ))}
            </select>
          </div>

          {/* 日志内容 */}
          <div
            style={{
              background: '#1f2937',
              color: '#10b981',
              fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
              fontSize: '0.75rem',
              padding: '1rem',
              borderRadius: '0.375rem',
              maxHeight: '600px',
              overflowY: 'auto',
              lineHeight: 1.6,
            }}
          >
            {activeLogs.length === 0 ? (
              <div style={{ color: '#6b7280', fontStyle: 'italic' }}>
                暂无日志
              </div>
            ) : (
              activeLogs.map((log, idx) => (
                <div key={idx} style={{ marginBottom: '0.5rem' }}>
                  <span style={{ color: '#9ca3af' }}>[{log.timestamp}]</span>
                  {' '}
                  <span style={{
                    color: log.level === 'error' ? '#f87171' :
                           log.level === 'warn' ? '#fbbf24' : '#60a5fa'
                  }}>
                    [{log.level.toUpperCase()}]
                  </span>
                  {log.service && <span style={{ color: '#fbbf24' }}> [{log.service}]</span>}
                  {getLogBadges(log).map((badge) => (
                    <span key={badge.key} style={{ color: badge.color }}>
                      {' '}
                      {badge.text}
                    </span>
                  ))}
                  {' ' + log.message}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
            )}

      {/* AI汇报内容 */}
      {activeMenu === 'ai-report' && (
        <div>
          {/* 页面标题 */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1f2937', marginBottom: '0.25rem' }}>
              AI 周报摘要服务
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              定时收集各集成的历史通知，由 AI 生成摘要后推送到飞书群组
            </div>
          </div>

          {/* 服务状态卡片 */}
          <div style={{
            background: 'white',
            borderRadius: '0.75rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            display: 'flex',
            marginBottom: '2rem',
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '160px',
              gap: '0.75rem',
              flexShrink: 0,
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                background: 'rgba(255,255,255,0.2)',
                padding: '0.25rem 0.75rem',
                borderRadius: '1rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.9)',
                  animation: 'pulse 2s infinite',
                  flexShrink: 0,
                }} />
                运行中
              </div>
            </div>
            <div style={{ padding: '1.25rem 1.5rem', flex: 1 }}>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', marginBottom: '0.25rem' }}>
                📊 AI 周报摘要服务
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
                定时调度 · OpenAI 摘要 · 飞书推送
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
                按配置的时间表，自动从各集成拉取上一周的通知记录，调用 AI 模型生成结构化摘要，并通过机器人推送到指定飞书群组。
              </p>
            </div>
            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '2rem', borderRight: '1px solid #f3f4f6', flexShrink: 0 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>周报任务</div>
                <div style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1f2937' }}>3</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>本周发送</div>
                <div style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1f2937' }}>5</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>成功率</div>
                <div style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1f2937' }}>100%</div>
              </div>
            </div>
          </div>

          {/* Tab 切换 */}
          <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '1.5rem', display: 'flex', gap: '2rem' }}>
            <button
              style={{
                padding: '0.625rem 0',
                background: 'none',
                border: 'none',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#1f2937',
                cursor: 'pointer',
                borderBottom: '2px solid #2563eb',
                marginBottom: '-1px',
              }}
            >
              周报任务列表
            </button>
            <button
              style={{
                padding: '0.625rem 0',
                background: 'none',
                border: 'none',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#6b7280',
                cursor: 'pointer',
                marginBottom: '-1px',
              }}
            >
              发送历史
            </button>
            <button
              style={{
                padding: '0.625rem 0',
                background: 'none',
                border: 'none',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#6b7280',
                cursor: 'pointer',
                marginBottom: '-1px',
              }}
            >
              运行日志
            </button>
          </div>

          {/* 周报任务列表表格 */}
          <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1f2328' }}>📋 已配置任务</span>
                <span style={{ fontSize: '0.8125rem', color: '#656d76' }}>共 3 个</span>
              </div>
              <button style={{ padding: '0.375rem 0.875rem', backgroundColor: '#1f883d', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500 }}>
                + 新增
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: '900px' }}>
                <tbody>
                  {[
                    { id: '1', name: '飞书 AI 系统周报', desc: '覆盖全部集成的综合周报', schedule: '每周一 09:00', integrations: ['GitHub', 'VS Code Chat', '+2'], model: 'GPT-4o', robot: '主汇报机器人', lastSent: '2026-03-10 09:02', lastStatus: '✅ 成功推送', status: 'active' },
                    { id: '2', name: 'GitHub CI/CD 周报', desc: '专注构建与部署事件摘要', schedule: '每周五 18:00', integrations: ['GitHub'], model: 'GPT-4o mini', robot: '研发群机器人', lastSent: '2026-03-07 18:01', lastStatus: '✅ 成功推送', status: 'active' },
                    { id: '3', name: 'MCP 工作汇报周报', desc: 'AI Copilot 工作成果汇总', schedule: '每周三 10:00', integrations: ['VS Code Chat'], model: 'GPT-4o', robot: '主汇报机器人', lastSent: '—', lastStatus: '尚未运行', status: 'inactive' },
                  ].map((task) => (
                    <tr key={task.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '0.875rem 1.5rem', width: '200px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1f2328' }}>{task.name}</span>
                          <span style={{ fontSize: '0.75rem', color: '#656d76' }}>{task.desc}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.875rem 0.75rem', width: '140px', textAlign: 'center', color: '#3b5bdb', fontSize: '0.75rem', fontWeight: 600 }}>📅 {task.schedule}</td>
                      <td style={{ padding: '0.875rem 0.75rem', width: '160px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                          {task.integrations.map((tag, idx) => (
                            <span key={idx} style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600, background: '#dbeafe', color: '#1e40af' }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '0.875rem 0.75rem', width: '100px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{task.model}</span>
                      </td>
                      <td style={{ padding: '0.875rem 0.75rem', width: '120px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.8125rem', color: '#1f2937' }}>🤖 {task.robot}</span>
                      </td>
                      <td style={{ padding: '0.875rem 0.75rem', width: '150px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8125rem', color: '#374151' }}>{task.lastSent}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{task.lastStatus}</div>
                      </td>
                      <td style={{ padding: '0.875rem 0.75rem', width: '100px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.625rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600, background: task.status === 'active' ? '#d1fae5' : '#f3f4f6', color: task.status === 'active' ? '#065f46' : '#6b7280' }}>
                          ● {task.status === 'active' ? '启用' : '禁用'}
                        </span>
                      </td>
                      <td style={{ padding: '0.875rem 1.5rem', width: '150px', textAlign: 'right' }}>
                        <button style={{ padding: '0.375rem 0.75rem', border: '1px solid #d1d5db', background: 'white', color: '#0969da', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500, marginRight: '0.25rem' }}>编辑</button>
                        <button style={{ padding: '0.375rem 0.75rem', border: '1px solid #d1d5db', background: 'white', color: '#ef4444', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500 }}>删除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 发送历史表格 */}
          <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb' }}>
              <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1f2328' }}>📨 推送历史记录</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: '800px' }}>
                <tbody>
                  {[
                    { time: '2026-03-10 09:02', task: '飞书 AI 系统周报', count: '47', summary: '「上周共收到 47 条通知，其中 GitHub CI/CD 构建成功率 96%...」', status: '✅ 成功' },
                    { time: '2026-03-07 18:01', task: 'GitHub CI/CD 周报', count: '23', summary: '「本周 CI 流水线共触发 23 次，其中 deploy-prod 成功 21 次...」', status: '✅ 成功' },
                    { time: '2026-03-03 09:03', task: '飞书 AI 系统周报', count: '35', summary: '「上周系统运行稳定，共处理 35 条消息，无异常告警事件...」', status: '✅ 成功' },
                  ].map((record, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '0.875rem 1.5rem', width: '160px' }}>
                        <span style={{ fontSize: '0.8125rem', color: '#374151', whiteSpace: 'nowrap' }}>{record.time}</span>
                      </td>
                      <td style={{ padding: '0.875rem 0.75rem', width: '200px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1f2328' }}>{record.task}</span>
                      </td>
                      <td style={{ padding: '0.875rem 0.75rem', width: '80px', textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#1f2937' }}>{record.count}</span> <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>条</span>
                      </td>
                      <td style={{ padding: '0.875rem 0.75rem', flex: 1, minWidth: '250px' }}>
                        <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{record.summary}</span>
                      </td>
                      <td style={{ padding: '0.875rem 1.5rem', width: '100px', textAlign: 'right' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.625rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600, background: '#d1fae5', color: '#065f46' }}>✅ 成功</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 运行日志 */}
          <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>📋 实时日志</span>
              <button style={{ padding: '0.375rem 0.75rem', border: '1px solid #d1d5db', background: 'white', color: '#6b7280', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500 }}>⏸ 暂停刷新</button>
            </div>
            <div style={{ background: '#1f2937', color: '#10b981', fontFamily: "'Monaco', 'Menlo', monospace", fontSize: '0.75rem', padding: '1rem', borderRadius: '0.375rem', margin: '1rem', height: '300px', overflowY: 'auto', lineHeight: 1.6 }}>
              <div><span style={{ color: '#9ca3af' }}>[2026-03-14 08:47:12]</span> <span style={{ color: '#60a5fa' }}>[INFO]</span> <span style={{ color: '#fbbf24' }}>[AI周报]</span> 定时任务调度器已启动，下次运行: 2026-03-16 09:00</div>
              <div><span style={{ color: '#9ca3af' }}>[2026-03-14 08:47:12]</span> <span style={{ color: '#60a5fa' }}>[INFO]</span> <span style={{ color: '#fbbf24' }}>[AI周报]</span> 已加载 3 个周报任务，其中 2 个处于启用状态</div>
              <div><span style={{ color: '#9ca3af' }}>[2026-03-10 09:00:01]</span> <span style={{ color: '#60a5fa' }}>[INFO]</span> <span style={{ color: '#fbbf24' }}>[AI周报]</span> <span style={{ color: '#34d399' }}>[任务:飞书AI系统周报]</span> 触发执行，查询范围: 2026-03-03 ~ 2026-03-10</div>
              <div><span style={{ color: '#9ca3af' }}>[2026-03-10 09:00:02]</span> <span style={{ color: '#60a5fa' }}>[INFO]</span> <span style={{ color: '#fbbf24' }}>[AI周报]</span> <span style={{ color: '#34d399' }}>[任务:飞书AI系统周报]</span> 从数据库获取到 47 条通知记录</div>
              <div><span style={{ color: '#9ca3af' }}>[2026-03-10 09:00:03]</span> <span style={{ color: '#60a5fa' }}>[INFO]</span> <span style={{ color: '#fbbf24' }}>[AI周报]</span> <span style={{ color: '#34d399' }}>[任务:飞书AI系统周报]</span> 调用 OpenAI GPT-4o，提示词长度 3,842 tokens</div>
              <div><span style={{ color: '#9ca3af' }}>[2026-03-10 09:00:07]</span> <span style={{ color: '#60a5fa' }}>[INFO]</span> <span style={{ color: '#fbbf24' }}>[AI周报]</span> <span style={{ color: '#34d399' }}>[任务:飞书AI系统周报]</span> AI 摘要生成完成，输出 1,204 tokens</div>
              <div><span style={{ color: '#9ca3af' }}>[2026-03-10 09:00:08]</span> <span style={{ color: '#60a5fa' }}>[INFO]</span> <span style={{ color: '#fbbf24' }}>[AI周报]</span> <span style={{ color: '#34d399' }}>[任务:飞书AI系统周报]</span> 已推送飞书卡片，消息ID: msg_abc123</div>
              <div><span style={{ color: '#9ca3af' }}>[2026-03-10 09:00:08]</span> <span style={{ color: '#60a5fa' }}>[INFO]</span> <span style={{ color: '#fbbf24' }}>[AI周报]</span> <span style={{ color: '#34d399' }}>[任务:飞书AI系统周报]</span> ✅ 执行完成，耗时 7.2s</div>
            </div>
          </div>
        </div>
      )}
          </main>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
      `}</style>
    </div>
  );
};

export default Services;
