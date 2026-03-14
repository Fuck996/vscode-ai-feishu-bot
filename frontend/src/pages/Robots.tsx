import React, { useEffect, useState } from 'react';
import { CalendarDays, ChevronDown, Clock3, MoreHorizontal, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SceneIcon from '../components/SceneIcon';

import { useToast } from '../hooks/useToast';
import authService from '../services/auth';

interface Robot {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  webhookUrl: string;
  lastMessageAt?: string;
  createdAt: string;
  messageCount?: number;
}

interface RobotsResponse {
  success: boolean;
  data: Robot[];
  error?: string;
}

interface ActionMenuState {
  robotId: string;
  top: number;
  left: number;
}

export default function Robots() {
  const navigate = useNavigate();
  const toast = useToast();
  const [robots, setRobots] = useState<Robot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testingRobotId, setTestingRobotId] = useState<string | null>(null);
  const [isAddRobotModalOpen, setIsAddRobotModalOpen] = useState(false);
  const [isEditRobotModalOpen, setIsEditRobotModalOpen] = useState(false);
  const [editingRobot, setEditingRobot] = useState<Robot | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', webhookUrl: '' });
  const [editFormData, setEditFormData] = useState({ name: '', description: '', webhookUrl: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [openActionMenu, setOpenActionMenu] = useState<ActionMenuState | null>(null);
  const [openFilterMenu, setOpenFilterMenu] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const API_BASE_URL = '';  // 使用相对路径，走 Vite 代理转发到后端

  useEffect(() => {
    fetchRobots();
  }, []);

  useEffect(() => {
    if (!openActionMenu) return undefined;
    const handler = () => setOpenActionMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [openActionMenu]);

  const fetchRobots = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/robots`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        let errMsg = '获取机器人列表失败';
        try {
          const errData = await response.json();
          errMsg = (errData as any).error || errMsg;
        } catch {}
        setError(errMsg);
        return;
      }

      const data: RobotsResponse = await response.json();

      if (data.success) {
        setRobots(data.data || []);
      } else {
        setError(data.error || '获取机器人列表失败');
      }
    } catch (err) {
      console.error('Fetch robots error:', err);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleTestRobot = async (robotId: string) => {
    try {
      setTestingRobotId(robotId);

      const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/robots/${robotId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('测试通知已发送成功');
      } else {
        toast.error(`测试失败: ${data.error || '未知错误'}`);
      }
    } catch (err) {
      console.error('Test robot error:', err);
      toast.error('网络错误，请稍后重试');
    } finally {
      setTestingRobotId(null);
    }
  };

  const handleToggleRobotStatus = async (robot: Robot) => {
    try {
      const newStatus = robot.status === 'active' ? 'inactive' : 'active';

      const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/robots/${robot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...robot,
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setRobots(robots.map(r => r.id === robot.id ? { ...r, status: newStatus } : r));
        toast.success(`机器人已${newStatus === 'active' ? '启用' : '禁用'}`);
      } else {
        toast.error(data.error || '更新状态失败');
      }
    } catch (err) {
      console.error('Toggle robot status error:', err);
      toast.error('网络错误，请稍后重试');
    }
  };

  const handleDeleteRobot = async (robotId: string) => {
    const robot = robots.find(r => r.id === robotId);
    if (!confirm(`确定要删除机器人 "${robot?.name}" 吗？`)) {
      return;
    }

    try {
      const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/robots/${robotId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setRobots(robots.filter(r => r.id !== robotId));
        toast.success('机器人已删除');
      } else {
        toast.error(data.error || '删除机器人失败');
      }
    } catch (err) {
      console.error('Delete robot error:', err);
      toast.error('网络错误，请稍后重试');
    }
  };

  const handleFormInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditFormInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenEditModal = (robot: Robot) => {
    setEditingRobot(robot);
    setEditFormData({ name: robot.name, description: robot.description || '', webhookUrl: robot.webhookUrl });
    setIsEditRobotModalOpen(true);
  };

  const handleUpdateRobot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRobot) return;
    if (!editFormData.name.trim()) { toast.error('请输入机器人名称'); return; }
    if (!editFormData.webhookUrl.trim()) { toast.error('请输入 Webhook URL'); return; }
    try {
      new URL(editFormData.webhookUrl);
    } catch {
      toast.error('请输入有效的 URL 格式');
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/robots/${editingRobot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editingRobot, ...editFormData }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setRobots(robots.map(r => r.id === editingRobot.id ? { ...r, ...editFormData } : r));
        setIsEditRobotModalOpen(false);
        setEditingRobot(null);
        toast.success('机器人已更新');
      } else {
        toast.error(data.error || '更新机器人失败');
      }
    } catch (err) {
      console.error('Update robot error:', err);
      toast.error('网络错误，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddRobot = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('请输入机器人名称');
      return;
    }

    if (!formData.webhookUrl.trim()) {
      toast.error('请输入 Webhook URL');
      return;
    }

    // 验证URL格式
    try {
      new URL(formData.webhookUrl);
    } catch {
      toast.error('Webhook URL 格式不正确，请检查后重试');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/robots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          webhookUrl: formData.webhookUrl.trim(),
          status: 'active',
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setRobots([...robots, data.data]);
        toast.success(`机器人 "${formData.name}" 创建成功`);
        setFormData({ name: '', description: '', webhookUrl: '' });
        setIsAddRobotModalOpen(false);
      } else {
        toast.error(data.error || '创建机器人失败');
      }
    } catch (err) {
      console.error('Add robot error:', err);
      toast.error('网络错误，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 生成简化的App ID（从UUID中提取）
  const getAppId = (id: string): string => {
    return id.substring(0, 8).toUpperCase();
  };

  // 获取创建日期
  const getCreateDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('zh-CN');
    } catch {
      return '未知';
    }
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
          <p style={{ fontSize: '1rem', color: '#6b7280', fontWeight: 500 }}>加载机器人列表中...</p>
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
          正在获取您的机器人配置，请稍候...
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


  const openActionMenuAt = (event: React.MouseEvent<HTMLButtonElement>, robotId: string) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setOpenActionMenu(current => {
      if (current?.robotId === robotId) return null;
      return { robotId, top: rect.bottom + 8, left: rect.right - 132 };
    });
  };

  // 过滤机器人列表
  const filteredRobots = robots.filter(robot => {
    if (statusFilter !== 'all' && robot.status !== statusFilter) return false;
    if (searchQuery.trim() !== '' && !robot.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // 格式化最后消息时间
  const formatLastMessageDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return {
        date: date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }),
        time: date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
      };
    } catch {
      return { date: '未知', time: '' };
    }
  };

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', paddingBottom: '2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>

        {/* 搜索框 - 卡片外右上角 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', border: '1px solid #d0d7de', borderRadius: '2rem', backgroundColor: 'white', width: '220px' }}>
            <Search size={14} color="#57606a" />
            <input
              type="text"
              placeholder="搜索机器人名称"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ border: 'none', outline: 'none', fontSize: '0.8125rem', width: '100%', color: '#24292f', backgroundColor: 'transparent' }}
            />
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        {/* 机器人列表卡片 */}
        <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          {/* 卡片标头 */}
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            {/* 左侧：标题 + 数量 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1f2328' }}>机器人管理</span>
              <span style={{ fontSize: '0.8125rem', color: '#656d76' }}>共 {filteredRobots.length} 个</span>
            </div>
            {/* 右侧：新建按钮 + 状态筛选 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={() => setIsAddRobotModalOpen(true)}
                style={{ padding: '0.45rem 0.875rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.375rem', whiteSpace: 'nowrap' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#059669')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#10b981')}
              >
                ＋ 新建机器人
              </button>
              {/* 状态筛选下拉 */}
              <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setOpenFilterMenu(!openFilterMenu)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.6rem', fontSize: '0.8125rem', fontWeight: 500, color: '#24292f', border: '1px solid #d0d7de', borderRadius: '0.375rem', backgroundColor: 'white', cursor: 'pointer' }}
                >
                  状态
                  {statusFilter !== 'all' && <span style={{ backgroundColor: '#0969da', color: 'white', borderRadius: '999px', fontSize: '0.6875rem', padding: '0 5px', marginLeft: '2px' }}>1</span>}
                  <ChevronDown size={14} />
                </button>
                {openFilterMenu && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 0.375rem)', right: 0, minWidth: '120px', padding: '0.4rem', backgroundColor: '#ffffff', border: '1px solid #d0d7de', borderRadius: '0.75rem', boxShadow: '0 8px 24px rgba(31,35,40,0.12)', zIndex: 20 }}>
                    {[
                      { label: '全部', value: 'all' },
                      { label: '启用', value: 'active' },
                      { label: '禁用', value: 'inactive' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setStatusFilter(opt.value as 'all' | 'active' | 'inactive'); setOpenFilterMenu(false); }}
                        style={{ width: '100%', textAlign: 'left', padding: '0.45rem 0.75rem', border: 'none', borderRadius: '0.5rem', backgroundColor: statusFilter === opt.value ? '#f3f4f6' : 'transparent', color: '#1f2328', cursor: 'pointer', fontSize: '0.875rem', fontWeight: statusFilter === opt.value ? 600 : 400 }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 表格区域 */}
          <div style={{ overflowX: 'auto' }}>
            {filteredRobots.length === 0 ? (
              <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
                {robots.length === 0 ? (
                  <p>暂无机器人，点击"新建机器人"创建第一个</p>
                ) : (
                  <p>没有符合条件的机器人</p>
                )}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                <tbody>
                  {filteredRobots.map(robot => {
                    const lastMsg = robot.lastMessageAt ? formatLastMessageDate(robot.lastMessageAt) : null;
                    return (
                      <tr key={robot.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        {/* 列1：名称 + 消息数 */}
                        <td style={{ padding: '0.875rem 1.5rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                              <SceneIcon name="robotMessage" size={16} title={robot.name} />
                              <span
                                style={{ fontWeight: 600, color: '#1f2328', fontSize: '0.875rem', cursor: 'pointer', textDecoration: 'none' }}
                                onMouseEnter={e => { e.currentTarget.style.color = '#0969da'; e.currentTarget.style.textDecoration = 'underline'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = '#1f2328'; e.currentTarget.style.textDecoration = 'none'; }}
                                onClick={() => navigate(`/robots/${robot.id}/integrations`)}
                              >{robot.name}</span>
                            </span>
                            <span style={{ color: '#656d76', fontSize: '0.75rem' }}>{robot.messageCount || 0} 条记录</span>
                          </div>
                        </td>
                        {/* 列2：创建时间 + App ID */}
                        <td style={{ padding: '0.875rem 0.75rem', width: '200px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#374151', fontSize: '0.8125rem', fontWeight: 500 }}>
                              <CalendarDays size={13} color="#57606a" />
                              <span>创建日期：{getCreateDate(robot.createdAt)}</span>
                            </span>
                            <span style={{ color: '#656d76', fontSize: '0.75rem', paddingLeft: '1.2rem' }}>APP ID: {getAppId(robot.id)}</span>
                          </div>
                        </td>
                        {/* 列3：最后消息时间 */}
                        <td style={{ padding: '0.875rem 0.75rem', width: '190px' }}>
                          {lastMsg ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#374151', fontSize: '0.8125rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                <CalendarDays size={13} color="#57606a" />
                                <span>最后活动：{lastMsg.date}</span>
                              </span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#656d76', fontSize: '0.75rem' }}>
                                <Clock3 size={13} color="#57606a" />
                                <span>{lastMsg.time}</span>
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: '0.8125rem' }}>未发送</span>
                          )}
                        </td>
                        {/* 列4：快捷开关 */}
                        <td style={{ padding: '0.875rem 0.75rem', width: '90px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <button
                              onClick={() => handleToggleRobotStatus(robot)}
                              style={{ width: '40px', height: '22px', backgroundColor: robot.status === 'active' ? '#10b981' : '#cbd5e1', borderRadius: '11px', position: 'relative', cursor: 'pointer', border: 'none', padding: 0, transition: 'background-color 0.2s', flexShrink: 0 }}
                            >
                              <div style={{ width: '18px', height: '18px', backgroundColor: 'white', borderRadius: '9px', position: 'absolute', top: '2px', left: robot.status === 'active' ? '20px' : '2px', transition: 'left 0.2s' }} />
                            </button>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: robot.status === 'active' ? '#10b981' : '#9ca3af', whiteSpace: 'nowrap' }}>
                              {robot.status === 'active' ? '启用' : '禁用'}
                            </span>
                          </div>
                        </td>
                        {/* 列5：操作菜单 */}
                        <td style={{ padding: '0.875rem 1rem', width: '56px', textAlign: 'right', position: 'relative' }}>
                          <div style={{ display: 'inline-flex', position: 'relative' }} onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(event) => openActionMenuAt(event, robot.id)}
                              style={{ width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #d0d7de', borderRadius: '0.5rem', backgroundColor: '#ffffff', color: '#57606a', cursor: 'pointer' }}
                              aria-label="更多操作"
                            >
                              <MoreHorizontal size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>


      {/* 三点菜单浮层（fixed 定位避免被 overflow 截断）*/}
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
          {([
            { label: '测试', color: '#1f2328', action: () => { handleTestRobot(openActionMenu.robotId); setOpenActionMenu(null); } },
            { label: '集成', color: '#1f2328', action: () => { navigate(`/robots/${openActionMenu.robotId}/integrations`); setOpenActionMenu(null); } },
            { label: '编辑', color: '#1f2328', action: () => { const r = robots.find(x => x.id === openActionMenu.robotId); if (r) handleOpenEditModal(r); setOpenActionMenu(null); } },
            { label: '删除', color: '#cf222e', action: () => { handleDeleteRobot(openActionMenu.robotId); setOpenActionMenu(null); } },
          ] as const).map(item => (
            <button
              key={item.label}
              type="button"
              onClick={item.action}
              style={{ width: '100%', textAlign: 'left', padding: '0.45rem 0.75rem', border: 'none', borderRadius: '0.5rem', backgroundColor: 'transparent', color: item.color, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f6f8fa')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {/* 编辑机器人模态框 */}
      {isEditRobotModalOpen && editingRobot && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={() => setIsEditRobotModalOpen(false)}>
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 20px 25px rgba(0,0,0,0.15)', width: '90%', maxWidth: '450px', maxHeight: '90vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>✏️ 编辑机器人</h2>
              <button onClick={() => setIsEditRobotModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280', padding: '0.25rem 0.5rem' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#1f2937')} onMouseLeave={(e) => (e.currentTarget.style.color = '#6b7280')}>✕</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              {error && (
                <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>❌ {error}</div>
              )}
              <form onSubmit={handleUpdateRobot}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontWeight: 500, fontSize: '0.875rem', color: '#1f2937', marginBottom: '0.5rem' }}>机器人名称 <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" name="name" value={editFormData.name} onChange={handleEditFormInputChange} placeholder="例如：代码提交通知"
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontWeight: 500, fontSize: '0.875rem', color: '#1f2937', marginBottom: '0.5rem' }}>描述（可选）</label>
                  <textarea name="description" value={editFormData.description} onChange={handleEditFormInputChange} placeholder="例如：用于发送 Git 提交通知到飞书群组"
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'inherit', minHeight: '80px', resize: 'none' }} />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontWeight: 500, fontSize: '0.875rem', color: '#1f2937', marginBottom: '0.5rem' }}>Webhook URL <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="url" name="webhookUrl" value={editFormData.webhookUrl} onChange={handleEditFormInputChange} placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'monospace' }} />
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>从飞书开发者后台获取的群机器人 Webhook URL</p>
                </div>
              </form>
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button onClick={() => setIsEditRobotModalOpen(false)}
                  style={{ padding: '0.5rem 1.5rem', backgroundColor: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#d1d5db')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#e5e7eb')}>取消</button>
                <button onClick={handleUpdateRobot} disabled={isSubmitting}
                  style={{ padding: '0.5rem 1.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: 500, opacity: isSubmitting ? 0.6 : 1 }}
                  onMouseEnter={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = '#2563eb')} onMouseLeave={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = '#3b82f6')}>
                  {isSubmitting ? '保存中...' : '✓ 保存修改'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 新建机器人模态框 */}
      {isAddRobotModalOpen && (
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
          zIndex: 50,
        }}
        onClick={() => setIsAddRobotModalOpen(false)}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
            width: '90%',
            maxWidth: '450px',
            maxHeight: '90vh',
            overflow: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* 模态框头部 */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>
                🤖 创建新的机器人
              </h2>
              <button
                onClick={() => setIsAddRobotModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0.25rem 0.5rem',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#1f2937')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#6b7280')}
              >
                ✕
              </button>
            </div>

            {/* 模态框内容 */}
            <div style={{ padding: '1.5rem' }}>
              {/* 提示信息 */}
              <div style={{
                backgroundColor: '#dbeafe',
                color: '#1e40af',
                padding: '0.75rem',
                borderRadius: '0.375rem',
                marginBottom: '1.5rem',
                fontSize: '0.875rem',
                lineHeight: '1.5',
              }}>
                💡 <strong>提示：</strong> 机器人是连接飞书的桥梁，用于接收和发送通知。每个机器人需要 Webhook URL 来接收回调。
              </div>

              {/* 错误提示 */}
              {error && (
                <div style={{
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  padding: '0.75rem',
                  borderRadius: '0.375rem',
                  marginBottom: '1.5rem',
                  fontSize: '0.875rem',
                }}>
                  ❌ {error}
                </div>
              )}

              {/* 表单 */}
              <form onSubmit={handleAddRobot}>
                {/* 机器人名称 */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    color: '#1f2937',
                    marginBottom: '0.5rem',
                  }}>
                    机器人名称 <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleFormInputChange}
                    placeholder="例如：代码提交通知"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                    }}
                  />
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                    用于识别不同的机器人，最多50个字符
                  </p>
                </div>

                {/* 机器人描述 */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    color: '#1f2937',
                    marginBottom: '0.5rem',
                  }}>
                    描述（可选）
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleFormInputChange}
                    placeholder="例如：用于发送 Git 提交通知到飞书群组"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                      minHeight: '80px',
                      resize: 'none',
                    }}
                  />
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                    描述此机器人的用途，帮助识别和管理
                  </p>
                </div>

                {/* Webhook URL */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    color: '#1f2937',
                    marginBottom: '0.5rem',
                  }}>
                    Webhook URL <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="url"
                    name="webhookUrl"
                    value={formData.webhookUrl}
                    onChange={handleFormInputChange}
                    placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box',
                      fontFamily: 'monospace',
                    }}
                  />
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                    从飞书开发者后台获取的 Webhook URL
                  </p>
                </div>

                {/* 帮助信息 */}
                <div style={{
                  marginTop: '1.5rem',
                  paddingTop: '1.5rem',
                  borderTop: '1px solid #e5e7eb',
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  lineHeight: '1.6',
                }}>
                  <p style={{ fontWeight: 500, marginBottom: '0.5rem' }}>需要帮助？</p>
                  <ul style={{ margin: '0.5rem 0 0 1rem', paddingLeft: '1rem' }}>
                    <li>如何获取 Webhook URL？ <a href="https://www.feishu.cn" target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>查看文档</a></li>
                    <li>一个 URL 可以绑定多个机器人吗？ <a href="https://www.feishu.cn" target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>了解更多</a></li>
                    <li>创建后可以修改 URL 吗？ <a href="https://www.feishu.cn" target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>查看指南</a></li>
                  </ul>
                </div>
              </form>

              {/* 模态框底部 */}
              <div style={{
                marginTop: '1.5rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'flex-end',
              }}>
                <button
                  onClick={() => setIsAddRobotModalOpen(false)}
                  style={{
                    padding: '0.5rem 1.5rem',
                    backgroundColor: '#e5e7eb',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#d1d5db')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#e5e7eb')}
                >
                  取消
                </button>
                <button
                  onClick={handleAddRobot}
                  disabled={isSubmitting}
                  style={{
                    padding: '0.5rem 1.5rem',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    transition: 'background-color 0.2s',
                    opacity: isSubmitting ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = '#059669')}
                  onMouseLeave={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = '#10b981')}
                >
                  {isSubmitting ? '创建中...' : '✓ 创建机器人'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
