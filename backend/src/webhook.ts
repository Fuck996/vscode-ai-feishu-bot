import { Router, Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import feishuService, { NotificationPayload } from './feishu';
import databaseService from './database';
import logger from './logger';

const router = Router();

// 验证 schema
const notificationSchema = Joi.object({
  title: Joi.string().required().max(200),
  summary: Joi.string().required().max(1000),
  status: Joi.string().valid('success', 'error', 'warning', 'info').required(),
  action: Joi.string().valid('pull', 'push', 'deploy', 'build', 'test', 'other').optional(),
  details: Joi.object().optional(),
  timestamp: Joi.string().isoDate().optional(),
});

/**
 * POST /api/notify
 * 发送通知
 */
router.post('/notify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = notificationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const payload: NotificationPayload = value;

    try {
      // 发送到飞书
      await feishuService.sendRichNotification(payload);

      // 保存到数据库
      const id = await databaseService.saveNotification({
        title: payload.title,
        summary: payload.summary,
        status: payload.status,
        details: payload.details ? JSON.stringify(payload.details) : undefined,
        action: payload.action,
        robotName: payload.robotName || '默认机器人',
        source: payload.source || 'API',
      });

      logger.info({ notificationId: id }, 'Notification sent successfully');

      return res.status(200).json({
        success: true,
        message: 'Notification sent',
        notificationId: id,
      });
    } catch (feishuError) {
      logger.error({ error: feishuError }, 'Failed to send Feishu notification');

      // 即使 Feishu 失败，也保存到数据库
      const id = await databaseService.saveNotification({
        title: payload.title,
        summary: payload.summary,
        status: 'error',
        details: JSON.stringify({ ...payload.details, errorReason: 'Feishu send failed' }),
        action: payload.action,
        robotName: payload.robotName || '默认机器人',
        source: payload.source || 'API',
      });

      return res.status(207).json({
        success: false,
        message: 'Notification saved but failed to send to Feishu',
        notificationId: id,
        error: feishuError instanceof Error ? feishuError.message : 'Unknown error',
      });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/notifications
 * 查询通知历史
 */
router.get(
  '/notifications',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status as string | undefined;

      const notifications = await databaseService.getNotifications(
        limit,
        offset,
        status
      );

      logger.info({ count: notifications.length }, 'Fetched notifications');

      return res.status(200).json({
        success: true,
        data: notifications,
        limit,
        offset,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/stats
 * 获取统计数据
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await databaseService.getNotificationStats();

    logger.info(stats, 'Fetched notification stats');

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/webhooks/test
 * 测试 Webhook
 */
router.post('/webhooks/test', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const testPayload: NotificationPayload = {
      title: '🧪 Webhook 测试',
      summary: '这是一条来自飞书机器人通知系统的测试消息',
      status: 'info',
      details: {
        timestamp: new Date().toISOString(),
        source: 'webhook-test',
      },
    };

    await feishuService.sendRichNotification(testPayload);

    const id = await databaseService.saveNotification({
      title: testPayload.title,
      summary: testPayload.summary,
      status: 'info',
      details: testPayload.details ? JSON.stringify(testPayload.details) : undefined,
      source: '系统通知/测试消息',
      robotName: '系统机器人',
    });

    logger.info({ testId: id }, 'Test webhook sent');

    return res.status(200).json({
      success: true,
      message: 'Test notification sent successfully',
      notificationId: id,
    });
  } catch (err) {
    logger.error({ error: err }, 'Test webhook failed');
    next(err);
  }
});

/**
 * GET /api/health
 * 健康检查
 */
router.get('/health', (req: Request, res: Response) => {
  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

export default router;
