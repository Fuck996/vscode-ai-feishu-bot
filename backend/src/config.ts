import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || 'localhost',
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Feishu 配置
  feishu: {
    webhookUrl: process.env.FEISHU_WEBHOOK_URL || '',
  },
  
  // JWT 配置
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-key',
    expiresIn: '7d',
  },
  
  // 数据库配置
  database: {
    path: process.env.DATABASE_PATH || './data/notifications.db',
  },
  
  // 日志配置
  log: {
    level: process.env.LOG_LEVEL || 'info',
  },
  
  // CORS 配置
  cors: {
    origin: (process.env.CORS_ORIGIN || '*').split(','),
  },
  
  // 其他配置
  maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000', 10),
};
