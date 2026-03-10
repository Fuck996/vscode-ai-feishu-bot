import { Router, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import database from '../database';
import * as crypto from 'crypto';

const router = Router();

interface LoginRequest {
  username: string;
  password: string;
}

interface ChangePasswordRequest {
  currentPassword?: string;
  newPassword: string;
}

interface AuthPayload {
  userId: string;
  username: string;
  role: string;
}

// JWT密钥（开发用）
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

/**
 * POST /api/auth/login
 * 登录端点
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as LoginRequest;

    // 验证输入
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required',
      });
    }

    // 查找用户
    const user = await database.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      });
    }

    // 验证密码
    const isValidPassword = await database.verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      });
    }

    // 生成JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
      } as AuthPayload,
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 更新最后登录时间
    await database.updateLastLogin(user.id);

    // 返回响应
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        passwordChanged: user.passwordChanged,
      },
      requiresPasswordChange: !user.passwordChanged,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/auth/change-password
 * 修改密码端点
 */
router.post('/change-password', async (req: Request, res: Response) => {
  try {
    // 从JWT token中获取用户信息
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header',
      });
    }

    const token = authHeader.substring(7);
    let decoded: AuthPayload;
    
    try {
      decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }

    const { currentPassword, newPassword } = req.body as ChangePasswordRequest;

    // 验证新密码
    if (!newPassword || newPassword.length < 8 || newPassword.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Password must be between 8 and 20 characters',
      });
    }

    // 首次登录强制修改时不需要验证旧密码
    const user = await database.getUserByUsername(decoded.username);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // 如果密码已修改过，则需要验证旧密码
    if (user.passwordChanged && currentPassword) {
      const isValidPassword = await database.verifyPassword(
        currentPassword,
        user.passwordHash
      );
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Current password is incorrect',
        });
      }
    }

    // 生成新密码哈希
    const newPasswordHash = crypto
      .createHash('sha256')
      .update(newPassword)
      .digest('hex');

    // 更新密码
    await database.updateUserPassword(user.id, newPasswordHash);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/auth/verify
 * 验证token是否有效
 */
router.get('/verify', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header',
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
      res.json({
        success: true,
        user: decoded,
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
