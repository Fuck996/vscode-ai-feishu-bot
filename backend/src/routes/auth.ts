import { Router, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import database from '../database';
import * as crypto from 'crypto';
import axios from 'axios';

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
 * 验证token是否有效（同时检查用户是否仍存在于数据库中）
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
    
    let decoded: AuthPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: '无效或过期的令牌',
      });
    }

    // 额外检查：确认用户仍存在于数据库中（防止数据库重置后旧 token 仍被认为有效）
    const user = await database.getUserById(decoded.userId);
    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: '用户不存在或已被禁用',
      });
    }

    res.json({
      success: true,
      user: decoded,
    });
  } catch (error) {
    console.error('验证错误:', error);
    res.status(500).json({
      success: false,
      error: '内部服务器错误',
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * 密码找回第一步：输入用户名，发送验证码
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ success: false, error: '请输入用户名' });
    }

    const user = await database.getUserByUsername(username);
    // 无论用户是否存在，都返回相同消息（防止枚举用户名）
    if (!user || user.status !== 'active') {
      return res.json({ success: true, message: '如果该用户名存在，验证码已发送' });
    }

    if (!user.recoveryRobotId) {
      return res.status(400).json({ success: false, error: '该账号未配置密码找回机器人，请联系管理员' });
    }

    // 找到对应机器人
    const robot = await database.getRobotById(user.recoveryRobotId);
    if (!robot || robot.status !== 'active') {
      return res.status(400).json({ success: false, error: '密码找回机器人不可用，请联系管理员' });
    }

    const code = database.createPasswordResetCode(username);

    // 通过飞书 Webhook 发送验证码
    try {
      await axios.post(robot.webhookUrl, {
        msg_type: 'interactive',
        card: {
          header: {
            title: { tag: 'plain_text', content: '🔐 密码重置验证码' },
            template: 'blue',
          },
          elements: [
            {
              tag: 'div',
              text: {
                tag: 'lark_md',
                content: `用户 **${username}** 请求重置密码\n\n验证码：**${code}**\n\n⏰ 验证码10分钟内有效，请勿泄露给他人`,
              },
            },
          ],
        },
      });
    } catch (sendErr) {
      console.error('发送验证码失败:', sendErr);
      return res.status(500).json({ success: false, error: '验证码发送失败，请联系管理员' });
    }

    res.json({ success: true, message: '验证码已通过飞书发送，10分钟内有效' });
  } catch (error) {
    console.error('密码找回错误:', error);
    res.status(500).json({ success: false, error: '内部服务器错误' });
  }
});

/**
 * POST /api/auth/verify-reset-code
 * 密码找回第二步：验证码校验
 */
router.post('/verify-reset-code', async (req: Request, res: Response) => {
  try {
    const { username, code } = req.body;
    if (!username || !code) {
      return res.status(400).json({ success: false, error: '请输入用户名和验证码' });
    }

    const isValid = database.verifyPasswordResetCode(username, code);
    if (!isValid) {
      return res.status(400).json({ success: false, error: '验证码无效或已过期' });
    }

    res.json({ success: true, message: '验证码正确' });
  } catch (error) {
    console.error('验证码校验错误:', error);
    res.status(500).json({ success: false, error: '内部服务器错误' });
  }
});

/**
 * POST /api/auth/reset-password
 * 密码找回第三步：重置密码
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { username, code, newPassword } = req.body;
    if (!username || !code || !newPassword) {
      return res.status(400).json({ success: false, error: '参数不完整' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: '密码至少为 6 个字符' });
    }

    const isValid = database.verifyPasswordResetCode(username, code);
    if (!isValid) {
      return res.status(400).json({ success: false, error: '验证码无效或已过期，请重新获取' });
    }

    const user = await database.getUserByUsername(username);
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    const newHash = crypto.createHash('sha256').update(newPassword).digest('hex');
    await database.updateUserPassword(user.id, newHash);
    database.deletePasswordResetCode(username);

    res.json({ success: true, message: '密码已重置，请使用新密码登录' });
  } catch (error) {
    console.error('重置密码错误:', error);
    res.status(500).json({ success: false, error: '内部服务器错误' });
  }
});

export default router;
