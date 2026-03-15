import { Router, Request, Response } from 'express';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import axios from 'axios';

import db, { Integration, ModelConfig, Notification, PromptTemplate, ReportTask, ReportTaskHistory, ReportTaskRange, Robot } from '../database';
import { getLogs } from '../serviceLogger';
import logger from '../logger';

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
    case '1d':
      // 前一天 0 点
      base.setDate(base.getDate() - 1);
      return base;
    case '7d':
      // 7 天前 0 点（不包含当日，最多 6 天前到昨天）
      base.setDate(base.getDate() - 7);
      return base;
    case '14d':
      // 14 天前 0 点
      base.setDate(base.getDate() - 14);
      return base;
    case '30d':
      // 30 天前 0 点
      base.setDate(base.getDate() - 30);
      return base;
    case 'today':
      // 当日 0 点
      return base;
    case 'week': {
      // 本周一 0 点
      const weekday = base.getDay() === 0 ? 7 : base.getDay();
      base.setDate(base.getDate() - weekday + 1);
      return base;
    }
    case 'month':
      // 本月 1 日 0 点
      base.setDate(1);
      return base;
    default:
      base.setDate(base.getDate() - 7);
      return base;
  }
}

function getRangeEnd(rangeType: ReportTaskRange): Date {
  const now = new Date();
  const base = new Date(now);
  base.setHours(23, 59, 59, 999);

  switch (rangeType) {
    case '1d':
    case '7d':
    case '14d':
    case '30d':
      // "最近 X 天"的 end 应该是当日前一天的 23:59:59
      base.setDate(base.getDate() - 1);
      base.setHours(23, 59, 59, 999);
      return base;
    case 'today':
      // 当日 23:59:59
      return base;
    case 'week': {
      // 本周日 23:59:59
      const weekday = base.getDay() === 0 ? 7 : base.getDay();
      base.setDate(base.getDate() - weekday + 7);
      base.setHours(23, 59, 59, 999);
      return base;
    }
    case 'month':
      // 本月最后一天 23:59:59
      base.setMonth(base.getMonth() + 1);
      base.setDate(0);
      base.setHours(23, 59, 59, 999);
      return base;
    default:
      base.setDate(base.getDate() - 1);
      base.setHours(23, 59, 59, 999);
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
  const rangeType = ['1d', '7d', '14d', '30d', 'today', 'week', 'month'].includes(payload.rangeType) ? payload.rangeType as ReportTaskRange : '7d';
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
  // 【新增】最多发送给模型的条数，默认50，范围1-1000
  const maxNotifications = Math.min(Math.max(1, Number(payload.maxNotifications) || 50), 1000);

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
    maxNotifications,  // 【新增】保存用户配置的最大条数
    status,
    lastSentAt: existingTask?.lastSentAt,
    createdAt: existingTask?.createdAt || now,
    updatedAt: now,
  };
}

/**
 * 格式化通知为 JSON 方案A（结构化数据）
 * - 包含统计信息和关键事件
 * - 按优先级+时间智能选择最重要的通知（由用户配置最大条数）
 * - 确保不会遗漏关键的错误和警告
 */
function formatNotificationsAsJSON(
  notifications: Array<Notification & { id?: number; createdAt?: string }>,
  maxNotifications: number = 50  // 【新增】用户可配置，默认50
): {
  total: number;
  originalCount: number;
  statistics: Record<string, number>;
  events: Array<{
    status: string;
    title: string;
    summary: string;
    timestamp: string;
  }>;
  truncated: boolean;
  maxLimit: number;
} {
  // 过滤有效通知
  const validNotifications = notifications.filter(n => n.createdAt && n.id);
  const originalCount = validNotifications.length;

  // 智能排序：优先级 > 时间（相同优先级内按时间倒序）
  const priorityMap = { error: 0, warning: 1, success: 2, info: 3 };
  const sorted = validNotifications.sort((a, b) => {
    const priorityDiff = (priorityMap[a.status] ?? 99) - (priorityMap[b.status] ?? 99);
    if (priorityDiff !== 0) return priorityDiff;

    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  // 限制为配置的最大条数，并标记是否被截断
  const selected = sorted.slice(0, maxNotifications);
  const truncated = originalCount > maxNotifications;

  // 统计各类型
  const statistics: Record<string, number> = {
    success: 0,
    error: 0,
    warning: 0,
    info: 0,
  };

  selected.forEach(n => {
    statistics[n.status] = (statistics[n.status] || 0) + 1;
  });

  // 构建事件列表（已按优先级+时间排序，取前20条）
  const events = selected
    .slice(0, 20)
    .map(n => ({
      status: n.status,
      title: n.title,
      summary: n.summary,
      timestamp: n.createdAt || new Date().toISOString(),
    }));

  return {
    total: selected.length,
    originalCount,
    statistics,
    events,
    truncated,
    maxLimit: maxNotifications,
  };
}

/**
 * 调用 LLM API 生成报告
 * 支持 DeepSeek、OpenAI、Google 等模型
 */
async function callLLMAPI(
  model: ModelConfig,
  promptTemplate: PromptTemplate,
  notificationData: ReturnType<typeof formatNotificationsAsJSON>,
  taskName: string
): Promise<string> {
  if (!model.apiKey || !model.apiUrl || !model.modelId) {
    throw new Error(`模型 ${model.name} 配置不完整`);
  }

  const conversationHistory = [
    {
      role: 'user',
      content: `${promptTemplate.content}\n\n【当前数据】\n${JSON.stringify(notificationData, null, 2)}\n\n请生成关于"${taskName}"的汇报。`,
    },
  ];

  try {
    const response = await axios.post(
      `${model.apiUrl}/v1/chat/completions`,
      {
        model: model.modelId,
        messages: conversationHistory,
        temperature: 0.7,
        max_tokens: 2000,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${model.apiKey}`,
        },
        timeout: 60000, // 60秒超时
      }
    );

    const choices = response.data?.choices || [];
    if (!choices.length) {
      throw new Error('模型返回空结果');
    }

    const reportContent = choices[0]?.message?.content || '无法生成报告';

    // 【新增】异步查询模型余额（仅 DeepSeek 支持，不等待结果）
    if (model.provider === 'deepseek' && model.apiKey) {
      (async () => {
        try {
          const balanceUrl = 'https://api.deepseek.com/user/balance';
          const balanceResponse = await axios.get(balanceUrl, {
            headers: {
              'Authorization': `Bearer ${model.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 5000,
          });

          const balanceData = balanceResponse.data as {
            is_available?: boolean;
            balance_log_list?: Array<{ total_balance?: number }>;
            balance_infos?: Array<{ total_balance?: number }>;
          };

          let balance: number | null = null;
          if (balanceData.balance_log_list && balanceData.balance_log_list.length > 0) {
            balance = balanceData.balance_log_list[0].total_balance ?? null;
          } else if (balanceData.balance_infos && balanceData.balance_infos.length > 0) {
            balance = balanceData.balance_infos[0].total_balance ?? null;
          }

          if (balance !== null) {
            logger.info({ modelId: model.id, balance }, '模型余额查询成功（异步更新）');
          }
        } catch (balanceError) {
          logger.debug({ modelId: model.id, error: balanceError }, '异步查询余额失败（不影响主流程）');
        }
      })();
    }

    return reportContent;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error({ modelName: model.name, error: errorMsg }, 'LLM API 调用失败');
    throw new Error(`调用模型 ${model.name} 失败: ${errorMsg}`);
  }
}

/**
 * 发送报告到汇报机器人的 Webhook
 */
async function sendReportToRobot(
  robot: Robot | null,
  report: string,
  taskName: string,
  statisticsData: any
): Promise<void> {
  if (!robot || !robot.webhookUrl) {
    throw new Error('汇报机器人未配置或 Webhook URL 为空');
  }

  try {
    // 构建飞书消息卡片
    const message = {
      msg_type: 'interactive',
      card: {
        config: { wide_screen_mode: true },
        header: {
          title: { content: `📊 ${taskName} - AI 周报`, tag: 'plain_text' },
          template: 'blue',
        },
        elements: [
          {
            tag: 'markdown',
            content: report,
          },
          {
            tag: 'hr',
          },
          {
            tag: 'note',
            elements: [
              {
                tag: 'plain_text',
                content: `📈 统计: 成功 ${statisticsData.success || 0} | 警告 ${statisticsData.warning || 0} | 错误 ${statisticsData.error || 0} | 信息 ${statisticsData.info || 0}`,
              },
              {
                tag: 'plain_text',
                content: `⏰ 生成时间: ${new Date().toISOString()}`,
              },
            ],
          },
        ],
      },
    };

    await axios.post(robot.webhookUrl, message, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    logger.info({ robotId: robot.id, taskName }, '报告已发送到汇报机器人');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error({ robotName: robot?.name, error: errorMsg }, '发送报告到机器人失败');
    throw new Error(`发送报告失败: ${errorMsg}`);
  }
}

async function runReportTask(task: ReportTask): Promise<ReportTaskHistory> {
  const robot = await db.getRobotById(task.robotId);
  const model = await db.getModelConfig(task.modelConfigId);
  const prompt = await db.getPromptTemplate(task.promptTemplateId);
  const integrations = await Promise.all(task.integrationIds.map(id => db.getIntegrationById(id)));
  const validIntegrations = integrations.filter(Boolean) as Integration[];

  const start = getRangeStart(task.rangeType);
  const end = getRangeEnd(task.rangeType);
  const allNotifications = await db.getNotifications(10000, 0);
  
  // 过滤通知：时间 + 状态 + 机器人 + 集成 + 排除汇报任务产生的数据
  let relatedNotifications = allNotifications.filter(notification => {
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

    // 【新增】排除汇报任务相关的数据污染
    // 1. 排除来自汇报机器人本身的通知（防止循环）
    if (robot && notification.robotName === robot.name) {
      return false;
    }

    // 2. 排除 source 中包含"汇报"、"报告"等关键词的通知
    const source = (notification.source || '').toLowerCase();
    if (source.includes('report') || source.includes('汇报')) {
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

  const createdAt = new Date().toISOString();
  let historyStatus: 'success' | 'failed' = 'failed';
  let summary = '';
  let generatedReport = '';

  try {
    // 【优化1】配置有效性检查
    if (!model || !prompt || model.status === 'unconfigured') {
      throw new Error('模型或提示词配置不可用');
    }

    if (!robot || !robot.webhookUrl) {
      throw new Error('汇报机器人未配置');
    }

    // 【优化2】格式化通知数据为 JSON 方案A（智能选择最重要的通知）
    // 使用任务配置的 maxNotifications（默认50），也可用户自定义
    const maxNotifications = task.maxNotifications || 50;
    const formattedData = formatNotificationsAsJSON(relatedNotifications, maxNotifications);

    // 记录收集和选择情况
    logger.info(
      {
        taskName: task.name,
        collectedCount: relatedNotifications.length,
        selectedCount: formattedData.total,
        originalCount: formattedData.originalCount,
        truncated: formattedData.truncated,
      },
      `通知收集完成${formattedData.truncated ? '（已超50条限制，按优先级智能选择）' : ''}`
    );

    logger.info(
      {
        taskName: task.name,
        selectedCount: formattedData.total,
        statistics: formattedData.statistics,
      },
      '开始调用 LLM 生成报告'
    );

    // 【优化3】调用 LLM API 生成报告
    generatedReport = await callLLMAPI(model, prompt, formattedData, task.name);

    logger.info(
      { taskName: task.name, reportLength: generatedReport.length },
      'LLM 报告生成成功'
    );

    // 【优化4】发送报告到汇报机器人
    await sendReportToRobot(robot, generatedReport, task.name, formattedData.statistics);

    // 【新增】记录任务发送日志
    logger.info(
      { 
        taskId: task.id,
        taskName: task.name,
        robotId: robot.id,
        robotName: robot.name,
        notificationCount: formattedData.total,
        reportLength: generatedReport.length,
        statistics: {
          success: formattedData.statistics?.success || 0,
          error: formattedData.statistics?.error || 0,
          warning: formattedData.statistics?.warning || 0,
          info: formattedData.statistics?.info || 0
        }
      },
      '汇报通知已发送至机器人'
    );

    // 设置成功状态
    historyStatus = 'success';
    const truncationHint = formattedData.truncated
      ? `（原始 ${formattedData.originalCount} 条，按优先级选择 ${formattedData.total} 条）`
      : '';
    summary = `任务「${task.name}」成功执行：通过模型 ${model.name} 汇总了 ${formattedData.total} 条通知${truncationHint}，并已发送给汇报机器人。`;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(
      { taskName: task.name, error: errorMsg },
      '汇报任务执行失败'
    );
    summary = `任务「${task.name}」执行失败：${errorMsg}`;
  }

  // 保存历史记录
  const history: ReportTaskHistory = {
    id: crypto.randomUUID(),
    taskId: task.id,
    taskName: task.name,
    periodLabel: formatPeriodLabel(start, end),
    notificationCount: relatedNotifications.length,
    summary: `${summary}${generatedReport ? `\n\n【生成内容】\n${generatedReport.substring(0, 300)}...` : ''}`,
    status: historyStatus,
    modelName: model?.name || '未知模型',
    promptName: prompt?.name || '未知提示词',
    createdAt,
  };

  await db.saveReportTaskHistory(history);
  task.lastSentAt = createdAt;
  await db.saveReportTask(task);

  // 保存执行事件到通知系统
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
      sentToRobot: historyStatus === 'success',
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
          { label: '关联任务', value: String(tasks.length) },
          { label: '今日调用', value: String(histories.filter(item => {
            const itemDate = new Date(item.createdAt);
            const today = new Date();
            return itemDate.toDateString() === today.toDateString();
          }).length) },
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
