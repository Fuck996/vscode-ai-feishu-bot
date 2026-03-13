import * as fs from 'fs';
import * as path from 'path';

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { config } from './config';
import logger from './logger';
import webhookRouter from './routes/webhook';
import authRouter from './routes/auth';
import robotsRouter from './routes/robots';
import usersRouter from './routes/users';
import integrationsRouter from './routes/integrations';
import platformWebhookRouter from './routes/platform-webhook';
import mcpConfigRouter from './routes/mcp-config';
import mcpEndpointRouter from './routes/mcp-endpoint';
import servicesRouter from './routes/services';
import auditRouter from './routes/audit';
import databaseService from './database';

// 设置时区为北京时间
process.env.TZ = process.env.TZ || 'Asia/Shanghai';

// 确保 UTF-8 编码
if (typeof global !== 'undefined') {
  (global as any).console = {
    ...console,
    log: (...args: any[]) => {
      process.stdout.write(Buffer.from(String(...args), 'utf8').toString('utf8') + '\n');
    },
  };
}

const app: Express = express();

function readAppVersion(): string {
  try {
    const packageJsonPath = path.join(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return typeof packageJson.version === 'string' ? packageJson.version : '0.0.0';
  } catch (error) {
    logger.warn({ error }, '读取 package.json 版本失败，回退到默认版本号');
    return '0.0.0';
  }
}

// 信任反向代理（nginx/Docker），使速率限制器使用真实客户端 IP
// 若不设置，nginx 后面所有请求都视为同一 IP，共享速率限额
app.set('trust proxy', 1);

// 临时调试中间件：记录所有 /api 请求的基本信息（路径、方法、部分头部）
// 用于排查外网请求是否到达后端（上线后请移除或禁用）
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.headers.authorization || '';
    logger.info({ method: req.method, path: req.originalUrl, auth: auth ? '[REDACTED]' : '' }, 'Incoming API request');
  } catch (e) {
    // 忽略日志错误，继续流程
  }
  next();
});

// 中间件配置
app.use(helmet());
app.use(pinoHttp({ logger }));
app.use(morgan('combined'));

// 设置 UTF-8 字符集响应头（仅限 API 路由，避免污染静态文件的 Content-Type）
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// CORS 配置
app.use(
  cors({
    origin: '*',
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 速率限制（开发环境下禁用）
// 排除 MCP 端点：SSE 连接是长连接且已有 Token 认证保护，不应被 IP 速率限制干扰
// 若不排除，VS Code 每次连接消耗 2 次配额（POST 405 + GET），重连多次后触发 429
// 429 响应含 Retry-After: 900，VS Code MCP 客户端将等待 15 分钟后重试
const limiter = config.nodeEnv === 'production' ? rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 限制每个 IP 100 个请求
  message: { success: false, error: '请求过于频繁，请15分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
  // 跳过 MCP 路由：/api/mcp/sse、/api/mcp/message、/api/mcp/config
  skip: (req: Request) => req.originalUrl.startsWith('/api/mcp'),
}) : (req: Request, res: Response, next: NextFunction) => next();

app.use('/api/', limiter);

// 请求体解析（同时捕获 rawBody，用于平台 Webhook 签名验证）
app.use(express.json({
  limit: '10mb',
  verify: (req: any, _res, buf) => {
    req.rawBody = buf.toString('utf8');
  },
}));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 路由
app.use('/api/auth', authRouter);
app.use('/api/robots', robotsRouter);
app.use('/api/robots/:robotId/integrations', integrationsRouter);
app.use('/api/users', usersRouter);
app.use('/api/services', servicesRouter);
app.use('/api/audit', auditRouter);
app.use('/api/webhook', platformWebhookRouter);  // 平台 Webhook 接收
app.use('/api/mcp', mcpEndpointRouter);  // MCP HTTP SSE 服务器（远端连接）
app.use('/api/mcp', mcpConfigRouter);    // MCP 配置读取
app.use('/api', webhookRouter);

// 版本端点
const APP_VERSION = readAppVersion();
app.get('/api/version', (req: Request, res: Response) => {
  res.json({
    backend: APP_VERSION,
    version: APP_VERSION,
    name: 'Feishu AI Notification Service',
  });
});

// 健康检查端点
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// 服务状态（JSON），放在 /api/status 以避免与前端静态文件根路径冲突
app.get('/api/status', (req: Request, res: Response) => {
  res.json({
    name: 'Feishu AI Notification Service',
    version: APP_VERSION,
    status: 'running',
    endpoints: {
      health: '/api/health',
      notify: 'POST /api/notify',
      notifications: 'GET /api/notifications',
      stats: 'GET /api/stats',
      test: 'POST /api/webhooks/test',
    },
  });
});

// 提供前端静态文件
app.use(express.static('public', { 
  index: 'index.html',
  maxAge: '1h'
}));

// SPA 历史模式支持 - 所有非 API 路由都返回 index.html
app.get('*', (req: Request, res: Response) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile('public/index.html', { root: process.cwd() });
  } else {
    res.status(404).json({
      error: '未找到',
      path: req.path,
    });
  }
});

// 404 处理
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: '未找到',
    path: req.path,
  });
});

// 错误处理中间件
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({ error: err }, '未处理的错误');

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    error: err.message || '内部服务器错误',
    status: statusCode,
  });
});

// 初始化并启动服务器
async function start() {
  try {
    // 初始化数据库
    await databaseService.initialize();
    logger.info('数据库已初始化');

    // 检查 Feishu Webhook URL
    if (!config.feishu.webhookUrl) {
      logger.warn(
        '未配置 FEISHU_WEBHOOK_URL。通知将被记录但不会发送到飞书。'
      );
    }

    // 启动服务器
    const server = app.listen(config.port, config.host, () => {
      logger.info(
        `服务器运行在 http://${config.host}:${config.port}`,
        '服务器已启动'
      );
    });

    // 优雅关闭
    process.on('SIGTERM', async () => {
      logger.info('收到 SIGTERM，正在优雅关闭...');
      server.close(async () => {
        await databaseService.close();
        logger.info('服务器已关闭');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      logger.info('收到 SIGINT，正在优雅关闭...');
      server.close(async () => {
        await databaseService.close();
        logger.info('服务器已关闭');
        process.exit(0);
      });
    });
  } catch (err) {
    logger.error({ error: err }, '启动服务器失败');
    process.exit(1);
  }
}

start();

export default app;
