import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import authService from '../services/auth';

// ===== 类型定义 =====

interface Robot {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  webhookUrl: string;
}

interface Integration {
  id: string;
  robotId: string;
  projectName: string;
  projectSubName?: string;
  projectType: 'vercel' | 'railway' | 'github' | 'gitlab' | 'vscode-chat' | 'api' | 'custom';
  config: Record<string, unknown>;
  webhookSecret?: string;          // 创建时自动生成，用于验证外部平台签名
  triggeredEvents: string[];
  notifyOn: 'success' | 'failure' | 'always' | 'changes';
  messageTemplate?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

type IntegrationModalMode = 'create' | 'edit';

const API_BASE_URL = '';
// Webhook 地址使用前端 origin（Vite dev proxy 和 nginx 均代理 /api 到后端）
const WEBHOOK_BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';

// ===== 静态数据 =====

const TYPE_LABELS: Record<string, string> = {
  vercel:       '▲ Vercel',
  railway:      '🚂 Railway',
  github:       '🐙 GitHub',
  gitlab:       '🦊 GitLab',
  'vscode-chat':'💬 VS Code Chat',
  api:          '🔌 Direct API',
  custom:       '🛠️ Custom Webhook',
};

const TYPE_COLORS: Record<string, React.CSSProperties> = {
  vercel:       { background: '#f0fdf4', color: '#166534' },
  railway:      { background: '#fef2f2', color: '#991b1b' },
  github:       { background: '#e0f2fe', color: '#0c4a6e' },
  gitlab:       { background: '#fce7f3', color: '#9d174d' },
  'vscode-chat':{ background: '#ede9fe', color: '#4c1d95' },
  api:          { background: '#dbeafe', color: '#1e40af' },
  custom:       { background: '#f3f4f6', color: '#374151' },
};

const EVENT_OPTIONS = [
  // 部署类
  { value: 'deploy_success',    label: '部署成功' },
  { value: 'deploy_failure',    label: '部署失败' },
  { value: 'deploy_started',    label: '部署开始' },
  { value: 'deploy_canceled',   label: '部署取消' },
  { value: 'deployment_ready',  label: '域名就绪' },
  { value: 'service_crash',     label: '服务崩溃' },
  // 代码类
  { value: 'commit_pushed',     label: '代码推送' },
  { value: 'pr_opened',         label: 'PR 已开启' },
  { value: 'pr_merged',         label: 'PR 合并' },
  { value: 'workflow_run',      label: 'Actions 工作流' },
  { value: 'pipeline_done',     label: 'Pipeline 完成' },
  { value: 'version_released',  label: '版本发布' },
  // 测试类
  { value: 'test_passed',       label: '测试通过' },
  { value: 'test_failed',       label: '测试失败' },
  // VS Code Chat 类
  { value: 'chat_manual',       label: 'Chat 手动汇报' },
  { value: 'chat_session_end',  label: 'Chat 会话结束' },
];

// 各平台 normalizer 实际支持的事件（与 backend/routes/platform-webhook.ts 对应）
const PLATFORM_EVENTS: Record<string, string[]> = {
  github:       ['commit_pushed', 'pr_opened', 'pr_merged', 'workflow_run', 'version_released'],
  gitlab:       ['commit_pushed', 'pr_opened', 'pr_merged', 'pipeline_done', 'version_released'],
  vercel:       ['deploy_started', 'deploy_success', 'deploy_failure', 'deployment_ready', 'deploy_canceled'],
  railway:      ['deploy_success', 'deploy_failure', 'service_crash'],
  'vscode-chat':['chat_manual', 'chat_session_end'],
  api:          ['deploy_success', 'deploy_failure', 'deploy_started', 'commit_pushed', 'test_passed', 'test_failed', 'chat_manual', 'version_released'],
  custom:       EVENT_OPTIONS.map(o => o.value), // 自定义平台不限制事件类型
};

const NOTIFY_ON_OPTIONS = [
  { value: 'always',   label: '始终通知' },
  { value: 'failure',  label: '仅失败' },
  { value: 'success',  label: '仅成功' },
  { value: 'changes',  label: '变更时通知' },
];

const PROJECT_TYPES: Array<{ type: string; icon: string; name: string; desc: string }> = [
  { type: 'vercel',       icon: '▲',  name: 'Vercel',        desc: '前端/全栈部署' },
  { type: 'railway',      icon: '🚂', name: 'Railway',       desc: '后端服务部署' },
  { type: 'github',       icon: '🐙', name: 'GitHub',        desc: 'Webhook 集成' },
  { type: 'gitlab',       icon: '🦊', name: 'GitLab',        desc: 'Webhook 集成' },
  { type: 'vscode-chat',  icon: '💬', name: 'VS Code Chat',  desc: 'Copilot 汇报' },
  { type: 'api',          icon: '🔌', name: 'Direct API',    desc: '直接 API 调用' },
  { type: 'custom',       icon: '🛠️', name: 'Custom Webhook', desc: '自定义集成' },
];

// ===== 辅助函数 =====
function getAuthHeaders() {
  const token = authService.getToken();
  return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ===== 主组件 =====
export default function Integrations() {
  const { robotId } = useParams<{ robotId: string }>();
  const navigate = useNavigate();

  const [robot, setRobot] = useState<Robot | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // 模态框状态
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<IntegrationModalMode>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string>('');
  const [formProjectName, setFormProjectName] = useState('');
  const [formProjectSubName, setFormProjectSubName] = useState('');
  const [formConfig, setFormConfig] = useState<Record<string, string>>({});
  const [formSelectedEvents, setFormSelectedEvents] = useState<string[]>([]);
  const [formNotifyOn, setFormNotifyOn] = useState('always');
  const [submitting, setSubmitting] = useState(false);

  // 创建成功后展示 Webhook 配置引导
  const [createdInfo, setCreatedInfo] = useState<Integration | null>(null);

  // 列表行复制反馈
  const [copiedUrlId, setCopiedUrlId] = useState<string | null>(null);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  // 查看 MCP 配置弹窗（vscode-chat 类型专用）
  const [mcpGuideIntegration, setMcpGuideIntegration] = useState<Integration | null>(null);

  const copyText = (text: string, id: string, setter: (v: string | null) => void) => {
    navigator.clipboard.writeText(text).then(() => {
      setter(id);
      setTimeout(() => setter(null), 2000);
    });
  };

  useEffect(() => {
    if (robotId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [robotId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [robotRes, intRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/robots/${robotId}`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/api/robots/${robotId}/integrations`, { headers: getAuthHeaders() }),
      ]);
      const robotData = await robotRes.json();
      const intData = await intRes.json();
      if (robotRes.ok && robotData.success) setRobot(robotData.data);
      else setError(robotData.error || '获取机器人信息失败');
      if (intRes.ok && intData.success) setIntegrations(intData.data || []);
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  // ===== 切换启用/停用状态 =====
  const handleToggleStatus = async (integration: Integration) => {
    setTogglingId(integration.id);
    try {
      const newStatus = integration.status === 'active' ? 'inactive' : 'active';
      const res = await fetch(
        `${API_BASE_URL}/api/robots/${robotId}/integrations/${integration.id}/status`,
        {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ status: newStatus }),
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setIntegrations(prev => prev.map(i =>
          i.id === integration.id ? { ...i, status: newStatus } : i
        ));
        showMessage(`✅ 集成已${newStatus === 'active' ? '启用' : '停用'}`);
      } else {
        showMessage(`❌ 操作失败: ${data.error || '未知错误'}`);
      }
    } catch {
      showMessage('❌ 网络错误');
    } finally {
      setTogglingId(null);
    }
  };

  // ===== 删除集成 =====
  const handleDelete = async (integration: Integration) => {
    if (!confirm(`确定要删除集成 "${integration.projectName}" 吗？此操作不可撤销。`)) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/robots/${robotId}/integrations/${integration.id}`,
        { method: 'DELETE', headers: getAuthHeaders() }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setIntegrations(prev => prev.filter(i => i.id !== integration.id));
        showMessage('✅ 集成已删除');
      } else {
        showMessage(`❌ 删除失败: ${data.error || '未知错误'}`);
      }
    } catch {
      showMessage('❌ 网络错误');
    }
  };

  // ===== 打开新建模态框 =====
  const openCreateModal = () => {
    setModalMode('create');
    setEditingId(null);
    setStep(1);
    setSelectedType('');
    setFormProjectName('');
    setFormProjectSubName('');
    setFormConfig({});
    setFormSelectedEvents([]);
    setFormNotifyOn('always');
    setModalOpen(true);
  };

  // ===== 打开编辑模态框 =====
  const openEditModal = (integration: Integration) => {
    setModalMode('edit');
    setEditingId(integration.id);
    setSelectedType(integration.projectType);
    setFormProjectName(integration.projectName);
    setFormProjectSubName(integration.projectSubName || '');
    setFormConfig(Object.fromEntries(
      Object.entries(integration.config || {}).map(([k, v]) => [k, String(v)])
    ));
    setFormSelectedEvents(integration.triggeredEvents);
    setFormNotifyOn(integration.notifyOn);
    setStep(2); // 编辑时直接跳到0第2步
    setModalOpen(true);
  };

  // ===== 提交新建或编辑 =====
  const handleSubmit = async () => {
    if (!formProjectName.trim()) {
      showMessage('❌ 请填写项目名称');
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        projectName: formProjectName.trim(),
        projectSubName: formProjectSubName.trim(),
        projectType: selectedType,
        config: formConfig,
        triggeredEvents: formSelectedEvents,
        notifyOn: formNotifyOn,
      };
      let res: Response;
      if (modalMode === 'create') {
        res = await fetch(
          `${API_BASE_URL}/api/robots/${robotId}/integrations`,
          { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body) }
        );
      } else {
        res = await fetch(
          `${API_BASE_URL}/api/robots/${robotId}/integrations/${editingId}`,
          { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(body) }
        );
      }
      const data = await res.json();
      if (res.ok && data.success) {
        if (modalMode === 'create') {
          setIntegrations(prev => [...prev, data.data]);
          setModalOpen(false);
          setCreatedInfo(data.data); // 显示 Webhook 配置引导
        } else {
          setIntegrations(prev => prev.map(i => i.id === editingId ? data.data : i));
          showMessage('✅ 集成已更新');
          setModalOpen(false);
        }
      } else {
        showMessage(`❌ 操作失败: ${data.error || '未知错误'}`);
      }
    } catch {
      showMessage('❌ 网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFormEvent = (value: string) => {
    setFormSelectedEvents(prev =>
      prev.includes(value) ? prev.filter(e => e !== value) : [...prev, value]
    );
  };

  // ===== 页面渲染 =====
  if (loading) return <div style={{ textAlign: 'center', padding: '4rem', color: '#6b7280' }}>加载中...</div>;

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', paddingBottom: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>

        {/* 面包屑 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
          <span style={{ color: '#3b82f6', cursor: 'pointer' }} onClick={() => navigate('/robots')}>机器人管理</span>
          <span style={{ color: '#d1d5db' }}>›</span>
          <span style={{ color: '#3b82f6', cursor: 'pointer' }} onClick={() => navigate('/robots')}>{robot?.name || '...'}</span>
          <span style={{ color: '#d1d5db' }}>›</span>
          <span style={{ color: '#1f2937', fontWeight: 500 }}>项目集成</span>
        </div>

        {/* 页头 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>🔗 项目集成管理</h1>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>{robot?.name}</p>
          </div>
          <button onClick={openCreateModal} style={{
            padding: '0.5rem 1rem', backgroundColor: '#10b981', color: 'white',
            border: 'none', borderRadius: '0.375rem', cursor: 'pointer',
            fontSize: '0.875rem', fontWeight: 500, whiteSpace: 'nowrap',
          }}>
            ➕ 添加集成
          </button>
        </div>

        {/* 提示 */}
        <div style={{ background: '#dbeafe', color: '#1e40af', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          💡 项目集成定义了哪些外部系统事件会触发此机器人发送飞书通知。每个集成可独立启用或停用。
        </div>

        {/* 全局消息 */}
        {(error || message) && (
          <div style={{
            background: error ? '#fee2e2' : (message?.includes('✅') ? '#d1fae5' : '#fee2e2'),
            color: error ? '#dc2626' : (message?.includes('✅') ? '#047857' : '#dc2626'),
            padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.875rem',
          }}>
            {error || message}
          </div>
        )}

        {/* 机器人概览卡 */}
        {robot && (
          <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', background: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>🤖</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '1rem', color: '#1f2937' }}>{robot.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'monospace' }}>{robot.webhookUrl.substring(0, 50)}...</div>
              </div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.8rem',
              borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 500,
              background: robot.status === 'active' ? '#d1fae5' : '#f3f4f6',
              color: robot.status === 'active' ? '#065f46' : '#6b7280',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: robot.status === 'active' ? '#10b981' : '#9ca3af', display: 'inline-block' }} />
              {robot.status === 'active' ? '运行中' : '已停用'}
            </div>
          </div>
        )}

        {/* 集成列表 */}
        <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: '#1f2937' }}>已配置的项目集成</span>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>共 {integrations.length} 个</span>
          </div>

          {integrations.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
              <p>暂无集成配置</p>
              <p style={{ marginTop: '0.5rem' }}>点击"添加集成"为此机器人配置第一个项目集成</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={thStyle(14)}>类型</th>
                    <th style={thStyle(16)}>项目名称</th>
                    <th style={thStyle(22)}>触发事件</th>
                    <th style={thStyle(10)}>通知时机</th>
                    <th style={thStyle(8)}>状态</th>
                    <th style={thStyle(30)}>操作 / Webhook</th>
                  </tr>
                </thead>
                <tbody>
                  {integrations.map(integration => (
                    <tr key={integration.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={tdStyle}>
                        <span style={{ ...typeBadgeStyle, ...TYPE_COLORS[integration.projectType] }}>
                          {TYPE_LABELS[integration.projectType]}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 500 }}>{integration.projectName}</div>
                        {integration.projectSubName && (
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{integration.projectSubName}</div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {integration.triggeredEvents.length === 0 ? (
                            <span style={{ color: '#9ca3af', fontSize: '0.78rem' }}>未配置</span>
                          ) : integration.triggeredEvents.map(ev => {
                            const opt = EVENT_OPTIONS.find(o => o.value === ev);
                            const isError = ev.includes('failure') || ev.includes('failed');
                            return (
                              <span key={ev} style={{
                                background: isError ? '#fef2f2' : '#f0fdf4',
                                color: isError ? '#991b1b' : '#166534',
                                padding: '0.125rem 0.5rem', borderRadius: '9999px',
                                fontSize: '0.7rem', fontWeight: 500,
                              }}>
                                {opt?.label || ev}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, color: '#6b7280', fontSize: '0.8rem' }}>
                        {NOTIFY_ON_OPTIONS.find(o => o.value === integration.notifyOn)?.label || integration.notifyOn}
                      </td>
                      <td style={tdStyle}>
                        <ToggleSwitch
                          checked={integration.status === 'active'}
                          disabled={togglingId === integration.id}
                          onChange={() => handleToggleStatus(integration)}
                        />
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                          <button onClick={() => openEditModal(integration)} style={btnSecondary}>编辑</button>
                          <button onClick={() => handleDelete(integration)} style={btnDanger}>删除</button>
                          <button
                            onClick={() => copyText(`${WEBHOOK_BASE_URL}/api/webhook/${integration.id}`, integration.id + '_url', setCopiedUrlId)}
                            style={{ ...btnSecondary, background: copiedUrlId === integration.id + '_url' ? '#d1fae5' : undefined, color: copiedUrlId === integration.id + '_url' ? '#065f46' : undefined }}
                            title={`复制 Webhook URL：${WEBHOOK_BASE_URL}/api/webhook/${integration.id}`}
                          >
                            {copiedUrlId === integration.id + '_url' ? '✓ URL' : '📋 URL'}
                          </button>
                          {integration.webhookSecret && (
                            <button
                              onClick={() => copyText(integration.webhookSecret!, integration.id + '_token', setCopiedTokenId)}
                              style={{ ...btnSecondary, background: copiedTokenId === integration.id + '_token' ? '#d1fae5' : undefined, color: copiedTokenId === integration.id + '_token' ? '#065f46' : undefined }}
                              title="复制 Webhook Secret Token"
                            >
                              {copiedTokenId === integration.id + '_token' ? '✓ Token' : '🔑 Token'}
                            </button>
                          )}
                          {integration.projectType === 'vscode-chat' && (
                            <button
                              onClick={() => setMcpGuideIntegration(integration)}
                              style={{ ...btnSecondary, background: '#ede9fe', color: '#4c1d95' }}
                              title="查看 MCP 配置片段"
                            >
                              📋 MCP配置
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ===== 新建/编辑模态框 ===== */}
      {modalOpen && (
        <IntegrationModal
          mode={modalMode}
          step={step}
          setStep={setStep}
          selectedType={selectedType}
          setSelectedType={setSelectedType}
          projectName={formProjectName}
          setProjectName={setFormProjectName}
          projectSubName={formProjectSubName}
          setProjectSubName={setFormProjectSubName}
          formConfig={formConfig}
          setFormConfig={setFormConfig}
          selectedEvents={formSelectedEvents}
          toggleEvent={toggleFormEvent}
          notifyOn={formNotifyOn}
          setNotifyOn={setFormNotifyOn}
          submitting={submitting}
          onSubmit={handleSubmit}
          onClose={() => setModalOpen(false)}
        />
      )}

      {/* ===== Webhook 配置引导弹窗（新建成功后）===== */}
      {createdInfo && (
        <SetupGuideModal
          integration={createdInfo}
          apiBaseUrl={WEBHOOK_BASE_URL}
          onClose={() => { setCreatedInfo(null); showMessage('✅ 集成已创建成功'); }}
        />
      )}

      {/* ===== 查看 MCP 配置弹窗（vscode-chat 类型，已有集成）===== */}
      {mcpGuideIntegration && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
          onClick={e => { if (e.target === e.currentTarget) setMcpGuideIntegration(null); }}
        >
          <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 25px 50px rgba(0,0,0,0.2)', width: '100%', maxWidth: '520px' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#3730a3' }}>💬 查看 MCP 配置 — {mcpGuideIntegration.projectName}</h2>
              <button onClick={() => setMcpGuideIntegration(null)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#6b7280' }}>✕</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <VscodeChatMcpGuide apiBaseUrl={WEBHOOK_BASE_URL} token={mcpGuideIntegration.webhookSecret || ''} />
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setMcpGuideIntegration(null)} style={{ ...btnPrimary, background: '#6366f1' }}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== 子组件：切换开关 =====
function ToggleSwitch({ checked, disabled, onChange }: {
  checked: boolean; disabled: boolean; onChange: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <button
        onClick={onChange}
        disabled={disabled}
        title={checked ? '点击停用' : '点击启用'}
        style={{
          width: '36px', height: '20px', borderRadius: '9999px', border: 'none',
          backgroundColor: checked ? '#10b981' : '#d1d5db',
          position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s', padding: 0, flexShrink: 0,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span style={{
          position: 'absolute', top: '3px',
          left: checked ? '19px' : '3px',
          width: '14px', height: '14px', borderRadius: '50%',
          background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transition: 'left 0.2s', display: 'block',
        }} />
      </button>
      <span style={{ fontSize: '0.78rem', fontWeight: 600, minWidth: '2.2rem', color: checked ? '#10b981' : '#9ca3af' }}>
        {checked ? '启用' : '停用'}
      </span>
    </div>
  );
}

// ===== 子组件：模态框 =====
function IntegrationModal({
  mode, step, setStep, selectedType, setSelectedType,
  projectName, setProjectName, projectSubName, setProjectSubName,
  formConfig, setFormConfig,
  selectedEvents, toggleEvent, notifyOn, setNotifyOn,
  submitting, onSubmit, onClose,
}: {
  mode: IntegrationModalMode; step: number; setStep: (s: number) => void;
  selectedType: string; setSelectedType: (t: string) => void;
  projectName: string; setProjectName: (v: string) => void;
  projectSubName: string; setProjectSubName: (v: string) => void;
  formConfig: Record<string, string>; setFormConfig: (v: Record<string, string>) => void;
  selectedEvents: string[]; toggleEvent: (v: string) => void;
  notifyOn: string; setNotifyOn: (v: string) => void;
  submitting: boolean; onSubmit: () => void; onClose: () => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);

  const handleNext = () => {
    if (step === 1 && !selectedType) { alert('请选择集成类型'); return; }
    if (step < 3) setStep(step + 1);
  };

  // ===== 步骤界面渲染 =====
  const renderStep = () => {
    if (step === 1) {
      if (mode === 'edit') {
        return (
          <div>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>集成类型创建后不可更改。</p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', background: '#f3f4f6', borderRadius: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
              {TYPE_LABELS[selectedType]}
            </div>
          </div>
        );
      }
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
          {PROJECT_TYPES.map(pt => (
            <div
              key={pt.type}
              onClick={() => setSelectedType(pt.type)}
              style={{
                padding: '1rem', borderRadius: '0.5rem', cursor: 'pointer',
                border: `2px solid ${selectedType === pt.type ? '#3b82f6' : '#e5e7eb'}`,
                background: selectedType === pt.type ? '#eff6ff' : 'white',
                textAlign: 'center', transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>{pt.icon}</div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1f2937' }}>{pt.name}</div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{pt.desc}</div>
            </div>
          ))}
        </div>
      );
    }

    if (step === 2) {
      // 平台専属配置字段
      const setConfig = (key: string, val: string) =>
        setFormConfig({ ...formConfig, [key]: val });

      const platformConfigSection = () => {
        switch (selectedType) {
          case 'github':
            return (
              <div style={{ ...formGroup, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '0.5rem', padding: '1rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#0369a1', marginBottom: '0.75rem' }}>🐙 GitHub Webhook 配置</div>
                <div style={formGroup}>
                  <label style={labelStyle}>仓库地址（owner/repo）<span style={{ color: '#9ca3af', fontWeight: 400 }}>（选填，仅用于标识）</span></label>
                  <input value={formConfig.repo || ''} onChange={e => setConfig('repo', e.target.value)}
                    placeholder="如： myorg/frontend-app" style={inputStyle} />
                </div>
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.375rem', padding: '0.75rem', fontSize: '0.78rem', color: '#92400e', lineHeight: 1.7 }}>
                  📖 <strong>配置步骤：</strong><br />
                  1. 前往 GitHub 仓库 → Settings → Webhooks → Add webhook<br />
                  2. Payload URL 填入创建后生成的 Webhook 地址<br />
                  3. Content type 选择 <code>application/json</code><br />
                  4. Secret 填入创建后生成的 Webhook Secret
                </div>
              </div>
            );
          case 'gitlab':
            return (
              <div style={{ ...formGroup, background: '#fdf4ff', border: '1px solid #e9d5ff', borderRadius: '0.5rem', padding: '1rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#7e22ce', marginBottom: '0.75rem' }}>🦊 GitLab Webhook 配置</div>
                <div style={formGroup}>
                  <label style={labelStyle}>GitLab 实例地址 <span style={{ color: '#9ca3af', fontWeight: 400 }}>（选填，仅用于标识；留空表示官方 gitlab.com）</span></label>
                  <input value={formConfig.instanceUrl || ''} onChange={e => setConfig('instanceUrl', e.target.value)}
                    placeholder="https://gitlab.com" style={inputStyle} />
                </div>
                <div style={formGroup}>
                  <label style={labelStyle}>项目路径（namespace/project）<span style={{ color: '#9ca3af', fontWeight: 400 }}>（选填，仅用于标识）</span></label>
                  <input value={formConfig.projectPath || ''} onChange={e => setConfig('projectPath', e.target.value)}
                    placeholder="如： mygroup/backend-service" style={inputStyle} />
                </div>
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.375rem', padding: '0.75rem', fontSize: '0.78rem', color: '#92400e', lineHeight: 1.7 }}>
                  📖 <strong>配置步骤：</strong><br />
                  1. 前往 GitLab 项目 → Settings → Integrations<br />
                  2. URL 填入创建后生成的 Webhook 地址<br />
                  3. Secret Token 填入创建后生成的 Webhook Secret
                </div>
              </div>
            );
          case 'vscode-chat':
            return (
              <div style={{ ...formGroup, background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '0.5rem', padding: '1rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#3730a3', marginBottom: '0.75rem' }}>💬 VS Code Chat / MCP 汇报配置</div>
                <div style={{ background: '#e0e7ff', borderRadius: '0.375rem', padding: '0.75rem', fontSize: '0.78rem', color: '#3730a3', lineHeight: 1.7 }}>
                  💡 创建集成后，弹窗会显示 MCP 配置片段，直接粘贴到你的项目 <code>.vscode/mcp.json</code> 中即可。
                  Copilot Agent 完成任务后会自动发送工作汇报到飞书。
                </div>
                {/* 以下 AI 摘要配置暂时隐藏：功能尚未接入当前 MCP 架构，保留代码供后续参考 */}
                {/* <div style={formGroup}>
                  <label style={labelStyle}>汇报摘要 AI（可选）</label>
                  <select value={formConfig.aiProvider || 'none'} onChange={e => setConfig('aiProvider', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="none">不启用摘要（原文推送）</option>
                    <option value="openai">OpenAI GPT-4o</option>
                    <option value="deepseek">DeepSeek</option>
                  </select>
                </div>
                {formConfig.aiProvider && formConfig.aiProvider !== 'none' && (
                  <div style={formGroup}>
                    <label style={labelStyle}>AI API Key <Required /></label>
                    <input type="password" value={formConfig.aiApiKey || ''} onChange={e => setConfig('aiApiKey', e.target.value)}
                      placeholder="sk-..." style={inputStyle} />
                  </div>
                )} */}
              </div>
            );
          case 'vercel':
            return (
              <div style={{ ...formGroup, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', padding: '1rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#166534', marginBottom: '0.5rem' }}>▲ Vercel Webhook 配置</div>
                <div style={{ background: '#dcfce7', borderRadius: '0.375rem', padding: '0.75rem', fontSize: '0.78rem', color: '#166534', lineHeight: 1.7 }}>
                  📖 <strong>配置步骤：</strong><br />
                  1. 前往 Vercel 项目 → Settings → Webhooks → Add Webhook<br />
                  2. Payload URL 填入创建后生成的 Webhook 地址<br />
                  3. Secret 字段填入创建后生成的 Webhook Secret（Vercel 用于 HMAC-SHA1 签名验证）
                </div>
              </div>
            );
          case 'railway':
            return (
              <div style={{ ...formGroup, background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '0.5rem', padding: '1rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#9f1239', marginBottom: '0.5rem' }}>🚂 Railway Webhook 配置</div>
                <div style={{ background: '#ffe4e6', borderRadius: '0.375rem', padding: '0.75rem', fontSize: '0.78rem', color: '#9f1239', lineHeight: 1.7 }}>
                  📖 <strong>配置步骤：</strong><br />
                  1. 前往 Railway 项目 → Settings → Webhooks<br />
                  2. URL 填入创建后生成的 Webhook 地址<br />
                  3. 请在请求头中传入 <code>X-Webhook-Secret</code> 进行验证
                </div>
              </div>
            );
          default:
            return (
              <div style={{ ...formGroup, background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem' }}>
                <div style={{ fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.7 }}>
                  🔌 创建成功后，将展示 <strong>Webhook 地址</strong>和 <strong>Secret</strong>。
                  将地址填入对应平台。
                  发送请求时需在 Header 中传入 <code>X-Webhook-Secret: &lt;secret&gt;</code>。
                </div>
              </div>
            );
        }
      };

      return (
        <div>
          {/* 项目名称 - 两个模式都可编辑 */}
          <div style={formGroup}>
            <label style={labelStyle}>项目名称 <Required /></label>
            <input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="如: api-service" style={inputStyle} />
          </div>

          <div style={formGroup}>
            <label style={labelStyle}>环境/备注 <span style={{ color: '#9ca3af', fontWeight: 400 }}>（选填，仅用于标识）</span></label>
            <input value={projectSubName} onChange={e => setProjectSubName(e.target.value)} placeholder="如: production / staging / v2" style={inputStyle} />
          </div>
          {platformConfigSection()}
          <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: '0.375rem', padding: '0.75rem', fontSize: '0.78rem', color: '#713f12' }}>
            🔑 点击「创建集成」后，系统会自动生成 <strong>Webhook 地址</strong>和 <strong>Secret</strong>，请将它们填入对应平台。
          </div>
        </div>
      );
    }

    if (step === 3) {
      // 按选定平台过滤，只展示该平台 normalizer 实际能处理的事件
      const visibleEvents = (PLATFORM_EVENTS[selectedType] || EVENT_OPTIONS.map(o => o.value)).length > 0
        ? EVENT_OPTIONS.filter(o => (PLATFORM_EVENTS[selectedType] ?? EVENT_OPTIONS.map(x => x.value)).includes(o.value))
        : EVENT_OPTIONS;
      return (
        <div>
          <div style={{ ...formGroup, marginBottom: '1.25rem' }}>
            <label style={labelStyle}>触发事件
              <span style={{ fontWeight: 400, fontSize: '0.75rem', color: '#6b7280', marginLeft: '0.4rem' }}>（已过滤为当前平台支持的事件）</span>
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
              {visibleEvents.map(opt => (
                <div
                  key={opt.value}
                  onClick={() => toggleEvent(opt.value)}
                  style={{
                    padding: '0.4rem 0.9rem', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.8rem',
                    border: `1.5px solid ${selectedEvents.includes(opt.value) ? '#3b82f6' : '#e5e7eb'}`,
                    background: selectedEvents.includes(opt.value) ? '#eff6ff' : 'white',
                    color: selectedEvents.includes(opt.value) ? '#1d4ed8' : '#374151',
                    fontWeight: selectedEvents.includes(opt.value) ? 600 : 400,
                    transition: 'all 0.15s',
                  }}
                >
                  {selectedEvents.includes(opt.value) && '✓ '}{opt.label}
                </div>
              ))}
            </div>
          </div>
          <div style={formGroup}>
            <label style={labelStyle}>通知时机</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
              {NOTIFY_ON_OPTIONS.map(opt => (
                <div
                  key={opt.value}
                  onClick={() => setNotifyOn(opt.value)}
                  style={{
                    padding: '0.4rem 1rem', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.8rem',
                    border: `1.5px solid ${notifyOn === opt.value ? '#10b981' : '#e5e7eb'}`,
                    background: notifyOn === opt.value ? '#f0fdf4' : 'white',
                    color: notifyOn === opt.value ? '#065f46' : '#374151',
                    fontWeight: notifyOn === opt.value ? 600 : 400,
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem', overflowY: 'auto' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={modalRef} style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 20px 25px rgba(0,0,0,0.15)', width: '100%', maxWidth: '580px', margin: 'auto' }}>

        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#1f2937' }}>
            {mode === 'create' ? '➕ 添加项目集成' : '✏️ 编辑集成配置'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>

        {/* Steps bar */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {[1, 2, 3].map((s, i) => {
            const stepLabels = ['选择类型', '基本信息', '触发规则'];
            const isDone = s < step;
            const isActive = s === step;
            return (
              <React.Fragment key={s}>
                {i > 0 && <div style={{ flex: 1, height: '2px', background: isDone ? '#3b82f6' : '#e5e7eb', minWidth: '20px' }} />}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 700,
                    background: isDone ? '#3b82f6' : isActive ? '#3b82f6' : '#e5e7eb',
                    color: isDone || isActive ? 'white' : '#9ca3af',
                  }}>
                    {isDone ? '✓' : s}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: isActive ? '#1d4ed8' : '#6b7280', fontWeight: isActive ? 600 : 400 }}>
                    {stepLabels[i]}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem' }}>
          {renderStep()}
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={onClose} style={btnSecondary}>取消</button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {step > 1 && <button onClick={() => setStep(step - 1)} style={btnSecondary}>← 上一步</button>}
            {step < 3
              ? <button onClick={handleNext} style={btnPrimary}>下一步 →</button>
              : <button onClick={onSubmit} disabled={submitting} style={{ ...btnPrimary, opacity: submitting ? 0.6 : 1 }}>
                  {submitting ? '保存中...' : (mode === 'create' ? '✓ 创建集成' : '✓ 保存更改')}
                </button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== 样式常量 =====
const thStyle = (pct: number): React.CSSProperties => ({
  padding: '0.75rem', textAlign: 'left', fontWeight: 600,
  fontSize: '0.8rem', color: '#6b7280', borderBottom: '1px solid #e5e7eb',
  width: `${pct}%`,
});

const tdStyle: React.CSSProperties = { padding: '0.875rem 0.75rem', verticalAlign: 'middle' };

const typeBadgeStyle: React.CSSProperties = {
  display: 'inline-block', padding: '0.2rem 0.6rem',
  borderRadius: '0.375rem', fontSize: '0.78rem', fontWeight: 600,
};

const btnSecondary: React.CSSProperties = {
  padding: '0.4rem 0.9rem', background: '#e5e7eb', color: '#374151',
  border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.8rem',
};

const btnDanger: React.CSSProperties = {
  padding: '0.4rem 0.9rem', background: '#f3f4f6', color: '#ef4444',
  border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.8rem',
};

const btnPrimary: React.CSSProperties = {
  padding: '0.4rem 1rem', background: '#3b82f6', color: 'white',
  border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
};

const formGroup: React.CSSProperties = { marginBottom: '1.25rem' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#1f2937', marginBottom: '0.4rem' };
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db',
  borderRadius: '0.375rem', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'inherit',
};

function Required() {
  return <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>;
}

// ===== 子组件：VS Code Chat 类型的 MCP 配置展示 =====
// 使用 VS Code inputs 安全机制：Token 不明文存储，由 VS Code 在连接时弹框询问
function VscodeChatMcpGuide({ apiBaseUrl }: { apiBaseUrl: string; token: string }) {
  const mcpSseUrl = `${apiBaseUrl}/api/mcp/sse`;

  // 使用 inputs 安全机制生成配置，Token 不会出现在配置文件中
  const mcpJson = JSON.stringify({
    inputs: [
      {
        type: 'promptString',
        id: 'feishu_mcp_token',
        description: 'Feishu MCP Token（从飞书通知系统集成管理页面「📋 MCP配置」按钮获取）',
        password: true,
      }
    ],
    servers: {
      'feishu-notifier': {
        type: 'sse',
        url: `${mcpSseUrl}?token=\${input:feishu_mcp_token}`,
      }
    }
  }, null, 2);

  const [copied, setCopied] = React.useState(false);
  const copyMcpJson = () => {
    navigator.clipboard.writeText(mcpJson).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '0.5rem', padding: '1rem' }}>
      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#3730a3', marginBottom: '0.75rem' }}>🤖 MCP 远端配置</div>
      <p style={{ fontSize: '0.78rem', color: '#4338ca', marginBottom: '0.75rem', lineHeight: 1.6 }}>
        将以下配置粘贴到你的<strong>其他项目</strong>的 <code>.vscode/mcp.json</code>。
        VS Code 首次连接时会弹出密码输入框，Token 安全存储，不会出现在配置文件中。
      </p>
      <div style={{ background: '#e0e7ff', borderRadius: '0.375rem', padding: '0.6rem 0.75rem', fontSize: '0.75rem', color: '#3730a3', marginBottom: '0.75rem' }}>
        🔑 Token 从本页面右上角「🔑 Token」按钮复制，首次连接粘贴到 VS Code 弹出的输入框即可
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 500, color: '#374151' }}>
            复制到 <code>.vscode/mcp.json</code>
          </div>
          <button
            onClick={copyMcpJson}
            style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem', background: copied ? '#d1fae5' : '#4f46e5', color: copied ? '#065f46' : 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
          >
            {copied ? '✅ 已复制' : '📋 复制'}
          </button>
        </div>
        <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.72rem', background: '#1e293b', color: '#e2e8f0', padding: '0.75rem', borderRadius: '0.375rem', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {mcpJson}
        </pre>
      </div>
    </div>
  );
}

// ===== 子组件：创建成功后的 Webhook 配置引导弹窗 =====
function SetupGuideModal({ integration, apiBaseUrl, onClose }: {
  integration: Integration; apiBaseUrl: string; onClose: () => void;
}) {
  const webhookUrl = `${apiBaseUrl}/api/webhook/${integration.id}`;
  const secret = integration.webhookSecret || '（请重新创建获取）';

  const [copiedUrl, setCopiedUrl] = React.useState(false);
  const [copiedSecret, setCopiedSecret] = React.useState(false);

  const copy = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const platformInstructions: Record<string, { header: string; bg: string; color: string; steps: string[] }> = {
    vercel:       { header: '▲ Vercel', bg: '#f0fdf4', color: '#166534', steps: ['进入 Vercel 项目 → Settings → Webhooks → Add Webhook', '填写上方 Webhook URL', '勾选所需事件（推荐：Deployment）', '保存即可（无需填写 Secret）'] },
    railway:      { header: '🚂 Railway', bg: '#fff1f2', color: '#9f1239', steps: ['进入 Railway 项目 → Settings → Webhooks → Add Webhook', '填写上方 Webhook URL', '在请求时带上 X-Webhook-Secret: <secret> 请求头'] },
    github:       { header: '🐙 GitHub', bg: '#e0f2fe', color: '#0c4a6e', steps: ['进入 GitHub 仓库 → Settings → Webhooks → Add webhook', 'Payload URL 填写上方地址', 'Content type 选择 application/json', 'Secret 填写上方 Webhook Secret', '选择需要的事件（推荐：push, pull_request, workflow_run）'] },
    gitlab:       { header: '🦊 GitLab', bg: '#fdf4ff', color: '#7e22ce', steps: ['进入 GitLab 项目 → Settings → Integrations', 'URL 填写上方 Webhook URL', 'Secret Token 填写上方 Webhook Secret', '勾选需要的触发器后保存'] },
    // vscode-chat 使用单独的 MCP 展示区，不走通用 steps（在下方条件渲染）
    'vscode-chat':{ header: '💬 VS Code Chat', bg: '#eef2ff', color: '#3730a3', steps: [] },
    api:          { header: '🔌 Direct API', bg: '#dbeafe', color: '#1e40af', steps: ['使用 POST 请求向上方 Webhook URL 发送 JSON', '请求体：{ title, summary, status, url? }', '请求头：X-Webhook-Secret: <secret>'] },
    custom:       { header: '🛠️ Custom Webhook', bg: '#f3f4f6', color: '#374151', steps: ['向上方 Webhook URL 发送 POST 请求', '请求体：{ title, summary, status, event?, url? }', '请求头：X-Webhook-Secret: <secret>'] },
  };

  const guide = platformInstructions[integration.projectType] || platformInstructions['custom'];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 25px 50px rgba(0,0,0,0.2)', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflow: 'auto' }}>

        {/* 头部 */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0fdf4' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#065f46' }}>🎉 集成创建成功！</h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#059669' }}>请将以下信息填入对应平台的 Webhook 设置</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* Webhook URL */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ ...labelStyle, color: '#dc2626' }}>📡 Webhook 接收地址</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input readOnly value={webhookUrl} style={{ ...inputStyle, background: '#f9fafb', color: '#374151', fontFamily: 'monospace', fontSize: '0.8rem', flex: 1 }} />
              <button onClick={() => copy(webhookUrl, setCopiedUrl)} style={{ ...btnPrimary, whiteSpace: 'nowrap', background: copiedUrl ? '#10b981' : '#3b82f6' }}>
                {copiedUrl ? '✓ 已复制' : '📋 复制'}
              </button>
            </div>
          </div>

          {/* Webhook Secret */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ ...labelStyle, color: '#dc2626' }}>🔑 Webhook Secret <span style={{ fontWeight: 400, color: '#6b7280', fontSize: '0.78rem' }}>（仅此一次，请妥善保存）</span></label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input readOnly value={secret} style={{ ...inputStyle, background: '#fef9c3', color: '#374151', fontFamily: 'monospace', fontSize: '0.8rem', flex: 1 }} />
              <button onClick={() => copy(secret, setCopiedSecret)} style={{ ...btnPrimary, whiteSpace: 'nowrap', background: copiedSecret ? '#10b981' : '#3b82f6' }}>
                {copiedSecret ? '✓ 已复制' : '📋 复制'}
              </button>
            </div>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: '#dc2626' }}>⚠️ Secret 只在创建时显示一次，关闭弹窗后将无法再次查看</p>
          </div>

          {/* 平台配置步骤 */}
          {integration.projectType === 'vscode-chat' ? (
            <VscodeChatMcpGuide apiBaseUrl={apiBaseUrl} token={integration.webhookSecret || ''} />
          ) : (
            <div style={{ background: guide.bg, border: `1px solid ${guide.color}30`, borderRadius: '0.5rem', padding: '1rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: guide.color, marginBottom: '0.75rem' }}>{guide.header} 配置步骤</div>
              <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8rem', color: '#374151', lineHeight: 1.8 }}>
                {guide.steps.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </div>
          )}
        </div>

        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ ...btnPrimary, background: '#10b981' }}>✓ 我已完成配置</button>
        </div>
      </div>
    </div>
  );
}
