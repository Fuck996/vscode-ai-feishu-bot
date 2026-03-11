/**
 * 飞书通知 MCP Server
 *
 * 供 VS Code Copilot Agent 调用，在完成任务后自动发送工作总结到飞书群组。
 *
 * 工具：feishu_notify(summary, title?, projectName?)
 *   → POST /api/webhook/{integrationId}
 *   → X-Trigger-Token: {triggerToken}
 *   → 自动美化格式为 ✅/🔧 列表形式
 *
 * 环境变量（由 .vscode/mcp.json 注入）：
 *   WEBHOOK_ENDPOINT  — 完整的 Webhook 端点 URL
 *   TRIGGER_TOKEN     — 集成的 webhookSecret
 *   PROJECT_NAME      — 项目名称（可选，默认从 package.json 读取）
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const WEBHOOK_ENDPOINT = (process.env.WEBHOOK_ENDPOINT || '').trim();
const TRIGGER_TOKEN    = (process.env.TRIGGER_TOKEN    || '').trim();
const PROJECT_NAME_ENV = (process.env.PROJECT_NAME     || '').trim();

// 从 backend/package.json 读取项目名称
let PROJECT_NAME = PROJECT_NAME_ENV;
if (!PROJECT_NAME) {
  try {
    const pkgPath = path.join(__dirname, '../backend/package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      // 优先使用 description（用户友好），次序为 description > name > 默认值
      PROJECT_NAME = pkg.description || pkg.name || 'Feishu AI Notification Service';
    }
  } catch (e) {
    PROJECT_NAME = 'Feishu AI Notification Service';
  }
}

// 可选：尝试从后端获取配置（如果后端已启动）
async function fetchConfigFromBackend() {
  if (!WEBHOOK_ENDPOINT || !TRIGGER_TOKEN) {
    try {
      const response = await new Promise((resolve, reject) => {
        const url = new URL('http://localhost:3001/api/mcp/config');
        http.get(url, { timeout: 2000 }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              if (json.success && json.data) {
                resolve(json.data);
              } else {
                reject(new Error('无效的配置响应'));
              }
            } catch (e) {
              reject(e);
            }
          });
        }).on('error', reject);
      });
      return response;
    } catch (e) {
      process.stderr.write(`[飞书 MCP Server] 无法从后端获取配置: ${e.message}，使用环境变量\n`);
      return null;
    }
  }
  return null;
}

// 初始化配置
let currentConfig = {
  webhookEndpoint: WEBHOOK_ENDPOINT,
  triggerToken: TRIGGER_TOKEN,
  projectName: PROJECT_NAME,
};

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
        '将工作总结发送到飞书群组。在完成用户任务或阶段性工作后调用，自动推送工作汇报卡片（采用 ✅/🔧 列表格式）。',
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
          projectName: {
            type: 'string',
            description: `当前项目名称（可选，默认为 "${PROJECT_NAME}"）。会自动显示在消息中。`,
          },
        },
        required: ['summary'],
      },
    },
  ],
}));

// 格式化汇报内容
function formatSummary(summary) {
  if (typeof summary !== 'string') return summary;
  
  // 如果已经是列表形式（包含 ✅ 🔧 等符号），直接返回
  if (/^[\s\n]*(✅|🔧|📝|⚠️|🐛)/.test(summary)) {
    return summary;
  }
  
  // 尝试解析为JSON数组
  if (summary.startsWith('[') && summary.endsWith(']')) {
    try {
      const items = JSON.parse(summary);
      if (Array.isArray(items)) {
        return items.join('\n');
      }
    } catch (e) {}
  }
  
  // 分割超过200字符的纯文本为列表项
  if (summary.length > 150) {
    const sentences = summary.split(/(?<=[。！？；])\s*|\n/).filter(s => s.trim());
    if (sentences.length > 1) {
      return sentences
        .map((s, i) => {
          s = s.trim();
          if (i === 0) return `✅ ${s}`;
          if (i === sentences.length - 1) return `📝 ${s}`;
          return `🔧 ${s}`;
        })
        .join('\n');
    }
  }
  
  // 短文本前缀处理
  return summary.startsWith('完成') || summary.startsWith('已完成')
    ? `✅ ${summary}`
    : summary.startsWith('修复') || summary.startsWith('改进')
    ? `🔧 ${summary}`
    : `📝 ${summary}`;
}

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== 'feishu_notify') {
    throw new Error(`未知工具: ${request.params.name}`);
  }

  if (!currentConfig.webhookEndpoint || !currentConfig.triggerToken) {
    throw new Error(
      '飞书 MCP Server 未配置：请确保后端已启动或在 .vscode/mcp.json 中设置 WEBHOOK_ENDPOINT 和 TRIGGER_TOKEN'
    );
  }

  const args = request.params.arguments || {};
  const rawSummary = String(args.summary || '').trim();
  const summary = formatSummary(rawSummary);
  const customTitle = String(args.title || '').trim();
  const projectName = String(args.projectName || currentConfig.projectName || '').trim();
  
  // 自动生成标题
  let title = customTitle;
  if (!title) {
    if (summary.includes('✅')) title = '✅ 任务完成';
    else if (summary.includes('🔧')) title = '🔧 问题修复';
    else if (summary.includes('🐛')) title = '🐛 Bug 修复';
    else title = '📝 工作总结';
  }

  if (!summary) {
    throw new Error('summary 不能为空');
  }

  // 构建请求体（与后端 webhook 期望的格式一致）
  const body = JSON.stringify({
    event:   'chat_session_end',
    status:  'info',
    title,
    summary, // 已格式化的 summary
    projectName,
  });

  // 发送到后端 webhook
  await postJson(currentConfig.webhookEndpoint, currentConfig.triggerToken, body);

  return {
    content: [
      {
        type: 'text',
        text: `✅ 工作总结已成功发送到飞书！\n\n**标题：** ${title}\n\n**项目：** ${projectName}\n\n**内容：**\n${summary.substring(0, 150)}${summary.length > 150 ? '\n...' : ''}`,
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
    
    // 确保 body 是 UTF-8 编码的 Buffer
    const bodyBuffer = typeof body === 'string' ? Buffer.from(body, 'utf8') : body;
    
    const options = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + (parsed.search || ''),
      method:   'POST',
      headers:  {
        'Content-Type':     'application/json; charset=utf-8',
        'Content-Length':   bodyBuffer.length,
        'X-Trigger-Token':  token,
      },
    };

    const req = lib.request(options, (res) => {
      let data = '';
      // 确保响应也以 UTF-8 解码
      res.setEncoding('utf8');
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
    req.write(bodyBuffer, 'utf8');
    req.end();
  });
}

// ─────────────────────────────────────────────
// 启动 MCP Server（stdio 传输）
// ─────────────────────────────────────────────

async function main() {
  // 尝试从后端获取配置
  const backendConfig = await fetchConfigFromBackend();
  if (backendConfig) {
    currentConfig.webhookEndpoint = backendConfig.webhookEndpoint;
    currentConfig.triggerToken = backendConfig.triggerToken;
    currentConfig.projectName = backendConfig.projectName;
    process.stderr.write(`[飞书 MCP Server] 已从后端获取配置 (集成: ${backendConfig.integrationId})\n`);
  } else if (currentConfig.webhookEndpoint && currentConfig.triggerToken) {
    process.stderr.write(`[飞书 MCP Server] 使用环境变量配置\n`);
  } else {
    process.stderr.write(`[飞书 MCP Server] 警告：未配置 WEBHOOK_ENDPOINT 或 TRIGGER_TOKEN\n`);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // 注意：不要向 stdout 输出任何内容（MCP 协议通过 stdout 通信）
  process.stderr.write('[飞书 MCP Server] 已启动，等待工具调用...\n');
}

main().catch((err) => {
  process.stderr.write(`[飞书 MCP Server] 启动失败: ${err.message}\n`);
  process.exit(1);
});
