import axios, { AxiosError } from 'axios';
import logger from './logger';
import { config } from './config';

export interface NotificationPayload {
  title: string;
  summary: string;
  status: 'success' | 'error' | 'warning' | 'info';
  details?: Record<string, any>;
  timestamp?: string;
  action?: string; // pull, push, deploy, build
  robotName?: string;
  source?: string;
}

class FeishuService {
  private webhookUrl: string;
  private maxRetries: number;

  constructor() {
    this.webhookUrl = config.feishu.webhookUrl;
    this.maxRetries = config.maxRetries;
  }

  /**
   * 发送富文本消息到飞书
   */
  async sendRichNotification(payload: NotificationPayload): Promise<void> {
    if (!this.webhookUrl) {
      throw new Error('Feishu Webhook URL not configured');
    }

    const message = this.buildRichMessage(payload);
    await this.sendWithRetry(message);
  }

  /**
   * 发送简单文本消息到飞书
   */
  async sendTextNotification(text: string): Promise<void> {
    if (!this.webhookUrl) {
      throw new Error('Feishu Webhook URL not configured');
    }

    const message = {
      msg_type: 'text',
      content: {
        text,
      },
    };

    await this.sendWithRetry(message);
  }

  /**
   * 构建富文本消息
   */
  private buildRichMessage(payload: NotificationPayload) {
    const statusEmoji = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
    };

    const emoji = statusEmoji[payload.status] || 'ℹ️';
    const timestamp = payload.timestamp || new Date().toISOString();

    // 构建详情区域
    let detailsMarkdown = '';
    if (payload.details) {
      detailsMarkdown = '\n\n**详细信息：**\n';
      for (const [key, value] of Object.entries(payload.details)) {
        if (value !== null && value !== undefined) {
          detailsMarkdown += `- ${key}: \`${value}\`\n`;
        }
      }
    }

    const content = `${emoji} **${payload.title}**

${payload.summary}${detailsMarkdown}

*时间：${new Date(timestamp).toLocaleString('zh-CN')}*`;

    return {
      msg_type: 'post',
      content: {
        post: {
          zh_cn: {
            title: `${emoji} ${payload.title}`,
            content: [
              [
                {
                  tag: 'text',
                  text: content,
                },
              ],
            ],
          },
        },
      },
    };
  }

  /**
   * 带重试的发送
   */
  private async sendWithRetry(message: any): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await axios.post(this.webhookUrl, message, {
          timeout: config.requestTimeout,
        });
        logger.info(`Feishu notification sent successfully on attempt ${attempt}`);
        return;
      } catch (error) {
        lastError = error instanceof AxiosError ? new Error(error.message) : (error as Error);
        logger.warn(`Attempt ${attempt} failed: ${lastError.message}`);

        if (attempt < this.maxRetries) {
          // 指数退避
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    logger.error(`Failed to send Feishu notification after ${this.maxRetries} attempts`);
    throw new Error(`Failed to send notification: ${lastError?.message}`);
  }
}

export default new FeishuService();
