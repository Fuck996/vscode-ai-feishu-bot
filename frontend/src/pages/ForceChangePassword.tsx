import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import SceneIcon from '../components/SceneIcon';
import authService from '../services/auth';
import { validatePasswordStrength, validatePasswordMatch } from '../utils/validation';
import '../styles/auth.css';

export default function ForceChangePassword() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 获取密码验证结果
  const passwordValidation = validatePasswordStrength(newPassword);
  const passwordsMatch = validatePasswordMatch(newPassword, confirmPassword);
  const canSubmit = passwordValidation.isValid && passwordsMatch && newPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors.join('; '));
      return;
    }

    if (!passwordsMatch) {
      setError('两次输入的密码不一致');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.changePassword(newPassword);

      if (response.success) {
        // 密码修改成功，跳转到Dashboard
        navigate('/dashboard');
      } else {
        setError(response.error || '密码修改失败');
      }
    } catch (err) {
      setError('密码修改过程出错，请稍后重试');
      console.error('Change password error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const strengthColors = {
    weak: '#ef4444',
    fair: '#f97316',
    good: '#eab308',
    strong: '#22c55e',
  };

  const strengthLabels = {
    weak: '弱',
    fair: '一般',
    good: '中等',
    strong: '强',
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-header-visual">
            <SceneIcon name="key" size={72} title="首次登录修改密码" />
          </div>
          <h1>首次登录 - 强制修改密码</h1>
          <p>为了安全起见，请修改初始密码</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message">{error}</div>}

          {/* 新密码 */}
          <div className="form-group">
            <label htmlFor="newPassword">新密码</label>
            <div className="password-input-wrapper">
              <input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                placeholder="输入新密码"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowNewPassword(!showNewPassword)}
                disabled={isLoading}
                tabIndex={-1}
                aria-label={showNewPassword ? '隐藏密码' : '显示密码'}
              >
                {showNewPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* 确认密码 */}
          <div className="form-group">
            <label htmlFor="confirmPassword">确认密码</label>
            <div className="password-input-wrapper">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="再次输入密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
                tabIndex={-1}
                aria-label={showConfirmPassword ? '隐藏密码' : '显示密码'}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {confirmPassword && !passwordsMatch && (
              <div className="password-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <SceneIcon name="error" size={18} title="错误" />
                <span>两次输入密码不一致</span>
              </div>
            )}
          </div>

          {/* 密码强度指示器 */}
          {newPassword && (
            <div className="password-strength-section">
              <div className="strength-bar-container">
                <div className="strength-label">
                  密码强度: 
                  <span
                    style={{
                      color: strengthColors[passwordValidation.strength],
                      fontWeight: 'bold',
                      marginLeft: '0.5rem',
                    }}
                  >
                    {strengthLabels[passwordValidation.strength]}
                  </span>
                </div>
                <div className="strength-bar">
                  <div
                    className="strength-fill"
                    style={{
                      width: `${
                        passwordValidation.strength === 'weak'
                          ? '25%'
                          : passwordValidation.strength === 'fair'
                          ? '50%'
                          : passwordValidation.strength === 'good'
                          ? '75%'
                          : '100%'
                      }`,
                      backgroundColor: strengthColors[passwordValidation.strength],
                    }}
                  />
                </div>
              </div>

              {/* 密码要求检查表 */}
              <div className="password-requirements">
                <div
                  className={`requirement ${
                    passwordValidation.hasLowercase ? 'met' : 'unmet'
                  }`}
                >
                  {passwordValidation.hasLowercase ? '✓' : '✗'} 小写字母 (a-z)
                </div>
                <div
                  className={`requirement ${
                    passwordValidation.hasNumbers ? 'met' : 'unmet'
                  }`}
                >
                  {passwordValidation.hasNumbers ? '✓' : '✗'} 数字 (0-9)
                </div>
                <div
                  className={`requirement ${
                    passwordValidation.hasSpecialChars ? 'met' : 'unmet'
                  }`}
                >
                  {passwordValidation.hasSpecialChars ? '✓' : '✗'} 特殊字符
                  (!@#$%^&*)
                </div>
                <div
                  className={`requirement ${
                    passwordValidation.lengthValid ? 'met' : 'unmet'
                  }`}
                >
                  {passwordValidation.lengthValid ? '✓' : '✗'} 长度 8-20 字符 (
                  {newPassword.length}/20)
                </div>
              </div>

              {/* 错误提示 */}
              {!passwordValidation.isValid && (
                <div className="password-errors">
                  {passwordValidation.errors.map((error, idx) => (
                    <div key={idx} className="error-item">
                      • {error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 按钮 */}
          <div className="auth-buttons">
            <button
              type="submit"
              className="submit-button"
              disabled={!canSubmit || isLoading}
            >
              {isLoading ? '修改中...' : '确认修改'}
            </button>
            <button
              type="button"
              className="logout-button"
              onClick={handleLogout}
              disabled={isLoading}
            >
              退出登录
            </button>
          </div>
        </form>

        <div className="auth-footer">
          <p>密码必须同时满足上述所有要求</p>
          <p style={{ fontSize: '0.75rem', color: '#999' }}>
            修改成功后将跳转到仪表板
          </p>
        </div>
      </div>
    </div>
  );
}
