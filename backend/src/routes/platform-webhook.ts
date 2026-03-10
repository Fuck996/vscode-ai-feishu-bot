/**
 * Platform Webhook 接收路由
 *
 * 外部平台（Vercel / Railway / GitHub / GitLab / VS Code Chat / Direct API / Custom）
 * 向此路由 POST 事件通知，系统验证签名后解析事件并通过对应机器人发送飞书卡片消息。
 *
 * 端点：POST /api/webhook/:integrationId
 */

import { Router, Request, Response } from 'express';
import * as crypto from 'crypto';
import axios from 'axios';
import database from '../database';
import logger from '../logger';

const router = Router();

// ===== 签名验证函数 =====

/** 验证 GitHub HMAC-SHA256 签名（X-Hub-Signature-256 header） */
function verifyGitHubSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/** 验证 Vercel HMAC-SHA1 签名（x-vercel-signature header） */
function verifyVercelSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha1', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

// ===== 标准化事件结构 =====

interface NormalizedEvent {
  event: string;
  status: 'success' | 'failure' | 'info';
  title: string;
  summary: string;
  url?: string;
}

/** 解析 GitHub Webhook payload */
function normalizeGitHub(headers: Record<string, any>, body: Record<string, any>): NormalizedEvent | null {
  const ghEvent = headers['x-github-event'];
  switch (ghEvent) {
    case 'push':
      return {
        event: 'commit_pushed', status: 'info',
        title: '📦 代码推送',
        summary: `仓库 **${body.repository?.full_name}**\n分支：${body.ref?.replace('refs/heads/', '')}\n推送者：${body.pusher?.name}\n提交数：${body.commits?.length || 1}`,
        url: body.repository?.html_url,
      };
    case 'pull_request': {
      const pr = body.pull_request;
      if (body.action === 'opened') return { event: 'pr_opened', status: 'info', title: '🔀 PR 已开启', summary: `**#${pr?.number}** ${pr?.title}\n作者：${pr?.user?.login}`, url: pr?.html_url };
      if (body.action === 'closed' && pr?.merged) return { event: 'pr_merged', status: 'success', title: '✅ PR 已合并', summary: `**#${pr?.number}** ${pr?.title}\n合并者：${body.sender?.login}`, url: pr?.html_url };
      return null;
    }
    case 'workflow_run': {
      const wr = body.workflow_run;
      const isSuccess = wr?.conclusion === 'success';
      return {
        event: 'workflow_run',
        status: isSuccess ? 'success' : 'failure',
        title: `${isSuccess ? '✅' : '❌'} GitHub Actions ${isSuccess ? '成功' : '失败'}`,
        summary: `工作流：${wr?.name}\n分支：${wr?.head_branch}\n提交：${wr?.head_sha?.substring(0, 7)}`,
        url: wr?.html_url,
      };
    }
    case 'release':
      return { event: 'version_released', status: 'success', title: '🏷️ 版本发布', summary: `**${body.release?.tag_name}** ${body.release?.name || ''}`, url: body.release?.html_url };
    default:
      return null;
  }
}

/** 解析 Vercel Webhook payload */
function normalizeVercel(body: Record<string, any>): NormalizedEvent | null {
  const type = body.type as string;
  const p = body.payload || {};
  const name = p.name || p.project?.name || '项目';
  const target = p.target || 'production';
  const url = p.url ? `https://${p.url}` : undefined;

  switch (type) {
    case 'deployment.created':
      return { event: 'deploy_started', status: 'info', title: '⏳ Vercel 部署开始', summary: `**${name}** 开始部署到 ${target}`, url };
    case 'deployment.succeeded':
      return { event: 'deploy_success', status: 'success', title: '✅ Vercel 部署成功', summary: `**${name}** 已部署至 ${target}${url ? `\n🌐 ${url}` : ''}`, url };
    case 'deployment.failed':
      return { event: 'deploy_failure', status: 'failure', title: '❌ Vercel 部署失败', summary: `**${name}** 部署失败（${target}）${p.error?.message ? `\n错误：${p.error.message}` : ''}`, url };
    case 'deployment.ready':
      return { event: 'deployment_ready', status: 'success', title: '🌐 Vercel 域名就绪', summary: `**${name}** 已上线${url ? `\n🔗 ${url}` : ''}`, url };
    case 'deployment.canceled':
      return { event: 'deploy_canceled', status: 'info', title: '🚫 Vercel 部署取消', summary: `**${name}** 部署已取消` };
    default:
      return null;
  }
}

/** 解析 Railway Webhook payload */
function normalizeRailway(body: Record<string, any>): NormalizedEvent | null {
  const type = (body.type as string || '').toUpperCase();
  const project = body.project?.name || body.projectId || '项目';
  const service = body.service?.name || body.serviceName || '服务';

  if (type.includes('SUCCESS') || type === 'DEPLOYMENT_SUCCESS') {
    return { event: 'deploy_success', status: 'success', title: '✅ Railway 部署成功', summary: `**${project}** / ${service} 部署成功`, url: body.deployment?.url };
  }
  if (type.includes('FAILED') || type.includes('FAILURE')) {
    return { event: 'deploy_failure', status: 'failure', title: '❌ Railway 部署失败', summary: `**${project}** / ${service} 部署失败` };
  }
  if (type === 'SERVICE_CRASH' || type === 'CRASH') {
    return { event: 'service_crash', status: 'failure', title: '🚨 Railway 服务崩溃', summary: `**${project}** / ${service} 发生崩溃\n时间：${new Date().toLocaleString('zh-CN')}` };
  }
  return null;
}

/** 解析 GitLab Webhook payload */
function normalizeGitLab(headers: Record<string, any>, body: Record<string, any>): NormalizedEvent | null {
  const event = headers['x-gitlab-event'];
  const obj = body.object_attributes || {};
  const project = body.project?.path_with_namespace || body.repository?.name || '项目';

  switch (event) {
    case 'Push Hook':
      return { event: 'commit_pushed', status: 'info', title: '📦 GitLab 代码推送', summary: `**${project}**\n分支：${body.ref?.replace('refs/heads/', '')}\n推送者：${body.user_name}\n提交数：${body.commits?.length || 1}` };
    case 'Merge Request Hook': {
      if (obj.action === 'open') return { event: 'pr_opened', status: 'info', title: '🔀 MR 已开启', summary: `**!${obj.iid}** ${obj.title}\n作者：${body.user?.name}`, url: obj.url };
      if (obj.action === 'merge') return { event: 'pr_merged', status: 'success', title: '✅ MR 已合并', summary: `**!${obj.iid}** ${obj.title}`, url: obj.url };
      return null;
    }
    case 'Pipeline Hook': {
      const status = obj.status;
      if (status === 'success') return { event: 'pipeline_done', status: 'success', title: '✅ GitLab Pipeline 成功', summary: `**${project}** #${obj.id}\n分支：${obj.ref}`, url: `${body.project?.web_url}/-/pipelines/${obj.id}` };
      if (status === 'failed') return { event: 'pipeline_done', status: 'failure', title: '❌ GitLab Pipeline 失败', summary: `**${project}** #${obj.id}\n分支：${obj.ref}`, url: `${body.project?.web_url}/-/pipelines/${obj.id}` };
      return null;
    }
    case 'Tag Push Hook':
      return { event: 'version_released', status: 'success', title: '🏷️ GitLab 标签推送', summary: `**${project}** 新标签：${body.ref?.replace('refs/tags/', '')}` };
    default:
      return null;
  }
}

/** 解析通用格式（Direct API / VS Code Chat / Custom Webhook） */
function normalizeGeneric(body: Record<string, any>): NormalizedEvent {
  return {
    event: body.event || 'chat_manual',
    status: body.status || 'info',
    title: body.title || '📩 新通知',
    summary: body.summary || body.content || body.message || '（无内容）',
    url: body.url,
  };
}

// ===== 触发规则检查 =====

function shouldNotify(event: string, status: 'success' | 'failure' | 'info', triggeredEvents: string[], notifyOn: string): boolean {
  // 检查触发事件列表（空 = 全部通过）
  if (triggeredEvents.length > 0 && !triggeredEvents.includes(event)) return false;
  // 检查通知时机
  switch (notifyOn) {
    case 'always':  return true;
    case 'success': return status === 'success';
    case 'failure': return status === 'failure';
    case 'changes': return status !== 'info';
    default:        return true;
  }
}

// ===== 构建飞书卡片消息 =====

function buildFeishuCard(title: string, summary: string, status: 'success' | 'failure' | 'info', projectName: string, url?: string) {
  const template = status === 'success' ? 'green' : status === 'failure' ? 'red' : 'blue';
  const card: Record<string, any> = {
    msg_type: 'interactive',
    card: {
      header: {
        title: { tag: 'plain_text', content: title },
        template,
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'lark_md',
            content: `**项目：** ${projectName}\n\n${summary}\n\n🕐 *${new Date().toLocaleString('zh-CN')}*`,
          },
        },
      ],
    },
  };

  if (url) {
    card.card.elements.push({ tag: 'hr' });
    card.card.elements.push({
      tag: 'action',
      actions: [{ tag: 'button', text: { tag: 'plain_text', content: '查看详情' }, url, type: 'default' }],
    });
  }

  return card;
}

// ===== 主路由 =====

/**
 * POST /api/webhook/:integrationId
 * 外部平台向此端点推送事件通知
 */
router.post('/:integrationId', async (req: Request, res: Response) => {
  const { integrationId } = req.params;

  try {
    // 1. 查找集成配置
    const integration = await database.getIntegrationById(integrationId);
    if (!integration || integration.status !== 'active') {
      return res.status(404).json({ success: false, error: '集成不存在或未启用' });
    }

    // 2. 查找关联机器人
    const robot = await database.getRobotById(integration.robotId);
    if (!robot || robot.status !== 'active') {
      return res.status(404).json({ success: false, error: '关联机器人不存在或未启用' });
    }

    // 3. 签名/Token 验证（使用 rawBody 保证签名准确性）
    const rawBody: string = (req as any).rawBody || JSON.stringify(req.body);
    const secret = integration.webhookSecret || '';
    const platform = integration.projectType;

    if (secret) {
      let verified = true;
      if (platform === 'github') {
        const sig = req.headers['x-hub-signature-256'] as string;
        if (sig) verified = verifyGitHubSignature(rawBody, sig, secret);
      } else if (platform === 'vercel') {
        const sig = req.headers['x-vercel-signature'] as string;
        if (sig) verified = verifyVercelSignature(rawBody, sig, secret);
      } else if (platform === 'gitlab') {
        const token = req.headers['x-gitlab-token'] as string;
        if (token) verified = (token === secret);
      } else {
        // Railway / VS Code Chat / API / Custom：X-Webhook-Secret 或 X-Trigger-Token
        const provided = (req.headers['x-webhook-secret'] || req.headers['x-trigger-token']) as string;
        if (provided) verified = (provided === secret);
      }
      if (!verified) {
        logger.warn('平台 Webhook 签名验证失败', { platform, integrationId });
        return res.status(401).json({ success: false, error: '签名验证失败' });
      }
    }

    // 4. 解析事件
    let normalized: NormalizedEvent | null = null;
    switch (platform) {
      case 'github':
        normalized = normalizeGitHub(req.headers as any, req.body);
        break;
      case 'vercel':
        normalized = normalizeVercel(req.body);
        break;
      case 'railway':
        normalized = normalizeRailway(req.body);
        break;
      case 'gitlab':
        normalized = normalizeGitLab(req.headers as any, req.body);
        break;
      default:
        // vscode-chat / api / custom：通用格式
        normalized = normalizeGeneric(req.body);
    }

    if (!normalized) {
      logger.info('未识别的平台事件，已忽略', { platform, integrationId });
      return res.json({ success: true, message: '事件已接收，无对应处理器' });
    }

    // 5. 检查触发规则
    if (!shouldNotify(normalized.event, normalized.status, integration.triggeredEvents, integration.notifyOn)) {
      return res.json({ success: true, message: '事件已接收，不满足触发条件，已跳过' });
    }

    // 6. 构建飞书卡片并发送到机器人的 Webhook URL
    const card = buildFeishuCard(normalized.title, normalized.summary, normalized.status, integration.projectName, normalized.url);
    await axios.post(robot.webhookUrl, card);

    // 7. 保存通知记录
    const dbStatus = normalized.status === 'failure' ? 'error' : normalized.status === 'success' ? 'success' : 'info';
    await database.saveNotification({
      title: normalized.title,
      summary: normalized.summary,
      status: dbStatus as any,
      source: `${platform}/${integration.projectName}`,
      robotName: robot.name,
    });

    logger.info('平台 Webhook 处理成功', { platform, integrationId, event: normalized.event });
    res.json({ success: true, message: '通知已发送' });

  } catch (error) {
    logger.error('平台 Webhook 处理异常', { integrationId, error });
    res.status(500).json({ success: false, error: '内部服务器错误' });
  }
});

export default router;
