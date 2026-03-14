import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal, CalendarDays, Clock3, ChevronDown } from 'lucide-react';
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
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterRole, setFilterRole] = useState<string[]>([]);
  const [filterStatusOpen, setFilterStatusOpen] = useState(false);
  const [filterRoleOpen, setFilterRoleOpen] = useState(false);
  const [userMenuPos, setUserMenuPos] = useState<{ top: number; left: number; user: UserRow } | null>(null);

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

  useEffect(() => { setUserPage(1); }, [filterStatus, filterRole]);

  useEffect(() => {
    const handler = () => {
      setFilterStatusOpen(false);
      setFilterRoleOpen(false);
      setUserMenuPos(null);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

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
  const filteredUsers = users.filter(u => {
    if (filterStatus.length > 0 && !filterStatus.includes(u.status)) return false;
    if (filterRole.length > 0 && !filterRole.includes(u.role)) return false;
    return true;
  });
  const userTotalPages = Math.max(1, Math.ceil(filteredUsers.length / usersPerPage));
  const paginatedUsers = filteredUsers.slice((userPage - 1) * usersPerPage, userPage * usersPerPage);

  // 样式
  const menuItemStyle = (key: string): React.CSSProperties => ({
    padding: '0.875rem 1.25rem',
    cursor: 'pointer',
    borderLeft: activeMenu === key ? '3px solid #1e40af' : '3px solid transparent',
    fontSize: '0.875rem',
    color: activeMenu === key ? '#0969da' : '#57606a',
    backgroundColor: 'transparent',
    fontWeight: activeMenu === key ? 600 : 400,
    borderBottom: '1px solid #f3f4f6',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'background-color 0.15s ease, color 0.15s ease',
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
            <div
              style={menuItemStyle('account-settings')}
              onClick={() => setActiveMenu('account-settings')}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#ddf4ff'; e.currentTarget.style.color = '#0969da'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = activeMenu === 'account-settings' ? '#0969da' : '#57606a'; }}
            >
              <SceneIcon name="key" size={16} title="账户信息" inheritColor />
              账户信息
            </div>
            {isAdmin && (
              <>
                <div style={{ padding: '0.75rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', borderBottom: '1px solid #f3f4f6', background: '#f9fafb' }}>
                  高级管理
                </div>
                <div
                  style={menuItemStyle('users')}
                  onClick={() => setActiveMenu('users')}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#ddf4ff'; e.currentTarget.style.color = '#0969da'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = activeMenu === 'users' ? '#0969da' : '#57606a'; }}
                >
                  <SceneIcon name="users" size={16} title="用户管理" inheritColor />
                  用户管理
                </div>
                <div
                  style={menuItemStyle('audit')}
                  onClick={() => setActiveMenu('audit')}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#ddf4ff'; e.currentTarget.style.color = '#0969da'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = activeMenu === 'audit' ? '#0969da' : '#57606a'; }}
                >
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
                      <div style={{ fontWeight: 500, color: '#1f2937', fontSize: '0.875rem', marginBottom: '0.25rem' }}>密码找回机器人配置</div>
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
                  {/* 表头栏 */}
                  <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1f2328' }}>所有用户</span>
                      <span style={{ fontSize: '0.8125rem', color: '#656d76' }}>共 {filteredUsers.length} 个</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {/* 新建用户 */}
                      <button onClick={openCreateUser} style={{ padding: '0.375rem 0.875rem', backgroundColor: '#1f883d', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500 }}>
                        新建用户
                      </button>
                      {/* 状态筛选 */}
                      <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => { setFilterStatusOpen(v => !v); setFilterRoleOpen(false); }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', fontSize: '0.8125rem', fontWeight: filterStatus.length > 0 ? 600 : 500, color: filterStatus.length > 0 ? '#0969da' : '#57606a', backgroundColor: filterStatus.length > 0 ? '#dbeafe' : '#f6f8fa', border: `1px solid ${filterStatus.length > 0 ? '#0969da' : '#d0d7de'}`, borderRadius: '0.375rem', cursor: 'pointer' }}
                        >
                          状态
                          {filterStatus.length > 0 && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#0969da', color: 'white', fontSize: '0.6rem', fontWeight: 700 }}>{filterStatus.length}</span>
                          )}
                          <ChevronDown size={13} />
                        </button>
                        {filterStatusOpen && (
                          <div style={{ position: 'absolute', top: 'calc(100% + 0.375rem)', right: 0, minWidth: '160px', backgroundColor: '#ffffff', border: '1px solid #d0d7de', borderRadius: '0.75rem', boxShadow: '0 16px 32px rgba(31, 35, 40, 0.15)', zIndex: 30, overflow: 'hidden', padding: '0.4rem' }}>
                            {[{ value: 'active', label: '启用' }, { value: 'inactive', label: '停用' }].map(opt => (
                              <button key={opt.value} type="button" onClick={() => setFilterStatus(prev => prev.includes(opt.value) ? prev.filter(x => x !== opt.value) : [...prev, opt.value])} style={{ width: '100%', textAlign: 'left', padding: '0.45rem 0.75rem', border: 'none', borderRadius: '0.5rem', backgroundColor: filterStatus.includes(opt.value) ? '#dbeafe' : 'transparent', color: filterStatus.includes(opt.value) ? '#0969da' : '#1f2328', cursor: 'pointer', fontSize: '0.875rem', fontWeight: filterStatus.includes(opt.value) ? 600 : 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ width: '14px', height: '14px', borderRadius: '0.25rem', border: `1px solid ${filterStatus.includes(opt.value) ? '#0969da' : '#d0d7de'}`, backgroundColor: filterStatus.includes(opt.value) ? '#0969da' : 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  {filterStatus.includes(opt.value) && <span style={{ color: 'white', fontSize: '0.6rem', lineHeight: 1 }}>✓</span>}
                                </span>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* 角色筛选 */}
                      <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => { setFilterRoleOpen(v => !v); setFilterStatusOpen(false); }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', fontSize: '0.8125rem', fontWeight: filterRole.length > 0 ? 600 : 500, color: filterRole.length > 0 ? '#0969da' : '#57606a', backgroundColor: filterRole.length > 0 ? '#dbeafe' : '#f6f8fa', border: `1px solid ${filterRole.length > 0 ? '#0969da' : '#d0d7de'}`, borderRadius: '0.375rem', cursor: 'pointer' }}
                        >
                          角色
                          {filterRole.length > 0 && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#0969da', color: 'white', fontSize: '0.6rem', fontWeight: 700 }}>{filterRole.length}</span>
                          )}
                          <ChevronDown size={13} />
                        </button>
                        {filterRoleOpen && (
                          <div style={{ position: 'absolute', top: 'calc(100% + 0.375rem)', right: 0, minWidth: '160px', backgroundColor: '#ffffff', border: '1px solid #d0d7de', borderRadius: '0.75rem', boxShadow: '0 16px 32px rgba(31, 35, 40, 0.15)', zIndex: 30, overflow: 'hidden', padding: '0.4rem' }}>
                            {[{ value: 'admin', label: '管理员' }, { value: 'user', label: '普通用户' }].map(opt => (
                              <button key={opt.value} type="button" onClick={() => setFilterRole(prev => prev.includes(opt.value) ? prev.filter(x => x !== opt.value) : [...prev, opt.value])} style={{ width: '100%', textAlign: 'left', padding: '0.45rem 0.75rem', border: 'none', borderRadius: '0.5rem', backgroundColor: filterRole.includes(opt.value) ? '#dbeafe' : 'transparent', color: filterRole.includes(opt.value) ? '#0969da' : '#1f2328', cursor: 'pointer', fontSize: '0.875rem', fontWeight: filterRole.includes(opt.value) ? 600 : 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ width: '14px', height: '14px', borderRadius: '0.25rem', border: `1px solid ${filterRole.includes(opt.value) ? '#0969da' : '#d0d7de'}`, backgroundColor: filterRole.includes(opt.value) ? '#0969da' : 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  {filterRole.includes(opt.value) && <span style={{ color: 'white', fontSize: '0.6rem', lineHeight: 1 }}>✓</span>}
                                </span>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {userLoading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>加载中...</div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: '700px' }}>
                        <colgroup>
                          <col style={{ width: '280px' }} />
                          <col />
                          <col style={{ width: '240px' }} />
                        </colgroup>
                        <tbody>
                          {paginatedUsers.length === 0 ? (
                            <tr>
                              <td colSpan={3} style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
                                {filteredUsers.length === 0 && users.length > 0 ? '无匹配结果，请调整筛选条件' : '暂无用户数据'}
                              </td>
                            </tr>
                          ) : paginatedUsers.map(u => (
                            <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              {/* 用户列：角色徽章 + 用户名 */}
                              <td style={{ padding: '0.875rem 1rem', paddingLeft: '1.5rem', verticalAlign: 'middle' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                  <span style={{ display: 'inline-flex', justifyContent: 'center', minWidth: '4.5rem', padding: '0.2rem 0.6rem', borderRadius: '0.375rem', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap', background: u.role === 'admin' ? '#fef3c7' : '#f3f4f6', color: u.role === 'admin' ? '#92400e' : '#374151', flexShrink: 0 }}>
                                    {u.role === 'admin' ? '管理员' : '普通用户'}
                                  </span>
                                  <div>
                                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1f2328' }}>{u.username}</div>
                                    {u.nickname && <div style={{ fontSize: '0.75rem', color: '#656d76' }}>{u.nickname}</div>}
                                  </div>
                                </div>
                              </td>
                              {/* 状态列 */}
                              <td style={{ padding: '0.875rem 0.75rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                <span style={{ display: 'inline-block', padding: '0.25rem 0.7rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, background: u.status === 'active' ? '#dcfce7' : '#f6f8fa', color: u.status === 'active' ? '#1a7f37' : '#57606a' }}>
                                  {u.status === 'active' ? '启用' : '停用'}
                                </span>
                              </td>
                              {/* 最后登录 + 操作 */}
                              <td style={{ padding: '0.875rem 1rem', paddingRight: '1.5rem', verticalAlign: 'middle', textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
                                  {u.lastLoginAt ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', textAlign: 'left' }}>
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#374151', fontSize: '0.8125rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                        <CalendarDays size={12} color="#57606a" />
                                        <span>{new Date(u.lastLoginAt).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                                      </span>
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#656d76', fontSize: '0.72rem' }}>
                                        <Clock3 size={12} color="#57606a" />
                                        <span>{new Date(u.lastLoginAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
                                      </span>
                                    </div>
                                  ) : (
                                    <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>从未登录</span>
                                  )}
                                  <span style={{ color: '#e5e7eb', fontSize: '1rem', flexShrink: 0 }}>|</span>
                                  <button
                                    type="button"
                                    onClick={e => {
                                      e.stopPropagation();
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setUserMenuPos(prev => prev?.user.id === u.id ? null : { top: rect.bottom + 6, left: rect.right - 132, user: u });
                                    }}
                                    style={{ width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: '0.5rem', backgroundColor: '#ffffff', color: '#57606a', cursor: 'pointer', flexShrink: 0 }}
                                  >
                                    <MoreHorizontal size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {userTotalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.125rem', margin: '1rem 0', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                          <button
                            onClick={() => setUserPage(p => Math.max(1, p - 1))}
                            disabled={userPage === 1}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.625rem', border: 'none', borderRadius: '0.375rem', backgroundColor: 'transparent', color: userPage === 1 ? '#8c959f' : '#0969da', cursor: userPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.8125rem', fontWeight: 500, opacity: userPage === 1 ? 0.7 : 1 }}
                            onMouseEnter={e => { if (userPage !== 1) e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <ChevronLeft size={15} />上一页
                          </button>
                          {Array.from({ length: userTotalPages }, (_, i) => i + 1).map(page => (
                            <button
                              key={page}
                              onClick={() => setUserPage(page)}
                              style={{ width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: userPage === page ? 'none' : '1px solid transparent', backgroundColor: userPage === page ? '#0969da' : 'transparent', color: userPage === page ? 'white' : '#1f2328', cursor: 'pointer', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: userPage === page ? 600 : 400 }}
                              onMouseEnter={e => { if (userPage !== page) e.currentTarget.style.border = '1px solid #d0d7de'; }}
                              onMouseLeave={e => { if (userPage !== page) e.currentTarget.style.border = '1px solid transparent'; }}
                            >
                              {page}
                            </button>
                          ))}
                          <button
                            onClick={() => setUserPage(p => Math.min(userTotalPages, p + 1))}
                            disabled={userPage === userTotalPages}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.625rem', border: 'none', borderRadius: '0.375rem', backgroundColor: 'transparent', color: userPage === userTotalPages ? '#8c959f' : '#0969da', cursor: userPage === userTotalPages ? 'not-allowed' : 'pointer', fontSize: '0.8125rem', fontWeight: 500, opacity: userPage === userTotalPages ? 0.7 : 1 }}
                            onMouseEnter={e => { if (userPage !== userTotalPages) e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            下一页<ChevronRight size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 审计日志 */}
            {activeMenu === 'audit' && isAdmin && (
              <div>

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

      {/* 用户行三点菜单 */}
      {userMenuPos && (() => {
        const menu = userMenuPos;
        return (
          <div
            style={{ position: 'fixed', top: menu.top, left: menu.left, minWidth: '132px', padding: '0.4rem', backgroundColor: '#ffffff', border: '1px solid #d0d7de', borderRadius: '0.75rem', boxShadow: '0 12px 28px rgba(31, 35, 40, 0.12)', zIndex: 9999 }}
            onClick={e => e.stopPropagation()}
          >
            <button type="button" onClick={() => { openEditUser(menu.user); setUserMenuPos(null); }} style={{ width: '100%', textAlign: 'left', padding: '0.45rem 0.75rem', border: 'none', borderRadius: '0.5rem', backgroundColor: 'transparent', color: '#1f2328', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f6f8fa'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>编辑</button>
            {menu.user.id !== currentUser?.id && (
              <>
                <button type="button" onClick={() => { handleToggleUserStatus(menu.user); setUserMenuPos(null); }} style={{ width: '100%', textAlign: 'left', padding: '0.45rem 0.75rem', border: 'none', borderRadius: '0.5rem', backgroundColor: 'transparent', color: '#1f2328', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f6f8fa'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>{menu.user.status === 'active' ? '停用' : '启用'}</button>
                <button type="button" onClick={() => { handleDeleteUser(menu.user); setUserMenuPos(null); }} style={{ width: '100%', textAlign: 'left', padding: '0.45rem 0.75rem', border: 'none', borderRadius: '0.5rem', backgroundColor: 'transparent', color: '#cf222e', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f6f8fa'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>删除</button>
              </>
            )}
          </div>
        );
      })()}

      {/* 用户操作模态框 */}
      {userModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 20px 25px rgba(0,0,0,0.15)', width: '100%', maxWidth: '480px' }}>
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

