import { Router, Request, Response } from 'express';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

import db, { Integration, ModelConfig, Notification, PromptTemplate, ReportTask, ReportTaskHistory, ReportTaskRange, Robot } from '../database';
import { getLogs } from '../serviceLogger';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

interface AuthPayload {
  userId: string;
  username: string;
  role: string;
}

interface AuthRequest extends Request {
  userId?: string;
  username?: string;
  role?: string;
}

function verifyToken(req: Request, res: Response, next: Function) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: '缺少授权信息' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    (req as AuthRequest).userId = decoded.userId;
    (req as AuthRequest).username = decoded.username;
    (req as AuthRequest).role = decoded.role;
    next();
  } catch {
    return res.status(401).json({ success: false, error: '无效或过期的 Token' });
  }
}

function checkAdminRole(req: AuthRequest, res: Response, next: Function) {
  if (req.role !== 'admin') {
    return res.status(403).json({ success: false, error: '仅管理员可访问此功能' });
  }

  next();
}

function formatUptime(): string {
  const seconds = Math.floor(process.uptime());
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function parseTimeToMinutes(sendTime: string): number {
  const [hourText = '0', minuteText = '0'] = sendTime.split(':');
  return Number(hourText) * 60 + Number(minuteText);
}

function computeNextRun(weekdays: number[], sendTime: string): string {
  if (!weekdays.length) {
    return '';
  }

  const now = new Date();
  const targetMinutes = parseTimeToMinutes(sendTime);
  let bestDate: Date | null = null;

  for (let offset = 0; offset < 14; offset += 1) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);

    const currentWeekday = candidate.getDay() === 0 ? 7 : candidate.getDay();
    if (!weekdays.includes(currentWeekday)) {
      continue;
    }

    candidate.setHours(Math.floor(targetMinutes / 60), targetMinutes % 60, 0, 0);
    if (candidate.getTime() <= now.getTime()) {
      continue;
    }

    if (!bestDate || candidate.getTime() < bestDate.getTime()) {
      bestDate = candidate;
    }
  }

  return bestDate ? bestDate.toISOString() : '';
}

function formatNextRunCountdown(nextRunAt?: string): string {
  if (!nextRunAt) {
    return '未设置';
  }

  const diff = new Date(nextRunAt).getTime() - Date.now();
  if (diff <= 0) {
    return '即将发送';
  }

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}天 ${hours}小时 ${minutes}分钟`;
  }

  if (hours > 0) {
    return `${hours}小时 ${minutes}分钟`;
  }

  return `${minutes}分钟`;
}

function formatRangeLabel(rangeType: ReportTaskRange): string {
  switch (rangeType) {
    case '14d':
      return '最近 14 天';
    case '30d':
      return '最近 30 天';
    case 'week':
      return '本周';
    case 'month':
      return '本月';
    case '7d':
    default:
      return '最近 7 天';
  }
}

function getRangeStart(rangeType: ReportTaskRange): Date {
  const now = new Date();
  const base = new Date(now);
  base.setHours(0, 0, 0, 0);

  switch (rangeType) {
    case '14d':
      base.setDate(base.getDate() - 13);
      return base;
    case '30d':
      base.setDate(base.getDate() - 29);
      return base;
    case 'week': {
      const weekday = base.getDay() === 0 ? 7 : base.getDay();
      base.setDate(base.getDate() - weekday + 1);
      return base;
    }
    case 'month':
      base.setDate(1);
      return base;
    case '7d':
    default:
      base.setDate(base.getDate() - 6);
      return base;
  }
}

function formatPeriodLabel(start: Date, end: Date): string {
  const startText = start.toISOString().slice(0, 10);
  const endText = end.toISOString().slice(0, 10);
  return `${startText} ~ ${endText}`;
}

function sanitizeModel(model: ModelConfig): ModelConfig {
  return {
    ...model,
    apiKey: undefined,
    hasApiKey: Boolean(model.apiKey),
  };
}

function sanitizePrompt(prompt: PromptTemplate): PromptTemplate {
  return prompt;
}

async function buildTaskDetail(task: ReportTask) {
  const robot = await db.getRobotById(task.robotId);
  const integrations = await Promise.all(task.integrationIds.map(id => db.getIntegrationById(id)));
  const model = await db.getModelConfig(task.modelConfigId);
  const prompt = await db.getPromptTemplate(task.promptTemplateId);

  return {
    ...task,
    robotName: robot?.name || '未知机器人',
    integrations: integrations.filter(Boolean).map(item => ({
      id: (item as Integration).id,
      name: (item as Integration).projectName,
      type: (item as Integration).projectType,
    })),
    modelName: model?.name || '未知模型',
    promptName: prompt?.name || '未知提示词',
    scheduleText: `每周${task.weekdays.map(day => WEEKDAY_LABELS[day - 1]).join('、')} ${task.sendTime}`,
    nextRunAt: computeNextRun(task.weekdays, task.sendTime),
  };
}

async function validateTaskPayload(payload: any, existingTask?: ReportTask): Promise<ReportTask> {
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const description = typeof payload.description === 'string' ? payload.description.trim() : '';
  const weekdays = Array.isArray(payload.weekdays)
    ? payload.weekdays.map((item: unknown) => Number(item)).filter((item: number) => item >= 1 && item <= 7)
    : [];
  const sendTime = typeof payload.sendTime === 'string' ? payload.sendTime.trim() : '';
  const rangeType = ['7d', '14d', '30d', 'week', 'month'].includes(payload.rangeType) ? payload.rangeType as ReportTaskRange : '7d';
  const robotId = typeof payload.robotId === 'string' ? payload.robotId : '';
  const integrationIds = Array.isArray(payload.integrationIds)
    ? payload.integrationIds.filter((item: unknown): item is string => typeof item === 'string' && item.trim() !== '')
    : [];
  const notificationStatuses = Array.isArray(payload.notificationStatuses)
    ? payload.notificationStatuses.filter((item: unknown): item is Notification['status'] => ['success', 'error', 'warning', 'info'].includes(String(item)))
    : [];
  const modelConfigId = typeof payload.modelConfigId === 'string' ? payload.modelConfigId : '';
  const promptTemplateId = typeof payload.promptTemplateId === 'string' ? payload.promptTemplateId : '';
  const status = payload.status === 'inactive' ? 'inactive' : 'active';

  if (!name || !weekdays.length || !sendTime || !robotId || !integrationIds.length || !notificationStatuses.length || !modelConfigId || !promptTemplateId) {
    throw new Error('任务信息不完整，请检查名称、发送计划、机器人、集成、状态、模型和提示词配置');
  }

  const robot = await db.getRobotById(robotId);
  if (!robot) {
    throw new Error('所选机器人不存在');
  }

  const integrations = await Promise.all(integrationIds.map((id: string) => db.getIntegrationById(id)));
  if (integrations.some(item => !item || item.robotId !== robotId)) {
    throw new Error('所选集成与当前机器人不匹配');
  }

  const model = await db.getModelConfig(modelConfigId);
  if (!model || model.status === 'unconfigured') {
    throw new Error('所选模型不存在或尚未配置完成');
  }

  const prompt = await db.getPromptTemplate(promptTemplateId);
  if (!prompt) {
    throw new Error('所选提示词不存在');
  }

  const now = new Date().toISOString();
  return {
    id: existingTask?.id || crypto.randomUUID(),
    name,
    description,
    weekdays,
    sendTime,
    rangeType,
    robotId,
    integrationIds,
    notificationStatuses,
    modelConfigId,
    promptTemplateId,
    status,
    lastSentAt: existingTask?.lastSentAt,
    createdAt: existingTask?.createdAt || now,
    updatedAt: now,
  };
}

async function runReportTask(task: ReportTask): Promise<ReportTaskHistory> {
  const robot = await db.getRobotById(task.robotId);
  const model = await db.getModelConfig(task.modelConfigId);
  const prompt = await db.getPromptTemplate(task.promptTemplateId);
  const integrations = await Promise.all(task.integrationIds.map(id => db.getIntegrationById(id)));
  const validIntegrations = integrations.filter(Boolean) as Integration[];

  const start = getRangeStart(task.rangeType);
  const end = new Date();
  const allNotifications = await db.getNotifications(10000, 0);
  const relatedNotifications = allNotifications.filter(notification => {
    if (!notification.createdAt) {
      return false;
    }

    const createdAt = new Date(notification.createdAt);
    if (createdAt < start || createdAt > end) {
      return false;
    }

    if (!task.notificationStatuses.includes(notification.status)) {
      return false;
    }

    if (robot && notification.robotName && notification.robotName !== robot.name) {
      return false;
    }

    if (!validIntegrations.length) {
      return true;
    }

    return validIntegrations.some(integration => {
      const source = notification.source || '';
      return source.includes(integration.id) || source.includes(integration.projectName);
    });
  });

  const historyStatus = model && prompt && model.status !== 'unconfigured' ? 'success' : 'failed';
  const summary = historyStatus === 'success'
    ? `任务「${task.name}」使用模型 ${model?.name || '未知模型'} 与提示词 ${prompt?.name || '未知提示词'}，汇总了 ${relatedNotifications.length} 条通知。`
    : `任务「${task.name}」执行失败：模型或提示词配置不可用。`;

  const createdAt = new Date().toISOString();
  const history: ReportTaskHistory = {
    id: crypto.randomUUID(),
    taskId: task.id,
    taskName: task.name,
    periodLabel: formatPeriodLabel(start, end),
    notificationCount: relatedNotifications.length,
    summary,
    status: historyStatus,
    modelName: model?.name || '未知模型',
    promptName: prompt?.name || '未知提示词',
    createdAt,
  };

  await db.saveReportTaskHistory(history);
  task.lastSentAt = createdAt;
  await db.saveReportTask(task);

  await db.saveNotification({
    title: `AI 汇报任务执行${historyStatus === 'success' ? '成功' : '失败'}: ${task.name}`,
    summary,
    status: historyStatus === 'success' ? 'success' : 'error',
    robotName: robot?.name,
    source: `ai-report-task/${task.id}`,
    details: JSON.stringify({
      taskId: task.id,
      period: history.periodLabel,
      modelName: history.modelName,
      promptName: history.promptName,
      notificationCount: history.notificationCount,
    }),
  });

  return history;
}

router.get('/', verifyToken, checkAdminRole, async (_req: AuthRequest, res: Response) => {
  try {
    const integrations = await db.getAllIntegrations();
    const mcpIntegrations = integrations.filter(integration => integration.status === 'active' && integration.projectType === 'vscode-chat');

    const histories = await db.getReportTaskHistories();
    const tasks = await db.getAllReportTasks();
    const nextRunAt = tasks
      .filter(task => task.status === 'active')
      .map(task => computeNextRun(task.weekdays, task.sendTime))
      .filter(Boolean)
      .sort()[0];

    const services = [
      {
        id: 'mcp-service',
        name: 'MCP 工作汇报服务',
        type: 'Model Context Protocol',
        icon: '📋',
        description: 'VS Code Copilot 工作汇报中间件，自动将任务总结发送到飞书群组',
        status: 'running',
        associatedIntegrations: mcpIntegrations.length,
        stats: [
          { label: '周报任务', value: String(tasks.length) },
          { label: '本周发送', value: String(histories.filter(item => new Date(item.createdAt) >= getRangeStart('week')).length) },
          { label: '运行时间', value: formatUptime() },
        ],
        isScheduled: Boolean(nextRunAt),
        nextRunTime: nextRunAt,
        uptime: formatUptime(),
      },
    ];

    res.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ success: false, error: '获取服务列表失败' });
  }
});

router.get('/logs', verifyToken, checkAdminRole, async (_req: AuthRequest, res: Response) => {
  try {
    res.json(getLogs(100));
  } catch (error) {
    console.error('Error fetching service logs:', error);
    res.status(500).json({ success: false, error: '获取日志失败' });
  }
});

router.get('/report-tasks/meta', verifyToken, checkAdminRole, async (_req: AuthRequest, res: Response) => {
  try {
    const robots = await db.getAllRobots();
    const integrations = await db.getAllIntegrations();
    const models = (await db.getAllModelConfigs()).filter(model => model.status !== 'unconfigured').map(sanitizeModel);
    const prompts = (await db.getAllPromptTemplates()).map(sanitizePrompt);

    res.json({
      success: true,
      data: {
        robots,
        integrations,
        models,
        prompts,
      },
    });
  } catch (error) {
    console.error('Error fetching report task metadata:', error);
    res.status(500).json({ success: false, error: '获取任务元数据失败' });
  }
});

router.get('/report-tasks', verifyToken, checkAdminRole, async (_req: AuthRequest, res: Response) => {
  try {
    const tasks = await db.getAllReportTasks();
    const detailedTasks = await Promise.all(tasks.map(task => buildTaskDetail(task)));
    res.json({ success: true, data: detailedTasks });
  } catch (error) {
    console.error('Error fetching report tasks:', error);
    res.status(500).json({ success: false, error: '获取任务列表失败' });
  }
});

router.get('/report-task-history', verifyToken, checkAdminRole, async (_req: AuthRequest, res: Response) => {
  try {
    const histories = await db.getReportTaskHistories();
    res.json({ success: true, data: histories });
  } catch (error) {
    console.error('Error fetching report task history:', error);
    res.status(500).json({ success: false, error: '获取发送历史失败' });
  }
});

router.post('/report-tasks', verifyToken, checkAdminRole, async (req: AuthRequest, res: Response) => {
  try {
    const task = await validateTaskPayload(req.body);
    const saved = await db.saveReportTask(task);
    res.status(201).json({ success: true, data: await buildTaskDetail(saved) });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : '创建任务失败' });
  }
});

router.put('/report-tasks/:taskId', verifyToken, checkAdminRole, async (req: AuthRequest, res: Response) => {
  try {
    const existingTask = await db.getReportTask(req.params.taskId);
    if (!existingTask) {
      return res.status(404).json({ success: false, error: '任务不存在' });
    }

    const task = await validateTaskPayload(req.body, existingTask);
    const saved = await db.saveReportTask(task);
    res.json({ success: true, data: await buildTaskDetail(saved) });
  } catch (error) {
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : '更新任务失败' });
  }
});

router.patch('/report-tasks/:taskId/status', verifyToken, checkAdminRole, async (req: AuthRequest, res: Response) => {
  try {
    const task = await db.getReportTask(req.params.taskId);
    if (!task) {
      return res.status(404).json({ success: false, error: '任务不存在' });
    }

    task.status = req.body.status === 'inactive' ? 'inactive' : 'active';
    const saved = await db.saveReportTask(task);
    res.json({ success: true, data: await buildTaskDetail(saved) });
  } catch (error) {
    res.status(500).json({ success: false, error: '切换任务状态失败' });
  }
});

router.post('/report-tasks/:taskId/run', verifyToken, checkAdminRole, async (req: AuthRequest, res: Response) => {
  try {
    const task = await db.getReportTask(req.params.taskId);
    if (!task) {
      return res.status(404).json({ success: false, error: '任务不存在' });
    }

    const history = await runReportTask(task);
    res.json({ success: true, data: history, message: history.status === 'success' ? '任务已手动发送' : '任务执行失败' });
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '手动发送失败' });
  }
});

router.delete('/report-tasks/:taskId', verifyToken, checkAdminRole, async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await db.deleteReportTask(req.params.taskId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: '任务不存在' });
    }

    res.json({ success: true, message: '任务已删除' });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除任务失败' });
  }
});

router.post('/:serviceId/action', verifyToken, checkAdminRole, async (req: AuthRequest, res: Response) => {
  try {
    const { serviceId } = req.params;
    const { action } = req.body;

    if (!['start', 'stop', 'restart'].includes(action)) {
      return res.status(400).json({ success: false, error: '无效的操作' });
    }

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
