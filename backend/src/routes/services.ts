import { Router, Request, Response } from 'express';
import db from '../database';
import { verifyToken } from '../middleware/auth';

const router = Router();

interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
  };
}

// 获取服务列表
router.get('/', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
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

    // 构建服务列表
    const services = [
      {
        id: 'mcp-service',
        name: 'MCP 工作汇报服务',
        type: 'Model Context Protocol',
        icon: '📋',
        description: 'VS Code Copilot 工作汇报中间件，自动将任务总结发送到飞书群组',
        status: 'running',
        associatedIntegrations: Math.floor(totalIntegrations * 0.4),
        stats: [
          { label: '关联集成', value: Math.floor(totalIntegrations * 0.4).toString() },
          { label: '今日调用', value: '24' },
          { label: '运行时间', value: '12h 34m' },
          { label: '可用性', value: '99.8%' },
        ],
        config: [
          { label: '协议版本', value: '2024-11-05' },
          { label: '连接数', value: '1 活跃连接' },
          { label: 'CPU 使用', value: '2.3%' },
          { label: '内存使用', value: '45 MB / 512 MB' },
        ],
      },
      {
        id: 'queue-service',
        name: '消息队列服务',
        type: 'Redis 消息缓存',
        icon: '⚙️',
        description: '可选消息队列服务，用于高并发场景下的消息缓冲和异步处理',
        status: 'stopped',
        associatedIntegrations: 0,
        stats: [
          { label: '关联集成', value: '0' },
          { label: '上次运行', value: '72小时前' },
          { label: '队列长度', value: '0' },
          { label: '配置状态', value: '就绪' },
        ],
        config: [
          { label: '主机', value: 'localhost:6379' },
          { label: '数据库', value: 'Redis (In-Memory)' },
          { label: '认证', value: '禁用' },
          { label: '最后检查', value: '-' },
        ],
      },
      {
        id: 'notification-service',
        name: '通知中枢',
        type: '飞书消息推送',
        icon: '🔔',
        description: '负责将所有通知推送到飞书群组，当前因 Webhook 认证失败而异常',
        status: 'error',
        associatedIntegrations: totalIntegrations,
        stats: [
          { label: '关联集成', value: totalIntegrations.toString() },
          { label: '失败数', value: '8' },
          { label: '重试次数', value: '3 / 3' },
          { label: '最后错误', value: '401 Auth' },
        ],
        config: [
          { label: '端点', value: 'open.feishu.cn' },
          { label: '重试策略', value: '指数退避' },
          { label: '超时', value: '30s' },
          { label: '错误详情', value: 'Webhook 已废弃' },
        ],
      },
    ];

    res.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ success: false, error: '获取服务列表失败' });
  }
});

// 获取服务日志
router.get('/logs', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    // 模拟日志数据
    const logs = [
      { timestamp: '2026-03-11 17:32:15', level: 'info', message: 'MCP SSE 连接建立: sessionId=abc123def456', service: 'MCP 服务' },
      { timestamp: '2026-03-11 17:31:52', level: 'info', message: 'feishu_notify 工具调用成功，消息已发送到飞书', service: 'MCP 服务' },
      { timestamp: '2026-03-11 17:31:48', level: 'info', message: 'tools/call 结果: ✅ 工作总结已成功发送到飞书', service: 'MCP 服务' },
      { timestamp: '2026-03-11 17:25:03', level: 'warn', message: '通知发送延迟 2.3s，建议检查网络连接', service: '通知中枢' },
      { timestamp: '2026-03-11 17:20:15', level: 'error', message: '飞书 Webhook 返回 401: Unauthorized (已重试 3/3)', service: '通知中枢' },
    ];

    res.json(logs);
  } catch (error) {
    console.error('Error fetching service logs:', error);
    res.status(500).json({ success: false, error: '获取日志失败' });
  }
});

// 执行服务操作（启动/停止/重启）
router.post('/:serviceId/action', verifyToken, async (req: AuthRequest, res: Response) => {
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
