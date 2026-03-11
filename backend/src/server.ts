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

// 中间件配置
app.use(helmet());
app.use(pinoHttp({ logger }));
app.use(morgan('combined'));

// 设置 UTF-8 字符集响应头
app.use((req: Request, res: Response, next: NextFunction) => {
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
const limiter = config.nodeEnv === 'production' ? rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 限制每个 IP 100 个请求
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
app.use('/api/webhook', platformWebhookRouter);  // 平台 Webhook 接收
app.use('/api/mcp', mcpEndpointRouter);  // MCP HTTP SSE 服务器（远端连接）
app.use('/api/mcp', mcpConfigRouter);    // MCP 配置读取
app.use('/api', webhookRouter);

// 版本端点
app.get('/api/version', (req: Request, res: Response) => {
  res.json({
    backend: '1.1.0',
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
    version: '1.1.0',
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
