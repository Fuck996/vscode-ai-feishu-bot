import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import logger from '../logger';

const router = Router();

// 应用认证中间件
router.use(authMiddleware);

// 内存中存储的 MCP 日志
const mcpLogs: Array<{
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  details?: any;
}> = [];

// 最大日志数量
const MAX_LOGS = 1000;

/**
 * 添加日志消息到 MCP 日志
 */
const addMcpLog = (level: 'INFO' | 'WARN' | 'ERROR', message: string, details?: any) => {
  const log = {
    timestamp: new Date().toISOString(),
    level,
    message,
    details,
  };

  mcpLogs.push(log);

  // 只保留最新的 MAX_LOGS 条记录
  if (mcpLogs.length > MAX_LOGS) {
    mcpLogs.shift();
  }

  // 同时输出到系统日志
  if (level === 'INFO') {
    logger.info(message, details);
  } else if (level === 'WARN') {
    logger.warn(message, details);
  } else {
    logger.error(message, details);
  }
};

/**
 * 获取所有 MCP 日志
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    const logs = mcpLogs.slice(-limit).reverse();

    res.json({
      success: true,
      data: logs,
      total: mcpLogs.length,
    });
  } catch (error) {
    logger.error('获取 MCP 日志失败', error);
    res.status(500).json({ success: false, error: '获取日志失败' });
  }
});

/**
 * 获取指定级别的 MCP 日志
 */
router.get('/:level', async (req: Request, res: Response) => {
  try {
    const { level } = req.params;
    const validLevels = ['INFO', 'WARN', 'ERROR'];

    if (!validLevels.includes(level.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: `无效的日志级别。允许的值：${validLevels.join(', ')}`,
      });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const filteredLogs = mcpLogs
      .filter(log => log.level === level.toUpperCase())
      .slice(-limit)
      .reverse();

    res.json({
      success: true,
      data: filteredLogs,
      total: filteredLogs.length,
    });
  } catch (error) {
    logger.error('获取 MCP 日志失败', error);
    res.status(500).json({ success: false, error: '获取日志失败' });
  }
});

/**
 * 清空 MCP 日志
 */
router.delete('/', async (req: Request, res: Response) => {
  try {
    const clearedCount = mcpLogs.length;
    mcpLogs.length = 0;

    logger.info('MCP 日志已清空', { count: clearedCount });

    res.json({
      success: true,
      message: `已清空 ${clearedCount} 条日志`,
    });
  } catch (error) {
    logger.error('清空 MCP 日志失败', error);
    res.status(500).json({ success: false, error: '清空日志失败' });
  }
});

export default router;
export { addMcpLog };
