import React, { useEffect, useState, useCallback, useRef } from 'react';
import { CalendarDays, Clock3, MoreHorizontal, ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import SceneIcon, { SceneIconName } from '../components/SceneIcon';
import authService from '../services/auth';
import mcpModelsService from '../services/mcpModels';
import mcpPromptsService from '../services/mcpPrompts';
import mcpLogsService from '../services/mcpLogs';
import toastService from '../services/toastService';

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
  const [activeMenu, setActiveMenu] = useState<'overview' | 'ai-report' | 'mcp-service'>('overview');
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
  const [taskMenuPos, setTaskMenuPos] = useState<{ top: number; left: number; taskId: string } | null>(null);
  const [historyMenuPos, setHistoryMenuPos] = useState<{ top: number; left: number; recordId: string } | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterRobot, setFilterRobot] = useState<string>('all');
  const [filterModel, setFilterModel] = useState<string>('all');
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskModalMode, setTaskModalMode] = useState<'add' | 'edit'>('add');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeReportTab, setActiveReportTab] = useState<'tasks' | 'history'>('tasks');
  const [activeMCPTab, setActiveMCPTab] = useState<'models' | 'prompts' | 'logs'>('models');
  const [modalWeekdays, setModalWeekdays] = useState<number[]>([1]);
  const [modalModel, setModalModel] = useState<string>('GPT-4o');
  const [modalTemplate, setModalTemplate] = useState<string>('report-summary');
  const [modalRobot, setModalRobot] = useState<string>('');
  const [modalNotificationStatus, setModalNotificationStatus] = useState<string[]>(['success', 'error', 'warning', 'info']);
  // MCP 服务弹窗状态
  const [mcpModelModalOpen, setMcpModelModalOpen] = useState(false);
  const [mcpPromptModalOpen, setMcpPromptModalOpen] = useState(false);
  const [customModelName, setCustomModelName] = useState('');
  const [customModelApiUrl, setCustomModelApiUrl] = useState('');
  const [customModelApiKey, setCustomModelApiKey] = useState('');
  const [customPromptName, setCustomPromptName] = useState('');
  const [customPromptPurpose, setCustomPromptPurpose] = useState('custom');
  const [customPromptContent, setCustomPromptContent] = useState('');
  // 提示词预览弹窗状态
  const [promptPreviewModalOpen, setPromptPreviewModalOpen] = useState(false);
  const [selectedPromptTemplate, setSelectedPromptTemplate] = useState<any | null>(null);
  // 内置模型配置弹窗状态
  const [builtInModelModalOpen, setBuiltInModelModalOpen] = useState(false);
  const [selectedBuiltInModel, setSelectedBuiltInModel] = useState<{ id?: string; name: string; desc: string; apiUrl: string; status: string } | null>(null);
  const [builtInModelApiKey, setBuiltInModelApiKey] = useState('');
  const [builtInModelLoading, setBuiltInModelLoading] = useState(false);
  const [builtInModelTestingConnection, setBuiltInModelTestingConnection] = useState(false);
  // 提示词编辑弹窗状态
  const [promptFormModalOpen, setPromptFormModalOpen] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [promptFormName, setPromptFormName] = useState('');
  const [promptFormPurpose, setPromptFormPurpose] = useState<'vscode-chat' | 'daily' | 'weekly' | 'incident' | 'optimization' | 'custom'>('custom');
  const [promptFormContent, setPromptFormContent] = useState('');
  const [promptFormLoading, setPromptFormLoading] = useState(false);
  const [promptFormPreview, setPromptFormPreview] = useState<string>('');
  // 自定义提示词列表
  const [customPromptsList, setCustomPromptsList] = useState<any[]>([]);
  const [customPromptsLoading, setCustomPromptsLoading] = useState(false);
  // 模型列表（从数据库读取）
  const [builtInModelsList, setBuiltInModelsList] = useState<any[]>([]);
  const [builtInModelsLoading, setBuiltInModelsLoading] = useState(false);
  // 内置提示词列表（从数据库读取）
  const [builtInPromptsList, setBuiltInPromptsList] = useState<any[]>([]);
  const [builtInPromptsLoading, setBuiltInPromptsLoading] = useState(false);
  // MCP 日志列表（从 API 读取）
  const [mcpLogs, setMcpLogs] = useState<any[]>([]);
  const [mcpLogsLoading, setMcpLogsLoading] = useState(false);
  // 发送历史分页 & 搜索状态
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all');
  const [historyPage, setHistoryPage] = useState<number>(1);
  const historyPageSize = 8;
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

  // 加载自定义提示词列表
  useEffect(() => {
    const loadCustomPrompts = async () => {
      try {
        setCustomPromptsLoading(true);
        const result = await mcpPromptsService.getCustomPrompts();
        if (result.success && result.data) {
          setCustomPromptsList(result.data);
        }
      } catch (error) {
        console.error('加载自定义提示词失败:', error);
      } finally {
        setCustomPromptsLoading(false);
      }
    };
    loadCustomPrompts();
  }, [promptFormModalOpen]); // 当弹窗打开时重新加载

  useEffect(() => {
    const loadBuiltInModels = async () => {
      try {
        setBuiltInModelsLoading(true);
        const result = await mcpModelsService.getBuiltInModels();
        if (result.success && result.data) {
          setBuiltInModelsList(result.data);
        }
      } catch (error) {
        console.error('加载内置模型失败:', error);
      } finally {
        setBuiltInModelsLoading(false);
      }
    };
    loadBuiltInModels();
  }, []); // 组件挂载时加载一次

  useEffect(() => {
    const loadBuiltInPrompts = async () => {
      try {
        setBuiltInPromptsLoading(true);
        const result = await mcpPromptsService.getBuiltInPrompts();
        if (result.success && result.data) {
          setBuiltInPromptsList(result.data);
        }
      } catch (error) {
        console.error('加载内置提示词失败:', error);
      } finally {
        setBuiltInPromptsLoading(false);
      }
    };
    loadBuiltInPrompts();
  }, []); // 组件挂载时加载一次

  useEffect(() => {
    const loadMcpLogs = async () => {
      try {
        setMcpLogsLoading(true);
        const result = await mcpLogsService.getAllLogs(100, 0);
        if (result.success && result.data) {
          setMcpLogs(result.data);
        }
      } catch (error) {
        console.error('加载 MCP 日志失败:', error);
      } finally {
        setMcpLogsLoading(false);
      }
    };
    
    // 当切换到日志标签页时加载
    if (activeMCPTab === 'logs') {
      loadMcpLogs();
      // 每 5 秒自动刷新一次日志
      const interval = setInterval(loadMcpLogs, 5000);
      return () => clearInterval(interval);
    }
  }, [activeMCPTab]); // 当标签页切换时重新加载

  // 当切换到MCP标签页（模型或提示词）时重新加载数据
  useEffect(() => {
    if (activeMCPTab === 'models') {
      const loadModels = async () => {
        try {
          setBuiltInModelsLoading(true);
          const result = await mcpModelsService.getBuiltInModels();
          if (result.success && result.data) {
            setBuiltInModelsList(result.data);
          }
        } catch (error) {
          console.error('加载内置模型失败:', error);
        } finally {
          setBuiltInModelsLoading(false);
        }
      };
      loadModels();
    } else if (activeMCPTab === 'prompts') {
      const loadPrompts = async () => {
        try {
          setBuiltInPromptsLoading(true);
          const result = await mcpPromptsService.getBuiltInPrompts();
          if (result.success && result.data) {
            setBuiltInPromptsList(result.data);
          }
        } catch (error) {
          console.error('加载内置提示词失败:', error);
        } finally {
          setBuiltInPromptsLoading(false);
        }
      };
      loadPrompts();
    }
  }, [activeMCPTab]);

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
    if (cd.days > 0) return `${cd.days}天 ${cd.hours}小时 ${cd.minutes}分钟`;
    if (cd.hours > 0) return `${cd.hours}小时 ${cd.minutes}分钟`;
    return `${cd.minutes}分钟 ${cd.seconds}秒`;
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
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', paddingBottom: '2rem' }} onClick={() => { if (taskMenuPos) setTaskMenuPos(null); if (historyMenuPos) setHistoryMenuPos(null); }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
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
            {/* 菜单分组标签 */}
            <div style={{ padding: '0.75rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', borderBottom: '1px solid #f3f4f6', background: '#f9fafb' }}>
              服务管理
            </div>

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

            {/* 菜单项：AI汇报管理 */}
            <div
              style={menuItemStyle('ai-report')}
              onClick={() => setActiveMenu('ai-report')}
              onMouseEnter={() => setHoveredMenu('ai-report')}
              onMouseLeave={() => setHoveredMenu(null)}
            >
              <SceneIcon name="history" size={16} title="AI汇报管理" inheritColor />
              AI汇报管理
            </div>

            {/* 菜单项：MCP 服务管理 */}
            <div
              style={menuItemStyle('mcp-service')}
              onClick={() => setActiveMenu('mcp-service')}
              onMouseEnter={() => setHoveredMenu('mcp-service')}
              onMouseLeave={() => setHoveredMenu(null)}
            >
              <SceneIcon name="notification" size={16} title="MCP 服务管理" inheritColor />
              MCP 服务管理
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
              background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
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
                AI 汇报服务
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
                AI Report · Smart Digest · Auto Delivery
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: 0, lineHeight: 1.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                定时收集集成数据，AI 生成摘要并推送至飞书
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
              <div style={{ textAlign: 'center', minWidth: '80px', padding: '0.5rem', background: '#f0f9ff', borderRadius: '0.375rem', borderLeft: '3px solid #3b82f6' }}>
                <div style={{ fontSize: '0.7rem', color: '#1e40af', fontWeight: 600, marginBottom: '0.125rem' }}>下次发送</div>
                <div style={{ fontSize: '0.8rem', color: '#0284c7', fontWeight: 500 }}>2天 6小时 45分钟</div>
              </div>
            </div>
          </div>

          {/* Tab 切换 */}
          <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '1.5rem', display: 'flex', gap: '0' }}>
            {(['tasks', 'history'] as const).map(tab => {
              const label = tab === 'tasks' ? '任务列表' : '发送历史';
              const isActive = activeReportTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveReportTab(tab)}
                  style={{
                    padding: '0.625rem 1.25rem',
                    background: 'none',
                    border: 'none',
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#0969da' : '#6b7280',
                    cursor: 'pointer',
                    borderBottom: isActive ? '3px solid #0969da' : '3px solid transparent',
                    marginBottom: '-1px',
                    borderRadius: '0.375rem 0.375rem 0 0',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = '#ddf4ff';
                    if (!isActive) e.currentTarget.style.color = '#0969da';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    if (!isActive) e.currentTarget.style.color = '#6b7280';
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* 任务列表表格 */}
          {activeReportTab === 'tasks' && (
          <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1f2328' }}>已配置任务</span>
                <span style={{ fontSize: '0.8125rem', color: '#656d76' }}>共 3 个</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button 
                  onClick={() => { setTaskModalMode('add'); setTaskModalOpen(true); }}
                  style={{ padding: '0.375rem 0.875rem', backgroundColor: '#1f883d', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500 }}>
                  + 新增
                </button>
                {/* 分隔线 */}
                <span style={{ width: '1px', height: '20px', backgroundColor: '#e5e7eb' }} />
                {/* 筛选按钮组 */}
                <button 
                  onClick={() => setFilterStatus(filterStatus === 'all' ? 'active' : 'all')}
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.375rem', 
                    padding: '0.375rem 0.75rem', 
                    fontSize: '0.8125rem', 
                    fontWeight: 500, 
                    color: filterStatus !== 'all' ? '#0969da' : '#57606a', 
                    backgroundColor: filterStatus !== 'all' ? '#dbeafe' : '#f6f8fa', 
                    border: `1px solid ${filterStatus !== 'all' ? '#0969da' : '#d0d7de'}`,
                    borderRadius: '0.375rem', 
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  状态
                  {filterStatus !== 'all' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#0969da', color: 'white', fontSize: '0.6rem', fontWeight: 700 }}>1</span>
                  )}
                  <ChevronDown size={13} />
                </button>
                <button 
                  onClick={() => setFilterRobot(filterRobot === 'all' ? '主汇报机器人' : 'all')}
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.375rem', 
                    padding: '0.375rem 0.75rem', 
                    fontSize: '0.8125rem', 
                    fontWeight: 500, 
                    color: filterRobot !== 'all' ? '#0969da' : '#57606a', 
                    backgroundColor: filterRobot !== 'all' ? '#dbeafe' : '#f6f8fa', 
                    border: `1px solid ${filterRobot !== 'all' ? '#0969da' : '#d0d7de'}`,
                    borderRadius: '0.375rem', 
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  机器人
                  {filterRobot !== 'all' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#0969da', color: 'white', fontSize: '0.6rem', fontWeight: 700 }}>1</span>
                  )}
                  <ChevronDown size={13} />
                </button>
                <button 
                  onClick={() => setFilterModel(filterModel === 'all' ? 'GPT-4o' : 'all')}
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.375rem', 
                    padding: '0.375rem 0.75rem', 
                    fontSize: '0.8125rem', 
                    fontWeight: 500, 
                    color: filterModel !== 'all' ? '#0969da' : '#57606a', 
                    backgroundColor: filterModel !== 'all' ? '#dbeafe' : '#f6f8fa', 
                    border: `1px solid ${filterModel !== 'all' ? '#0969da' : '#d0d7de'}`,
                    borderRadius: '0.375rem', 
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  模型
                  {filterModel !== 'all' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#0969da', color: 'white', fontSize: '0.6rem', fontWeight: 700 }}>1</span>
                  )}
                  <ChevronDown size={13} />
                </button>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: '950px' }}>
                <tbody>
                  {[
                    { id: '1', name: '飞书 AI 系统周报', integrations: ['GitHub', 'VS Code Chat', 'Telegram'], model: 'GPT-4o', robot: '主汇报机器人', schedule: '每周一 09:00', lastSent: '2026-03-10 09:02', status: 'active' },
                    { id: '2', name: 'GitHub CI/CD 周报', integrations: ['GitHub'], model: 'GPT-4o mini', robot: '研发群机器人', schedule: '每周五 18:00', lastSent: '2026-03-07 18:01', status: 'active' },
                    { id: '3', name: 'MCP 工作汇报周报', integrations: ['VS Code Chat'], model: 'GPT-4o', robot: '主汇报机器人', schedule: '每周三 10:00', lastSent: '2026-03-03 09:03', status: 'inactive' },
                  ].map((task) => {
                    const integrationsToShow = task.integrations.slice(0, 3);
                    const hasMore = task.integrations.length > 3;
                    const moreCount = task.integrations.length - 3;
                    
                    return (
                      <tr key={task.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        {/* 第 1 列：任务名 + 模型 */}
                        <td style={{ padding: '0.875rem 1.5rem', width: '260px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1f2328' }}>{task.name}</span>
                            <span style={{ fontSize: '0.75rem', color: '#656d76' }}>{task.model}</span>
                          </div>
                        </td>

                        {/* 第 2 列：集成名（最多 3 个 + N） */}
                        <td style={{ padding: '0.875rem 0.75rem', width: '280px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                            {integrationsToShow.map((integration, idx) => (
                              <span
                                key={idx}
                                style={{
                                  display: 'inline-block',
                                  padding: '0.2rem 0.6rem',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  background: '#dbeafe',
                                  color: '#1e40af',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {integration}
                              </span>
                            ))}
                            {hasMore && (
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '0.2rem 0.6rem',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  background: '#e5e7eb',
                                  color: '#374151',
                                }}
                              >
                                +{moreCount}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 第 3 列：机器人名 + 日程时间 */}
                        <td style={{ padding: '0.875rem 0.75rem', width: '220px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.875rem', fontWeight: 600, color: '#1f2328' }}>
                              <SceneIcon name="robot" size={14} inheritColor />
                              {task.robot}
                            </div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#656d76' }}>
                              <CalendarDays size={12} color="#57606a" />
                              {task.schedule}
                            </div>
                          </div>
                        </td>

                        {/* 第 4 列：操作列（最后活动时间 | 启停开关 | 三点菜单） */}
                        <td style={{ padding: '0.875rem 1.5rem 0.875rem 0.75rem', width: '240px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
                            {/* 最后活动时间 */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#374151', fontSize: '0.8125rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                <CalendarDays size={12} color="#57606a" />
                                {task.lastSent.split(' ')[0]}
                              </div>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#656d76', fontSize: '0.8125rem', whiteSpace: 'nowrap', fontWeight: 500 }}>
                                <Clock3 size={12} color="#57606a" />
                                {(task.lastSent.split(' ')[1] || '00:00') + ':00'}
                              </div>
                            </div>

                            {/* 分隔竖线 */}
                            <span style={{ color: '#e5e7eb', fontSize: '1rem', flexShrink: 0 }}>|</span>

                            {/* 启停开关 */}
                            <button
                              onClick={() => {}}
                              style={{
                                width: '36px',
                                height: '20px',
                                backgroundColor: task.status === 'active' ? '#10b981' : '#cbd5e1',
                                borderRadius: '10px',
                                position: 'relative',
                                cursor: 'pointer',
                                border: 'none',
                                padding: 0,
                                transition: 'background-color 0.2s',
                                flexShrink: 0,
                              }}
                            >
                              <div
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  backgroundColor: 'white',
                                  borderRadius: '8px',
                                  position: 'absolute',
                                  top: '2px',
                                  left: task.status === 'active' ? '18px' : '2px',
                                  transition: 'left 0.2s',
                                }}
                              />
                            </button>

                            {/* 三点菜单按钮 */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                setTaskMenuPos({ top: rect.bottom + 8, left: rect.left, taskId: task.id });
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '0.25rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#6b7280',
                                flexShrink: 0,
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.color = '#1f2937'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = '#6b7280'; }}
                            >
                              <MoreHorizontal size={16} />
                            </button>

                            {/* 三点菜单弹窗 */}
                            {taskMenuPos && taskMenuPos.taskId === task.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  position: 'fixed',
                                  top: `${taskMenuPos.top}px`,
                                  left: `${taskMenuPos.left - 100}px`,
                                  background: 'white',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '0.5rem',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                  zIndex: 1000,
                                  minWidth: '120px',
                                }}
                              >
                                <button
                                  onClick={() => {
                                    console.log('手动发送任务:', task.id);
                                    setTaskMenuPos(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem 1rem',
                                    border: 'none',
                                    background: 'none',
                                    textAlign: 'left',
                                    fontSize: '0.875rem',
                                    color: '#1f2937',
                                    cursor: 'pointer',
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                >
                                  手动发送
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedTaskId(task.id);
                                    setTaskModalMode('edit');
                                    setTaskModalOpen(true);
                                    setTaskMenuPos(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem 1rem',
                                    border: 'none',
                                    background: 'none',
                                    textAlign: 'left',
                                    fontSize: '0.875rem',
                                    color: '#1f2937',
                                    cursor: 'pointer',
                                    borderTop: '1px solid #f3f4f6',
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                >
                                  编辑
                                </button>
                                <button
                                  onClick={() => {
                                    console.log('删除任务:', task.id);
                                    setTaskMenuPos(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem 1rem',
                                    border: 'none',
                                    background: 'none',
                                    textAlign: 'left',
                                    fontSize: '0.875rem',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    borderTop: '1px solid #f3f4f6',
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                >
                                  删除
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {/* 发送历史表格 */}
          {activeReportTab === 'history' && (
          <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '2rem' }}>
            {/* 表头区 */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1f2328' }}>发送历史</span>
                <span style={{ fontSize: '0.8125rem', color: '#656d76' }}>共 3 条</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.75rem', border: '1px solid #d0d7de', borderRadius: '2rem', backgroundColor: 'white', width: '200px' }}>
                  <Search size={13} color="#57606a" />
                  <input
                    type="text"
                    placeholder="搜索任务名称"
                    value={historySearch}
                    onChange={e => { setHistorySearch(e.target.value); setHistoryPage(1); }}
                    style={{ border: 'none', outline: 'none', fontSize: '0.8125rem', width: '100%', color: '#24292f', backgroundColor: 'transparent' }}
                  />
                </div>
                <select
                  value={historyStatusFilter}
                  onChange={e => { setHistoryStatusFilter(e.target.value); setHistoryPage(1); }}
                  style={{ padding: '0.35rem 0.625rem', border: '1px solid #d0d7de', borderRadius: '0.375rem', fontSize: '0.8125rem', color: '#24292f', backgroundColor: 'white', cursor: 'pointer', outline: 'none' }}
                >
                  <option value="all">全部状态</option>
                  <option value="success">发送成功</option>
                  <option value="failed">发送失败</option>
                </select>
              </div>
            </div>
            {/* 表体 */}
            <div style={{ overflowX: 'auto', padding: '0 1.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <tbody>
                  {(() => {
                    const allRecords = [
                      { id: '1', date: '2026-03-10', clock: '09:02:14', task: '飞书 AI 系统周报', period: '2026-03-03 ~ 2026-03-09', count: 47, summary: '「上周共收到 47 条通知，其中 GitHub CI/CD 构建成功率 96%，飞书群消息活跃度上升 12%」', status: 'success' as const },
                      { id: '2', date: '2026-03-07', clock: '18:01:47', task: 'GitHub CI/CD 周报', period: '2026-02-28 ~ 2026-03-06', count: 23, summary: '「本周 CI 流水线共触发 23 次，其中 deploy-prod 成功 21 次，失败 2 次，需关注」', status: 'success' as const },
                      { id: '3', date: '2026-03-03', clock: '09:03:32', task: '飞书 AI 系统周报', period: '2026-02-24 ~ 2026-03-02', count: 35, summary: '「上周系统运行稳定，共处理 35 条消息，无异常告警事件，MCP 推送成功率 100%」', status: 'success' as const },
                    ];
                    const filtered = allRecords.filter(r =>
                      (historyStatusFilter === 'all' || r.status === historyStatusFilter) &&
                      (historySearch === '' || r.task.includes(historySearch))
                    );
                    const totalPg = Math.ceil(filtered.length / historyPageSize);
                    const sliced = filtered.slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize);
                    return (
                      <>
                        {sliced.length > 0 ? sliced.map(record => (
                          <tr key={record.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            {/* 任务名称 + 汇报期间 */}
                            <td style={{ padding: '1rem 0.75rem', width: '220px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1f2328', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{record.task}</span>
                                <span style={{ fontSize: '0.75rem', color: '#656d76', whiteSpace: 'nowrap' }}>{record.period}</span>
                              </div>
                            </td>
                            {/* 摘要 */}
                            <td style={{ padding: '1rem 0.75rem' }}>
                              <span style={{ fontSize: '0.8125rem', color: '#6b7280', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-all' } as React.CSSProperties}>{record.summary}</span>
                            </td>
                            {/* 状态 */}
                            <td style={{ padding: '1rem 0.75rem', width: '90px', textAlign: 'center' }}>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', padding: '0.25rem 0.7rem',
                                borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, lineHeight: 1,
                                color: record.status === 'success' ? '#1a7f37' : '#cf222e',
                                backgroundColor: record.status === 'success' ? '#dafbe1' : '#ffebe9',
                              }}>
                                {record.status === 'success' ? '成功' : '失败'}
                              </span>
                            </td>
                            {/* 时间 + 操作 */}
                            <td style={{ padding: '1rem 1.5rem 1rem 0.75rem', width: '200px', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', textAlign: 'left' }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#374151', fontSize: '0.8125rem', fontWeight: 500 }}>
                                    <CalendarDays size={13} color="#57606a" />{record.date}
                                  </span>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#656d76', fontSize: '0.75rem' }}>
                                    <Clock3 size={13} color="#57606a" />{record.clock}
                                  </span>
                                </div>
                                <span style={{ color: '#e5e7eb', flexShrink: 0 }}>|</span>
                                <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setHistoryMenuPos(historyMenuPos?.recordId === record.id ? null : { top: rect.bottom + 6, left: rect.left, recordId: record.id });
                                    }}
                                    style={{ width: '30px', height: '30px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: '0.375rem', backgroundColor: 'transparent', color: '#57606a', cursor: 'pointer' }}
                                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                  >
                                    <MoreHorizontal size={15} />
                                  </button>
                                  {historyMenuPos && historyMenuPos.recordId === record.id && (
                                    <div
                                      onClick={e => e.stopPropagation()}
                                      style={{
                                        position: 'fixed',
                                        top: `${historyMenuPos.top}px`,
                                        left: `${historyMenuPos.left - 60}px`,
                                        background: 'white',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '0.5rem',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                        zIndex: 1000,
                                        minWidth: '100px',
                                      }}
                                    >
                                      <button
                                        onClick={() => { console.log('查看记录:', record.id); setHistoryMenuPos(null); }}
                                        style={{ width: '100%', padding: '0.5rem 1rem', border: 'none', background: 'none', textAlign: 'left', fontSize: '0.875rem', color: '#1f2937', cursor: 'pointer' }}
                                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                      >
                                        查看
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={4} style={{ padding: '2.5rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
                              {historySearch || historyStatusFilter !== 'all' ? '无匹配结果，请调整搜索条件' : '暂无发送记录'}
                            </td>
                          </tr>
                        )}
                        {totalPg > 1 && (
                          <tr>
                            <td colSpan={4} style={{ padding: '0.875rem 0', borderTop: '1px solid #e5e7eb' }}>
                              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.125rem' }}>
                                <button
                                  onClick={() => setHistoryPage(Math.max(1, historyPage - 1))}
                                  disabled={historyPage === 1}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.625rem', border: 'none', backgroundColor: 'transparent', color: historyPage === 1 ? '#8c959f' : '#0969da', cursor: historyPage === 1 ? 'not-allowed' : 'pointer', borderRadius: '0.375rem', fontSize: '0.8125rem', fontWeight: 500, opacity: historyPage === 1 ? 0.7 : 1 }}
                                >
                                  <ChevronLeft size={15} />上一页
                                </button>
                                {Array.from({ length: totalPg }, (_, i) => i + 1).map(pg => (
                                  <button
                                    key={pg}
                                    onClick={() => setHistoryPage(pg)}
                                    style={{ width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: historyPage === pg ? 'none' : '1px solid transparent', backgroundColor: historyPage === pg ? '#0969da' : 'transparent', color: historyPage === pg ? 'white' : '#1f2328', cursor: 'pointer', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: historyPage === pg ? 600 : 400 }}
                                  >
                                    {pg}
                                  </button>
                                ))}
                                <button
                                  onClick={() => setHistoryPage(Math.min(totalPg, historyPage + 1))}
                                  disabled={historyPage === totalPg}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.625rem', border: 'none', backgroundColor: 'transparent', color: historyPage === totalPg ? '#8c959f' : '#0969da', cursor: historyPage === totalPg ? 'not-allowed' : 'pointer', borderRadius: '0.375rem', fontSize: '0.8125rem', fontWeight: 500, opacity: historyPage === totalPg ? 0.7 : 1 }}
                                >
                                  下一页<ChevronRight size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
          )}

        </div>
      )}

      {/* MCP 服务管理内容 */}
      {activeMenu === 'mcp-service' && (
        <div>
          {/* Tab 切换 */}
          <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '1.5rem', display: 'flex', gap: '0' }}>
            {(['models', 'prompts', 'logs'] as const).map(tab => {
              const labels = {
                models: '模型配置',
                prompts: '提示词管理',
                logs: 'MCP 日志',
              };
              const isActive = activeMCPTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveMCPTab(tab)}
                  style={{
                    padding: '0.625rem 1.25rem',
                    background: 'none',
                    border: 'none',
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#0969da' : '#6b7280',
                    cursor: 'pointer',
                    borderBottom: isActive ? '3px solid #0969da' : '3px solid transparent',
                    marginBottom: '-1px',
                    borderRadius: '0.375rem 0.375rem 0 0',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = '#ddf4ff';
                    if (!isActive) e.currentTarget.style.color = '#0969da';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    if (!isActive) e.currentTarget.style.color = '#6b7280';
                  }}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          {/* 模型配置标签页 */}
          {activeMCPTab === 'models' && (
            <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', marginTop: 0, marginBottom: '1rem' }}>内置模型</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                {builtInModelsLoading ? (
                  <div style={{ textAlign: 'center', color: '#9ca3af', padding: '1.5rem' }}>加载中...</div>
                ) : builtInModelsList.length > 0 ? (
                  builtInModelsList.map((model) => {
                    const modelDescriptions: Record<string, {desc: string; pricing: string}> = {
                      'deepseek': { desc: '深度求索 DeepSeek-V3 超低成本模型', pricing: '$0.27/1M input tokens（约 ¥2/百万 token）' },
                      'openai': { desc: '业界标准模型系列', pricing: 'GPT-4o: $2.50/1M in | GPT-4o mini: $0.15/1M in' },
                      'claude': { desc: '高智能推理能力', pricing: 'Claude 3.5 Haiku: $0.80/1M in（商用最便宜）' },
                      'moonshot': { desc: '月之暗面 Kimi 高端推理模型', pricing: '¥0.012/1K tokens（约 $0.0017）' },
                    };
                    const info = modelDescriptions[model.id] || { desc: '', pricing: '' };
                    const statusMap: Record<string, {text: string; color: string}> = {
                      'connected': { text: '✓ 已连接', color: '#10b981' },
                      'testing': { text: '测试中', color: '#f59e0b' },
                      'disconnected': { text: '未连接', color: '#9ca3af' },
                      'unconfigured': { text: '未配置', color: '#ef4444' },
                    };
                    const status = statusMap[model.status] || { text: model.status, color: '#9ca3af' };
                    return (
                      <div
                        key={model.id}
                        style={{
                          border: '1px solid #d1d5db',
                          borderRadius: '0.5rem',
                          padding: '1rem',
                          backgroundColor: model.status === 'connected' ? '#f0fdf4' : '#f9fafb',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                          <div>
                            <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1f2937' }}>
                              {model.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                              {info.desc}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedBuiltInModel(model);
                              setBuiltInModelApiKey('');
                              setBuiltInModelModalOpen(true);
                            }}
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
                          >
                            配置
                          </button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
                            <div>
                              <span style={{ color: '#6b7280' }}>API URL: </span>
                              <span style={{ color: '#1f2937', fontFamily: "'Monaco', monospace" }}>{model.apiUrl}</span>
                            </div>
                            <div>
                              <span style={{ color: '#6b7280' }}>状态: </span>
                              <span style={{ color: status.color, fontWeight: 600 }}>{status.text}</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                          {info.pricing}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: 'center', color: '#9ca3af' }}>暂无内置模型</div>
                )}
              </div>

              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', marginTop: '1.5rem', marginBottom: '1rem' }}>自定义模型</h3>
              <div style={{ border: '2px dashed #d1d5db', borderRadius: '0.5rem', padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                  💡 支持任何兼容 OpenAI API 的模型服务
                </div>
                <button
                  onClick={() => setMcpModelModalOpen(true)}
                  style={{
                    padding: '0.5rem 1.25rem',
                    backgroundColor: '#1f883d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                  }}
                >
                  + 添加自定义模型
                </button>
              </div>
            </div>
          )}

          {/* 提示词管理标签页 */}
          {activeMCPTab === 'prompts' && (
            <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>提示词库</h3>
                  <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                    管理 AI 汇报的提示词模板
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingPromptId(null);
                    setPromptFormName('');
                    setPromptFormPurpose('custom');
                    setPromptFormContent('');
                    setPromptFormModalOpen(true);
                  }}
                  style={{
                    padding: '0.375rem 0.875rem',
                    backgroundColor: '#1f883d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                  }}
                >
                  + 新增
                </button>
              </div>

              {/* 内置提示词列表 */}
              <div style={{ padding: '1.5rem' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '1rem', textTransform: 'uppercase' }}>
                  内置模板
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                  {builtInPromptsLoading ? (
                    <div style={{ textAlign: 'center', color: '#9ca3af', padding: '1.5rem' }}>加载中...</div>
                  ) : builtInPromptsList.length > 0 ? (
                    builtInPromptsList.map(template => (
                    <div
                      key={template.id}
                      style={{
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        padding: '0.75rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1f2937' }}>
                          {template.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                          被 {template.usageCount || 0} 个任务使用
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedPromptTemplate(template);
                          setPromptPreviewModalOpen(true);
                        }}
                        style={{
                          padding: '0.25rem 0.75rem',
                          border: '1px solid #d1d5db',
                          background: 'white',
                          color: '#57606a',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                        }}
                      >
                        预览
                      </button>
                    </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', color: '#9ca3af' }}>暂无内置模板</div>
                  )}
                </div>

                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '1rem', textTransform: 'uppercase' }}>
                  自定义模板
                </h4>
                {customPromptsLoading ? (
                  <div style={{ textAlign: 'center', color: '#9ca3af', padding: '1.5rem' }}>
                    加载中...
                  </div>
                ) : customPromptsList.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {customPromptsList.map(template => (
                      <div
                        key={template.id}
                        style={{
                          border: '1px solid #d1d5db',
                          borderRadius: '0.375rem',
                          padding: '0.75rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1f2937' }}>
                            {template.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                            {template.purpose || '自定义'} · 被 {template.usageCount || 0} 个任务使用
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => {
                              setEditingPromptId(template.id);
                              setPromptFormName(template.name);
                              setPromptFormPurpose(template.purpose || 'custom');
                              setPromptFormContent(template.content);
                              setPromptFormModalOpen(true);
                            }}
                            style={{
                              padding: '0.25rem 0.75rem',
                              border: '1px solid #d1d5db',
                              background: 'white',
                              color: '#57606a',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                            }}
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('确定要删除该提示词吗？')) {
                                mcpPromptsService.deletePrompt(template.id).then(() => {
                                  setCustomPromptsList(customPromptsList.filter(p => p.id !== template.id));
                                });
                              }
                            }}
                            style={{
                              padding: '0.25rem 0.75rem',
                              border: '1px solid #ef4444',
                              background: 'white',
                              color: '#ef4444',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                            }}
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ border: '2px dashed #d1d5db', borderRadius: '0.375rem', padding: '1.5rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
                    暂无自定义模板，点击"新增"按钮创建
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MCP 日志标签页 */}
          {activeMCPTab === 'logs' && (
            <div style={{ background: '#1f2937', borderRadius: '0.5rem', padding: '1.5rem' }}>
              <div style={{ color: '#10b981', fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace", fontSize: '0.75rem', lineHeight: 1.6 }}>
                {mcpLogsLoading ? (
                  <div style={{ color: '#9ca3af' }}>加载日志中...</div>
                ) : mcpLogs.length > 0 ? (
                  mcpLogs.map((log, idx) => (
                    <div key={idx} style={{ color: '#9ca3af', marginBottom: '0.5rem' }}>
                      [{new Date(log.timestamp).toLocaleString()}] 
                      <span style={{ color: log.level === 'ERROR' ? '#ef4444' : log.level === 'WARN' ? '#fbbf24' : '#60a5fa' }}>
                        [{log.level}]
                      </span>
                      {' '}{log.message}
                    </div>
                  ))
                ) : (
                  <div style={{ color: '#9ca3af' }}>暂无日志记录</div>
                )}
              </div>
            </div>
          )}
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

      {/* 内置模型配置弹窗 */}
      {builtInModelModalOpen && selectedBuiltInModel && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '1rem',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              width: '600px',
              maxWidth: '95vw',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* 弹窗头 */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1f2937' }}>
                  配置 {selectedBuiltInModel.name}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  {selectedBuiltInModel.desc}
                </div>
              </div>
              <button 
                onClick={() => setBuiltInModelModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  color: '#9ca3af',
                  lineHeight: 1,
                  padding: '0.25rem',
                  borderRadius: '0.25rem',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#374151'; e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                ✕
              </button>
            </div>

            {/* 弹窗体 */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.35rem' }}>
                  API 地址
                </label>
                <div style={{ 
                  padding: '0.5rem 0.75rem', 
                  background: '#f3f4f6', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '0.375rem', 
                  fontSize: '0.875rem', 
                  fontFamily: 'monospace',
                  color: '#1f2937'
                }}>
                  {selectedBuiltInModel.apiUrl}
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#374151' }}>
                    API Key <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  {/* 若已配置 Key，显示状态标签和清除按钮 */}
                  {(selectedBuiltInModel as any).apiKey && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 500 }}>
                        已配置：{String((selectedBuiltInModel as any).apiKey).slice(0, 6)}...{String((selectedBuiltInModel as any).apiKey).slice(-4)}
                      </span>
                      <button
                        onClick={async () => {
                          const modelId = (selectedBuiltInModel as any).id;
                          if (!modelId) return;
                          try {
                            const result = await mcpModelsService.updateModel(modelId, { apiKey: '', status: 'unconfigured' });
                            if (result.success) {
                              toastService.success('API Key 已清除，模型状态已重置');
                              setBuiltInModelModalOpen(false);
                              // 刷新模型列表
                              const res = await mcpModelsService.getBuiltInModels();
                              if (res.success && res.data) setBuiltInModelsList(res.data);
                            } else {
                              toastService.error('清除失败：' + (result.error || result.message || '未知错误'));
                            }
                          } catch (err) {
                            toastService.error('清除出错：' + (err instanceof Error ? err.message : '未知错误'));
                          }
                        }}
                        style={{
                          padding: '0.2rem 0.6rem',
                          fontSize: '0.75rem',
                          color: '#ef4444',
                          background: 'none',
                          border: '1px solid #ef4444',
                          borderRadius: '0.25rem',
                          cursor: 'pointer',
                        }}
                      >
                        清除
                      </button>
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  placeholder={(selectedBuiltInModel as any).apiKey ? '输入新 Key 以更新（留空则保留已配置的 Key）' : '输入该模型的 API Key'}
                  value={builtInModelApiKey}
                  onChange={(e) => setBuiltInModelApiKey(e.target.value)}
                  autoComplete="off"
                  spellCheck="false"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>
              <button
                onClick={async () => {
                  const existingKey = (selectedBuiltInModel as any).apiKey;
                  if (!selectedBuiltInModel || (!builtInModelApiKey.trim() && !existingKey)) {
                    toastService.warning('请输入 API Key');
                    return;
                  }
                  setBuiltInModelTestingConnection(true);
                  try {
                    const modelId = (selectedBuiltInModel as any).id;
                    if (!modelId) {
                      toastService.error('无法确定模型ID');
                      return;
                    }
                    // 若输入为空则使用后端存储的 Key（传 undefined 让后端用已存 Key）
                    const keyToTest = builtInModelApiKey.trim() || undefined;
                    const result = await mcpModelsService.testModel(modelId, keyToTest);
                    if (result.success) {
                      toastService.success('测试连接成功');
                    } else {
                      toastService.error('连接失败：' + (result.message || result.error || '未知错误'));
                    }
                  } catch (error) {
                    toastService.error('测试连接出错：' + (error instanceof Error ? error.message : '未知错误'));
                  } finally {
                    setBuiltInModelTestingConnection(false);
                  }
                }}
                disabled={builtInModelTestingConnection}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: builtInModelTestingConnection ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: builtInModelTestingConnection ? 'not-allowed' : 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                }}
              >
                {builtInModelTestingConnection ? '测试中...' : '测试连接'}
              </button>
            </div>

            {/* 弹窗底部按钮 */}
            <div style={{
              padding: '1.5rem',
              borderTop: '1px solid #f3f4f6',
              display: 'flex',
              gap: '0.875rem',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setBuiltInModelModalOpen(false)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                }}
              >
                取消
              </button>
              <button
                onClick={async () => {
                  const existingKey = (selectedBuiltInModel as any).apiKey;
                  if (!selectedBuiltInModel || (!builtInModelApiKey.trim() && !existingKey)) {
                    toastService.warning('请输入 API Key');
                    return;
                  }
                  setBuiltInModelLoading(true);
                  try {
                    const modelId = (selectedBuiltInModel as any).id;
                    if (modelId) {
                      // 有输入时更新为新 Key，无输入时不修改 Key（仅保存其他配置）
                      const updatePayload = builtInModelApiKey.trim()
                        ? { apiKey: builtInModelApiKey }
                        : {};
                      const result = await mcpModelsService.updateModel(modelId, updatePayload);
                      if (result.success) {
                        toastService.success('配置保存成功');
                        setBuiltInModelModalOpen(false);
                        setBuiltInModelApiKey('');
                        // 刷新模型列表
                        const res = await mcpModelsService.getBuiltInModels();
                        if (res.success && res.data) setBuiltInModelsList(res.data);
                      } else {
                        toastService.error('保存失败：' + (result.error || result.message || '未知错误'));
                      }
                    } else {
                      toastService.error('无法确定模型ID');
                    }
                  } catch (error) {
                    toastService.error('保存配置出错：' + (error instanceof Error ? error.message : '未知错误'));
                  } finally {
                    setBuiltInModelLoading(false);
                  }
                }}
                disabled={builtInModelLoading}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: builtInModelLoading ? '#9ca3af' : '#1f883d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: builtInModelLoading ? 'not-allowed' : 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                }}
              >
                {builtInModelLoading ? '保存中...' : '保存配置'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 自定义模型弹窗 */}
      {mcpModelModalOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '1rem',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              width: '560px',
              maxWidth: '95vw',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* 弹窗头 */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1f2937' }}>
                添加自定义模型
              </div>
              <button 
                onClick={() => setMcpModelModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  color: '#9ca3af',
                  lineHeight: 1,
                  padding: '0.25rem',
                  borderRadius: '0.25rem',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#374151'; e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                ✕
              </button>
            </div>

            {/* 弹窗体 */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.35rem' }}>
                  模型名称 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="如：My Ollama Model"
                  value={customModelName}
                  onChange={(e) => setCustomModelName(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.35rem' }}>
                  API 地址 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="如：http://localhost:11434/v1"
                  value={customModelApiUrl}
                  onChange={(e) => setCustomModelApiUrl(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.35rem' }}>
                  API Key <span style={{ color: '#9ca3af' }}>(可选)</span>
                </label>
                <input
                  type="text"
                  placeholder="如果需要认证，输入 API Key"
                  value={customModelApiKey}
                  onChange={(e) => setCustomModelApiKey(e.target.value)}
                  autoComplete="off"
                  spellCheck="false"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>
              <button
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                }}
              >
                🔗 测试连接
              </button>
            </div>

            {/* 弹窗底部按钮 */}
            <div style={{
              padding: '1.5rem',
              borderTop: '1px solid #f3f4f6',
              display: 'flex',
              gap: '0.875rem',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setMcpModelModalOpen(false)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                }}
              >
                取消
              </button>
              <button
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#1f883d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                }}
              >
                确认添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 提示词管理弹窗 */}
      {mcpPromptModalOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '1rem',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              width: '900px',
              maxWidth: '95vw',
              maxHeight: '90vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* 弹窗头 */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1f2937' }}>
                新增提示词模板
              </div>
              <button 
                onClick={() => setMcpPromptModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  color: '#9ca3af',
                  lineHeight: 1,
                  padding: '0.25rem',
                  borderRadius: '0.25rem',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#374151'; e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                ✕
              </button>
            </div>

            {/* 弹窗体：两列布局 */}
            <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {/* 左列：表单输入 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.35rem' }}>
                    模板名称 <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="如：团队周报模板"
                    value={customPromptName}
                    onChange={(e) => setCustomPromptName(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.35rem' }}>
                    用途标签 <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    {['周报', '日报', '事件', '其他'].map(tag => (
                      <label key={tag} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="purpose"
                          value={tag}
                          checked={customPromptPurpose === tag}
                          onChange={(e) => setCustomPromptPurpose(e.target.value)}
                          style={{ cursor: 'pointer' }}
                        />
                        {tag}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.35rem' }}>
                    提示词内容 <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    placeholder="输入提示词内容（如：生成✅完成、🔧修复、📝说明三种格式的汇报...）"
                    value={customPromptContent}
                    onChange={(e) => setCustomPromptContent(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace", boxSizing: 'border-box', minHeight: '200px' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                    💡 提示词应指导模型按照飞书汇报规范生成内容
                  </div>
                </div>
              </div>

              {/* 右列：飞书卡片预览 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>📋 飞书卡片预览</div>
                <div style={{
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  minHeight: '350px',
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                  {/* 飞书卡片头部 */}
                  <div style={{
                    backgroundColor: '#1f883d',
                    color: 'white',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.375rem 0.375rem 0 0',
                    marginBottom: '1rem',
                  }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      ✅ {customPromptName || '模板预览'}
                    </div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.25rem' }}>
                      {customPromptPurpose ? `分类：${customPromptPurpose}汇报` : '分类：待选择'}
                    </div>
                  </div>

                  {/* 示例输出 */}
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    <div style={{ fontSize: '0.8125rem', color: '#6b7280', lineHeight: 1.8 }}>
                      <div style={{ color: '#10b981', marginBottom: '0.75rem' }}>✅ 完成的任务1</div>
                      <div style={{ color: '#10b981', marginBottom: '0.75rem' }}>✅ 完成的任务2</div>
                      <div style={{ color: '#f59e0b', marginBottom: '0.75rem' }}>🔧 修复的问题1</div>
                      <div style={{ color: '#f59e0b', marginBottom: '0.75rem' }}>🔧 改进的功能1</div>
                      <div style={{ color: '#6b7280' }}>📝 后续计划或说明</div>
                    </div>
                  </div>

                  {/* 卡片底部说明 */}
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#9ca3af',
                    marginTop: '1rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid #e5e7eb',
                  }}>
                    飞书卡片将采用这种格式展示，✅🔧📝 三种符号分类汇报内容
                  </div>
                </div>

                {/* 模板示例说明 */}
                <div style={{
                  background: '#fef3c7',
                  border: '1px solid #fcd34d',
                  borderRadius: '0.375rem',
                  padding: '0.75rem',
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#92400e', lineHeight: 1.6 }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>💡 提示词编写建议</div>
                    <div>指导模型按照 ✅完成 | 🔧修复 | 📝说明 的格式组织信息</div>
                  </div>
                </div>

                {/* 格式教程 */}
                <div style={{
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>📖 格式教程</div>
                  
                  <div style={{ fontSize: '0.75rem', color: '#4b5563', lineHeight: 1.8 }}>
                    <div style={{ fontWeight: 600, color: '#1f2937', marginBottom: '0.5rem' }}>✏️ 提示词编写步骤：</div>
                    
                    <div style={{ marginBottom: '0.75rem', paddingLeft: '1rem', borderLeft: '3px solid #3b82f6' }}>
                      <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>1️⃣ 定义输出格式</div>
                      <div style={{ fontSize: '0.7rem', color: '#6b7280', fontFamily: 'monospace' }}>
                        "请按以下格式输出："
                      </div>
                    </div>

                    <div style={{ marginBottom: '0.75rem', paddingLeft: '1rem', borderLeft: '3px solid #10b981' }}>
                      <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>2️⃣ 列举成功项</div>
                      <div style={{ fontSize: '0.7rem', color: '#6b7280', fontFamily: 'monospace' }}>
                        "✅ 已完成的任务和成果（每项一行）"
                      </div>
                    </div>

                    <div style={{ marginBottom: '0.75rem', paddingLeft: '1rem', borderLeft: '3px solid #f59e0b' }}>
                      <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>3️⃣ 列举修复/改进项</div>
                      <div style={{ fontSize: '0.7rem', color: '#6b7280', fontFamily: 'monospace' }}>
                        "🔧 已修复的问题和改进（每项一行）"
                      </div>
                    </div>

                    <div style={{ marginBottom: '0.75rem', paddingLeft: '1rem', borderLeft: '3px solid #6b7280' }}>
                      <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>4️⃣ 添加说明信息</div>
                      <div style={{ fontSize: '0.7rem', color: '#6b7280', fontFamily: 'monospace' }}>
                        "📝 后续计划或需要关注的事项"
                      </div>
                    </div>

                    <div style={{ background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '0.375rem', padding: '0.75rem', marginTop: '1rem' }}>
                      <div style={{ fontWeight: 600, color: '#075985', marginBottom: '0.5rem' }}>📋 提示词示例：</div>
                      <div style={{ fontSize: '0.7rem', color: '#075985', fontFamily: 'monospace', lineHeight: 1.6, background: 'white', padding: '0.5rem', borderRadius: '0.25rem' }}>
                        分析以下工作日志，按照下述格式生成汇报：<br/>
                        ✅ 列出所有已完成的任务<br/>
                        🔧 列出所有已修复的问题和改进<br/>
                        📝 包含后续计划或风险提示<br/>
                        每项前缀必须包含符号。
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 弹窗底部按钮 */}
            <div style={{
              padding: '1.5rem',
              borderTop: '1px solid #f3f4f6',
              display: 'flex',
              gap: '0.875rem',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setMcpPromptModalOpen(false)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                }}
              >
                取消
              </button>
              <button
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#1f883d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                }}
              >
                确认添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 提示词预览弹窗 */}
      {promptPreviewModalOpen && selectedPromptTemplate && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '1rem',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              width: '700px',
              maxWidth: '95vw',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* 弹窗头 */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1f2937' }}>
                  {selectedPromptTemplate.name}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  {selectedPromptTemplate.purpose === 'vscode-chat' && '任务完成汇报'}
                  {selectedPromptTemplate.purpose === 'daily' && '日报编辑'}
                  {selectedPromptTemplate.purpose === 'weekly' && '周报撰写'}
                  {selectedPromptTemplate.purpose === 'incident' && '事件管理'}
                  {selectedPromptTemplate.purpose === 'optimization' && '产品优化'}
                  {selectedPromptTemplate.purpose === 'custom' && '自定义模板'}
                </div>
              </div>
              <button 
                onClick={() => setPromptPreviewModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  color: '#9ca3af',
                  lineHeight: 1,
                  padding: '0.25rem',
                  borderRadius: '0.25rem',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#374151'; e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                ✕
              </button>
            </div>

            {/* 弹窗体 */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* 提示词内容展示 */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.75rem' }}>
                  提示词内容
                </label>
                <div style={{
                  background: '#f9fafb',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
                  fontSize: '0.8125rem',
                  color: '#1f2937',
                  lineHeight: 1.7,
                  minHeight: '200px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {selectedPromptTemplate.id === 'vscode-chat-report' && `AI 任务完成后的飞书汇报。

根据 AI 任务的执行结果，生成符合飞书汇报规范的内容。

格式规范（严格遵守）：

✅ 已完成的任务
- 列举所有成功完成的工作项
- 一项一行，前缀必须为 ✅

🔧 改进或修复的内容
- 列举所有改进、修复、优化的项目
- 一项一行，前缀必须为 🔧

📝 说明或后续
- 包含必要的说明信息
- 潜在的问题或建议
- 后续需要的操作或跟进

严格要求：每一行必须以符号开头，确保飞书卡片显示正确。`}
                  {selectedPromptTemplate.id === 'weekly-summary' && `生成系统周期性工作汇总。

请分析提供的工作日志数据，按照以下格式生成周报汇总：

✅ 本周已完成的主要任务
- 列举所有完成的功能、目标或交付物
- 每项包含简要成果描述

🔧 本周发现并修复的问题
- 列举所有已解决的 Bug、性能优化、代码改进
- 每项包含修复内容和影响范围

📝 下周计划和风险提示
- 下周的主要计划任务
- 当前存在的风险或阻碍因素

注意：每个要点必须以对应符号开头。`}
                  {selectedPromptTemplate.id === 'daily-digest' && `生成每日工作快报。

请分析今日工作内容，按照以下格式生成简洁日报：

✅ 今日完成
- 列出 3-5 项已完成的具体工作

🔧 问题与改进
- 列出发现的问题或做出的改进

📝 明日计划
- 明日的主要工作计划（1-3 项）

要求：内容简洁，重点突出，符号必须包含。`}
                  {selectedPromptTemplate.id === 'incident-report' && `记录和跟进重要事件。

请根据事件信息生成事件报告，遵循以下格式：

✅ 事件已解决的方面
- 已采取的措施
- 已恢复的功能或服务

🔧 事件的根本原因
- 问题分析
- 技术细节

📝 后续跟进计划
- 改进措施
- 预防性方案
- 相关任务跟进

注意事项：报告需清晰、准确、专业。`}
                  {selectedPromptTemplate.id === 'vscode-chat-report' && `AI 任务完成后的飞书汇报。

根据 AI 任务的执行结果，生成符合飞书汇报规范的内容。

格式规范（严格遵守）：

✅ 已完成的任务
- 列举所有成功完成的工作项
- 一项一行，前缀必须为 ✅

🔧 改进或修复的内容
- 列举所有改进、修复、优化的项目
- 一项一行，前缀必须为 🔧

📝 说明或后续
- 包含必要的说明信息
- 潜在的问题或建议
- 后续需要的操作或跟进

严格要求：每一行必须以符号开头，确保飞书卡片显示正确。`}
                  {selectedPromptTemplate.id === 'optimization-suggestion' && `分析并生成系统改进建议。

根据提供的系统数据和问题反馈，生成优化建议。

格式规范：

✅ 已实现的优化
- 已解决的瓶颈问题
- 已优化的性能指标

🔧 建议立即改进的方面
- 关键性能问题
- 用户反馈最多的问题
- 实施难度较低的优化

📝 长期改进规划
- 架构优化方向
- 功能完善计划
- 技术债清偿方案

每项建议应包含：问题描述、改进方案、预期效果。`}
                </div>
              </div>

              {/* 使用情况 */}
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '0.5rem',
                padding: '1rem',
              }}>
                <div style={{ fontSize: '0.8125rem', color: '#166534', fontWeight: 600, marginBottom: '0.5rem' }}>
                  使用情况
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#166534' }}>
                  已被 <span style={{ fontWeight: 700 }}>{selectedPromptTemplate.usageCount || 0}</span> 个任务使用
                </div>
              </div>
            </div>

            {/* 弹窗底部按钮 */}
            <div style={{
              padding: '1.5rem',
              borderTop: '1px solid #f3f4f6',
              display: 'flex',
              gap: '0.875rem',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setPromptPreviewModalOpen(false)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                }}
              >
                关闭
              </button>
              <button
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                }}
              >
                复制到剪贴板
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 提示词编辑弹窗 */}
      {promptFormModalOpen && (
        <div 
          onClick={() => setPromptFormModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '1rem',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              width: '900px',
              maxWidth: '95vw',
              maxHeight: '90vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* 弹窗头 */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1f2937' }}>
                {editingPromptId ? '编辑提示词' : '新增提示词'}
              </div>
              <button 
                onClick={() => setPromptFormModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  color: '#9ca3af',
                  lineHeight: 1,
                  padding: '0.25rem',
                  borderRadius: '0.25rem',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#374151'; e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                ✕
              </button>
            </div>

            {/* 弹窗体 - 双列布局 */}
            <div style={{ padding: '1.5rem', display: 'flex', gap: '1.5rem', flex: 1, minHeight: '500px' }}>
              {/* 左列 - 表单 */}
              <div style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.35rem' }}>
                    提示词名称 <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="例如：日报生成"
                    value={promptFormName}
                    onChange={(e) => setPromptFormName(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.35rem' }}>
                    应用场景 <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={promptFormPurpose}
                    onChange={(e) => setPromptFormPurpose(e.target.value as any)}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  >
                    <option value="vscode-chat">VS Code Chat 汇报</option>
                    <option value="daily">日报快报</option>
                    <option value="weekly">周报总结</option>
                    <option value="incident">事件报告</option>
                    <option value="optimization">优化建议</option>
                    <option value="custom">自定义</option>
                  </select>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.35rem' }}>
                    提示词内容 <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    placeholder="输入 AI 提示词内容...（支持 Markdown 格式）"
                    value={promptFormContent}
                    onChange={(e) => setPromptFormContent(e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '0.75rem', 
                      border: '1px solid #d1d5db', 
                      borderRadius: '0.375rem', 
                      fontSize: '0.875rem', 
                      fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
                      flex: 1,
                      minHeight: '250px',
                      boxSizing: 'border-box',
                      resize: 'vertical',
                    }}
                  />
                </div>
              </div>

              {/* 右列 - 预览 + 格式教程 */}
              <div style={{ flex: '0 0 60%', display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '1px solid #e5e7eb', paddingLeft: '1.5rem' }}>
                {/* 预览标签页 */}
                <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>
                  <button
                    onClick={() => setPromptFormPreview('preview')}
                    style={{
                      padding: '0.5rem 1rem',
                      background: promptFormPreview === 'preview' ? '#3b82f6' : 'transparent',
                      color: promptFormPreview === 'preview' ? 'white' : '#57606a',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      fontWeight: promptFormPreview === 'preview' ? 600 : 400,
                    }}
                  >
                    飞书卡片预览
                  </button>
                  <button
                    onClick={() => setPromptFormPreview('format')}
                    style={{
                      padding: '0.5rem 1rem',
                      background: promptFormPreview === 'format' ? '#3b82f6' : 'transparent',
                      color: promptFormPreview === 'format' ? 'white' : '#57606a',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      fontWeight: promptFormPreview === 'format' ? 600 : 400,
                    }}
                  >
                    格式说明
                  </button>
                </div>

                {/* 预览内容 */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {promptFormPreview === 'preview' && (
                    <div style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '0.5rem',
                      padding: '1rem',
                    }}>
                      <div style={{ fontSize: '0.8125rem', color: '#166534', fontWeight: 600, marginBottom: '0.5rem' }}>
                        📋 飞书汇报预览
                      </div>
                      <div style={{
                        background: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        padding: '1rem',
                        fontFamily: 'inherit',
                        fontSize: '0.875rem',
                        color: '#1f2937',
                        lineHeight: 1.6,
                      }}>
                        {promptFormContent ? (
                          <div>
                            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                              {promptFormContent}
                            </div>
                          </div>
                        ) : (
                          <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>提示词预览将在这里显示...</div>
                        )}
                      </div>
                    </div>
                  )}
                  {promptFormPreview === 'format' && (
                    <div style={{ fontSize: '0.8125rem', color: '#374151', lineHeight: 1.7 }}>
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>✅ 符号规范</div>
                        <div style={{ paddingLeft: '1rem' }}>
                          • <strong>✅</strong> 用于"已完成"或"成功"的项目<br/>
                          • <strong>🔧</strong> 用于"改进"或"修复"的项目<br/>
                          • <strong>📝</strong> 用于"说明"或"补充信息"<br/>
                        </div>
                      </div>
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>📋 内容格式</div>
                        <div style={{ paddingLeft: '1rem', background: '#f9fafb', padding: '0.75rem', borderRadius: '0.375rem', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          ✅ 已完成的任务<br/>
                          - 任务项1<br/>
                          - 任务项2<br/>
                          <br/>
                          🔧 改进的内容<br/>
                          - 改进项1<br/>
                          - 改进项2
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 弹窗底部按钮 */}
            <div style={{
              padding: '1.5rem',
              borderTop: '1px solid #f3f4f6',
              display: 'flex',
              gap: '0.875rem',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setPromptFormModalOpen(false)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                }}
              >
                取消
              </button>
              <button
                onClick={async () => {
                  if (!promptFormName.trim() || !promptFormContent.trim()) {
                    alert('请填写完整的提示词信息');
                    return;
                  }
                  setPromptFormLoading(true);
                  try {
                    const promptData = {
                      name: promptFormName,
                      purpose: promptFormPurpose,
                      content: promptFormContent,
                      isBuiltIn: false,
                      usageCount: 0,
                    };
                    
                    if (editingPromptId) {
                      const result = await mcpPromptsService.updatePrompt(editingPromptId, promptData);
                      if (result.success) {
                        alert('提示词已更新');
                        setPromptFormModalOpen(false);
                      } else {
                        alert('保存失败：' + (result.error || '未知错误'));
                      }
                    } else {
                      const result = await mcpPromptsService.savePrompt(promptData);
                      if (result.success) {
                        alert('提示词已保存');
                        setPromptFormModalOpen(false);
                        setPromptFormName('');
                        setPromptFormContent('');
                      } else {
                        alert('保存失败：' + (result.error || '未知错误'));
                      }
                    }
                  } catch (error) {
                    alert('保存提示词出错：' + (error instanceof Error ? error.message : '未知错误'));
                  } finally {
                    setPromptFormLoading(false);
                  }
                }}
                disabled={promptFormLoading}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: promptFormLoading ? '#9ca3af' : '#1f883d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: promptFormLoading ? 'not-allowed' : 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                }}
              >
                {promptFormLoading ? '保存中...' : '保存提示词'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新增/编辑周报任务弹窗 */}
      {taskModalOpen && (
        <div 
          onClick={() => setTaskModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '1rem',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              width: '680px',
              maxWidth: '95vw',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* 弹窗头 */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1f2937' }}>
                {taskModalMode === 'add' ? '新增周报任务' : '编辑周报任务'}
              </div>
              <button 
                onClick={() => setTaskModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  color: '#9ca3af',
                  lineHeight: 1,
                  padding: '0.25rem',
                  borderRadius: '0.25rem',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#374151'; e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                ✕
              </button>
            </div>

            {/* 弹窗体 */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* ── 第1区：基础信息 ── */}
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.875rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f3f4f6' }}>
                  基础信息
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.35rem' }}>
                      任务名称 <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="如：飞书 AI 系统周报"
                      style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.35rem' }}>
                      任务描述
                    </label>
                    <input
                      type="text"
                      placeholder="简要描述该汇报任务的用途"
                      style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {/* ── 第2区：发送计划 ── */}
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.875rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f3f4f6' }}>
                  发送计划
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {/* 星期多选 */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>
                      发送星期 <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {(['一','二','三','四','五','六','日']).map((day, idx) => {
                        const dayNum = idx + 1; // 1=周一 … 7=周日
                        const isSelected = modalWeekdays.includes(dayNum);
                        return (
                          <button
                            key={dayNum}
                            onClick={() => setModalWeekdays(
                              isSelected
                                ? modalWeekdays.filter(d => d !== dayNum)
                                : [...modalWeekdays, dayNum]
                            )}
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              border: `1.5px solid ${isSelected ? '#3b82f6' : '#d1d5db'}`,
                              background: isSelected ? '#3b82f6' : 'white',
                              color: isSelected ? 'white' : '#374151',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* 发送时间 + 统计范围 */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.35rem' }}>
                        发送时间 <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="time"
                        defaultValue="09:00"
                        style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.35rem' }}>
                        统计范围
                      </label>
                      <select style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', fontFamily: 'inherit', backgroundColor: 'white', boxSizing: 'border-box' }}>
                        <option>最近 7 天</option>
                        <option>最近 14 天</option>
                        <option>最近 30 天</option>
                        <option>本周</option>
                        <option>本月</option>
                      </select>
                    </div>
                  </div>
                  {/* 计划预览行 */}
                  <div style={{ padding: '0.625rem 0.875rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.5rem', fontSize: '0.8125rem', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CalendarDays size={14} />
                    <span>
                      每周{modalWeekdays.map(d => ['一','二','三','四','五','六','日'][d-1]).join('、')} 09:00 发送，覆盖最近 7 天数据
                    </span>
                  </div>
                </div>
              </div>

              {/* ── 第3区：汇总范围 ── */}
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.875rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f3f4f6' }}>
                  汇总范围
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {/* 先选机器人 */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.35rem' }}>
                      汇报机器人 <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      value={modalRobot}
                      onChange={(e) => setModalRobot(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', fontFamily: 'inherit', backgroundColor: 'white', boxSizing: 'border-box' }}
                    >
                      <option value="">请选择机器人</option>
                      <option value="main">主汇报机器人</option>
                      <option value="test">测试机器人</option>
                    </select>
                  </div>
                  {/* 选了机器人后才显示集成列表 */}
                  {modalRobot === '' ? (
                    <div style={{ padding: '1rem', backgroundColor: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '0.5rem', textAlign: 'center', fontSize: '0.8125rem', color: '#9ca3af' }}>
                      请先选择机器人，将自动加载该机器人下的集成
                    </div>
                  ) : (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>
                        选择集成 <span style={{ color: '#6b7280', fontWeight: 400 }}>（勾选参与本次汇总的集成）</span>
                      </label>
                      <div style={{ border: '1px solid #d1d5db', borderRadius: '0.5rem', overflow: 'hidden' }}>
                        {(modalRobot === 'main'
                          ? [
                              { name: 'GitHub 代码仓库', type: 'GitHub', meta: '126 次事件' },
                              { name: '飞书工作群组', type: '飞书', meta: '89 条消息' },
                              { name: 'Jira 任务追踪', type: 'Jira', meta: '34 个 Issue' },
                            ]
                          : [
                              { name: '飞书工作群组', type: '飞书', meta: '89 条消息' },
                            ]
                        ).map((item, idx, arr) => (
                          <label
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '0.625rem 0.875rem',
                              gap: '0.75rem',
                              borderBottom: idx < arr.length - 1 ? '1px solid #f3f4f6' : 'none',
                              cursor: 'pointer',
                              backgroundColor: 'white',
                            }}
                          >
                            <input type="checkbox" defaultChecked style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#3b82f6' }} />
                            <span style={{ flex: 1, fontSize: '0.875rem', color: '#1f2937', fontWeight: 500 }}>{item.name}</span>
                            <span style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem', backgroundColor: '#f3f4f6', color: '#6b7280', borderRadius: '0.25rem', fontWeight: 500 }}>{item.type}</span>
                            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{item.meta}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── 第3区：消息过滤规则 ── */}
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.875rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f3f4f6' }}>
                  消息过滤规则
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {/* 通知状态筛选 */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>
                      通知状态 <span style={{ color: '#6b7280', fontWeight: 400 }}>（选择要包含的通知状态）</span>
                    </label>
                    <div style={{ border: '1px solid #d1d5db', borderRadius: '0.5rem', overflow: 'hidden' }}>
                      {[
                        { value: 'success', label: '成功', color: '#1a7f37' },
                        { value: 'error', label: '失败', color: '#cf222e' },
                        { value: 'warning', label: '警告', color: '#9a6700' },
                        { value: 'info', label: '信息', color: '#0969da' },
                      ].map((status, idx, arr) => (
                        <label
                          key={status.value}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0.625rem 0.875rem',
                            gap: '0.75rem',
                            borderBottom: idx < arr.length - 1 ? '1px solid #f3f4f6' : 'none',
                            cursor: 'pointer',
                            backgroundColor: 'white',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={modalNotificationStatus.includes(status.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setModalNotificationStatus([...modalNotificationStatus, status.value]);
                              } else {
                                setModalNotificationStatus(modalNotificationStatus.filter(s => s !== status.value));
                              }
                            }}
                            style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#3b82f6' }}
                          />
                          <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: status.color, flexShrink: 0 }} />
                          <span style={{ flex: 1, fontSize: '0.875rem', color: '#1f2937', fontWeight: 500 }}>{status.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 第4区：模型配置 ── */}
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: '0.875rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f3f4f6' }}>
                  模型配置
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {/* 模型卡片网格 */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>
                      AI 模型 <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      {[
                        { id: 'GPT-4o', label: 'GPT-4o', desc: '综合效果最佳' },
                        { id: 'GPT-4o mini', label: 'GPT-4o mini', desc: '速度快，成本低' },
                        { id: 'Claude 3.5 Sonnet', label: 'Claude 3.5', desc: '擅长长文档分析' },
                        { id: 'DeepSeek-V3', label: 'DeepSeek-V3', desc: '国内免费，性能强劲' },
                        { id: 'Qwen-Plus', label: 'Qwen-Plus', desc: '阿里通义，性价比高' },
                        { id: 'GLM-4-Flash', label: 'GLM-4-Flash', desc: '智谱AI，免费使用' },
                        { id: 'Kimi', label: 'Kimi (Moonshot)', desc: '月之暗面，擅长长文' },
                        { id: 'custom', label: '自定义模型', desc: '填写自定义 API 信息' },
                      ].map(m => {
                        const isSelected = modalModel === m.id;
                        return (
                          <div
                            key={m.id}
                            onClick={() => setModalModel(m.id)}
                            style={{
                              border: `1.5px solid ${isSelected ? '#3b82f6' : '#d1d5db'}`,
                              borderRadius: '0.5rem',
                              padding: '0.625rem 0.75rem',
                              cursor: 'pointer',
                              backgroundColor: isSelected ? '#eff6ff' : 'white',
                              transition: 'all 0.15s',
                            }}
                          >
                            <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: isSelected ? '#1d4ed8' : '#1f2937' }}>{m.label}</div>
                            <div style={{ fontSize: '0.6875rem', color: '#6b7280', marginTop: '0.125rem' }}>{m.desc}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* 汇报模板选择 */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>
                      提示词模板 <span style={{ color: '#6b7280', fontWeight: 400 }}>（从 MCP 服务管理配置）</span>
                    </label>
                    <select
                      value={modalTemplate}
                      onChange={(e) => setModalTemplate(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', fontFamily: 'inherit', backgroundColor: 'white', boxSizing: 'border-box' }}
                    >
                      <option value="">-- 选择提示词模板 --</option>
                      <optgroup label="内置模板">
                        <option value="vscode-chat-report">VS Code Chat汇报</option>
                        <option value="daily-digest">日报快报</option>
                        <option value="weekly-summary">周报总结</option>
                        <option value="incident-report">事件报告</option>
                        <option value="optimization-suggestion">优化建议</option>
                      </optgroup>
                      <optgroup label="自定义模板">
                        <option value="custom-1">我的自定义模板</option>
                      </optgroup>
                    </select>
                  </div>
                </div>
              </div>

            </div>

            {/* 弹窗底 */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderTop: '1px solid #f3f4f6',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.625rem',
            }}>
              <button
                onClick={() => setTaskModalOpen(false)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #d1d5db',
                  background: 'white',
                  color: '#1f2937',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                取消
              </button>
              <button
                onClick={() => setTaskModalOpen(false)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#1f883d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                {taskModalMode === 'add' ? '创建任务' : '保存任务'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;
