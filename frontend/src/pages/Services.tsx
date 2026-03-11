import React, { useEffect, useState } from 'react';

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
  config: {
    label: string;
    value: string;
  }[];
  lastError?: string;
  uptime?: string;
  cpuUsage?: string;
  memoryUsage?: string;
}

interface Log {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  service?: string;
}

const Services: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [activeLogs, setActiveLogs] = useState<Log[]>([]);
  const [logFilter, setLogFilter] = useState('全部');

  useEffect(() => {
    fetchServices();
    fetchLogs();
  }, []);

  useEffect(() => {
    if (logFilter === '全部') {
      setActiveLogs(logs);
    } else {
      setActiveLogs(logs.filter(log => log.service === logFilter || log.message.includes(logFilter)));
    }
  }, [logFilter, logs]);

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
          config: [
            { label: '协议版本', value: '2024-11-05' },
            { label: '连接数', value: '1 活跃连接' },
            { label: 'CPU 使用', value: '2.3%' },
            { label: '内存使用', value: '45 MB / 512 MB' },
          ],
          uptime: '12h 34m',
          cpuUsage: '2.3%',
          memoryUsage: '45 MB / 512 MB',
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
          config: [
            { label: '主机', value: 'localhost:6379' },
            { label: '数据库', value: 'Redis (In-Memory)' },
            { label: '认证', value: '禁用' },
            { label: '最后检查', value: '-' },
          ],
        },
        {
          id: 'notification-service',
          name: '通知中枢',
          type: '飞书消息推送',
          icon: '🔔',
          description: '负责将所有通知推送到飞书群组，当前因 Webhook 认证失败而异常',
          status: 'error',
          associatedIntegrations: 5,
          stats: [
            { label: '关联集成', value: '5' },
            { label: '失败数', value: '8' },
            { label: '重试次数', value: '3 / 3' },
            { label: '最后错误', value: '401 Auth' },
          ],
          config: [
            { label: '端点', value: 'open.feishu.cn' },
            { label: '重试策略', value: '指数退避' },
            { label: '超时', value: '30s' },
            { label: '错误详情', value: 'Webhook 已废弃' },
          ],
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
        { timestamp: '2026-03-11 17:31:52', level: 'info', message: 'feishu_notify 工具调用成功，消息已发送到飞书', service: 'MCP 服务' },
        { timestamp: '2026-03-11 17:31:48', level: 'info', message: 'tools/call 结果: ✅ 工作总结已成功发送到飞书', service: 'MCP 服务' },
        { timestamp: '2026-03-11 17:25:03', level: 'warn', message: '通知发送延迟 2.3s，建议检查网络连接', service: '通知中枢' },
        { timestamp: '2026-03-11 17:20:15', level: 'error', message: '飞书 Webhook 返回 401: Unauthorized (已重试 3/3)', service: '通知中枢' },
      ]);
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

  const handleServiceAction = async (action: string, serviceId: string) => {
    try {
      const response = await fetch(`/api/services/${serviceId}/action`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });
      if (response.ok) {
        alert(`${action} 操作执行成功`);
        fetchServices();
      } else {
        alert('操作失败');
      }
    } catch (err) {
      console.error('Service action failed:', err);
      alert('执行操作失败');
    }
  };

  const handleRestartService = async (serviceId: string) => {
    await handleServiceAction('restart', serviceId);
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
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1f2937' }}>
          📡 服务管理
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '2rem' }}>
          监控和管理所有集成服务，查看实时日志和配置
        </p>

        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '1rem', borderRadius: '0.5rem', marginBottom: '2rem' }}>
            {error}
          </div>
        )}

        {/* 服务卡片网格 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {services.map((service) => (
            <div
              key={service.id}
              style={{
                background: 'white',
                borderRadius: '0.75rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                overflow: 'hidden',
                transition: 'all 0.2s',
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
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
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
              <div style={{ padding: '1.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem', lineHeight: 1.5 }}>
                  {service.description}
                </p>

                {/* 统计数据 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                  {service.stats.map((stat, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{stat.label}</span>
                      <span style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>{stat.value}</span>
                    </div>
                  ))}
                </div>

                {/* 操作按钮 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                  <button
                    style={{
                      padding: '0.5rem 0.75rem',
                      border: '1px solid #d1d5db',
                      background: service.status === 'running' ? '#ef4444' : '#3b82f6',
                      color: service.status === 'running' ? 'white' : 'white',
                      borderColor: service.status === 'running' ? '#ef4444' : '#3b82f6',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      transition: 'all 0.2s',
                    }}
                    onClick={() => handleServiceAction(service.status === 'running' ? 'stop' : 'start', service.id)}
                  >
                    {service.status === 'running' ? '停止' : '启动'}
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
                      setSelectedService(service);
                      setShowConfigModal(true);
                    }}
                  >
                    配置
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
                    onClick={() => alert('查看日志已打开')}
                  >
                    查看日志
                  </button>
                  <button
                    style={{
                      padding: '0.5rem 0.75rem',
                      border: '1px solid #d1d5db',
                      background: '#3b82f6',
                      color: 'white',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      transition: 'all 0.2s',
                    }}
                    onClick={() => handleRestartService(service.id)}
                  >
                    重启
                  </button>
                </div>

                {/* 配置信息 */}
                <div style={{ background: '#f9fafb', padding: '0.75rem', borderRadius: '0.375rem', fontSize: '0.75rem' }}>
                  {service.config.map((cfg, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', color: '#6b7280' }}>
                      <span style={{ fontWeight: 500 }}>{cfg.label}</span>
                      <span style={{ color: '#1f2937' }}>{cfg.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 日志面板 */}
        <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem', marginTop: '2rem' }}>
          <div style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: '#1f2937' }}>
            📊 实时日志
          </div>

          {/* 日志标签 */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
            {['全部', 'MCP 服务', '通知中枢', '消息队列'].map((tab) => (
              <button
                key={tab}
                style={{
                  padding: '0.75rem 1rem',
                  background: 'none',
                  border: 'none',
                  color: logFilter === tab ? '#3b82f6' : '#6b7280',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  borderBottom: logFilter === tab ? '2px solid #3b82f6' : '2px solid transparent',
                  transition: 'all 0.2s',
                }}
                onClick={() => setLogFilter(tab)}
              >
                {tab}
              </button>
            ))}
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
              maxHeight: '300px',
              overflowY: 'auto',
              lineHeight: 1.5,
            }}
          >
            {activeLogs.map((log, idx) => (
              <div key={idx} style={{ marginBottom: '0.5rem' }}>
                <span style={{ color: '#9ca3af' }}>[{log.timestamp}]</span>
                {' '}
                <span style={{ color: log.level === 'error' ? '#f87171' : log.level === 'warn' ? '#fbbf24' : '#60a5fa' }}>
                  [{log.level.toUpperCase()}]
                </span>
                {' ' + log.message}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 配置弹窗 */}
      {showConfigModal && selectedService && (
        <div
          style={{
            display: 'fixed',
            position: 'fixed' as const,
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            justifyContent: 'center',
            alignItems: 'center',
            padding: '1rem',
            overflow: 'auto',
          }}
          onClick={() => setShowConfigModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '0.75rem',
              padding: '2rem',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 25px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1f2937' }}>
                ⚙️ 配置 {selectedService.name}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              {selectedService.config.map((cfg, idx) => (
                <div key={idx} style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>
                    {cfg.label}
                  </label>
                  <input
                    type="text"
                    defaultValue={cfg.value}
                    readOnly={cfg.label.includes('版本') || cfg.label.includes('数据库')}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                style={{
                  padding: '0.5rem 1rem',
                  background: '#f3f4f6',
                  color: '#6b7280',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
                onClick={() => setShowConfigModal(false)}
              >
                取消
              </button>
              <button
                style={{
                  padding: '0.5rem 1rem',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
                onClick={() => {
                  alert('配置已保存');
                  setShowConfigModal(false);
                }}
              >
                保存配置
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default Services;
