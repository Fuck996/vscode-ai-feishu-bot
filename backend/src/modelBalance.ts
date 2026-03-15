import axios from 'axios';

import db, { ModelConfig, Notification } from './database';
import feishuService from './feishu';
import logger from './logger';

export const LOW_BALANCE_THRESHOLD = 1;

const LOW_BALANCE_ALERT_COOLDOWN_MS = 12 * 60 * 60 * 1000;

interface DeepSeekBalanceResponse {
  is_available?: boolean;
  balance_log_list?: Array<{ total_balance?: number }>;
  balance_infos?: Array<{ total_balance?: number }>;
}

export function extractDeepSeekBalance(data: DeepSeekBalanceResponse): number | null {
  if (data.balance_log_list && data.balance_log_list.length > 0) {
    return data.balance_log_list[0].total_balance ?? null;
  }

  if (data.balance_infos && data.balance_infos.length > 0) {
    return data.balance_infos[0].total_balance ?? null;
  }

  return null;
}

export async function fetchModelBalance(model: ModelConfig): Promise<number | null> {
  if (model.provider !== 'deepseek' || !model.apiKey) {
    return null;
  }

  const response = await axios.get<DeepSeekBalanceResponse>('https://api.deepseek.com/user/balance', {
    headers: {
      Authorization: `Bearer ${model.apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 5000,
  });

  return extractDeepSeekBalance(response.data);
}

function isRecentLowBalanceAlert(notification: Notification, title: string, modelId: string): boolean {
  if (notification.title !== title || !notification.createdAt) {
    return false;
  }

  const createdAtTime = new Date(notification.createdAt).getTime();
  if (!Number.isFinite(createdAtTime) || Date.now() - createdAtTime > LOW_BALANCE_ALERT_COOLDOWN_MS) {
    return false;
  }

  if (!notification.details) {
    return false;
  }

  try {
    const parsed = JSON.parse(notification.details) as { modelId?: string };
    return parsed.modelId === modelId;
  } catch {
    return false;
  }
}

export async function notifyLowBalanceIfNeeded(model: ModelConfig, balance: number | null, trigger: string): Promise<void> {
  if (balance === null || balance > LOW_BALANCE_THRESHOLD) {
    return;
  }

  const title = `${model.name} 余额不足预警`;
  const recentWarnings = await db.getNotifications(200, 0, 'warning');
  const hasRecentAlert = recentWarnings.some((notification) => isRecentLowBalanceAlert(notification, title, model.id));

  if (hasRecentAlert) {
    logger.info({ modelId: model.id, modelName: model.name, balance, trigger }, '低余额预警冷却中，跳过重复通知');
    return;
  }

  const details = {
    modelId: model.id,
    modelName: model.name,
    provider: model.provider,
    balance,
    threshold: LOW_BALANCE_THRESHOLD,
    trigger,
  };

  const summary = `检测到模型 ${model.name} 当前余额为 ¥${balance.toFixed(2)}，已低于预警阈值 ¥${LOW_BALANCE_THRESHOLD.toFixed(2)}。\n触发节点：${trigger}。\n请及时充值，避免 AI 汇报任务中断。`;

  await db.saveNotification({
    title,
    summary,
    status: 'warning',
    source: model.name,
    details: JSON.stringify(details),
  });

  try {
    await feishuService.sendRichNotification({
      title,
      summary,
      status: 'warning',
      source: model.name,
      details,
    });
    logger.warn({ modelId: model.id, modelName: model.name, balance, trigger }, '已发送低余额飞书预警');
  } catch (error) {
    logger.warn({ modelId: model.id, modelName: model.name, balance, trigger, error }, '低余额飞书预警发送失败');
  }
}