import { Router, Request, Response } from 'express';
import * as crypto from 'crypto';
import database from '../database';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// 管理员权限验证
async function requireAdmin(req: Request, res: Response): Promise<boolean> {
  const userId = (req as any).userId;
  const user = await database.getUserById(userId);
  if (!user || user.role !== 'admin') {
    res.status(403).json({ success: false, error: '需要管理员权限' });
    return false;
  }
  return true;
}

/**
 * GET /api/users/me
 * 获取当前用户信息
 */
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = await database.getUserById(userId);

    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    res.json({
      id: user.id,
      username: user.username,
      nickname: user.nickname || '',
      role: user.role,
      status: user.status,
      recoveryRobotId: user.recoveryRobotId || '',
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ success: false, error: '内部服务器错误' });
  }
});

/**
 * PUT /api/users/profile
 * 更新当前用户个人信息（昵称）
 */
router.put('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { nickname } = req.body;
    await database.updateUserProfile(userId, { nickname });
    res.json({ success: true, message: '个人信息已更新' });
  } catch (error) {
    console.error('更新用户信息错误:', error);
    res.status(500).json({ success: false, error: '内部服务器错误' });
  }
});

/**
 * PUT /api/users/recovery-robot
 * 更新当前用户的密码找回机器人
 */
router.put('/recovery-robot', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { recoveryRobotId } = req.body;
    await database.updateRecoveryRobot(userId, recoveryRobotId || '');
    res.json({ success: true, message: '密码找回机器人已更新' });
  } catch (error) {
    console.error('更新找回机器人错误:', error);
    res.status(500).json({ success: false, error: '内部服务器错误' });
  }
});

/**
 * POST /api/users/change-password
 * 修改当前用户密码（正确哈希密码）
 */
router.post('/change-password', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: '当前密码和新密码为必需' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: '新密码至少为 6 个字符' });
    }

    const user = await database.getUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    const isValid = await database.verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      // 记录审计日志 - 密码修改失败
      await database.createAuditLog({
        userId: userId,
        username: user.username,
        action: 'change_password',
        resourceType: 'user',
        resourceId: userId,
        description: `修改密码失败 - 当前密码不正确`,
        status: 'failure',
      });
      return res.status(401).json({ success: false, error: '当前密码不正确' });
    }

    // 正确哈希密码后再存储
    const newHash = crypto.createHash('sha256').update(newPassword).digest('hex');
    await database.updateUserPassword(userId, newHash);

    // 记录审计日志 - 密码修改成功
    await database.createAuditLog({
      userId: userId,
      username: user.username,
      action: 'change_password',
      resourceType: 'user',
      resourceId: userId,
      description: `修改密码成功`,
      status: 'success',
    });

    res.json({ success: true, message: '密码已成功修改' });
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({ success: false, error: '内部服务器错误' });
  }
});

/**
 * GET /api/users
 * 获取所有用户列表（管理员专用）
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const users = await database.getAllUsers();

    // 附加每个用户的通知数
    const usersWithStats = await Promise.all(
      users.map(async (u) => ({
        ...u,
        notificationCount: await database.getNotificationCountByUserId(u.id),
      }))
    );

    res.json({ success: true, data: usersWithStats });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({ success: false, error: '内部服务器错误' });
  }
});

/**
 * POST /api/users
 * 创建新用户（管理员专用）
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const { username, password, role, nickname } = req.body;
    const adminUserId = (req as any).userId;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: '用户名和密码为必需' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: '密码至少为 6 个字符' });
    }
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ success: false, error: '无效的角色' });
    }

    const newUser = await database.createUser({ username, password, role: role as 'admin' | 'user', nickname });
    
    // 记录审计日志
    const admin = await database.getUserById(adminUserId);
    await database.createAuditLog({
      userId: adminUserId,
      username: admin?.username || 'unknown',
      action: 'create',
      resourceType: 'user',
      resourceId: newUser.id,
      description: `创建新用户 '${username}' [角色: ${role}, 昵称: ${nickname || '(无)'}]`,
      status: 'success',
    });
    
    res.status(201).json({ success: true, data: newUser });
  } catch (error: any) {
    if (error.message === '用户名已存在') {
      return res.status(409).json({ success: false, error: error.message });
    }
    console.error('创建用户错误:', error);
    res.status(500).json({ success: false, error: '内部服务器错误' });
  }
});

/**
 * PUT /api/users/:userId
 * 更新用户信息（管理员专用）
 */
router.put('/:userId', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const { userId } = req.params;
    const currentAdminId = (req as any).userId;

    // 不允许管理员修改自己的角色或状态
    if (userId === currentAdminId && (req.body.role || req.body.status)) {
      return res.status(400).json({ success: false, error: '不能修改自己的角色或状态' });
    }

    const { role, status, nickname } = req.body;
    const targetUser = await database.getUserById(userId);
    const admin = await database.getUserById(currentAdminId);
    await database.updateUserByAdmin(userId, { role, status, nickname });
    
    // 记录审计日志
    const changes: string[] = [];
    if (role) changes.push(`角色: ${role}`);
    if (status) changes.push(`状态: ${status}`);
    if (nickname !== undefined) changes.push(`昵称: ${nickname || '(清除)'}`);
    
    await database.createAuditLog({
      userId: currentAdminId,
      username: admin?.username || 'unknown',
      action: 'update',
      resourceType: 'user',
      resourceId: userId,
      description: `更新用户 '${targetUser?.username || userId}' [${changes.join(', ') || '无更改'}]`,
      status: 'success',
    });
    
    res.json({ success: true, message: '用户已更新' });
  } catch (error) {
    console.error('更新用户错误:', error);
    res.status(500).json({ success: false, error: '内部服务器错误' });
  }
});

/**
 * DELETE /api/users/:userId
 * 删除用户（管理员专用）
 */
router.delete('/:userId', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const { userId } = req.params;
    const currentAdminId = (req as any).userId;

    if (userId === currentAdminId) {
      return res.status(400).json({ success: false, error: '不能删除自己的账号' });
    }

    const targetUser = await database.getUserById(userId);
    const admin = await database.getUserById(currentAdminId);
    await database.deleteUser(userId);
    
    // 记录审计日志
    await database.createAuditLog({
      userId: currentAdminId,
      username: admin?.username || 'unknown',
      action: 'delete',
      resourceType: 'user',
      resourceId: userId,
      description: `删除用户 '${targetUser?.username || userId}'`,
      status: 'success',
    });
    
    res.json({ success: true, message: '用户已删除' });
  } catch (error) {
    console.error('删除用户错误:', error);
    res.status(500).json({ success: false, error: '内部服务器错误' });
  }
});

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
        error: '用户不存在',
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
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      success: false,
      error: '内部服务器错误',
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
      message: '用户信息已成功更新',
    });
  } catch (error) {
    console.error('更新用户信息错误:', error);
    res.status(500).json({
      success: false,
      error: '内部服务器错误',
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
        error: '当前密码和新密码为必需',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: '新密码至少为 6 个字符',
      });
    }

    const user = await database.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在',
      });
    }

    // 验证当前密码
    const isValid = await database.verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: '当前密码不正确',
      });
    }

    // 更新密码
    await database.updateUserPassword(userId, newPassword);

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

export default router;
