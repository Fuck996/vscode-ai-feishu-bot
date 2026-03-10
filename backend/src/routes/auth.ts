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
        error: '用户名和密码为必需',
      });
    }

    // 查找用户
    const user = await database.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: '用户名或密码无效',
      });
    }

    // 验证密码
    const isValidPassword = await database.verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: '用户名或密码无效',
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
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      error: '内部服务器错误',
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
        error: '缺少或无效的授权标头',
      });
    }

    const token = authHeader.substring(7);
    let decoded: AuthPayload;
    
    try {
      decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: '无效或过期的令牌',
      });
    }

    const { currentPassword, newPassword } = req.body as ChangePasswordRequest;

    // 验证新密码
    if (!newPassword || newPassword.length < 8 || newPassword.length > 20) {
      return res.status(400).json({
        success: false,
        error: '密码必须在 8 到 20 个字符之间',
      });
    }

    // 首次登录强制修改时不需要验证旧密码
    const user = await database.getUserByUsername(decoded.username);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在',
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
          error: '当前密码不正确',
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
      message: '密码已成功修改',
    });
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({
      success: false,
      error: '内部服务器错误',
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
        error: '缺少或无效的授权标头',
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
        error: '无效或过期的令牌',
      });
    }
  } catch (error) {
    console.error('验证错误:', error);
    res.status(500).json({
      success: false,
      error: '内部服务器错误',
    });
  }
});

export default router;
