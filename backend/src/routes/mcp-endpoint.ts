/**
 * 远端 MCP HTTP 服务器端点
 *
 * 实现 MCP SSE 传输协议，供 VS Code 通过网络连接调用 feishu_notify。
 * 与 mcp-server/index.js 实现完全相同的工具规范和格式化规则。
 *
 * 连接方式：
 *   GET  /api/mcp/sse?token=<webhookSecret>   — 建立 SSE 连接
 *   POST /api/mcp/message?sessionId=&token=   — 发送 JSON-RPC 消息
 *
 * 认证方式：token 为集成的 webhookSecret（从设置页面获取）
 * 访问地址：通过前端 URL 访问，无需暴露后端端口
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import axios from 'axios';
import database from '../database';
import logger from '../logger';
import { buildFeishuCard } from './platform-webhook';

const router = Router();

// 活跃的 SSE 会话：sessionId → { res, integrationId }
const sessions = new Map<string, { res: Response; integrationId: string }>();

// ─────────────────────────────────────────────
// Token 认证（通过 webhookSecret 识别集成）
// ─────────────────────────────────────────────

async function validateMCPToken(token: string) {
  if (!token) return null;
  const integration = await database.findIntegrationBySecret(token);
  if (!integration || integration.status !== 'active') return null;
  const robot = await database.getRobotById(integration.robotId);
  if (!robot || robot.status !== 'active') return null;
  return { integration, robot };
}

function extractToken(req: Request): string {
  const queryToken = req.query.token as string;
  if (queryToken) return queryToken;
  const authHeader = req.headers.authorization || '';
  return authHeader.replace(/^Bearer\s+/i, '');
}

// ─────────────────────────────────────────────
// 与 mcp-server/index.js 完全相同的格式化逻辑
// ─────────────────────────────────────────────

function formatSummary(summary: string): string {
  if (typeof summary !== 'string') return String(summary);

  // 已是列表形式，直接返回
  if (/^[\s\n]*(✅|🔧|📝|⚠️|🐛)/.test(summary)) return summary;

  // 尝试解析 JSON 数组
  if (summary.startsWith('[') && summary.endsWith(']')) {
    try {
      const items = JSON.parse(summary);
      if (Array.isArray(items)) return items.join('\n');
    } catch { /* ignore */ }
  }

  // 长文本拆分为列表项
  if (summary.length > 150) {
    const sentences = summary.split(/(?<=[。！？；])\s*|\n/).filter((s: string) => s.trim());
    if (sentences.length > 1) {
      return sentences.map((s: string, i: number) => {
        s = s.trim();
        if (i === 0) return `✅ ${s}`;
        if (i === sentences.length - 1) return `📝 ${s}`;
        return `🔧 ${s}`;
      }).join('\n');
    }
  }

  // 短文本前缀
  return summary.startsWith('完成') || summary.startsWith('已完成')
    ? `✅ ${summary}`
    : summary.startsWith('修复') || summary.startsWith('改进')
    ? `🔧 ${summary}`
    : `📝 ${summary}`;
}

// ─────────────────────────────────────────────
// MCP 工具定义（与 mcp-server/index.js 保持一致）
// ─────────────────────────────────────────────

const FEISHU_NOTIFY_TOOL = {
  name: 'feishu_notify',
  description: '将工作总结发送到飞书群组。在完成用户任务或阶段性工作后调用，自动推送工作汇报卡片（采用 ✅/🔧 列表格式）。',
  inputSchema: {
    type: 'object',
    properties: {
      summary: {
        type: 'string',
        description: '工作总结内容。支持两种格式：(1) 纯文本自动美化为列表；(2) 数组格式 ["✅ 完成项A", "🔧 改动B", "📝 说明C"]',
      },
      title: {
        type: 'string',
        description: '消息标题（可选，默认根据内容自动生成，如"📝 工作总结"或"🔧 任务完成"）',
      },
    },
    required: ['summary'],
  },
};

// ─────────────────────────────────────────────
// SSE 辅助函数
// ─────────────────────────────────────────────

function sendSSE(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// ─────────────────────────────────────────────
// GET /api/mcp/sse?token=<webhookSecret>
// ─────────────────────────────────────────────

router.get('/sse', async (req: Request, res: Response) => {
  const token = extractToken(req);
  const context = await validateMCPToken(token);

  if (!context) {
    // 注意：必须返回 403 而非 401
    // VS Code MCP 客户端遇到 401 会触发 OAuth 认证流程，打开浏览器页面
    // 403 表示 Token 无效/缺失，不触发 OAuth，客户端直接报错并停止
    return res.status(403).json({
      error: token ? '无效的 Token，请从集成管理页面「📋 MCP配置」中获取正确的 Token' : '缺少认证 Token，请在 .vscode/mcp.json 中配置 FEISHU_MCP_TOKEN 环境变量',
    });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');  // 关闭 nginx 缓冲
  res.flushHeaders();

  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, { res, integrationId: context.integration.id });

  // 告知客户端 POST 消息的端点
  sendSSE(res, 'endpoint', `/api/mcp/message?sessionId=${sessionId}&token=${encodeURIComponent(token)}`);

  logger.info(
    { sessionId, project: context.integration.projectName },
    'MCP SSE 连接建立'
  );

  // 心跳保活：每 25 秒发一次 SSE comment，防止客户端超时断开
  const heartbeat = setInterval(() => {
    res.write(': ping\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sessions.delete(sessionId);
    logger.info({ sessionId }, 'MCP SSE 连接关闭');
  });
});

// ─────────────────────────────────────────────
// POST /api/mcp/message?sessionId=&token=
// ─────────────────────────────────────────────

router.post('/message', async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const token = extractToken(req);
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: '会话不存在或已过期，请重新建立 SSE 连接' });
  }

  const context = await validateMCPToken(token);
  if (!context) {
    return res.status(403).json({ error: '无效 Token' });
  }

  // 立即返回 202，异步处理
  res.status(202).json({ ok: true });

  handleRPC(req.body, session.res, context).catch((err: Error) => {
    logger.error({ err }, 'MCP RPC 处理异常');
  });
});

// ─────────────────────────────────────────────
// JSON-RPC 消息处理（MCP 协议层）
// ─────────────────────────────────────────────

async function handleRPC(
  msg: { id?: unknown; method: string; params?: Record<string, unknown> },
  sseRes: Response,
  context: { integration: any; robot: any }
) {
  const { id, method, params } = msg;

  try {
    switch (method) {
      case 'initialize':
        sendSSE(sseRes, 'message', {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'feishu-notifier', version: '1.0.0' },
          },
        });
        break;

      case 'notifications/initialized':
        // 无需响应
        break;

      case 'tools/list':
        sendSSE(sseRes, 'message', {
          jsonrpc: '2.0',
          id,
          result: { tools: [FEISHU_NOTIFY_TOOL] },
        });
        break;

      case 'tools/call':
        await handleFeishuNotify(params?.arguments as Record<string, unknown>, id, sseRes, context);
        break;

      default:
        sendSSE(sseRes, 'message', {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `方法不存在: ${method}` },
        });
    }
  } catch (err: any) {
    sendSSE(sseRes, 'message', {
      jsonrpc: '2.0',
      id,
      error: { code: -32603, message: err.message || '内部错误' },
    });
  }
}

// ─────────────────────────────────────────────
// feishu_notify 工具实现
// ─────────────────────────────────────────────

async function handleFeishuNotify(
  args: Record<string, unknown>,
  id: unknown,
  sseRes: Response,
  context: { integration: any; robot: any }
) {
  const rawSummary = String(args.summary || '').trim();
  if (!rawSummary) {
    sendSSE(sseRes, 'message', {
      jsonrpc: '2.0', id,
      error: { code: -32602, message: 'summary 不能为空' },
    });
    return;
  }

  const summary = formatSummary(rawSummary);

  // 每次调用时重新从数据库获取最新集成信息（防止缓存过时导致项目名称不同步）
  const freshIntegration = await database.getIntegrationById(context.integration.id);
  const projectName = (freshIntegration || context.integration).projectName;

  // 自动生成标题（与 mcp-server/index.js 相同逻辑）
  let title = String(args.title || '').trim();
  if (!title) {
    if (summary.includes('✅')) title = '✅ 任务完成';
    else if (summary.includes('🔧')) title = '🔧 问题修复';
    else if (summary.includes('🐛')) title = '🐛 Bug 修复';
    else title = '📝 工作总结';
  }

  // 使用与 platform-webhook.ts 相同的卡片构建函数
  const card = buildFeishuCard(title, summary, 'info', projectName);

  // 【关键】立即返回 MCP 响应（不能阻塞，否则 VS Code Chat 会卡住超时）
  const preview = summary.substring(0, 150);
  sendSSE(sseRes, 'message', {
    jsonrpc: '2.0',
    id,
    result: {
      content: [{
        type: 'text',
        text: `✅ 工作总结已成功发送到飞书！\n\n**标题：** ${title}\n\n**项目：** ${projectName}\n\n**内容：**\n${preview}${summary.length > 150 ? '\n...' : ''}`,
      }],
    },
  });

  // 异步发送飞书通知（不阻塞 MCP 响应）
  // 使用 setImmediate 让 response 先返回，再异步处理下游操作
  // 重要：即使飞书发送或数据库操作失败/超时，也不影响 MCP 工具调用结果
  setImmediate(async () => {
    try {
      // 5 秒超时：即使网络慢也不会无限等待
      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), 5000);
      
      await axios.post(context.robot.webhookUrl, card, {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        timeout: 5000,
        signal: abortController.signal,
      });
      
      clearTimeout(timeout);
      logger.info({ project: projectName }, 'MCP feishu_notify 飞书发送完成');
    } catch (err: any) {
      logger.warn(
        { project: projectName, error: err.message },
        'MCP feishu_notify 飞书发送失败（不影响工具调用结果）'
      );
    }

    // 保存通知记录（即使飞书发送失败也应该记录）
    try {
      await database.saveNotification({
        title,
        summary,
        status: 'info',
        source: `mcp-remote/${projectName}`,
        robotName: context.robot.name,
      });
      logger.info({ project: projectName }, 'MCP 通知记录已保存');
    } catch (err: any) {
      logger.warn({ project: projectName, error: err.message }, 'MCP 通知记录失败');
    }
  });
}

export default router;
