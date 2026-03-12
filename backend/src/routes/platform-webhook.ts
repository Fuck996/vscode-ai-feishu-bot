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
import { addLog } from '../serviceLogger';

const router = Router();

// ===== 事件去重缓存（防止同一事件短时间内重复处理） =====
const recentEvents = new Map<string, number>();
const DEDUP_WINDOW = 5000; // 5秒去重窗口

function isRecentEvent(eventKey: string): boolean {
  const now = Date.now();
  const lastTime = recentEvents.get(eventKey);
  
  if (lastTime && now - lastTime < DEDUP_WINDOW) {
    return true; // 在去重窗口内，是重复事件
  }
  
  recentEvents.set(eventKey, now);
  
  // 清理过期缓存（> 60秒）
  for (const [key, time] of recentEvents.entries()) {
    if (now - time > 60000) {
      recentEvents.delete(key);
    }
  }
  
  return false;
}

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
  projectName?: string;  // 可选：由 MCP Server 或其他来源提供
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
      const action = body.action; // 'requested', 'in_progress', 'completed'
      
      // 根据 action 和 conclusion 确定状态
      if (action === 'requested') {
        // 构建开始
        return {
          event: 'workflow_run',
          status: 'info',
          title: '⏳ GitHub Actions 构建开始',
          summary: `工作流：${wr?.name}\n分支：${wr?.head_branch}\n提交：${wr?.head_sha?.substring(0, 7)}`,
          url: wr?.html_url,
        };
      } else if (action === 'completed') {
        // 构建完成（成功/失败）
        const isSuccess = wr?.conclusion === 'success';
        const isFailure = wr?.conclusion === 'failure';
        
        if (!isSuccess && !isFailure) {
          // 其他结论状态（cancelled, timed_out, neutral等）- 不通知
          return null;
        }
        
        return {
          event: 'workflow_run',
          status: isSuccess ? 'success' : 'failure',
          title: `${isSuccess ? '✅' : '❌'} GitHub Actions ${isSuccess ? '成功' : '失败'}`,
          summary: `工作流：${wr?.name}\n分支：${wr?.head_branch}\n提交：${wr?.head_sha?.substring(0, 7)}`,
          url: wr?.html_url,
        };
      } else {
        // in_progress 或其他状态 - 不通知
        return null;
      }
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

/** 解析 Railway Webhook payload
 * Railway 官方格式（2024）：
 *   { type: "DEPLOY", project: {...}, service: {...}, deployment: { status: "SUCCESS"|"FAILED"|"CRASHED", url, meta } }
 *   { type: "SERVICE_CRASH", project: {...}, service: {...} }
 */
function normalizeRailway(body: Record<string, any>): NormalizedEvent | null {
  const type = (body.type as string || '').toUpperCase();
  const project = body.project?.name || body.projectId || '项目';
  const service = body.service?.name || body.serviceName || '服务';
  const deployUrl = body.deployment?.url
    ? (body.deployment.url.startsWith('http') ? body.deployment.url : `https://${body.deployment.url}`)
    : undefined;

  if (type === 'DEPLOY') {
    // 官方格式：status 在 deployment.status，兼容顶层 status
    const status = ((body.deployment?.status || body.status) as string || '').toUpperCase();
    if (status === 'SUCCESS') {
      return { event: 'deploy_success', status: 'success', title: '✅ Railway 部署成功',
        summary: `**${project}** / ${service} 部署成功${body.deployment?.meta?.commitMessage ? `\n提交：${body.deployment.meta.commitMessage}` : ''}`, url: deployUrl };
    }
    if (status === 'FAILED' || status === 'FAILURE' || status === 'ERROR') {
      return { event: 'deploy_failure', status: 'failure', title: '❌ Railway 部署失败',
        summary: `**${project}** / ${service} 部署失败` };
    }
    if (status === 'CRASHED') {
      return { event: 'service_crash', status: 'failure', title: '🚨 Railway 服务崩溃',
        summary: `**${project}** / ${service} 发生崩溃\n时间：${new Date().toLocaleString('zh-CN')}` };
    }
    return null;
  }

  if (type === 'SERVICE_CRASH' || type === 'CRASH') {
    return { event: 'service_crash', status: 'failure', title: '🚨 Railway 服务崩溃',
      summary: `**${project}** / ${service} 发生崩溃\n时间：${new Date().toLocaleString('zh-CN')}` };
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

/**
 * 解析群晖 NAS (Synology DSM) Webhook 通知
 *
 * 群晖 DSM 在 控制面板 → 通知 → 高级 → 服务 中可配置 HTTP 通知
 * 发送 POST 请求，Body 通过模板变量填入：%SUBJECT% / %DESCRIPTION% / %HOSTNAME%
 *
 * 支持中英文两种 DSM 界面的通知文本。
 * 事件识别基于关键词匹配，覆盖：存储空间不足、硬盘异常/故障、容器意外停止、安全风险、恶意软件、备份任务。
 */
function normalizeSynology(body: Record<string, any>): NormalizedEvent {
  // 群晖 DSM webhook 的实际请求体格式：
  //   "Synology Chat Webhook" 原生格式：{"text": "存储空间 1 快达到容量上限..."}
  //   自定义 HTTP 通知格式（需用户在 Body 模板中配置 %SUBJECT%）：{"subject": "..."}
  //   兼容 form-encoded 及其他字段名
  const subject = String(
    body.subject || body.Subject || body.title || body.Title ||
    body.text    || body.Text    || body.msg   || body.message || ''
  ).trim();
  const description = String(
    body.description || body.Description || body.body || body.Body || body.content || ''
  ).trim();
  const hostname = String(
    body.hostname || body.Hostname || body.host || body.nas_name || 'NAS'
  ).trim();

  const text = `${subject} ${description}`.toLowerCase();
  const summary = `**主机：** ${hostname}\n**事件：** ${subject}${description ? `\n**详情：** ${description}` : ''}`;

  // ── 存储空间不足 / 卷/存储池异常 ──────────────────────────────────────
  if (
    (text.includes('volume') || text.includes('storage pool') || text.includes('存储空间') || text.includes('存储池') || text.includes('卷')) &&
    (text.includes('warning') || text.includes('critical') || text.includes('degraded') || text.includes('full') ||
     text.includes('exceeded') || text.includes('已超过') || text.includes('不足') || text.includes('警告') || text.includes('严重') || text.includes('损毁'))
  ) {
    return { event: 'nas_storage_warning', status: 'failure', title: '⚠️ NAS 存储空间不足', summary };
  }

  // ── 硬盘故障（需先于严重状态匹配，优先级更高）────────────────────────
  if (
    (text.includes('disk') || text.includes('drive') || text.includes('hdd') || text.includes('ssd') ||
     text.includes('硬盘') || text.includes('磁盘')) &&
    (text.includes('failed') || text.includes('failure') || text.includes('has failed') ||
     text.includes('故障') || text.includes('已失效') || text.includes('失败'))
  ) {
    return { event: 'nas_disk_failure', status: 'failure', title: '🚨 NAS 硬盘发生故障', summary };
  }

  // ── 硬盘严重状态 ────────────────────────────────────────────────────────
  if (
    (text.includes('disk') || text.includes('drive') || text.includes('hdd') || text.includes('ssd') ||
     text.includes('硬盘') || text.includes('磁盘')) &&
    (text.includes('critical') || text.includes('warning') || text.includes('bad') ||
     text.includes('predictive') || text.includes('error') || text.includes('出现问题') ||
     text.includes('严重') || text.includes('警告') || text.includes('异常'))
  ) {
    return { event: 'nas_disk_warning', status: 'failure', title: '⚠️ NAS 硬盘严重状态', summary };
  }

  // ── 恶意软件（优先于安全风险匹配）──────────────────────────────────────
  if (
    text.includes('malware') || text.includes('virus') || text.includes('trojan') ||
    text.includes('恶意软件') || text.includes('病毒') ||
    (text.includes('antivirus') && (text.includes('found') || text.includes('detected') || text.includes('发现')))
  ) {
    return { event: 'nas_malware', status: 'failure', title: '🦠 NAS 检测到恶意软件', summary };
  }

  // ── 安全风险 ────────────────────────────────────────────────────────────
  if (
    (text.includes('security') || text.includes('安全')) &&
    (text.includes('risk') || text.includes('threat') || text.includes('vulnerab') ||
     text.includes('风险') || text.includes('威胁') || text.includes('漏洞') || text.includes('issue') || text.includes('问题'))
  ) {
    return { event: 'nas_security_risk', status: 'failure', title: '🔒 NAS 检测到安全风险', summary };
  }

  // ── 容器/套件意外停止 ──────────────────────────────────────────────────
  if (
    (text.includes('container') || text.includes('docker') || text.includes('package') ||
     text.includes('service') || text.includes('容器') || text.includes('套件') || text.includes('服务')) &&
    (text.includes('stopped') || text.includes('crashed') || text.includes('unexpected') ||
     text.includes('意外') || text.includes('异常停止') || text.includes('崩溃'))
  ) {
    return { event: 'nas_container_crash', status: 'failure', title: '🐋 NAS 容器意外停止', summary };
  }

  // ── 备份失败 ────────────────────────────────────────────────────────────
  if (
    (text.includes('backup') || text.includes('备份')) &&
    (text.includes('failed') || text.includes('failure') || text.includes('error') ||
     text.includes('失败') || text.includes('错误'))
  ) {
    return { event: 'nas_backup_failed', status: 'failure', title: '💾 NAS 备份任务失败', summary };
  }

  // ── 备份成功 ────────────────────────────────────────────────────────────
  if (
    (text.includes('backup') || text.includes('备份')) &&
    (text.includes('success') || text.includes('completed') || text.includes('succeeded') ||
     text.includes('成功') || text.includes('完成'))
  ) {
    return { event: 'nas_backup_success', status: 'success', title: '✅ NAS 备份任务成功', summary };
  }

  // ── UPS 不间断电源 ────────────────────────────────────────────────────
  if (text.includes('ups') || text.includes('不间断电源') || text.includes('battery')) {
    return { event: 'nas_system_info', status: 'info', title: '🔋 NAS UPS 状态通知', summary };
  }

  // ── 系统重启 ────────────────────────────────────────────────────────────
  if (
    text.includes('reboot') || text.includes('restart') ||
    (text.includes('系统') && (text.includes('重启') || text.includes('重新启动')))
  ) {
    return { event: 'nas_system_info', status: 'info', title: '🔄 NAS 系统重启', summary };
  }

  // ── 通用降级：未匹配已知类型，作为一般系统通知 ─────────────────────────
  return { event: 'nas_system_info', status: 'info', title: '📢 NAS 系统通知', summary };
}

/** 解析通用格式（Direct API / VS Code Chat / Custom Webhook） */
function normalizeGeneric(body: Record<string, any>): NormalizedEvent {
  const event = body.event || 'chat_manual';
  const status = body.status || 'info';
  const title = body.title || '📩 新通知';
  let summary = body.summary || body.content || body.message || '（无内容）';
  const projectName = body.projectName || undefined;  // 优先级：从 MCP 读取
  
  // 处理数组格式的 summary（来自 MCP 格式化）
  if (typeof summary === 'string' && summary.startsWith('[')) {
    try {
      const items = JSON.parse(summary);
      if (Array.isArray(items)) {
        // 将数组转换为换行分隔的字符串
        summary = items.join('\n');
      }
    } catch (e) {
      // 如果解析失败，保持原值
    }
  }
  
  // 添加日志：追踪中文内容是否被正确接收
  logger.info(
    {event, status, titleLength: title.length, summaryLength: String(summary).length, projectName},
    `通用格式 Webhook 已接收 [event=${event}] [projectName=${projectName || '(无)'}]`
  );
  
  return {
    event,
    status,
    title,
    summary: String(summary),
    url: body.url,
    projectName,
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

export function buildFeishuCard(title: string, summary: string, status: 'success' | 'failure' | 'info', projectName: string, url?: string) {
  const template = status === 'success' ? 'green' : status === 'failure' ? 'red' : 'blue';
  
  // 确保 summary 正确处理换行（将 \n 转换为飞书支持的格式）
  // 飞书的 lark_md 格式支持 \n 但需要确保正确解析
  const formattedSummary = String(summary)
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n\n');  // 两个换行来分隔不同的行
  
  const timestamp = new Date().toLocaleString('zh-CN');
  
  // 构建更清晰的 markdown 格式
  const markdownContent = `**项目：** ${projectName}\n\n${formattedSummary}\n\n---\n\n🕐 *${timestamp}*`;
  
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
            content: markdownContent,
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
    // 0. 检查是否为重复事件（去重）
    // GitHub workflow_run 会在 requested/in_progress/completed 多个阶段发送，需要分别去重
    let eventSignature = `${integrationId}-${req.body.ref || req.body.installation?.id || req.headers['x-github-event'] || 'unknown'}-${req.headers['x-github-delivery'] || req.body.id || 'unknown'}`;
    
    // GitHub workflow_run 事件：基于 workflow_run.id + action 来唯一标识
    if (req.headers['x-github-event'] === 'workflow_run' && req.body.workflow_run?.id) {
      const action = req.body.action || 'unknown'; // requested / in_progress / completed
      const conclusion = req.body.workflow_run?.conclusion; // success / failure / neutral / cancelled / timed_out / null
      
      // 使用 action 和 conclusion 组成不同的事件签名
      // - requested: 基于 action 唯一标识（每个 workflow run 只有一个 requested）
      // - completed: 基于 conclusion 唯一标识（同一 workflow 的 completed 事件只应该处理一次）
      eventSignature = `${integrationId}-workflow_run-${req.body.workflow_run.id}-${action}${conclusion ? `-${conclusion}` : ''}`;
    }
    
    if (isRecentEvent(eventSignature)) {
      addLog('info', 'Webhook 接收', `检测到重复事件，已忽略 [integrationId=${integrationId}] [sig=${eventSignature}]`);
      return res.json({ success: true, message: '重复事件已忽略' });
    }

    // 1. 查找集成配置
    const integration = await database.getIntegrationById(integrationId);
    if (!integration || integration.status !== 'active') {
      addLog('warn', 'Webhook 接收', `集成不存在或未启用 [id=${integrationId}]`);
      return res.status(404).json({ success: false, error: '集成不存在或未启用' });
    }

    // 2. 查找关联机器人
    const robot = await database.getRobotById(integration.robotId);
    if (!robot || robot.status !== 'active') {
      addLog('warn', 'Webhook 接收', `关联机器人不存在或未启用 [robotId=${integration.robotId}]`);
      return res.status(404).json({ success: false, error: '关联机器人不存在或未启用' });
    }

    addLog('info', 'Webhook 接收', `收到 ${integration.projectType.toUpperCase()} 事件 [集成: ${integration.projectName}]`);

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
        addLog('warn', 'Webhook 接收', `签名验证失败 [${platform}] [${integration.projectName}]`);
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
      case 'synology':
        normalized = normalizeSynology(req.body);
        break;
      default:
        // vscode-chat / api / custom：通用格式
        normalized = normalizeGeneric(req.body);
    }

    if (!normalized) {
      logger.info('未识别的平台事件，已忽略', { platform, integrationId });
      addLog('info', 'Webhook 接收', `未识别的事件格式，已跳过 [${platform}] [${integration.projectName}]`);
      return res.json({ success: true, message: '事件已接收，无对应处理器' });
    }

    // 4.1 过滤 GitHub workflow_run 事件：
    // - action='requested': 构建开始，正常处理
    // - action='in_progress': 构建中，忽略（不发送通知）
    // - action='completed': 构建完成，normalizeGitHub 根据 conclusion 判断是否成功/失败
    if (platform === 'github' && req.headers['x-github-event'] === 'workflow_run') {
      const action = req.body.action || 'unknown';
      const wr = req.body.workflow_run;
      
      if (action === 'in_progress') {
        // 跳过构建中的事件
        addLog('info', 'Webhook 接收', `GitHub workflow_run 构建中，已跳过 [${wr?.name || 'unknown'}] [action=${action}]`);
        return res.json({ success: true, message: 'GitHub workflow_run 事件已接收，构建中已跳过' });
      }
      
      if (action === 'completed' && !wr?.conclusion) {
        // 不应该出现这种情况，但防御性地处理
        addLog('info', 'Webhook 接收', `GitHub workflow_run 状态异常（completed但无conclusion），已跳过`);
        return res.json({ success: true, message: 'GitHub workflow_run 事件异常，已跳过' });
      }
    }

    // 5. 检查触发规则
    if (!shouldNotify(normalized.event, normalized.status, integration.triggeredEvents, integration.notifyOn)) {
      addLog('info', 'Webhook 接收', `事件 "${normalized.event}" 不满足触发条件，已跳过 [${integration.projectName}]`);
      return res.json({ success: true, message: '事件已接收，不满足触发条件，已跳过' });
    }

    // 6. 构建飞书卡片并发送到机器人的 Webhook URL
    // 优先级：使用 MCP 提供的项目名称 > 集成中的项目名称
    const finalProjectName = normalized.projectName || integration.projectName;
    const card = buildFeishuCard(normalized.title, normalized.summary, normalized.status, finalProjectName, normalized.url);
    
    // 添加日志：记录即将发送的飞书卡片（包括中文内容）
    logger.info(
      { 
        robot: robot.name,
        projectName: integration.projectName,
        cardContent: JSON.stringify(card, null, 2).substring(0, 300)
      },
      `准备发送飞书卡片 [标题="${normalized.title}"]`
    );
    
    await axios.post(robot.webhookUrl, card, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });

    addLog('info', 'Webhook 接收', `飞书通知已发送 [${integration.projectType}] ${normalized.title} [项目: ${finalProjectName}]`);

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
    addLog('error', 'Webhook 接收', `处理异常 [id=${integrationId}]: ${(error as Error).message || '未知错误'}`);
    res.status(500).json({ success: false, error: '内部服务器错误' });
  }
});

export default router;
