import { Router, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import axios from 'axios';
import database from '../database';
import logger from '../logger';

const router = Router();

interface NotifyRequest {
  title: string;
  summary: string;
  status: 'success' | 'error' | 'warning' | 'info';
  action?: string;
  details?: any;
  robotId?: string;  // 用于直接指定机器人
}

interface AuthPayload {
  userId: string;
  username: string;
  role: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

// 验证 JWT Token 中间件
function verifyToken(req: Request, res: Response, next: Function) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: '缺少授权信息' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;

    (req as any).userId = decoded.userId;
    (req as any).username = decoded.username;
    (req as any).role = decoded.role;

    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: '无效或过期的 Token' });
  }
}

/**
 * POST /api/notify
 * 发送通知到飞书
 */
router.post('/notify', async (req: Request, res: Response) => {
  try {
    const { title, summary, status, action, details } = req.body as NotifyRequest;

    // 验证必填字段
    if (!title || !summary || !status) {
      return res.status(400).json({
        success: false,
        error: '标题、摘要和状态为必需',
      });
    }

    // 保存通知到数据库
    const notificationId = await database.saveNotification({
      title,
      summary,
      status,
      action,
      details: details ? JSON.stringify(details) : undefined,
    });

    logger.info(`已保存通知，ID: ${notificationId}`, {
      title,
      status,
      action,
    });

    // 这里可以添加额外逻辑，比如：
    // 1. 如果指定了robotId，则发送到相应的飞书机器人
    // 2. 触发相关的项目集成
    // 等等

    res.status(200).json({
      success: true,
      notificationId,
      message: '通知已成功处理',
    });
  } catch (error) {
    logger.error('通知错误', error);
    res.status(500).json({
      success: false,
      error: '内部服务器错误',
    });
  }
});

/**
 * GET /api/notifications
 * 获取当前用户的通知列表（按用户隔离）
 */
router.get('/notifications', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string | undefined;

    // 获取该用户的所有机器人
    const userRobots = await database.getRobots(userId);
    const userRobotNames = new Set(userRobots.map(r => r.name));

    // 获取所有通知，然后过滤
    const allNotifications = await database.getNotifications(limit * 10, 0, status); // 获取更多以弥补过滤后的数量

    // 按用户的机器人名称过滤通知
    const userNotifications = allNotifications.filter(n => 
      !n.robotName || userRobotNames.has(n.robotName)
    );

    // 分页
    const paginatedNotifications = userNotifications.slice(offset, offset + limit);

    res.json({
      success: true,
      notifications: paginatedNotifications,
      limit,
      offset,
      total: userNotifications.length,
    });
  } catch (error) {
    logger.error('获取通知列表错误', error);
    res.status(500).json({
      success: false,
      error: '内部服务器错误',
    });
  }
});

/**
 * GET /api/stats
 * 获取统计信息
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await database.getNotificationStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error('获取统计信息错误', error);
    res.status(500).json({
      success: false,
      error: '内部服务器错误',
    });
  }
});

export default router;
