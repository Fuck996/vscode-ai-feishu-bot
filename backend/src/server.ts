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
import mcpModelsRouter from './routes/mcp-models';
import mcpPromptsRouter from './routes/mcp-prompts';
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

function createJsonRateLimiter(options: {
  windowMs: number;
  max: number;
  message: string;
  skipSuccessfulRequests?: boolean;
}) {
  if (config.nodeEnv !== 'production') {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }

  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: { success: false, error: options.message },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
  });
}

// 仅限制公开入口，避免已登录后台页面和 MCP 长连接被全局配额误伤。
const authLoginLimiter = createJsonRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: '登录尝试过于频繁，请15分钟后再试',
  skipSuccessfulRequests: true,
});

const passwordRecoveryLimiter = createJsonRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: '密码找回请求过于频繁，请15分钟后再试',
});

const publicApiLimiter = createJsonRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: '公开接口请求过于频繁，请15分钟后再试',
});

const webhookLimiter = createJsonRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 600,
  message: 'Webhook 请求过于频繁，请稍后再试',
});

app.use('/api/auth/login', authLoginLimiter);
app.use('/api/auth/forgot-password', passwordRecoveryLimiter);
app.use('/api/auth/verify-reset-code', passwordRecoveryLimiter);
app.use('/api/auth/reset-password', passwordRecoveryLimiter);
app.use('/api/version', publicApiLimiter);
app.use('/api/health', publicApiLimiter);
app.use('/api/status', publicApiLimiter);
app.use('/api/notify', publicApiLimiter);
app.use('/api/stats', publicApiLimiter);
app.use('/api/mcp/config', publicApiLimiter);
app.use('/api/webhook', webhookLimiter);

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
app.use('/api/mcp/models', mcpModelsRouter);  // MCP 模型配置管理
app.use('/api/mcp/prompts', mcpPromptsRouter);  // MCP 提示词模板管理
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
