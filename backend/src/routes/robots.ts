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
        error: '缺少或无效的授权标头',
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: '无效或过期的令牌',
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
    console.error('获取机器人列表错误:', error);
    res.status(500).json({
      success: false,
      error: '内部服务器错误',
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
        error: '名称和 Webhook URL 为必需',
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
    console.error('创建机器人错误:', error);
    res.status(500).json({
      success: false,
      error: '内部服务器错误',
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
        error: '机器人不存在',
      });
    }

    // 验证所有权
    if (robot.userId !== (req as any).user.userId) {
      return res.status(403).json({
        success: false,
        error: '无权访问',
      });
    }

    res.json({
      success: true,
      data: robot,
    });
  } catch (error) {
    console.error('获取机器人错误:', error);
    res.status(500).json({
      success: false,
      error: '内部服务器错误',
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
        error: '机器人不存在',
      });
    }

    // 验证所有权
    if (robot.userId !== (req as any).user.userId) {
      return res.status(403).json({
        success: false,
        error: '无权访问',
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
    console.error('更新机器人错误:', error);
    res.status(500).json({
      success: false,
      error: '内部服务器错误',
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
        error: '机器人不存在',
      });
    }

    // 验证所有权
    if (robot.userId !== (req as any).user.userId) {
      return res.status(403).json({
        success: false,
        error: '无权访问',
      });
    }

    await database.deleteRobot(robotId);

    res.json({
      success: true,
      message: '机器人已删除成功',
    });
  } catch (error) {
    console.error('删除机器人错误:', error);
    res.status(500).json({
      success: false,
      error: '内部服务器错误',
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
        error: '机器人不存在',
      });
    }

    // 验证所有权
    if (robot.userId !== (req as any).user.userId) {
      return res.status(403).json({
        success: false,
        error: '无权访问',
      });
    }

    if (robot.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: '机器人未启用',
      });
    }

    // 发送测试消息到飞书（交互式卡片格式，与通知卡片保持一致）
    try {
      const now = new Date().toLocaleString('zh-CN');
      const testMessage = {
        msg_type: 'interactive',
        card: {
          config: { wide_screen_mode: true },
          header: {
            title: { tag: 'plain_text', content: '🔔 连接测试通知' },
            template: 'blue',
          },
          elements: [
            {
              tag: 'div',
              text: { tag: 'lark_md', content: `**机器人名称：** ${robot.name}\n\n**测试时间：** ${now}\n\n✅ 机器人连接正常，可以正常接收通知。` },
            },
            { tag: 'hr' },
            {
              tag: 'note',
              elements: [{ tag: 'plain_text', content: '此消息由飞书 AI 通知系统自动发送' }],
            },
          ],
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
      console.error('发送测试消息错误:', error);
      res.status(400).json({
        success: false,
        error: `无法连接到飞书: ${error.message}`,
      });
    }
  } catch (error) {
    console.error('测试机器人错误:', error);
    res.status(500).json({
      success: false,
      error: '内部服务器错误',
    });
  }
});

export default router;
