import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import authService from './services/auth';
import SceneIcon, { type SceneIconName } from './components/SceneIcon';
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

interface NavigationItem {
  path: string;
  matchPaths: string[];
  label: string;
  title: string;
  icon: SceneIconName;
  adminOnly?: boolean;
}

const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    path: '/dashboard',
    matchPaths: ['/dashboard'],
    label: '仪表板',
    title: '仪表板',
    icon: 'dashboard',
  },
  {
    path: '/robots',
    matchPaths: ['/robots'],
    label: '机器人',
    title: '机器人管理',
    icon: 'robot',
  },
  {
    path: '/history',
    matchPaths: ['/history'],
    label: '历史',
    title: '历史',
    icon: 'history',
  },
  {
    path: '/services',
    matchPaths: ['/services'],
    label: '服务',
    title: '服务管理',
    icon: 'service',
    adminOnly: true,
  },
  {
    path: '/settings',
    matchPaths: ['/settings'],
    label: '设置',
    title: '设置',
    icon: 'settings',
  },
];

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

  const normalizedPath = location.pathname === '/' ? '/dashboard' : location.pathname;

  const isActive = (matchPaths: string[]) => {
    return matchPaths.some((path) => normalizedPath === path || normalizedPath.startsWith(`${path}/`));
  };

  return (
    <div className="flex flex-col bg-gray-50" style={{ minHeight: '100vh' }}>
      {/* 导航栏 */}
      <nav className="github-topbar">
        <div className="github-topbar__inner">
          <button
            type="button"
            className="github-topbar__brand"
            onClick={() => navigate('/dashboard')}
            title="CortexFlow"
          >
            <SceneIcon name="brand" size={30} title="CortexFlow" />
            <span className="github-topbar__brand-title">CortexFlow</span>
          </button>
          
          <div className="github-topbar__links" aria-label="主导航">
            {NAVIGATION_ITEMS.filter((item) => !item.adminOnly || user?.role === 'admin').map((item) => {
              const active = isActive(item.matchPaths);

              return (
                <button
                  key={item.path}
                  type="button"
                  className={`github-nav-item${active ? ' is-active' : ''}`}
                  onClick={() => navigate(item.path)}
                  title={item.title}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className="github-nav-item__content">
                    <SceneIcon name={item.icon} size={18} title={item.title} inheritColor />
                    <span>{item.label}</span>
                    <span className="github-nav-item__indicator" aria-hidden="true" />
                  </span>
                </button>
              );
            })}
          </div>

          {user && (
            <div className="github-topbar__actions">
              <span className="github-topbar__user">
                <span aria-hidden="true" className="github-topbar__avatar">👤</span>
                <span>{userNickname || user.username}</span>
              </span>
            </div>
          )}
        </div>
      </nav>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* 页脚 */}
      <footer style={{ marginTop: '1.5rem', paddingBottom: '1.5rem' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="github-footer__text text-center text-gray-400" style={{ fontSize: '0.7rem' }}>
            © 2026 CortexFlow. All rights reserved. | System v{backendVersion} | Updated: {new Date().toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
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
      <div className="app-loading">
        <div className="app-loading__text">加载中...</div>
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
