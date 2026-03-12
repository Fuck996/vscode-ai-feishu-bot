import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { Bell, Settings as SettingsIcon, BarChart3, LogOut, Zap } from 'lucide-react';
import authService from './services/auth';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Settings from './pages/Settings';
import Robots from './pages/Robots';
import Integrations from './pages/Integrations';
import Services from './pages/Services';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ForceChangePassword from './pages/ForceChangePassword';
import ToastContainer from './components/ToastContainer';
import './index.css';

// 受保护的路由组件
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = authService.isAuthenticated();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

// 主应用布局
function MainLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = authService.getCurrentUser();
  const [backendVersion, setBackendVersion] = useState<string>('unknown');
  const [userNickname, setUserNickname] = useState<string>('');

  useEffect(() => {
    // 获取后端版本
    const fetchBackendVersion = async () => {
      try {
        const response = await fetch('/api/version');
        if (response.ok) {
          const data = await response.json();
          setBackendVersion(data.backend);
        }
      } catch (error) {
        console.error('Failed to fetch backend version:', error);
        setBackendVersion('error');
      }
    };

    // 获取用户昵称
    const fetchUserNickname = async () => {
      try {
        const token = authService.getToken();
        if (!token) return;

        const response = await authService.fetchWithAuth('/api/users/me');

        if (response.ok) {
          const data = await response.json();
          setUserNickname(data.nickname || user?.username || '');
        } else {
          setUserNickname(user?.username || '');
        }
      } catch (error) {
        console.error('Failed to fetch user nickname:', error);
        setUserNickname(user?.username || '');
      }
    };

    fetchBackendVersion();
    fetchUserNickname();
  }, [user?.username]);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path || (path === '/' && location.pathname === '/dashboard');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* 导航栏 */}
      <nav style={{ background: 'white', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', padding: '1rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🔔</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937' }}>飞书AI通知系统</span>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                borderRadius: '0.375rem',
                transition: 'background-color 0.2s',
                textDecoration: 'none',
                color: isActive('/') ? '#1e40af' : '#6b7280',
                fontSize: '0.875rem',
                border: 'none',
                backgroundColor: isActive('/') ? '#dbeafe' : 'transparent',
                fontWeight: isActive('/') ? 500 : 400,
              }}
              title="仪表板"
            >
              📊 仪表板
            </button>
            
            <button
              onClick={() => navigate('/robots')}
              style={{
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                borderRadius: '0.375rem',
                transition: 'background-color 0.2s',
                textDecoration: 'none',
                color: isActive('/robots') ? '#1e40af' : '#6b7280',
                fontSize: '0.875rem',
                border: 'none',
                backgroundColor: isActive('/robots') ? '#dbeafe' : 'transparent',
                fontWeight: isActive('/robots') ? 500 : 400,
              }}
              title="机器人管理"
            >
              🤖 机器人
            </button>
            
            <button
              onClick={() => navigate('/history')}
              style={{
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                borderRadius: '0.375rem',
                transition: 'background-color 0.2s',
                textDecoration: 'none',
                color: isActive('/history') ? '#1e40af' : '#6b7280',
                fontSize: '0.875rem',
                border: 'none',
                backgroundColor: isActive('/history') ? '#dbeafe' : 'transparent',
                fontWeight: isActive('/history') ? 500 : 400,
              }}
              title="历史"
            >
              📜 历史
            </button>
            
            {user?.role === 'admin' && (
              <button
                onClick={() => navigate('/services')}
                style={{
                  padding: '0.5rem 1rem',
                  cursor: 'pointer',
                  borderRadius: '0.375rem',
                  transition: 'background-color 0.2s',
                  textDecoration: 'none',
                  color: isActive('/services') ? '#1e40af' : '#6b7280',
                  fontSize: '0.875rem',
                  border: 'none',
                  backgroundColor: isActive('/services') ? '#dbeafe' : 'transparent',
                  fontWeight: isActive('/services') ? 500 : 400,
                }}
                title="服务管理"
              >
                📡 服务
              </button>
            )}
            
            <button
              onClick={() => navigate('/settings')}
              style={{
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                borderRadius: '0.375rem',
                transition: 'background-color 0.2s',
                textDecoration: 'none',
                color: isActive('/settings') ? '#1e40af' : '#6b7280',
                fontSize: '0.875rem',
                border: 'none',
                backgroundColor: isActive('/settings') ? '#dbeafe' : 'transparent',
                fontWeight: isActive('/settings') ? 500 : 400,
              }}
              title="设置"
            >
              ⚙️ 设置
            </button>
          </div>

          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
              <span>👤 {userNickname || user.username}</span>
              <button
                onClick={handleLogout}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#dc2626')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ef4444')}
                title="退出登录"
              >
                退出
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* 主内容 */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* 页脚 */}
      <footer className="bg-gray-100 border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-600" style={{ textAlign: 'center' }}>
            © 2026 飞书AI通知系统. 所有权利保留. | 前端 v1.3.6 | 后端 v{backendVersion} | 更新: 2026-03-12 18:00
          </p>
        </div>
      </footer>
    </div>
  );
}

// 应用根组件
function AppContent() {
  const location = useLocation();
  const isAuthPage =
    location.pathname === '/login' ||
    location.pathname === '/force-change-password' ||
    location.pathname === '/forgot-password';

  if (isAuthPage) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/force-change-password" element={<ForceChangePassword />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Routes>
    );
  }

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/robots" element={<ProtectedRoute><Robots /></ProtectedRoute>} />
        <Route path="/robots/:robotId/integrations" element={<ProtectedRoute><Integrations /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
        <Route path="/services" element={<ProtectedRoute><Services /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/force-change-password" element={<ForceChangePassword />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </MainLayout>
  );
}

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // 应用启动时验证token
    const initializeApp = async () => {
      if (authService.isAuthenticated()) {
        const verifyResult = await authService.verify();
        if (!verifyResult.success) {
          // Token无效，清除本地存储
          authService.logout();
        }
      }
      setIsInitialized(true);
    };

    initializeApp();
  }, []);

  if (!isInitialized) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f3f4f6',
      }}>
        <div style={{
          fontSize: '18px',
          color: '#6b7280',
        }}>
          加载中...
        </div>
      </div>
    );
  }

  return (
    <Router>
      <AppContent />
      <ToastContainer />
    </Router>
  );
}
