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
import databaseService from './database';

const app: Express = express();

// 中间件配置
app.use(helmet());
app.use(pinoHttp({ logger }));
app.use(morgan('combined'));

// CORS 配置
app.use(
  cors({
    origin: '*',
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 限制每个 IP 100 个请求
});
app.use('/api/', limiter);

// 请求体解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 路由
app.use('/api/auth', authRouter);
app.use('/api/robots', robotsRouter);
app.use('/api/users', usersRouter);
app.use('/api', webhookRouter);

// 版本端点
app.get('/api/version', (req: Request, res: Response) => {
  res.json({
    backend: '1.0.0',
    name: 'Feishu AI Notification Service',
  });
});

// 根路由
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Feishu AI Notification Service',
    version: '1.0.0',
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

// 404 处理
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
  });
});

// 错误处理中间件
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({ error: err }, 'Unhandled error');

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
    status: statusCode,
  });
});

// 初始化并启动服务器
async function start() {
  try {
    // 初始化数据库
    await databaseService.initialize();
    logger.info('Database initialized');

    // 检查 Feishu Webhook URL
    if (!config.feishu.webhookUrl) {
      logger.warn(
        'FEISHU_WEBHOOK_URL not configured. Notifications will be logged but not sent to Feishu.'
      );
    }

    // 启动服务器
    const server = app.listen(config.port, config.host, () => {
      logger.info(
        `Server running at http://${config.host}:${config.port}`,
        'Server started'
      );
    });

    // 优雅关闭
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      server.close(async () => {
        await databaseService.close();
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully...');
      server.close(async () => {
        await databaseService.close();
        logger.info('Server closed');
        process.exit(0);
      });
    });
  } catch (err) {
    logger.error({ error: err }, 'Failed to start server');
    process.exit(1);
  }
}

start();

export default app;
