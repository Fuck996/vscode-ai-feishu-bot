import { Router, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import database, { Robot } from '../database';
import axios from 'axios';

const router = Router();

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
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header',
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
}

/**
 * GET /api/robots
 * 获取当前用户的所有机器人
 */
router.get('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const robots = await database.getRobots(userId);
    
    res.json({
      success: true,
      data: robots,
    });
  } catch (error) {
    console.error('Get robots error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/robots
 * 创建新的机器人
 */
router.post('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const { name, description, webhookUrl, status } = req.body;
    const userId = (req as any).user.userId;

    // 验证必填字段
    if (!name || !webhookUrl) {
      return res.status(400).json({
        success: false,
        error: 'name and webhookUrl are required',
      });
    }

    const robot = await database.createRobot({
      name,
      description: description || '',
      webhookUrl,
      status: status || 'active',
      userId,
    });

    res.json({
      success: true,
      data: robot,
    });
  } catch (error) {
    console.error('Create robot error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/robots/:robotId
 * 获取单个机器人详情
 */
router.get('/:robotId', verifyToken, async (req: Request, res: Response) => {
  try {
    const { robotId } = req.params;
    const robot = await database.getRobotById(robotId);

    if (!robot) {
      return res.status(404).json({
        success: false,
        error: 'Robot not found',
      });
    }

    // 验证所有权
    if (robot.userId !== (req as any).user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
      });
    }

    res.json({
      success: true,
      data: robot,
    });
  } catch (error) {
    console.error('Get robot error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * PUT /api/robots/:robotId
 * 更新机器人
 */
router.put('/:robotId', verifyToken, async (req: Request, res: Response) => {
  try {
    const { robotId } = req.params;
    const { name, description, webhookUrl, status } = req.body;

    const robot = await database.getRobotById(robotId);
    if (!robot) {
      return res.status(404).json({
        success: false,
        error: 'Robot not found',
      });
    }

    // 验证所有权
    if (robot.userId !== (req as any).user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
      });
    }

    await database.updateRobot(robotId, {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(webhookUrl && { webhookUrl }),
      ...(status && { status }),
    });

    const updated = await database.getRobotById(robotId);
    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Update robot error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * DELETE /api/robots/:robotId
 * 删除机器人
 */
router.delete('/:robotId', verifyToken, async (req: Request, res: Response) => {
  try {
    const { robotId } = req.params;
    const robot = await database.getRobotById(robotId);

    if (!robot) {
      return res.status(404).json({
        success: false,
        error: 'Robot not found',
      });
    }

    // 验证所有权
    if (robot.userId !== (req as any).user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
      });
    }

    await database.deleteRobot(robotId);

    res.json({
      success: true,
      message: 'Robot deleted successfully',
    });
  } catch (error) {
    console.error('Delete robot error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/robots/:robotId/test
 * 发送测试通知到机器人
 */
router.post('/:robotId/test', verifyToken, async (req: Request, res: Response) => {
  try {
    const { robotId } = req.params;
    const robot = await database.getRobotById(robotId);

    if (!robot) {
      return res.status(404).json({
        success: false,
        error: 'Robot not found',
      });
    }

    // 验证所有权
    if (robot.userId !== (req as any).user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
      });
    }

    if (robot.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Robot is not active',
      });
    }

    // 发送测试消息到飞书
    try {
      const testMessage = {
        msg_type: 'text',
        content: {
          text: `✅ 测试通知 - ${robot.name}\n\n机器人: 飞书AI通知系统\n时间: ${new Date().toLocaleString('zh-CN')}\n\n这是一条测试通知，表示机器人连接正常。`,
        },
      };

      await axios.post(robot.webhookUrl, testMessage, {
        timeout: 5000,
      });

      // 更新最后消息时间
      await database.updateRobot(robotId, {
        lastMessageAt: new Date().toISOString(),
      });

      // 保存通知到数据库
      await database.saveNotification({
        title: `测试通知 - ${robot.name}`,
        summary: '发送了测试通知',
        status: 'success',
        action: 'test_notification',
      });

      res.json({
        success: true,
        message: '测试通知已发送',
      });
    } catch (error: any) {
      console.error('Send test message error:', error);
      res.status(400).json({
        success: false,
        error: `无法连接到飞书: ${error.message}`,
      });
    }
  } catch (error) {
    console.error('Test robot error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
