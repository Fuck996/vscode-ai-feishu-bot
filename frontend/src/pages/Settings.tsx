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
  const [mcpConfig, setMcpConfig] = useState<{ triggerToken: string; projectName: string } | null>(null);
  const [mcpCopied, setMcpCopied] = useState(false);

  const API_BASE_URL = '';

  useEffect(() => {
    loadUserSettings();
  }, []);

  useEffect(() => {
    if (activeMenu === 'mcp' && !mcpConfig) {
      fetch('/api/mcp/config')
        .then(r => r.json())
        .then(data => { if (data.success) setMcpConfig(data.data); })
        .catch(() => {});
    }
  }, [activeMenu]);

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
            {['account', 'mcp', 'danger'].map((menu) => (
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
                {menu === 'mcp' && '🤖 MCP 配置'}
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

            {/* MCP 远端配置 */}
            {activeMenu === 'mcp' && (() => {
              const mcpUrl = `${window.location.origin}/api/mcp/sse`;
              const token = mcpConfig?.triggerToken || '';
              const mcpJson = JSON.stringify({
                servers: {
                  'feishu-notifier': {
                    type: 'sse',
                    url: `${mcpUrl}?token=${token}`,
                  }
                }
              }, null, 2);

              const copyMcpJson = () => {
                navigator.clipboard.writeText(mcpJson).then(() => {
                  setMcpCopied(true);
                  setTimeout(() => setMcpCopied(false), 2000);
                });
              };

              return (
                <div style={{ padding: '1.5rem' }}>
                  <h3 style={{ color: '#1e40af', fontWeight: 600, marginBottom: '0.5rem' }}>🤖 MCP 远端配置</h3>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>
                    将系统部署到远端后，VS Code 通过以下配置连接此 MCP 服务。无需暴露后端端口。
                  </p>

                  {!mcpConfig ? (
                    <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '0.375rem', fontSize: '0.875rem', color: '#92400e' }}>
                      ⚠️ 未找到活跃的集成。请先到「机器人管理」→「🔗 集成」创建一个集成，才能使用 MCP 远端功能。
                    </div>
                  ) : (
                    <>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>
                          MCP 端点 URL（通过前端访问，无需后端端口）
                        </label>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: '#f3f4f6', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', color: '#374151', wordBreak: 'break-all' }}>
                          {mcpUrl}
                        </div>
                      </div>

                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>
                          认证 Token（集成的 webhookSecret，不同项目各不相同）
                        </label>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: '#f3f4f6', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', color: '#374151', wordBreak: 'break-all' }}>
                          {token}
                        </div>
                        <p style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                          当前为项目「{mcpConfig.projectName}」的 Token。其他集成的 Token 可在「机器人 → 集成」中查看。
                        </p>
                      </div>

                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#374151' }}>
                            复制到你的项目 <code style={{ background: '#e5e7eb', padding: '0 3px', borderRadius: '3px' }}>.vscode/mcp.json</code>
                          </label>
                          <button
                            onClick={copyMcpJson}
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', background: mcpCopied ? '#d1fae5' : '#1e40af', color: mcpCopied ? '#047857' : 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}
                          >
                            {mcpCopied ? '✅ 已复制' : '📋 复制'}
                          </button>
                        </div>
                        <pre style={{ fontFamily: 'monospace', fontSize: '0.75rem', background: '#1e293b', color: '#e2e8f0', padding: '1rem', borderRadius: '0.375rem', overflow: 'auto', margin: 0 }}>
                          {mcpJson}
                        </pre>
                      </div>

                      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.375rem', padding: '0.75rem', fontSize: '0.8rem', color: '#1e40af' }}>
                        <strong>使用说明：</strong> 将上方配置粘贴到你的 <strong>其他项目</strong>（如 my-app）的 <code>.vscode/mcp.json</code> 中，Copilot Agent 完成任务后将自动向飞书发送通知。
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

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
