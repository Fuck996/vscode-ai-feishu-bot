/**
 * 飞书通知 MCP Server
 *
 * 供 VS Code Copilot Agent 调用，在完成任务后自动发送工作总结到飞书群组。
 *
 * 工具：feishu_notify(summary, title?)
 *   → POST /api/webhook/{integrationId}
 *   → X-Trigger-Token: {triggerToken}
 *
 * 环境变量（由 .vscode/mcp.json 注入）：
 *   WEBHOOK_ENDPOINT  — 完整的 Webhook 端点 URL
 *   TRIGGER_TOKEN     — 集成的 webhookSecret
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const https = require('https');
const http = require('http');

const WEBHOOK_ENDPOINT = (process.env.WEBHOOK_ENDPOINT || '').trim();
const TRIGGER_TOKEN    = (process.env.TRIGGER_TOKEN    || '').trim();

// ─────────────────────────────────────────────
// 创建 MCP Server
// ─────────────────────────────────────────────

const server = new Server(
  { name: 'feishu-notifier', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// 声明可用工具
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'feishu_notify',
      description:
        '将工作总结发送到飞书群组。在完成用户任务或阶段性工作后调用，自动推送工作汇报卡片。',
      inputSchema: {
        type: 'object',
        properties: {
          summary: {
            type: 'string',
            description: '工作总结内容，用中文描述本次完成的主要事项、改动和结果',
          },
          title: {
            type: 'string',
            description: '消息标题（可选，默认为"📝 工作总结"）',
          },
        },
        required: ['summary'],
      },
    },
  ],
}));

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== 'feishu_notify') {
    throw new Error(`未知工具: ${request.params.name}`);
  }

  if (!WEBHOOK_ENDPOINT || !TRIGGER_TOKEN) {
    throw new Error(
      '飞书 MCP Server 未配置：请在 .vscode/mcp.json 中设置 WEBHOOK_ENDPOINT 和 TRIGGER_TOKEN'
    );
  }

  const args = request.params.arguments || {};
  const summary = String(args.summary || '').trim();
  const title   = String(args.title   || '📝 工作总结').trim();

  if (!summary) {
    throw new Error('summary 不能为空');
  }

  // 构建请求体（与后端 webhook 期望的格式一致）
  const body = JSON.stringify({
    event:   'chat_session_end',
    status:  'info',
    title,
    summary,
  });

  // 发送到后端 webhook
  await postJson(WEBHOOK_ENDPOINT, TRIGGER_TOKEN, body);

  return {
    content: [
      {
        type: 'text',
        text: `✅ 工作总结已成功发送到飞书！\n\n**标题：** ${title}\n\n**内容：** ${summary.substring(0, 100)}${summary.length > 100 ? '…' : ''}`,
      },
    ],
  };
});

// ─────────────────────────────────────────────
// HTTP 请求工具函数
// ─────────────────────────────────────────────

function postJson(url, token, body) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (e) {
      return reject(new Error(`无效的 WEBHOOK_ENDPOINT URL: ${url}`));
    }

    const lib = parsed.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + (parsed.search || ''),
      method:   'POST',
      headers:  {
        'Content-Type':    'application/json',
        'Content-Length':  Buffer.byteLength(body),
        'X-Trigger-Token': token,
      },
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.success === true) {
            resolve(result);
          } else {
            reject(new Error(`后端返回错误: ${JSON.stringify(result)}`));
          }
        } catch {
          // 如果无法解析 JSON，只要 HTTP 200 就认为成功
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true });
          } else {
            reject(new Error(`HTTP 错误 ${res.statusCode}: ${data}`));
          }
        }
      });
    });

    req.on('error', (err) => reject(new Error(`网络请求失败: ${err.message}`)));
    req.write(body);
    req.end();
  });
}

// ─────────────────────────────────────────────
// 启动 MCP Server（stdio 传输）
// ─────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // 注意：不要向 stdout 输出任何内容（MCP 协议通过 stdout 通信）
  process.stderr.write('[飞书 MCP Server] 已启动，等待工具调用...\n');
}

main().catch((err) => {
  process.stderr.write(`[飞书 MCP Server] 启动失败: ${err.message}\n`);
  process.exit(1);
});
