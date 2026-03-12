import { Router, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import db from '../database';
import { getLogs } from '../serviceLogger';

const router = Router();

// 计算真实服务运行时间
const formatUptime = (): string => {
  const seconds = Math.floor(process.uptime());
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

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

// 管理员权限中间件
function checkAdminRole(req: AuthRequest, res: Response, next: Function) {
  const role = (req as any).role;
  if (role !== 'admin') {
    return res.status(403).json({ success: false, error: '仅管理员可访问此功能' });
  }
  next();
}

interface AuthRequest extends Request {
  userId?: string;
  username?: string;
  role?: string;
}

// 获取服务列表
router.get('/', verifyToken, checkAdminRole, async (req: AuthRequest, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: '未授权' });
    }

    // 获取用户的所有机器人
    const robots = await db.getRobots(userId);
    
    // 获取所有集成（来自用户的机器人）
    let totalIntegrations = 0;
    for (const robot of robots) {
      const integrations = await db.getIntegrationsByRobotId(robot.id);
      totalIntegrations += integrations.length;
    }

    // 计算今天的调用数（通知数）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayNotifications = await db.getNotifications(10000, 0); // 获取所有通知
    const mcpRelatedNotifications = todayNotifications.filter((n: any) => {
      const notificationDate = new Date(n.createdAt || '');
      notificationDate.setHours(0, 0, 0, 0);
      return notificationDate.getTime() === today.getTime();
    });
    const todayCallCount = mcpRelatedNotifications.length;

    // 构建服务列表（只展示真实存在的服务）
    const services = [
      {
        id: 'mcp-service',
        name: 'MCP 工作汇报服务',
        type: 'Model Context Protocol',
        icon: '📋',
        description: 'VS Code Copilot 工作汇报中间件，自动将任务总结发送到飞书群组',
        status: 'running',
        associatedIntegrations: totalIntegrations,
        stats: [
          { label: '关联集成', value: totalIntegrations.toString() },
          { label: '今日调用', value: todayCallCount.toString() },
          { label: '运行时间', value: formatUptime() },
        ],
        isScheduled: false,
        uptime: formatUptime(),
      },
    ];

    res.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ success: false, error: '获取服务列表失败' });
  }
});

// 获取服务日志
router.get('/logs', verifyToken, checkAdminRole, async (req: AuthRequest, res: Response) => {
  try {
    const logs = getLogs(100);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching service logs:', error);
    res.status(500).json({ success: false, error: '获取日志失败' });
  }
});

// 执行服务操作（启动/停止/重启）
router.post('/:serviceId/action', verifyToken, checkAdminRole, async (req: AuthRequest, res: Response) => {
  try {
    const { serviceId } = req.params;
    const { action } = req.body;

    if (!['start', 'stop', 'restart'].includes(action)) {
      return res.status(400).json({ success: false, error: '无效的操作' });
    }

    // 实际操作：这里可以调用系统命令或其他服务管理器
    // 目前仅作模拟
    console.log(`执行操作: ${action} on service ${serviceId}`);

    res.json({
      success: true,
      message: `服务 ${serviceId} 的 ${action} 操作已执行`,
    });
  } catch (error) {
    console.error('Service action failed:', error);
    res.status(500).json({ success: false, error: '执行操作失败' });
  }
});

export default router;
