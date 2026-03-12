/**
 * 认证服务 - 处理登录、密码修改等API调用
 */

const API_BASE_URL = '';

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  passwordChanged: boolean;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
  requiresPasswordChange: boolean;
  error?: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
  error?: string;
}

export interface VerifyResponse {
  success: boolean;
  user?: User;
  error?: string;
}

class AuthService {
  /**
   * 登录
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // 保存token到localStorage
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        return data;
      } else {
        // 返回服务器返回的错误信息
        return {
          success: false,
          token: '',
          user: {} as User,
          requiresPasswordChange: false,
          error: data.error || (response.ok ? '登录失败' : `登录失败 (${response.status})`),
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      // 只在真正的网络错误时返回网络错误提示
      const errorMessage = error instanceof TypeError 
        ? '网络错误，请检查服务器地址'
        : '登录失败，请稍后重试';
      return {
        success: false,
        token: '',
        user: {} as User,
        requiresPasswordChange: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 修改密码
   */
  async changePassword(
    newPassword: string,
    currentPassword?: string
  ): Promise<ChangePasswordResponse> {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        return {
          success: false,
          message: '',
          error: '未授权',
        };
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // 更新localStorage中的用户信息
        const user = JSON.parse(localStorage.getItem('auth_user') || '{}');
        user.passwordChanged = true;
        localStorage.setItem('auth_user', JSON.stringify(user));
        return data;
      } else {
        return {
          success: false,
          message: '',
          error: data.error || '密码修改失败',
        };
      }
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        message: '',
        error: '网络错误，请稍后重试',
      };
    }
  }

  /**
   * 验证token是否有效
   */
  async verify(): Promise<VerifyResponse> {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        return {
          success: false,
          error: 'No token',
        };
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Verify error:', error);
      return {
        success: false,
        error: 'Network error',
      };
    }
  }

  /**
   * 登出
   */
  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }

  /**
   * 获取当前用户信息
   */
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('auth_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  /**
   * 获取token
   */
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  /**
   * 检查是否已登录
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * 带鉴权的 fetch 封装
   * 自动附加 Authorization 头，并对 401 / 用户不存在的 404 做统一处理：
   * 清除本地登录状态并跳转到登录页，避免外网旧 token 导致页面卡死在错误状态。
   */
  async fetchWithAuth(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
    const token = this.getToken();
    const headers = new Headers(init.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(input, { ...init, headers });

    // 401：token 无效或已过期，强制登出
    if (response.status === 401) {
      this.logout();
      window.location.href = '/login';
      // 返回一个永不 resolve 的 promise，中止后续逻辑
      return new Promise(() => {});
    }

    return response;
  }
}

export default new AuthService();
