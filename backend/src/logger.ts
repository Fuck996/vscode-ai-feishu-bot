import pino from 'pino';
import { config } from './config';

const logger = pino({
  level: config.log.level,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
      // 确保 UTF-8 编码输出
      singleLine: false,
      levelFirst: true,
    },
  },
});

export default logger;
