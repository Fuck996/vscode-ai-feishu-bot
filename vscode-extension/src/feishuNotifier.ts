/**
 * feishuNotifier.ts
 * Webhook 发送帮助类 — 对接 /api/webhook/{integrationId} 端点
 */

export interface WebhookPayload {
  /** 事件类型，对应后端 normalizeGeneric 识别 */
  event: 'chat_manual' | 'chat_session_end' | string;
  /** 事件验成：信息类内容用 info */
  status: 'success' | 'failure' | 'info';
  /** 消息标题 */
  title: string;
  /** 消息正文，支持 Markdown */
  summary: string;
  /** 可选链接 */
  url?: string;
}

export interface FeishuNotifierConfig {
  /** Webhook 地址（完整 URL） */
  webhookEndpoint: string;
  /** 所属集成的 webhookSecret，通过 X-Trigger-Token 头传入 */
  triggerToken: string;
}

export class FeishuNotifier {
  private config: FeishuNotifierConfig;

  constructor(config: FeishuNotifierConfig) {
    this.config = config;
  }

  /**
   * 发送通知到飞书 Webhook
   */
  async send(payload: WebhookPayload): Promise<void> {
    const { webhookEndpoint, triggerToken } = this.config;
    if (!webhookEndpoint || !triggerToken) {
      throw new Error('请先配置 feishuNotifier.webhookEndpoint 和 feishuNotifier.triggerToken');
    }

    const res = await fetch(webhookEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Trigger-Token': triggerToken,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
  }

  /**
   * 测试连通性 — 发送一坡測试通知
   */
  async test(): Promise<void> {
    await this.send({
      event: 'chat_manual',
      status: 'info',
      title: '🔔 VS Code Chat 测试通知',
      summary: '连接正常，飞书通知系统工作正常。',
    });
  }
}
