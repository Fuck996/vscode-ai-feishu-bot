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
export declare class FeishuNotifier {
    private config;
    constructor(config: FeishuNotifierConfig);
    /**
     * 发送通知到飞书 Webhook
     */
    send(payload: WebhookPayload): Promise<void>;
    /**
     * 测试连通性 — 发送一坡測试通知
     */
    test(): Promise<void>;
}
//# sourceMappingURL=feishuNotifier.d.ts.map