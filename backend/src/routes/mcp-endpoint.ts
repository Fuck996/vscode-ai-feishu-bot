/**
 * 远端 MCP HTTP 服务器端点
 *
 * 同时兼容两种 VS Code 传输模式：
 * 1. Streamable HTTP：POST /api/mcp/sse + Mcp-Session-Id，会话 404 后由 VS Code 自动重建
 * 2. Legacy SSE：GET /api/mcp/sse + POST /api/mcp/message，保留给旧客户端回退使用
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
import { addLog, type LogContext, type LogLevel } from '../serviceLogger';

const router = Router();

interface MCPContext {
  integration: any;
  robot: any;
  user: any;
}

interface LegacySession {
  res: Response;
  integrationId: string;
}

interface StreamableSession {
  integrationId: string;
  protocolVersion: string;
  backchannelClients: Set<Response>;
  logContext?: LogContext;
}

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: unknown;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcSuccessResponse {
  jsonrpc: '2.0';
  id: unknown;
  result: unknown;
}

interface JsonRpcErrorResponse {
  jsonrpc: '2.0';
  id: unknown;
  error: {
    code: number;
    message: string;
  };
}

interface RpcExecutionResult {
  response?: JsonRpcSuccessResponse | JsonRpcErrorResponse;
  negotiatedProtocolVersion?: string;
}

const legacySessions = new Map<string, LegacySession>();
const streamableSessions = new Map<string, StreamableSession>();

const HEARTBEAT_INTERVAL = 15000;
const LEGACY_PROTOCOL_VERSION = '2024-11-05';
const STREAMABLE_PROTOCOL_VERSION = '2025-06-18';

// ─────────────────────────────────────────────
// Token 认证（通过 webhookSecret 识别集成）
// ─────────────────────────────────────────────

async function validateMCPToken(token: string) {
  if (!token) return null;
  const integration = await database.findIntegrationBySecret(token);
  if (!integration || integration.status !== 'active' || integration.projectType !== 'vscode-chat') return null;
  const robot = await database.getRobotById(integration.robotId);
  if (!robot || robot.status !== 'active') return null;
  const user = await database.getUserById(robot.userId);
  if (!user || user.status !== 'active') return null;
  return { integration, robot, user };
}

function getUserDisplayName(user: any): string {
  return (typeof user?.nickname === 'string' && user.nickname.trim()) || user?.username || '未知用户';
}

function buildMcpLogContext(context?: MCPContext | null): LogContext | undefined {
  if (!context) {
    return undefined;
  }

  return {
    user: {
      id: context.user.id,
      username: context.user.username,
      nickname: context.user.nickname,
      displayName: getUserDisplayName(context.user),
    },
    robot: {
      id: context.robot.id,
      name: context.robot.name,
    },
    integration: {
      id: context.integration.id,
      name: context.integration.projectName,
      type: context.integration.projectType,
    },
  };
}

function addMcpLog(level: LogLevel, message: string, context?: MCPContext | null) {
  addLog(level, 'MCP 服务', message, buildMcpLogContext(context));
}

function extractToken(req: Request): string {
  const queryToken = req.query.token as string;
  if (queryToken) return queryToken;
  const authHeader = req.headers.authorization || '';
  return authHeader.replace(/^Bearer\s+/i, '');
}

function extractSessionId(req: Request): string {
  return (req.get('Mcp-Session-Id') || '').trim();
}

function normalizeProtocolVersion(version: unknown): string {
  if (typeof version === 'string' && version.trim()) {
    return version.trim();
  }
  return STREAMABLE_PROTOCOL_VERSION;
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

function setupSSEHeaders(res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

function closeResponseSafe(res: Response) {
  try {
    if (!res.writableEnded) {
      res.end();
    }
  } catch {
    // 连接已关闭，忽略
  }
}

function startHeartbeat(res: Response, onDisconnect: () => void) {
  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(heartbeat);
      onDisconnect();
    }
  }, HEARTBEAT_INTERVAL);

  return () => clearInterval(heartbeat);
}

function jsonRpcSuccess(id: unknown, result: unknown): JsonRpcSuccessResponse {
  return { jsonrpc: '2.0', id: id ?? null, result };
}

function jsonRpcError(id: unknown, code: number, message: string): JsonRpcErrorResponse {
  return {
    jsonrpc: '2.0',
    id: id ?? null,
    error: { code, message },
  };
}

function buildSessionExpiredDetails(label: string): string {
  return `${label}不存在或已失效，可能原因：\n1. 后端服务已重启\n2. 反向代理或隧道中断了长连接\n3. VS Code 仍在使用旧会话 ID\n请让 VS Code 重新建立 MCP 会话`;
}

function disposeStreamableSession(sessionId: string, reason: string) {
  const session = streamableSessions.get(sessionId);
  if (!session) {
    return;
  }

  for (const client of session.backchannelClients) {
    closeResponseSafe(client);
  }

  session.backchannelClients.clear();
  streamableSessions.delete(sessionId);
  addLog('info', 'MCP 服务', `HTTP 会话关闭：${reason} [${sessionId.substring(0, 8)}...]`, session.logContext);
  logger.info({ sessionId, reason }, 'MCP HTTP 会话关闭');
}

async function validateStreamableSession(req: Request, res: Response, sessionId: string): Promise<{ session: StreamableSession; context: MCPContext } | null> {
  const token = extractToken(req);
  const context = await validateMCPToken(token);

  if (!context) {
    addMcpLog('warn', 'HTTP 会话请求被拒绝：Token 无效或缺失');
    res.status(403).json({
      error: token ? '无效的 Token，请从集成管理页面重新获取' : '缺少认证 Token，请检查 FEISHU_MCP_TOKEN 配置',
    });
    return null;
  }

  const session = streamableSessions.get(sessionId);
  if (!session) {
    addMcpLog('warn', `HTTP 会话过期 [${sessionId.substring(0, 8)}...]`, context);
    res.status(404).json({
      error: '会话不存在或已过期，请重新建立 MCP 会话',
      details: buildSessionExpiredDetails('HTTP 会话'),
      action: 'retry',
    });
    return null;
  }

  if (session.integrationId !== context.integration.id) {
    addMcpLog('warn', `HTTP 会话与 Token 不匹配 [${sessionId.substring(0, 8)}...]`, context);
    res.status(403).json({ error: '当前 Token 与会话不匹配，请重新建立 MCP 会话' });
    return null;
  }

  return { session, context };
}

// 构建完整的消息端点 URL（给 endpoint 事件用，不能 JSON.stringify）
// 优先使用 x-forwarded-host，确保经过反向代理时 URL 指向外网地址
function buildMessageUrl(req: Request, sessionId: string, token: string): string {
  const proto = ((req.headers['x-forwarded-proto'] as string) || req.protocol || 'https').split(',')[0].trim();
  const host = (req.headers['x-forwarded-host'] as string) || (req.headers.host as string) || 'localhost';
  return `${proto}://${host}/api/mcp/message?sessionId=${sessionId}&token=${encodeURIComponent(token)}`;
}

async function attachLegacySSE(req: Request, res: Response) {
  const token = extractToken(req);
  const context = await validateMCPToken(token);

  if (!context) {
    addMcpLog('warn', 'Legacy SSE 连接被拒绝：Token 无效或缺失');
    return res.status(403).json({
      error: token ? '无效的 Token，请从集成管理页面「📋 MCP配置」中获取正确的 Token' : '缺少认证 Token，请在 .vscode/mcp.json 中配置 FEISHU_MCP_TOKEN 环境变量',
    });
  }

  setupSSEHeaders(res);

  const sessionId = crypto.randomUUID();
  const projectName = context.integration.projectName;
  legacySessions.set(sessionId, { res, integrationId: context.integration.id });

  addMcpLog('info', `Legacy SSE 连接建立：${projectName} [${sessionId.substring(0, 8)}...]`, context);

  const messageUrl = buildMessageUrl(req, sessionId, token);
  res.write(`event: endpoint\ndata: ${messageUrl}\n\n`);

  logger.info(
    { sessionId, project: projectName },
    'MCP Legacy SSE 连接建立'
  );

  const stopHeartbeat = startHeartbeat(res, () => {
    legacySessions.delete(sessionId);
  });

  req.on('close', () => {
    stopHeartbeat();
    legacySessions.delete(sessionId);
    addMcpLog('info', `Legacy SSE 连接关闭：${projectName} [${sessionId.substring(0, 8)}...]`, context);
    logger.info({ sessionId }, 'MCP Legacy SSE 连接关闭');
  });
}

async function attachStreamableBackchannel(req: Request, res: Response, sessionId: string) {
  const validated = await validateStreamableSession(req, res, sessionId);
  if (!validated) {
    return;
  }

  const { session, context } = validated;
  const projectName = context.integration.projectName;

  setupSSEHeaders(res);
  res.write(': connected\n\n');
  session.backchannelClients.add(res);

  addMcpLog('info', `HTTP 反向通道已连接：${projectName} [${sessionId.substring(0, 8)}...]`, context);
  logger.info({ sessionId, project: projectName }, 'MCP HTTP 反向通道已连接');

  const stopHeartbeat = startHeartbeat(res, () => {
    session.backchannelClients.delete(res);
  });

  req.on('close', () => {
    stopHeartbeat();
    session.backchannelClients.delete(res);
    addMcpLog('info', `HTTP 反向通道已关闭：${projectName} [${sessionId.substring(0, 8)}...]`, context);
    logger.info({ sessionId }, 'MCP HTTP 反向通道已关闭');
  });
}

// ─────────────────────────────────────────────
// GET /api/mcp/sse?token=<webhookSecret>
// ─────────────────────────────────────────────

router.get('/sse', async (req: Request, res: Response) => {
  const sessionId = extractSessionId(req);
  if (sessionId) {
    return attachStreamableBackchannel(req, res, sessionId);
  }

  return attachLegacySSE(req, res);
});

// ─────────────────────────────────────────────
// POST /api/mcp/sse?token=  （VS Code Streamable HTTP）
// 在同一地址支持 POST，可让 VS Code 保持 HTTP 会话模式，并在 404 时自动新建会话
// ─────────────────────────────────────────────

router.post('/sse', async (req: Request, res: Response) => {
  const token = extractToken(req);
  const context = await validateMCPToken(token);

  if (!context) {
    addMcpLog('warn', 'HTTP 会话请求被拒绝：Token 无效或缺失');
    return res.status(403).json({
      error: token ? '无效的 Token，请从集成管理页面重新获取' : '缺少认证 Token，请检查 FEISHU_MCP_TOKEN 配置',
    });
  }

  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || typeof req.body.method !== 'string') {
    return res.status(400).json({ error: '无效的 JSON-RPC 请求，请确认请求体是单个对象' });
  }

  const msg = req.body as JsonRpcRequest;
  const sessionId = extractSessionId(req);
  const requestedProtocolVersion = normalizeProtocolVersion(
    (msg.params as Record<string, unknown> | undefined)?.protocolVersion || req.get('MCP-Protocol-Version')
  );

  let session: StreamableSession | undefined;
  if (sessionId) {
    session = streamableSessions.get(sessionId);
    if (!session) {
      addMcpLog('warn', `HTTP 会话过期 [${sessionId.substring(0, 8)}...]`, context);
      return res.status(404).json({
        error: '会话不存在或已过期，请重新建立 MCP 会话',
        details: buildSessionExpiredDetails('HTTP 会话'),
        action: 'retry',
      });
    }

    if (session.integrationId !== context.integration.id) {
      addMcpLog('warn', `HTTP 会话与 Token 不匹配 [${sessionId.substring(0, 8)}...]`, context);
      return res.status(403).json({ error: '当前 Token 与会话不匹配，请重新建立 MCP 会话' });
    }
  } else if (msg.method !== 'initialize') {
    return res.status(400).json({ error: '缺少 Mcp-Session-Id，请先发送 initialize 请求建立会话' });
  }

  try {
    const execution = await executeRPC(msg, context, requestedProtocolVersion);
    const responseProtocolVersion = execution.negotiatedProtocolVersion || session?.protocolVersion || requestedProtocolVersion;
    res.setHeader('MCP-Protocol-Version', responseProtocolVersion);

    if (!sessionId) {
      const newSessionId = crypto.randomUUID();
      streamableSessions.set(newSessionId, {
        integrationId: context.integration.id,
        protocolVersion: responseProtocolVersion,
        backchannelClients: new Set<Response>(),
        logContext: buildMcpLogContext(context),
      });
      res.setHeader('Mcp-Session-Id', newSessionId);
      addMcpLog('info', `HTTP 会话建立：${context.integration.projectName} [${newSessionId.substring(0, 8)}...]`, context);
      logger.info({ sessionId: newSessionId, project: context.integration.projectName, protocolVersion: responseProtocolVersion }, 'MCP HTTP 会话建立');
    } else if (session) {
      session.protocolVersion = responseProtocolVersion;
      session.logContext = buildMcpLogContext(context);
    }

    if (!execution.response) {
      return res.status(202).end();
    }

    return res.status(200).json(execution.response);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error({ err: error }, 'MCP HTTP RPC 处理异常');
    return res.status(500).json(jsonRpcError(null, -32603, message || '内部错误'));
  }
});

router.delete('/sse', async (req: Request, res: Response) => {
  const sessionId = extractSessionId(req);
  if (!sessionId) {
    return res.status(400).json({ error: '缺少 Mcp-Session-Id，无法关闭会话' });
  }

  const validated = await validateStreamableSession(req, res, sessionId);
  if (!validated) {
    return;
  }

  disposeStreamableSession(sessionId, '客户端主动关闭');
  return res.status(204).end();
});

// ─────────────────────────────────────────────
// POST /api/mcp/message?sessionId=&token=
// ─────────────────────────────────────────────

router.post('/message', async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const token = extractToken(req);
  if (!sessionId) {
    return res.status(400).json({ error: '缺少 sessionId，无法通过 legacy SSE 通道发送消息' });
  }

  const session = legacySessions.get(sessionId);

  if (!session) {
    const errorMsg = '会话不存在或已过期，可能原因：\n1. 后端服务重启\n2. Legacy SSE 长连接已断开\n3. 网络连接中断\n请在 VS Code MCP 服务中重新建立连接';
    addMcpLog('warn', `Legacy SSE 会话过期 [sessionId=${sessionId.substring(0, 8)}...]`);
    return res.status(404).json({ 
      error: '会话不存在或已过期，请重新建立 SSE 连接',
      details: errorMsg,
      action: 'reconnect',
    });
  }

  const context = await validateMCPToken(token);
  if (!context) {
    addMcpLog('warn', '消息请求 Token 验证失败');
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
  msg: JsonRpcRequest,
  sseRes: Response,
  context: MCPContext
) {
  try {
    const execution = await executeRPC(msg, context, LEGACY_PROTOCOL_VERSION);
    if (execution.response) {
      sendSSE(sseRes, 'message', execution.response);
    }
  } catch (err: any) {
    sendSSE(sseRes, 'message', {
      jsonrpc: '2.0',
      id: msg.id ?? null,
      error: { code: -32603, message: err.message || '内部错误' },
    });
  }
}

// ─────────────────────────────────────────────
// feishu_notify 工具实现
// ─────────────────────────────────────────────

async function executeRPC(msg: JsonRpcRequest, context: MCPContext, protocolVersion: string): Promise<RpcExecutionResult> {
  if (!msg.method || typeof msg.method !== 'string') {
    return { response: jsonRpcError(msg.id, -32600, '无效的 JSON-RPC 请求') };
  }

  const params = (msg.params ?? {}) as Record<string, unknown>;

  switch (msg.method) {
    case 'initialize':
      return {
        negotiatedProtocolVersion: normalizeProtocolVersion(params.protocolVersion || protocolVersion),
        response: jsonRpcSuccess(msg.id, {
          protocolVersion: normalizeProtocolVersion(params.protocolVersion || protocolVersion),
          capabilities: { tools: {} },
          serverInfo: { name: 'feishuNotifier', version: '1.0.0' },
        }),
      };

    case 'notifications/initialized':
      return {};

    case 'ping':
      return { response: jsonRpcSuccess(msg.id, {}) };

    case 'tools/list':
      return { response: jsonRpcSuccess(msg.id, { tools: [FEISHU_NOTIFY_TOOL] }) };

    case 'tools/call': {
      const toolName = String(params.name || '');
      if (toolName !== 'feishu_notify') {
        return { response: jsonRpcError(msg.id, -32601, `未知工具: ${toolName || '(empty)'}`) };
      }

      const result = await invokeFeishuNotify((params.arguments ?? {}) as Record<string, unknown>, context);
      return { response: jsonRpcSuccess(msg.id, result) };
    }

    default:
      if (msg.id === undefined) {
        return {};
      }
      return { response: jsonRpcError(msg.id, -32601, `方法不存在: ${msg.method}`) };
  }
}

async function invokeFeishuNotify(
  args: Record<string, unknown>,
  context: MCPContext
) {
  const rawSummary = String(args.summary || '').trim();
  if (!rawSummary) {
    throw new Error('summary 不能为空');
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

  addMcpLog('info', `feishu_notify 调用：${projectName}  「${title}」`, context);

  const preview = summary.substring(0, 150);

  setImmediate(async () => {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 5000);

    try {
      await axios.post(context.robot.webhookUrl, card, {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        timeout: 5000,
        signal: abortController.signal,
      });

      addMcpLog('info', `飞书消息发送成功：${projectName}`, context);
      logger.info({ project: projectName }, 'MCP feishu_notify 飞书发送完成');
    } catch (err: any) {
      addMcpLog('warn', `飞书消息发送失败：${err.message}`, context);
      logger.warn(
        { project: projectName, error: err.message },
        'MCP feishu_notify 飞书发送失败（不影响工具调用结果）'
      );
    } finally {
      clearTimeout(timeout);
    }

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

  return {
    content: [{
      type: 'text',
      text: `✅ 工作总结已成功发送到飞书！\n\n**标题：** ${title}\n\n**项目：** ${projectName}\n\n**内容：**\n${preview}${summary.length > 150 ? '\n...' : ''}`,
    }],
  };
}

export default router;
