import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SceneIcon from '../components/SceneIcon';
import '../styles/auth.css';

// 密码找回 - 3步流程：输入用户名 → 输入验证码 → 设置新密码
export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) { setError('请输入用户名'); return; }
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || '验证码已发送到您配置的飞书机器人');
        setStep(2);
      } else {
        setError(data.error || '发送失败，请检查用户名是否正确');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) { setError('请输入验证码'); return; }
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, code }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg('验证码正确，请设置新密码');
        setStep(3);
      } else {
        setError(data.error || '验证码错误或已过期');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) { setError('请输入新密码'); return; }
    if (newPassword.length < 6) { setError('新密码至少需要6个字符'); return; }
    if (newPassword !== confirmPassword) { setError('两次输入的密码不一致'); return; }
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, code, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg('密码重置成功！正在跳转到登录页...');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(data.error || '密码重置失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const stepLabels = ['输入用户名', '输入验证码', '设置新密码'];

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '420px' }}>
        <div className="auth-header">
          <div className="auth-header-visual">
            <SceneIcon name="key" size={72} title="密码找回" />
          </div>
          <h1>密码找回</h1>
          <p>{stepLabels[step - 1]}</p>
        </div>

        {/* 步骤指示器 */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[1, 2, 3].map(s => (
            <React.Fragment key={s}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 700,
                background: s < step ? '#10b981' : s === step ? '#3b82f6' : '#e5e7eb',
                color: s <= step ? 'white' : '#9ca3af',
              }}>
                {s < step ? '✓' : s}
              </div>
              {s < 3 && <div style={{ width: 32, height: 2, alignSelf: 'center', background: s < step ? '#10b981' : '#e5e7eb' }} />}
            </React.Fragment>
          ))}
        </div>

        {error && <div className="error-message">{error}</div>}
        {successMsg && <div style={{ background: '#d1fae5', color: '#047857', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.875rem' }}>{successMsg}</div>}

        {/* 步骤1：输入用户名 */}
        {step === 1 && (
          <form onSubmit={handleStep1} className="auth-form">
            <div className="form-group">
              <label htmlFor="username">用户名 <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                id="username"
                type="text"
                placeholder="输入您的用户名"
                value={username}
                onChange={e => setUsername(e.target.value)}
                disabled={isLoading}
                autoComplete="username"
                required
              />
            </div>
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.375rem', padding: '0.75rem', fontSize: '0.8rem', color: '#1e40af', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <SceneIcon name="info" size={22} title="提示" />
              <span>系统将通过您账户配置的飞书机器人发送6位验证码</span>
            </div>
            <button type="submit" className="submit-button" disabled={isLoading}>
              {isLoading ? '发送中...' : '发送验证码'}
            </button>
          </form>
        )}

        {/* 步骤2：输入验证码 */}
        {step === 2 && (
          <form onSubmit={handleStep2} className="auth-form">
            <div className="form-group">
              <label>用户名</label>
              <input value={username} readOnly style={{ background: '#f3f4f6', cursor: 'not-allowed', color: '#6b7280' }} />
            </div>
            <div className="form-group">
              <label htmlFor="code">验证码 <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                id="code"
                type="text"
                placeholder="输入6位验证码"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={isLoading}
                maxLength={6}
                style={{ letterSpacing: '0.25rem', fontSize: '1.25rem', textAlign: 'center' }}
                required
              />
            </div>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '1rem' }}>验证码有效期为10分钟。请检查飞书消息获取验证码。</p>
            <button type="submit" className="submit-button" disabled={isLoading || code.length < 6}>
              {isLoading ? '验证中...' : '验证代码'}
            </button>
            <button type="button" onClick={() => { setStep(1); setCode(''); setSuccessMsg(''); }} style={{ display: 'block', width: '100%', marginTop: '0.75rem', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.875rem', textDecoration: 'underline' }}>
              重新发送
            </button>
          </form>
        )}

        {/* 步骤3：设置新密码 */}
        {step === 3 && (
          <form onSubmit={handleStep3} className="auth-form">
            <div className="form-group">
              <label htmlFor="newPassword">新密码 <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                id="newPassword"
                type="password"
                placeholder="至少6位"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">确认新密码 <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="再次输入密码"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                required
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <span style={{ fontSize: '0.8rem', color: '#ef4444' }}>密码不一致</span>
              )}
            </div>
            <button type="submit" className="submit-button" disabled={isLoading || newPassword.length < 6 || newPassword !== confirmPassword}>
              {isLoading ? '重置中...' : '重置密码'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button
            type="button"
            onClick={() => navigate('/login')}
            style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.875rem', textDecoration: 'underline' }}
          >
            返回登录
          </button>
        </div>
      </div>
    </div>
  );
}
