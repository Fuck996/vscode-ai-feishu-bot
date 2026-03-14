import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import SceneIcon from '../components/SceneIcon';
import authService from '../services/auth';
import { validateUsername } from '../utils/validation';
import '../styles/auth.css';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 验证输入
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      setError(usernameValidation.errors[0]);
      return;
    }

    if (!password) {
      setError('请输入密码');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.login(username, password);

      if (response.success) {
        // 如果需要修改密码，先跳转到修改密码页面
        if (response.requiresPasswordChange) {
          navigate('/force-change-password');
        } else {
          // 否则进入Dashboard
          navigate('/dashboard');
        }
      } else {
        setError(response.error || '登录失败');
      }
    } catch (err) {
      setError('登录过程出错，请稍后重试');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-header-visual">
            <SceneIcon name="brand" size={72} title="CortexFlow" />
          </div>
          <h1>CortexFlow</h1>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="username">用户名<span className="text-red-500">*</span></label>
            <input
              id="username"
              type="text"
              placeholder="输入用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">密码<span className="text-red-500">*</span></label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                tabIndex={-1}
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" strokeWidth={1.5} />
                ) : (
                  <Eye className="w-4 h-4" strokeWidth={1.5} />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={isLoading}
          >
            {isLoading ? '登录中...' : '登录'}
          </button>

          <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.875rem', textDecoration: 'underline' }}
            >
              忘记密码？
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
