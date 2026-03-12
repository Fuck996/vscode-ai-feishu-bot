import { Router, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import database from '../database';

const router = Router({ mergeParams: true });

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
      return res.status(401).json({ success: false, error: '缺少或无效的授权标头' });
    }
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: '无效或过期的令牌' });
  }
}

// 校验机器人所有权中间件
async function checkRobotOwner(req: Request, res: Response, next: Function) {
  const { robotId } = req.params;
  const robot = await database.getRobotById(robotId);
  if (!robot) {
    return res.status(404).json({ success: false, error: '机器人不存在' });
  }
  if (robot.userId !== (req as any).user.userId) {
    return res.status(403).json({ success: false, error: '无权访问' });
  }
  (req as any).robot = robot;
  next();
}

/**
 * GET /api/robots/:robotId/integrations
 * 获取机器人的所有集成
 */
router.get('/', verifyToken, checkRobotOwner, async (req: Request, res: Response) => {
  try {
    const { robotId } = req.params;
    const integrations = await database.getIntegrationsByRobotId(robotId);
    res.json({ success: true, data: integrations });
  } catch (error) {
    console.error('获取集成列表错误:', error);
    res.status(500).json({ success: false, error: '内部服务器错误' });
  }
});

/**
 * POST /api/robots/:robotId/integrations
 * 创建新的集成
 */
router.post('/', verifyToken, checkRobotOwner, async (req: Request, res: Response) => {
  try {
    const { robotId } = req.params;
    const userId = (req as any).user.userId;
    const { projectName, projectSubName, projectType, config, triggeredEvents, notifyOn, messageTemplate } = req.body;

    if (!projectName || !projectType) {
      return res.status(400).json({ success: false, error: '项目名称和项目类型为必需' });
    }

    const validTypes = ['vercel', 'railway', 'github', 'gitlab', 'vscode-chat', 'api', 'custom'];
    if (!validTypes.includes(projectType)) {
      return res.status(400).json({ success: false, error: `项目类型必须为以下之一: ${validTypes.join(', ')}` });
    }

    const validNotifyOn = ['success', 'failure', 'always', 'changes'];
    if (notifyOn && !validNotifyOn.includes(notifyOn)) {
      return res.status(400).json({ success: false, error: `通知时机必须为以下之一: ${validNotifyOn.join(', ')}` });
    }

    const robot = (req as any).robot;
    const integration = await database.createIntegration({
      robotId,
      projectName,
      projectSubName: projectSubName || '',
      projectType,
      config: config || {},
      triggeredEvents: triggeredEvents || [],
      notifyOn: notifyOn || 'always',
      messageTemplate: messageTemplate || '',
      status: 'active',
    });

    // 记录审计日志
    const user = await database.getUserById(userId);
    await database.createAuditLog({
      userId: userId,
      username: user?.username || 'unknown',
      action: 'create',
      resourceType: 'integration',
      resourceId: integration.id,
      description: `创建集成 '${projectName}' [类型: ${projectType}, 事件: ${triggeredEvents.length || 0}个]`,
      status: 'success',
    });

    res.status(201).json({ success: true, data: integration });
  } catch (error) {
    console.error('创建集成错误:', error);
    res.status(500).json({ success: false, error: '内部服务器错误' });
  }
});

/**
 * GET /api/robots/:robotId/integrations/:integrationId
 * 获取单个集成详情
 */
router.get('/:integrationId', verifyToken, checkRobotOwner, async (req: Request, res: Response) => {
  try {
    const { integrationId } = req.params;
    const integration = await database.getIntegrationById(integrationId);

    if (!integration) {
      return res.status(404).json({ success: false, error: '集成不存在' });
    }

    res.json({ success: true, data: integration });
  } catch (error) {
    console.error('获取集成错误:', error);
    res.status(500).json({ success: false, error: '内部服务器错误' });
  }
});

/**
 * PUT /api/robots/:robotId/integrations/:integrationId
 * 更新集成配置（projectName 在创建后不可修改）
 */
router.put('/:integrationId', verifyToken, checkRobotOwner, async (req: Request, res: Response) => {
  try {
    const { integrationId } = req.params;
    const userId = (req as any).user.userId;
    const existingIntegration = await database.getIntegrationById(integrationId);

    if (!existingIntegration) {
      return res.status(404).json({ success: false, error: '集成不存在' });
    }

    const { projectName, projectSubName, config, triggeredEvents, notifyOn, messageTemplate } = req.body;

    const updatedIntegration = await database.updateIntegration(integrationId, {
      ...(projectName !== undefined && { projectName }),
      ...(projectSubName !== undefined && { projectSubName }),
      ...(config !== undefined && { config }),
      ...(triggeredEvents !== undefined && { triggeredEvents }),
      ...(notifyOn !== undefined && { notifyOn }),
      ...(messageTemplate !== undefined && { messageTemplate }),
    });

    // 记录审计日志
    const user = await database.getUserById(userId);
    const changes: string[] = [];
    if (projectName !== undefined) changes.push(`项目名称: ${projectName}`);
    if (projectSubName !== undefined) changes.push(`子项目名: ${projectSubName || '(清除)'}`);
    if (triggeredEvents !== undefined) changes.push(`事件: ${triggeredEvents.length}个`);
    if (notifyOn !== undefined) changes.push(`通知时机: ${notifyOn}`);
    if (messageTemplate !== undefined) changes.push(`消息模板已更新`);

    await database.createAuditLog({
      userId: userId,
      username: user?.username || 'unknown',
      action: 'update',
      resourceType: 'integration',
      resourceId: integrationId,
      description: `更新集成 '${existingIntegration.projectName}' [${changes.join(', ') || '无更改'}]`,
      status: 'success',
    });

    res.json({ success: true, data: updatedIntegration });
  } catch (error) {
    console.error('更新集成错误:', error);
    res.status(500).json({ success: false, error: '内部服务器错误' });
  }
});

/**
 * PATCH /api/robots/:robotId/integrations/:integrationId/status
 * 切换集成状态（启用/停用）
 */
router.patch('/:integrationId/status', verifyToken, checkRobotOwner, async (req: Request, res: Response) => {
  try {
    const { integrationId } = req.params;
    const userId = (req as any).user.userId;
    const { status } = req.body;

    if (!status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, error: '状态必须为"active"或"inactive"' });
    }

    const existingIntegration = await database.getIntegrationById(integrationId);
    if (!existingIntegration) {
      return res.status(404).json({ success: false, error: '集成不存在' });
    }

    const updatedIntegration = await database.updateIntegration(integrationId, { status });
    
    // 记录审计日志
    const user = await database.getUserById(userId);
    await database.createAuditLog({
      userId: userId,
      username: user?.username || 'unknown',
      action: 'update',
      resourceType: 'integration',
      resourceId: integrationId,
      description: `切换集成 '${existingIntegration.projectName}' 状态为: ${status}`,
      status: 'success',
    });
    
    res.json({ success: true, data: updatedIntegration });
  } catch (error) {
    console.error('切换集成状态错误:', error);
    res.status(500).json({ success: false, error: '内部服务器错误' });
  }
});

/**
 * DELETE /api/robots/:robotId/integrations/:integrationId
 * 删除集成
 */
router.delete('/:integrationId', verifyToken, checkRobotOwner, async (req: Request, res: Response) => {
  try {
    const { integrationId } = req.params;
    const userId = (req as any).user.userId;
    const existingIntegration = await database.getIntegrationById(integrationId);

    if (!existingIntegration) {
      return res.status(404).json({ success: false, error: '集成不存在' });
    }

    await database.deleteIntegration(integrationId);
    
    // 记录审计日志
    const user = await database.getUserById(userId);
    await database.createAuditLog({
      userId: userId,
      username: user?.username || 'unknown',
      action: 'delete',
      resourceType: 'integration',
      resourceId: integrationId,
      description: `删除集成 '${existingIntegration.projectName}' [类型: ${existingIntegration.projectType}]`,
      status: 'success',
    });
    
    res.json({ success: true, message: '集成已删除成功' });
  } catch (error) {
    console.error('删除集成错误:', error);
    res.status(500).json({ success: false, error: '内部服务器错误' });
  }
});

export default router;
