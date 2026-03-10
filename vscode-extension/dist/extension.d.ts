/**
 * extension.ts
 * 飞书 AI 汇报器 VS Code 扩展入口
 *
 * 核心功能：
 *   1. @feishu Chat 参与者 — 在 Copilot Chat 中用 @feishu 触发工作汇报
 *   2. feishu-notifier.reportNow 命令 — 不依赖 Chat 的快速汇报命令（Ctrl+Shift+F）
 *   3. feishu-notifier.testConnection 命令 — 验证配置是否有效
 *
 * 使用前置条件：
 *   在 VS Code 设置中填写：
 *     feishuNotifier.webhookEndpoint  — 从飞书通知系统 VS Code Chat 集成创建后获取
 *     feishuNotifier.triggerToken     — 同上（即集成的 webhookSecret）
 */
import * as vscode from 'vscode';
export declare function activate(context: vscode.ExtensionContext): void;
export declare function deactivate(): void;
//# sourceMappingURL=extension.d.ts.map