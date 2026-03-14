import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/auth';
import { useToast } from '../hooks/useToast';
import SceneIcon from '../components/SceneIcon';

/* ─ 类型定义 ─ */
interface UserRow {
  id: string;
  username: string;
  nickname?: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
  lastLoginAt?: string;
  notificationCount: number;
}

interface AuditLogRow {
  id: string;
  userId: string;
  username: string;
  action: string;
  description: string;
  resourceType: string;
  resourceId?: string;
  status: string;
  createdAt: string;
}

interface Robot {
  id: string;
  name: string;
  status: string;
}

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';
  const toast = useToast();

  const [activeMenu, setActiveMenu] = useState<'account-settings' | 'users' | 'audit'>('account-settings');

  // 个人设置
  const [nickname, setNickname] = useState('');
  const [recoveryRobotId, setRecoveryRobotId] = useState('');
  const [myRobots, setMyRobots] = useState<Robot[]>([]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 用户管理
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [userModal, setUserModal] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [newNickname, setNewNickname] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const [userPage, setUserPage] = useState(1);
  const usersPerPage = 10;

  // 审计日志
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [filterAuditType, setFilterAuditType] = useState('');
  const logsPerPage = 10;

  const showMsg = (_m: string) => {}; // 已替换为 toast，保留占位定义以兼容

  useEffect(() => {
    loadMyProfile();
    loadMyRobots();
  }, []);

  useEffect(() => {
    if (activeMenu === 'users' && isAdmin) loadUsers();
    if (activeMenu === 'audit' && isAdmin) loadAuditLogs();
  }, [activeMenu]);

  const loadMyProfile = async () => {
    const res = await authService.fetchWithAuth('/api/users/me');
    if (res.ok) {
      const data = await res.json();
      setNickname(data.nickname || '');
      setRecoveryRobotId(data.recoveryRobotId || '');
    }
  };

  const loadMyRobots = async () => {
    const res = await authService.fetchWithAuth('/api/robots');
    if (res.ok) {
      const data = await res.json();
      setMyRobots(data.data || (Array.isArray(data) ? data : []));
    }
  };

  const loadUsers = async () => {
    setUserLoading(true);
    const res = await authService.fetchWithAuth('/api/users');
    if (res.ok) {
      const data = await res.json();
      setUsers(data.data || []);
    }
    setUserLoading(false);
  };

  const loadAuditLogs = async () => {
    setAuditLoading(true);
    const res = await authService.fetchWithAuth('/api/audit');
    if (res.ok) {
      const data = await res.json();
      setAuditLogs(data.data || []);
    }
    setAuditLoading(false);
  };

  // 个人信息
  const handleSaveProfile = async () => {
    const res = await authService.fetchWithAuth('/api/users/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname }),
    });
    if (res.ok) toast.success('信息已保存');
    else toast.error('保存失败');
  };

  const handleSaveRecoveryRobot = async () => {
    const res = await authService.fetchWithAuth('/api/users/recovery-robot', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recoveryRobotId }),
    });
    if (res.ok) toast.success('找回机器人已更新');
    else toast.error('更新失败');
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) { toast.error('请填写所有密码字段'); return; }
    if (newPassword !== confirmPassword) { toast.error('新密码与确认密码不一致'); return; }
    if (newPassword.length < 6) { toast.error('新密码至少需要6个字符'); return; }
    const res = await authService.fetchWithAuth('/api/users/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (res.ok) {
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      toast.success('密码已更改');
    } else {
      const data = await res.json();
      toast.error(data.error || '密码更改失败');
    }
  };

  // 用户管理
  const openCreateUser = () => {
    setEditUserId(null);
    setNewUsername(''); setNewNickname(''); setNewUserPassword(''); setNewUserRole('user');
    setUserModal(true);
  };

  const openEditUser = (u: UserRow) => {
    setEditUserId(u.id);
    setNewUsername(u.username);
    setNewNickname(u.nickname || '');
    setNewUserPassword('');
    setNewUserRole(u.role);
    setUserModal(true);
  };

  const handleUserSubmit = async () => {
    if (!editUserId) {
      if (!newUsername || !newUserPassword) { toast.error('用户名和密码为必填'); return; }
      const res = await authService.fetchWithAuth('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, password: newUserPassword, role: newUserRole, nickname: newNickname }),
      });
      if (res.ok) { setUserModal(false); loadUsers(); toast.success('用户已创建'); }
      else { const d = await res.json(); toast.error(d.error || '创建失败'); }
    } else {
      const res = await authService.fetchWithAuth('/api/users/' + editUserId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: newNickname, role: newUserRole }),
      });
      if (res.ok) { setUserModal(false); loadUsers(); toast.success('用户已更新'); }
      else { const d = await res.json(); toast.error(d.error || '更新失败'); }
    }
  };

  const handleToggleUserStatus = async (u: UserRow) => {
    const newStatus = u.status === 'active' ? 'inactive' : 'active';
    const res = await authService.fetchWithAuth('/api/users/' + u.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) loadUsers();
    else toast.error('状态更新失败');
  };

  const handleDeleteUser = async (u: UserRow) => {
    if (!confirm('\u786e\u5b9a\u8981\u5220\u9664\u7528\u6237\u300c' + u.username + '\u300d\u5417\uff1f\u6b64\u64cd\u4f5c\u4e0d\u53ef\u6491\u9500\u3002')) return;
    const res = await authService.fetchWithAuth('/api/users/' + u.id, { method: 'DELETE' });
    if (res.ok) { loadUsers(); toast.success('用户已删除'); }
    else toast.error('删除失败');
  };

  // 审计日志辅助
  const getActionLabel = (action: string): string => {
    const map: Record<string, string> = {
      create: '\u521b\u5efa', update: '\u66f4\u65b0', delete: '\u5220\u9664',
      login: '\u767b\u5f55', logout: '\u767b\u51fa',
      change_password: '\u4fee\u6539\u5bc6\u7801', reset_password: '\u91cd\u7f6e\u5bc6\u7801',
      start: '\u542f\u52a8', stop: '\u5173\u95ed',
    };
    return map[action] || action;
  };

  const getActionColor = (action: string): string => {
    const map: Record<string, string> = {
      create: '#10b981', delete: '#ef4444', update: '#f59e0b',
      login: '#3b82f6', change_password: '#f59e0b', reset_password: '#f59e0b',
      start: '#10b981', stop: '#ef4444',
    };
    return map[action] || '#6b7280';
  };

  const getResourceTypeLabel = (type: string): string => {
    const map: Record<string, string> = {
      user: '用户', robot: '机器人', integration: '集成',
      service: '服务', notification: '通知', system: '系统',
    };
    return map[type] || type;
  };

  const getActionIconName = (action: string) => {
    const m: Record<string, 'add' | 'error' | 'key' | 'settings' | 'robot' | 'service' | 'audit'> = {
      create: 'add', delete: 'error', login: 'key', logout: 'key',
      change_password: 'key', reset_password: 'key', update: 'settings',
      start: 'robot', stop: 'service',
    };
    return m[action] || 'audit';
  };

  const getResourceIconName = (type: string) => {
    const m: Record<string, 'user' | 'robot' | 'integration' | 'service' | 'notification' | 'settings'> = {
      user: 'user', robot: 'robot', integration: 'integration',
      service: 'service', notification: 'notification', system: 'settings',
    };
    return m[type] || 'settings';
  };

  const filteredLogs = filterAuditType ? auditLogs.filter(l => l.resourceType === filterAuditType) : auditLogs;
  const auditTotalPages = Math.max(1, Math.ceil(filteredLogs.length / logsPerPage));
  const paginatedLogs = filteredLogs.slice((auditPage - 1) * logsPerPage, auditPage * logsPerPage);
  const paginatedUsers = users.slice((userPage - 1) * usersPerPage, userPage * usersPerPage);
  const userTotalPages = Math.max(1, Math.ceil(users.length / usersPerPage));

  // 样式
  const menuItemStyle = (key: string): React.CSSProperties => ({
    padding: '0.875rem 1.25rem',
    cursor: 'pointer',
    borderLeft: activeMenu === key ? '3px solid #1e40af' : '3px solid transparent',
    fontSize: '0.875rem',
    color: activeMenu === key ? '#1e40af' : '#6b7280',
    backgroundColor: activeMenu === key ? '#dbeafe' : 'transparent',
    fontWeight: activeMenu === key ? 500 : 400,
    borderBottom: '1px solid #f3f4f6',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  });

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.5rem 0.75rem',
    border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem',
  };

  const btnPrimary: React.CSSProperties = {
    padding: '0.5rem 1.25rem', background: '#3b82f6', color: 'white',
    border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
  };

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', paddingBottom: '2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>

        {/* msg 已替换为 toast 通知，此处暫时保留占位元素 */}

        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.5rem' }}>

          {/* 左侧菜单 */}
          <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', height: 'fit-content' }}>
            <div style={{ padding: '0.75rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', borderBottom: '1px solid #f3f4f6', background: '#f9fafb' }}>
              个人设置
            </div>
            <div style={menuItemStyle('account-settings')} onClick={() => setActiveMenu('account-settings')}>
              <SceneIcon name="key" size={16} title="账户信息" inheritColor />
              账户信息
            </div>
            {isAdmin && (
              <>
                <div style={{ padding: '0.75rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', borderBottom: '1px solid #f3f4f6', background: '#f9fafb' }}>
                  高级管理
                </div>
                <div style={menuItemStyle('users')} onClick={() => setActiveMenu('users')}>
                  <SceneIcon name="users" size={16} title="用户管理" inheritColor />
                  用户管理
                </div>
                <div style={menuItemStyle('audit')} onClick={() => setActiveMenu('audit')}>
                  <SceneIcon name="audit" size={16} title="审计日志" inheritColor />
                  审计日志
                </div>
              </>
            )}
          </div>

          {/* 右侧内容 */}
          <div>

            {/* 账户信息 */}
            {activeMenu === 'account-settings' && (
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.25rem' }}>账户信息</h1>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>管理个人账户、安全设置与密码恢复</p>

                {/* 个人信息卡片 */}
                <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>个人信息</span>
                  </div>
                  <div style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#1f2937', marginBottom: '0.4rem' }}>用户名</label>
                        <input value={currentUser?.username || ''} readOnly style={{ ...inputStyle, backgroundColor: '#f3f4f6', cursor: 'not-allowed', color: '#6b7280' }} />
                        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>用户名不可修改</p>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#1f2937', marginBottom: '0.4rem' }}>昵称</label>
                        <input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="例如：系统管理员" style={inputStyle} />
                      </div>
                    </div>
                    <div style={{ marginBottom: '1.25rem' }}>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#1f2937', marginBottom: '0.4rem' }}>账户角色</label>
                      <div style={{ padding: '0.5rem 0.75rem', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '0.375rem', color: '#6b7280', fontSize: '0.875rem' }}>
                        {currentUser?.role === 'admin' ? '管理员' : '普通用户'}
                      </div>
                    </div>
                    <button onClick={handleSaveProfile} style={btnPrimary}>保存信息</button>
                  </div>
                </div>

                {/* 安全设置卡片 */}
                <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>安全与隐私</span>
                  </div>
                  <div style={{ padding: '1.5rem' }}>
                    <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                      <div style={{ fontWeight: 500, color: '#1f2937', fontSize: '0.875rem', marginBottom: '1rem' }}>修改密码</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b7280', fontWeight: 600, marginBottom: '0.3rem' }}>当前密码</label>
                          <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="当前密码" style={inputStyle} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b7280', fontWeight: 600, marginBottom: '0.3rem' }}>新密码</label>
                          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="新密码" style={inputStyle} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b7280', fontWeight: 600, marginBottom: '0.3rem' }}>确认新密码</label>
                          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="确认新密码" style={inputStyle} />
                        </div>
                      </div>
                      <button onClick={handleChangePassword} style={btnPrimary}>修改密码</button>
                    </div>

                    {/* 密码找回机器人 */}
                    <div>
                      <div style={{ fontWeight: 500, color: '#1f2937', fontSize: '0.875rem', marginBottom: '0.25rem' }}>🔔 密码找回机器人配置</div>
                      <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.875rem' }}>当忘记密码时，系统将通过此机器人向您发送重置验证码</p>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b7280', fontWeight: 600, marginBottom: '0.3rem' }}>选择密码找回机器人</label>
                        <select value={recoveryRobotId} onChange={e => setRecoveryRobotId(e.target.value)} style={inputStyle}>
                          <option value="">-- 请选择机器人 --</option>
                          {myRobots.filter(r => r.status === 'active').map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '0.375rem', padding: '0.75rem', fontSize: '0.8rem', color: '#92400e', marginBottom: '0.875rem' }}>
                        ⚠️ 密码找回验证码将通过机器人私聊方式发送到您的飞书账户。
                      </div>
                      <button onClick={handleSaveRecoveryRobot} style={btnPrimary}>保存配置</button>
                    </div>
                  </div>
                </div>

                {/* 退出登录卡片 */}
                <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>退出登录</span>
                  </div>
                  <div style={{ padding: '1.5rem' }}>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>退出后将返回登录页面，需重新输入密码才能访问系统。</p>
                    <button
                      onClick={() => { authService.logout(); navigate('/login'); }}
                      style={{ padding: '0.5rem 1.25rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
                    >
                      退出登录
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* 用户管理 */}
            {activeMenu === 'users' && isAdmin && (
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.25rem' }}>用户管理</h1>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>管理系统账户、角色与访问权限</p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                  {[
                    { label: '总用户数', value: users.length, sub: '已注册账户', color: '#1f2937' },
                    { label: '管理员', value: users.filter(u => u.role === 'admin').length, sub: '拥有所有权限', color: '#f59e0b' },
                    { label: '活跃用户', value: users.filter(u => u.status === 'active').length, sub: '当前启用账户', color: '#10b981' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1rem 1.25rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>{s.label}</div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>{s.sub}</div>
                    </div>
                  ))}
                </div>

                <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                  <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>所有用户</span>
                    <button onClick={openCreateUser} style={{ padding: '0.375rem 1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
                      新建用户
                    </button>
                  </div>

                  {userLoading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>加载中...</div>
                  ) : (
                    <div>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f9fafb' }}>
                          <tr>
                            {['用户名', '角色', '通知数', '状态', '最后登录', '操作'].map(h => (
                              <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedUsers.map(u => (
                            <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '0.875rem 1rem' }}>
                                <div style={{ fontWeight: 500, fontSize: '0.875rem', color: '#1f2937' }}>{u.username}</div>
                                {u.nickname && <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{u.nickname}</div>}
                              </td>
                              <td style={{ padding: '0.875rem 1rem' }}>
                                <span style={{ padding: '0.2rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, background: u.role === 'admin' ? '#fef3c7' : '#dbeafe', color: u.role === 'admin' ? '#92400e' : '#1e40af' }}>
                                  {u.role === 'admin' ? '管理员' : '普通用户'}
                                </span>
                              </td>
                              <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: u.notificationCount > 0 ? '#3b82f6' : '#9ca3af' }}>
                                {u.notificationCount}
                              </td>
                              <td style={{ padding: '0.875rem 1rem' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600, color: u.status === 'active' ? '#10b981' : '#9ca3af' }}>
                                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: u.status === 'active' ? '#10b981' : '#9ca3af', display: 'inline-block' }} />
                                  {u.status === 'active' ? '启用' : '停用'}
                                </span>
                              </td>
                              <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                                {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '从未登录'}
                              </td>
                              <td style={{ padding: '0.875rem 1rem' }}>
                                <div style={{ display: 'flex', gap: '0.375rem' }}>
                                  <button onClick={() => openEditUser(u)} style={{ padding: '0.25rem 0.75rem', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}>编辑</button>
                                  {u.id !== currentUser?.id && (
                                    <>
                                      <button onClick={() => handleToggleUserStatus(u)} style={{ padding: '0.25rem 0.75rem', background: u.status === 'active' ? '#fef3c7' : '#d1fae5', color: u.status === 'active' ? '#92400e' : '#065f46', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}>
                                        {u.status === 'active' ? '停用' : '启用'}
                                      </button>
                                      <button onClick={() => handleDeleteUser(u)} style={{ padding: '0.25rem 0.75rem', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}>删除</button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderTop: '1px solid #e5e7eb' }}>
                        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>第 {userPage} / {userTotalPages} 页</span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => setUserPage(Math.max(1, userPage - 1))} disabled={userPage === 1} style={{ padding: '0.375rem', background: userPage === 1 ? '#e5e7eb' : '#3b82f6', color: userPage === 1 ? '#9ca3af' : 'white', border: 'none', borderRadius: '0.375rem', cursor: userPage === 1 ? 'not-allowed' : 'pointer' }}><ChevronLeft size={16} /></button>
                          <button onClick={() => setUserPage(Math.min(userTotalPages, userPage + 1))} disabled={userPage === userTotalPages} style={{ padding: '0.375rem', background: userPage === userTotalPages ? '#e5e7eb' : '#3b82f6', color: userPage === userTotalPages ? '#9ca3af' : 'white', border: 'none', borderRadius: '0.375rem', cursor: userPage === userTotalPages ? 'not-allowed' : 'pointer' }}><ChevronRight size={16} /></button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 审计日志 */}
            {activeMenu === 'audit' && isAdmin && (
              <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.25rem' }}>审计日志</h1>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>系统操作记录，追踪所有关键变更</p>

                <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                  <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>操作记录</span>
                    <select value={filterAuditType} onChange={e => { setFilterAuditType(e.target.value); setAuditPage(1); }} style={{ padding: '0.4rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', background: 'white' }}>
                      <option value="">所有类型</option>
                      <option value="user">用户操作</option>
                      <option value="robot">机器人操作</option>
                      <option value="integration">集成操作</option>
                      <option value="service">服务操作</option>
                    </select>
                  </div>

                  {auditLoading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>加载中...</div>
                  ) : filteredLogs.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>暂无审计日志</div>
                  ) : (
                    <div style={{ padding: '0.5rem 1.5rem' }}>
                      {paginatedLogs.map((log, idx) => (
                        <div key={log.id + '-' + idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '0.875rem 0', borderBottom: '1px solid #f3f4f6' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: getActionColor(log.action) + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: getActionColor(log.action) }}>
                            <SceneIcon name={getActionIconName(log.action)} size={16} inheritColor />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1f2937' }}>
                              <span style={{ padding: '0.15rem 0.5rem', borderRadius: '0.25rem', background: getActionColor(log.action) + '20', color: getActionColor(log.action), fontWeight: 600, fontSize: '0.8rem', marginRight: '0.5rem' }}>
                                {getActionLabel(log.action)}
                              </span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', verticalAlign: 'middle' }}>
                                <SceneIcon name={getResourceIconName(log.resourceType)} size={13} />
                                {getResourceTypeLabel(log.resourceType)}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.125rem' }}>{log.description}</div>
                            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>用户：{log.username}</div>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                            {new Date(log.createdAt).toLocaleString('zh-CN')}
                          </div>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0' }}>
                        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>第 {auditPage} / {auditTotalPages} 页，共 {filteredLogs.length} 条</span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => setAuditPage(Math.max(1, auditPage - 1))} disabled={auditPage === 1} style={{ padding: '0.375rem', background: auditPage === 1 ? '#e5e7eb' : '#3b82f6', color: auditPage === 1 ? '#9ca3af' : 'white', border: 'none', borderRadius: '0.375rem', cursor: auditPage === 1 ? 'not-allowed' : 'pointer' }}><ChevronLeft size={16} /></button>
                          <button onClick={() => setAuditPage(Math.min(auditTotalPages, auditPage + 1))} disabled={auditPage === auditTotalPages} style={{ padding: '0.375rem', background: auditPage === auditTotalPages ? '#e5e7eb' : '#3b82f6', color: auditPage === auditTotalPages ? '#9ca3af' : 'white', border: 'none', borderRadius: '0.375rem', cursor: auditPage === auditTotalPages ? 'not-allowed' : 'pointer' }}><ChevronRight size={16} /></button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 用户操作模态框 */}
      {userModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setUserModal(false)}>
          <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 20px 25px rgba(0,0,0,0.15)', width: '100%', maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>{editUserId ? '编辑用户' : '新建用户'}</h2>
              <button onClick={() => setUserModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#6b7280' }}>✕</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#1f2937', marginBottom: '0.4rem' }}>用户名 {!editUserId && <span style={{ color: '#ef4444' }}>*</span>}</label>
                  <input value={newUsername} onChange={e => setNewUsername(e.target.value)} disabled={!!editUserId} placeholder="例如：zhangsan" style={{ ...inputStyle, background: editUserId ? '#f3f4f6' : undefined, cursor: editUserId ? 'not-allowed' : undefined, color: editUserId ? '#9ca3af' : undefined }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#1f2937', marginBottom: '0.4rem' }}>昵称</label>
                  <input value={newNickname} onChange={e => setNewNickname(e.target.value)} placeholder="例如：张三" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                {!editUserId && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#1f2937', marginBottom: '0.4rem' }}>初始密码 <span style={{ color: '#ef4444' }}>*</span></label>
                    <input type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} placeholder="至少6位" style={inputStyle} />
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#1f2937', marginBottom: '0.4rem' }}>角色 <span style={{ color: '#ef4444' }}>*</span></label>
                  <select value={newUserRole} onChange={e => setNewUserRole(e.target.value as 'admin' | 'user')} style={inputStyle}>
                    <option value="user">普通用户</option>
                    <option value="admin">管理员</option>
                  </select>
                </div>
              </div>
              {!editUserId && (
                <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '0.375rem', padding: '0.75rem', fontSize: '0.8rem', color: '#92400e' }}>
                  ⚠️ 新用户首次登录时将被强制要求修改密码
                </div>
              )}
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setUserModal(false)} style={{ padding: '0.5rem 1.25rem', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>取消</button>
              <button onClick={handleUserSubmit} style={btnPrimary}>{editUserId ? '保存' : '创建用户'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

