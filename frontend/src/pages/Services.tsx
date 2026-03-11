import React, { useEffect, useState, useCallback } from 'react';

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
}

interface TimeCountdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const Services: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLogs, setActiveLogs] = useState<Log[]>([]);
  const [selectedService, setSelectedService] = useState<string>('全部');
  const [countdowns, setCountdowns] = useState<Record<string, TimeCountdown>>({});
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [operatingServiceId, setOperatingServiceId] = useState<string | null>(null);

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
      const response = await fetch('/api/services', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
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
      const nextQueue = new Date(now.getTime() + 86400 * 1000);
      setServices([
        {
          id: 'mcp-service',
          name: 'MCP 工作汇报服务',
          type: 'Model Context Protocol',
          icon: '📋',
          description: 'VS Code Copilot 工作汇报中间件，自动将任务总结发送到飞书群组',
          status: 'running',
          associatedIntegrations: 3,
          stats: [
            { label: '关联集成', value: '3' },
            { label: '今日调用', value: '24' },
            { label: '运行时间', value: '12h 34m' },
            { label: '可用性', value: '99.8%' },
          ],
          isScheduled: true,
          nextRunTime: nextMCP.toISOString(),
          uptime: '12h 34m',
        },
        {
          id: 'queue-service',
          name: '消息队列服务',
          type: 'Redis 消息缓存',
          icon: '⚙️',
          description: '可选消息队列服务，用于高并发场景下的消息缓冲和异步处理',
          status: 'stopped',
          associatedIntegrations: 0,
          stats: [
            { label: '关联集成', value: '0' },
            { label: '上次运行', value: '72小时前' },
            { label: '队列长度', value: '0' },
            { label: '配置状态', value: '就绪' },
          ],
          isScheduled: true,
          nextRunTime: nextQueue.toISOString(),
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
      const response = await fetch('/api/services/logs', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      // 模拟数据
      setLogs([
        { timestamp: '2026-03-11 17:32:15', level: 'info', message: 'MCP SSE 连接建立: sessionId=abc123def456', service: 'MCP 服务' },
        { timestamp: '2026-03-11 17:31:52', level: 'info', message: 'feishu_notify 工具调用成功', service: 'MCP 服务' },
        { timestamp: '2026-03-11 17:31:48', level: 'info', message: '工作总结已成功发送到飞书', service: 'MCP 服务' },
        { timestamp: '2026-03-11 17:25:03', level: 'warn', message: '通知发送延迟 2.3s', service: '通知中枢' },
        { timestamp: '2026-03-11 17:20:15', level: 'error', message: '飞书 Webhook 返回 401', service: '通知中枢' },
      ]);
    }
  };

  const handleServiceAction = async (action: string, serviceId: string) => {
    try {
      setOperatingServiceId(serviceId);
      const response = await fetch(`/api/services/${serviceId}/action`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
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
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p>加载服务中...</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', paddingBottom: '2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1f2937' }}>
            📡 服务管理
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            监控和管理所有集成服务，查看实时日志和服务状态
          </p>
        </div>

        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '1rem', borderRadius: '0.5rem', marginBottom: '2rem' }}>
            {error}
          </div>
        )}

        {/* 服务卡片网格 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {services.map((service) => (
            <div
              key={service.id}
              style={{
                background: 'white',
                borderRadius: '0.75rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                overflow: 'hidden',
                transition: 'all 0.2s',
                cursor: 'default',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.15)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* 服务头部 */}
              <div
                style={{
                  background: getStatusColor(service.status),
                  color: 'white',
                  padding: '1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flex: 1 }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      background: 'rgba(255,255,255,0.2)',
                      borderRadius: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                    }}
                  >
                    {service.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      {service.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                      {service.type}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    background: 'rgba(255,255,255,0.2)',
                    padding: '0.375rem 0.75rem',
                    borderRadius: '0.25rem',
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
                      background: 'rgba(255,255,255,0.8)',
                      animation: 'pulse 2s infinite',
                    }}
                  />
                  {getStatusLabel(service.status)}
                </div>
              </div>

              {/* 服务内容 */}
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem', lineHeight: 1.5 }}>
                  {service.description}
                </p>

                {/* 统计数据 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                  {service.stats.map((stat, idx) => (
                    <div key={idx}>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                        {stat.label}
                      </div>
                      <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937' }}>
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 定时倒计时 */}
                {service.isScheduled && countdowns[service.id] && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f0f9ff', borderRadius: '0.375rem', borderLeft: '3px solid #3b82f6' }}>
                    <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 600, marginBottom: '0.25rem' }}>
                      ⏱️ 下次运行
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#0284c7', fontWeight: 500 }}>
                      {formatCountdown(countdowns[service.id])}
                    </div>
                  </div>
                )}

                {/* 错误提示 */}
                {service.status === 'error' && service.lastError && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fef2f2', borderRadius: '0.375rem', borderLeft: '3px solid #ef4444' }}>
                    <div style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: 600 }}>
                      ⚠️ 最后错误
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem' }}>
                      {service.lastError}
                    </div>
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <button
                  disabled={operatingServiceId === service.id}
                  style={{
                    padding: '0.5rem 0.75rem',
                    border: '1px solid #d1d5db',
                    background: service.status === 'running' ? '#ef4444' : '#3b82f6',
                    color: 'white',
                    borderRadius: '0.375rem',
                    cursor: operatingServiceId === service.id ? 'not-allowed' : 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                    opacity: operatingServiceId === service.id ? 0.5 : 1,
                  }}
                  onClick={() => handleServiceAction(
                    service.status === 'running' ? 'stop' : 'start',
                    service.id
                  )}
                  onMouseEnter={(e) => {
                    if (operatingServiceId !== service.id) {
                      e.currentTarget.style.opacity = '0.9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (operatingServiceId !== service.id) {
                      e.currentTarget.style.opacity = '1';
                    }
                  }}
                >
                  {service.status === 'running' ? '停止' : '启动'}
                </button>

                <button
                  disabled={operatingServiceId === service.id}
                  style={{
                    padding: '0.5rem 0.75rem',
                    border: '1px solid #3b82f6',
                    background: 'white',
                    color: '#3b82f6',
                    borderRadius: '0.375rem',
                    cursor: operatingServiceId === service.id ? 'not-allowed' : 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                    opacity: operatingServiceId === service.id ? 0.5 : 1,
                  }}
                  onClick={() => handleServiceAction('restart', service.id)}
                  onMouseEnter={(e) => {
                    if (operatingServiceId !== service.id) {
                      e.currentTarget.style.backgroundColor = '#eff6ff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (operatingServiceId !== service.id) {
                      e.currentTarget.style.backgroundColor = 'white';
                    }
                  }}
                >
                  重启
                </button>

                <button
                  style={{
                    padding: '0.5rem 0.75rem',
                    border: '1px solid #d1d5db',
                    background: 'white',
                    color: '#6b7280',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                  }}
                  onClick={() => {
                    setSelectedService(service.name || service.id);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                >
                  查看日志
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 日志面板 */}
        <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937' }}>
              📊 实时日志
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
              {autoRefresh ? '🔄 自动刷新' : '⏸️ 暂停'}
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
              maxHeight: '320px',
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
                  {' ' + log.message}
                </div>
              ))
            )}
          </div>
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
