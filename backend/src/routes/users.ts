import { Router, Request, Response } from 'express';
import database from '../database';
import { authMiddleware } from '../middleware/auth';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

/**
 * GET /api/users/me
 * 获取当前用户信息
 */
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = await database.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email || '',
      nickname: user.nickname || '',
      role: user.role,
      status: user.status,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * PUT /api/users/profile
 * 更新用户信息
 */
router.put('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { email, nickname } = req.body;

    await database.updateUserProfile(userId, { email, nickname });

    res.json({
      success: true,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/users/change-password
 * 修改密码
 */
router.post('/change-password', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters',
      });
    }

    const user = await database.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // 验证当前密码
    const isValid = await database.verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect',
      });
    }

    // 更新密码
    await database.updateUserPassword(userId, newPassword);

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
 * POST /api/system/restore
 * 系统还原 - 清空所有数据
 */
router.post('/system/restore', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = await database.getUserById(userId);

    // 只有admin可以执行系统还原
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admin can perform system restore',
      });
    }

    // 清除数据库文件
    const dbPath = path.join(__dirname, '../../data/notifications.db');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }

    // 重新初始化数据库（创建admin用户）
    await database.initialize();

    res.json({
      success: true,
      message: 'System restored successfully',
    });
  } catch (error) {
    console.error('System restore error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
