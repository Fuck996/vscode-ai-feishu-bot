import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/auth';
import { useToast } from '../hooks/useToast';

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

  const API_BASE_URL = '';  // 使用相对路径，走 Vite 代理转发到后端

  useEffect(() => {
    fetchRobots();
  }, []);

  const fetchRobots = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.fetchWithAuth(`${API_BASE_URL}/api/robots`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const data: RobotsResponse = await response.json();

      if (response.ok && data.success) {
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

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', paddingBottom: '2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        {/* 页面标题和新建按钮 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#1f2937' }}>🤖 机器人管理</h1>
          <button
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#059669')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#10b981')}
            onClick={() => setIsAddRobotModalOpen(true)}
          >
            ➕ 新建机器人
          </button>
        </div>

        {/* 信息框 */}
        <div style={{
          backgroundColor: '#dbeafe',
          color: '#1e40af',
          padding: '1rem',
          borderRadius: '0.5rem',
          marginBottom: '2rem',
          fontSize: '0.875rem',
        }}>
          💡 在此管理飞书机器人，可以创建、编辑、删除和测试机器人。每个机器人可接收来自不同应用的通知。
        </div>

        {/* 错误提示 */}
        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '1rem', borderRadius: '0.5rem', marginBottom: '2rem' }}>
            {error}
          </div>
        )}

        {/* 机器人列表 */}
        {robots.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            padding: '3rem 1rem',
            textAlign: 'center',
            color: '#9ca3af',
            fontSize: '0.875rem',
          }}>
            <p style={{ marginBottom: '0.5rem' }}>暂无机器人实例</p>
            <p>点击"新建机器人"创建您的第一个飞书机器人</p>
          </div>
        ) : (
          <div style={{
            background: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
          }}>
            <div style={{ overflowX: 'auto', padding: '1.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f9fafb' }}>
                  <tr>
                    <th style={{
                      padding: '0.75rem',
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      color: '#6b7280',
                      borderBottom: '1px solid #e5e7eb',
                      width: '20%',
                    }}>
                      机器人名称
                    </th>
                    <th style={{
                      padding: '0.75rem',
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      color: '#6b7280',
                      borderBottom: '1px solid #e5e7eb',
                      width: '20%',
                    }}>
                      App ID
                    </th>
                    <th style={{
                      padding: '0.75rem',
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      color: '#6b7280',
                      borderBottom: '1px solid #e5e7eb',
                      width: '12%',
                    }}>
                      快捷开关
                    </th>
                    <th style={{
                      padding: '0.75rem',
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      color: '#6b7280',
                      borderBottom: '1px solid #e5e7eb',
                      width: '13%',
                    }}>
                      创建时间
                    </th>
                    <th style={{
                      padding: '0.75rem',
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      color: '#6b7280',
                      borderBottom: '1px solid #e5e7eb',
                      width: '12%',
                    }}>
                      消息数
                    </th>
                    <th style={{
                      padding: '0.75rem',
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      color: '#6b7280',
                      borderBottom: '1px solid #e5e7eb',
                      width: '13%',
                    }}>
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {robots.map((robot) => (
                    <tr key={robot.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#374151' }}>
                        {robot.name}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#374151' }}>
                        {getAppId(robot.id)}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleToggleRobotStatus(robot)}
                            style={{
                              width: '44px',
                              height: '24px',
                              backgroundColor: robot.status === 'active' ? '#10b981' : '#cbd5e1',
                              borderRadius: '12px',
                              position: 'relative',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s',
                              border: 'none',
                              padding: 0,
                            }}
                            title={robot.status === 'active' ? '点击禁用' : '点击启用'}
                          >
                            <div
                              style={{
                                width: '20px',
                                height: '20px',
                                backgroundColor: 'white',
                                borderRadius: '10px',
                                position: 'absolute',
                                top: '2px',
                                left: robot.status === 'active' ? '22px' : '2px',
                                transition: 'left 0.2s',
                              }}
                            />
                          </button>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: robot.status === 'active' ? '#10b981' : '#6b7280',
                          }}>
                            {robot.status === 'active' ? '已启用' : '已禁用'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#374151' }}>
                        {getCreateDate(robot.createdAt)}
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#374151' }}>
                        {robot.messageCount || 0}条
                      </td>
                      <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleTestRobot(robot.id)}
                            disabled={testingRobotId === robot.id || robot.status !== 'active'}
                            style={{
                              padding: '0.375rem 0.75rem',
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              cursor: testingRobotId === robot.id || robot.status !== 'active' ? 'not-allowed' : 'pointer',
                              transition: 'background-color 0.2s',
                              opacity: testingRobotId === robot.id || robot.status !== 'active' ? 0.5 : 1,
                              whiteSpace: 'nowrap',
                            }}
                            title="测试连接"
                          >
                            {testingRobotId === robot.id ? '测试中...' : '测试'}
                          </button>
                          <button
                            onClick={() => navigate(`/robots/${robot.id}/integrations`)}
                            style={{
                              padding: '0.375rem 0.75rem',
                              backgroundColor: '#a855f7',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s',
                              whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#9333ea')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#a855f7')}
                            title="管理集成"
                          >
                            🔗 集成
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(robot)}
                            style={{
                              padding: '0.375rem 0.75rem',
                              backgroundColor: '#e5e7eb',
                              color: '#374151',
                              border: 'none',
                              borderRadius: '0.25rem',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s',
                              whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#d1d5db')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#e5e7eb')}
                            title="编辑"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDeleteRobot(robot.id)}
                            style={{
                              padding: '0.375rem 0.75rem',
                              backgroundColor: '#f3f4f6',
                              color: '#ef4444',
                              border: 'none',
                              borderRadius: '0.25rem',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s',
                              whiteSpace: 'nowrap',
                            }}
                            title="删除"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

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
