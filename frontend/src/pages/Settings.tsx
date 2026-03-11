import React, { useState, useEffect } from 'react';
import authService from '../services/auth';

const Settings: React.FC = () => {
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [activeMenu, setActiveMenu] = useState('account');
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = '';

  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      const token = authService.getToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEmail(data.email || '');
        setNickname(data.nickname || '');
      }
    } catch (err) {
      console.error('Failed to load user settings:', err);
    }
  };

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSaveAccount = async () => {
    try {
      setLoading(true);
      const token = authService.getToken();

      const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          nickname,
        }),
      });

      if (response.ok) {
        showMessage('✅ 账户信息已保存');
      } else {
        showMessage('❌ 保存失败，请重试');
      }
    } catch (err) {
      console.error('Failed to save account:', err);
      showMessage('❌ 网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showMessage('❌ 请填写所有密码字段');
      return;
    }
    if (newPassword !== confirmPassword) {
      showMessage('❌ 新密码与确认密码不一致');
      return;
    }
    if (newPassword.length < 6) {
      showMessage('❌ 新密码至少需要6个字符');
      return;
    }

    try {
      setLoading(true);
      const token = authService.getToken();

      const response = await fetch(`${API_BASE_URL}/api/users/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (response.ok) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showMessage('✅ 密码已更改');
      } else {
        const data = await response.json();
        showMessage(`❌ ${data.error || '密码更改失败'}`);
      }
    } catch (err) {
      console.error('Failed to change password:', err);
      showMessage('❌ 网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleSystemRestore = async () => {
    if (!confirm('确定要进行系统还原吗？此操作将清空所有数据并重置系统，不可撤销。')) {
      return;
    }

    if (!confirm('最后确认：是否继续进行系统还原？')) {
      return;
    }

    try {
      setLoading(true);
      const token = authService.getToken();

      const response = await fetch(`${API_BASE_URL}/api/system/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        showMessage('✅ 系统已还原，请重新登录');
        setTimeout(() => {
          authService.logout();
          window.location.href = '/login';
        }, 2000);
      } else {
        showMessage('❌ 系统还原失败');
      }
    } catch (err) {
      console.error('Failed to restore system:', err);
      showMessage('❌ 网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', paddingBottom: '2rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '2rem', color: '#1f2937' }}>
          设置
        </h1>

        {message && (
          <div style={{
            backgroundColor: message.startsWith('✅') ? '#d1fae5' : '#fee2e2',
            color: message.startsWith('✅') ? '#047857' : '#dc2626',
            padding: '1rem',
            borderRadius: '0.5rem',
            marginBottom: '2rem',
          }}>
            {message}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '2rem' }}>
          {/* 设置菜单 */}
          <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', overflow: 'hidden', height: 'fit-content' }}>
            {['account', 'danger'].map((menu) => (
              <div
                key={menu}
                onClick={() => setActiveMenu(menu)}
                style={{
                  padding: '0.875rem 1rem',
                  borderLeft: activeMenu === menu ? '3px solid #1e40af' : '3px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: activeMenu === menu ? '#dbeafe' : 'white',
                  color: activeMenu === menu ? '#1e40af' : '#6b7280',
                  fontWeight: activeMenu === menu ? 500 : 400,
                  fontSize: '0.875rem',
                  borderBottomWidth: '1px',
                  borderBottomColor: '#e5e7eb',
                }}
              >
                {menu === 'account' && '🔐 账户信息'}
                {menu === 'danger' && '⚠️ 系统还原'}
              </div>
            ))}
          </div>

          {/* 设置内容 */}
          <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
            {/* 账户信息 */}
            {activeMenu === 'account' && (
              <div>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: '#1f2937' }}>🔐 账户信息</h2>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>管理你的账户和个人信息</p>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontWeight: 500, fontSize: '0.875rem', color: '#1f2937', marginBottom: '0.5rem' }}>用户名</label>
                    <input type="text" value={authService.getCurrentUser()?.username || ''} readOnly style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', backgroundColor: '#f3f4f6', cursor: 'not-allowed' }} />
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontWeight: 500, fontSize: '0.875rem', color: '#1f2937', marginBottom: '0.5rem' }}>邮箱地址</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }} />
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontWeight: 500, fontSize: '0.875rem', color: '#1f2937', marginBottom: '0.5rem' }}>昵称</label>
                    <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="输入昵称" style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }} />
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
                    <button onClick={handleSaveAccount} disabled={loading} style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', fontSize: '0.875rem', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 500, opacity: loading ? 0.6 : 1 }}>保存更改</button>
                    <button style={{ padding: '0.5rem 1rem', backgroundColor: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '0.375rem', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 500 }}>取消</button>
                  </div>
                </div>

                <div style={{ padding: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: '#1f2937' }}>更改密码</h2>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>定期更改密码以保护账户安全</p>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontWeight: 500, fontSize: '0.875rem', color: '#1f2937', marginBottom: '0.5rem' }}>当前密码</label>
                    <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="输入当前密码" style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }} />
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontWeight: 500, fontSize: '0.875rem', color: '#1f2937', marginBottom: '0.5rem' }}>新密码</label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="输入新密码" style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }} />
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontWeight: 500, fontSize: '0.875rem', color: '#1f2937', marginBottom: '0.5rem' }}>确认新密码</label>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="再次输入新密码" style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }} />
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={handleChangePassword} disabled={loading} style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', fontSize: '0.875rem', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 500, opacity: loading ? 0.6 : 1 }}>更改密码</button>
                  </div>
                </div>
              </div>
            )}

            {/* 系统还原 */}
            {activeMenu === 'danger' && (
              <div style={{ padding: '1.5rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.375rem' }}>
                <h3 style={{ color: '#dc2626', fontWeight: 600, marginBottom: '0.5rem' }}>⚠️ 系统还原</h3>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>将系统恢复到初始状态，清空所有数据，此操作不可逆转</p>

                <div style={{
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fca5a5',
                  padding: '0.75rem',
                  borderRadius: '0.375rem',
                  marginBottom: '1rem',
                  fontSize: '0.75rem',
                  color: '#dc2626',
                }}>
                  ⚠️ 警告：系统还原将永久删除所有用户、机器人、通知记录和配置数据！
                </div>

                <div>
                  <button
                    onClick={handleSystemRestore}
                    disabled={loading}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#fee2e2',
                      color: '#ef4444',
                      border: '1px solid #fca5a5',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontWeight: 500,
                      opacity: loading ? 0.6 : 1,
                    }}
                  >
                    🔄 系统还原
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
