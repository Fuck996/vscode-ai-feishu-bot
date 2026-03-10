"use strict";
/**
 * feishuNotifier.ts
 * Webhook 发送帮助类 — 对接 /api/webhook/{integrationId} 端点
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeishuNotifier = void 0;
class FeishuNotifier {
    constructor(config) {
        this.config = config;
    }
    /**
     * 发送通知到飞书 Webhook
     */
    async send(payload) {
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
    async test() {
        await this.send({
            event: 'chat_manual',
            status: 'info',
            title: '🔔 VS Code Chat 测试通知',
            summary: '连接正常，飞书通知系统工作正常。',
        });
    }
}
exports.FeishuNotifier = FeishuNotifier;
//# sourceMappingURL=feishuNotifier.js.map