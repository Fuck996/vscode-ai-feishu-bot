"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const feishuNotifier_1 = require("./feishuNotifier");
let extensionContext;
const sessionLog = [];
// ─────────────────────────────────────────────
// 配置读取
// ─────────────────────────────────────────────
function getNotifier() {
    const cfg = vscode.workspace.getConfiguration('feishuNotifier');
    const webhookEndpoint = cfg.get('webhookEndpoint', '').trim();
    const triggerToken = cfg.get('triggerToken', '').trim();
    if (!webhookEndpoint || !triggerToken)
        return null;
    return new feishuNotifier_1.FeishuNotifier({ webhookEndpoint, triggerToken });
}
function showConfigError() {
    vscode.window
        .showErrorMessage('飞书汇报器：请先配置 webhookEndpoint 和 triggerToken。', '打开设置')
        .then((v) => {
        if (v === '打开设置') {
            vscode.commands.executeCommand('workbench.action.openSettings', 'feishuNotifier');
        }
    });
}
// ─────────────────────────────────────────────
// AI 摘要：优先使用 vscode.lm（Copilot），原文作 fallback
// ─────────────────────────────────────────────
async function generateSummary(userContent, cancelToken) {
    try {
        const models = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
        if (models.length === 0)
            return userContent;
        const messages = [
            vscode.LanguageModelChatMessage.User(`将以下工作内容整理为简洁、专业的飞书工作汇报（中文，200字以内），` +
                `包含：主要完成事项、关键进展、待跟进问题（如有）。\n\n原始内容：\n${userContent}`),
        ];
        const response = await models[0].sendRequest(messages, {}, cancelToken);
        let aiSummary = '';
        for await (const chunk of response.text) {
            aiSummary += chunk;
        }
        return aiSummary.trim() || userContent;
    }
    catch {
        // AI 摘要失败（无 Copilot 订阅或被取消），直接使用原文
        return userContent;
    }
}
// ─────────────────────────────────────────────
// @feishu Chat 参与者处理器
// ─────────────────────────────────────────────
async function handleChatRequest(request, _context, stream, token) {
    const notifier = getNotifier();
    if (!notifier) {
        stream.markdown('❌ **未配置飞书集成**\n\n' +
            '请在 VS Code 设置中填写以下两项，参数来自飞书通知系统 **VS Code Chat** 集成创建后的配置引导弹窗：\n\n' +
            '- `feishuNotifier.webhookEndpoint`\n' +
            '- `feishuNotifier.triggerToken`\n\n' +
            '[打开设置](command:workbench.action.openSettings?%22feishuNotifier%22)');
        return {};
    }
    // /end 子命令：汇总本次 Chat 会话的所有工作内容
    if (request.command === 'end') {
        stream.progress('正在读取本次 Chat 会话并生成汇总...');
        try {
            await sendSessionEndSummary();
            stream.markdown(`✅ **会话总结已成功发送到飞书！**

我已自动读取本次 Chat 会话的完整对话历史，提取工作成果并汇总至飞书群组。

**下一步：** 可继续进行新的工作会话，或通过 \`@feishu /end\` 再次汇总。`);
        }
        catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            console.error('[飞书汇报器] /end 命令执行失败:', e);
            stream.markdown(`❌ **发送失败**\n\n**错误：** ${errorMsg}\n\n**排查方法：**\n
1. 检查是否有可用的工作汇报内容
2. 查看 VS Code 输出面板（Output → "飞书汇报器"）了解详细日志
3. 确认飞书集成配置和网络连接`);
        }
        return {};
    }
    // /test 子命令
    if (request.command === 'test') {
        stream.progress('正在发送测试通知...');
        try {
            await notifier.test();
            stream.markdown('✅ **测试通知已发送！** 请检查飞书群组是否收到消息。');
        }
        catch (e) {
            stream.markdown(`❌ **发送失败：** ${e instanceof Error ? e.message : String(e)}`);
        }
        return {};
    }
    // 默认：汇报工作
    const userContent = request.prompt.trim();
    if (!userContent) {
        stream.markdown('请输入您的工作内容，例如：\n\n' +
            '```\n@feishu 今日完成了 Dashboard 数据统计模块的开发，修复了历史记录页分页 Bug\n```\n\n' +
            '或使用子命令 `/test` 验证配置是否正确。');
        return {};
    }
    stream.progress('正在生成工作摘要...');
    const summary = await generateSummary(userContent, token);
    if (token.isCancellationRequested)
        return {};
    try {
        await notifier.send({
            event: 'chat_manual',
            status: 'info',
            title: '📋 工作汇报',
            summary,
        });
        // 追踪到会话日志，供 chat_session_end 汇总使用
        sessionLog.push({ prompt: userContent, summary, time: new Date().toLocaleString('zh-CN') });
        stream.markdown(`✅ **已发送到飞书！**\n\n**摘要内容：**\n\n${summary}`);
        // ✨ 自动检测结束词语，自动汇总
        const endKeywords = ['完成', '结束', '好的', '可以', '谢谢', '再见', '拜拜'];
        const shouldAutoSummarize = endKeywords.some(kw => userContent.includes(kw));
        if (shouldAutoSummarize && sessionLog.length > 0) {
            stream.markdown('\n---\n\n🤖 **检测到工作完成，3 秒后自动生成会话总结...**');
            // 延迟 3 秒后自动汇总
            setTimeout(async () => {
                try {
                    await sendSessionEndSummary();
                    console.log('[飞书汇报器] 自动发送会话总结成功');
                }
                catch (e) {
                    console.error('[飞书汇报器] 自动发送会话总结失败:', e);
                }
            }, 3000);
        }
    }
    catch (e) {
        stream.markdown(`❌ **发送失败：** ${e instanceof Error ? e.message : String(e)}`);
    }
    return {};
}
// ─────────────────────────────────────────────
// 命令：快速手动汇报（不依赖 Copilot Chat）
// ─────────────────────────────────────────────
async function reportNow() {
    const notifier = getNotifier();
    if (!notifier) {
        showConfigError();
        return;
    }
    const content = await vscode.window.showInputBox({
        title: '发送飞书工作汇报',
        prompt: '输入本次工作汇报内容',
        placeHolder: '例如：完成了登录功能，修复了分页 Bug',
        validateInput: (v) => (v.trim() ? null : '内容不能为空'),
    });
    if (!content)
        return;
    // 命令模式下无 CancellationToken，用永不取消的 token
    const cts = new vscode.CancellationTokenSource();
    const summary = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: '飞书汇报器', cancellable: false }, async (progress) => {
        progress.report({ message: '正在生成摘要...' });
        const s = await generateSummary(content, cts.token);
        progress.report({ message: '正在发送...' });
        return s;
    });
    try {
        await notifier.send({ event: 'chat_manual', status: 'info', title: '📋 工作汇报', summary });
        sessionLog.push({ prompt: content, summary, time: new Date().toLocaleString('zh-CN') });
        vscode.window.showInformationMessage(`✅ 工作汇报已发送到飞书！\n摘要：${summary.substring(0, 80)}${summary.length > 80 ? '…' : ''}`);
    }
    catch (e) {
        vscode.window.showErrorMessage(`发送失败：${e instanceof Error ? e.message : String(e)}`);
    }
    finally {
        cts.dispose();
    }
}
// ─────────────────────────────────────────────
// 命令：测试连接
// ─────────────────────────────────────────────
async function testConnection() {
    const notifier = getNotifier();
    if (!notifier) {
        showConfigError();
        return;
    }
    try {
        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: '飞书汇报器：正在测试连接...' }, () => notifier.test());
        vscode.window.showInformationMessage('✅ 连接正常！请检查飞书群组是否收到测试消息。');
    }
    catch (e) {
        vscode.window.showErrorMessage(`❌ 连接失败：${e instanceof Error ? e.message : String(e)}`);
    }
}
// ─────────────────────────────────────────────
// 命令：结束会话并发送汇总（命令面板版）
// ─────────────────────────────────────────────
async function endSession() {
    const notifier = getNotifier();
    if (!notifier) {
        showConfigError();
        return;
    }
    try {
        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: '飞书汇报器：正在生成会话总结...' }, () => sendSessionEndSummary());
        vscode.window.showInformationMessage('✅ 会话总结已成功发送到飞书！');
    }
    catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        vscode.window.showErrorMessage(`❌ 发送失败: ${errorMsg}。请查看输出面板了解详情。`);
    }
}
// ─────────────────────────────────────────────
// 扩展激活 / 停用
// ─────────────────────────────────────────────
function activate(context) {
    // 保存全局 context，用于后续的存储路径访问
    extensionContext = context;
    // 注册 @feishu Chat 参与者（需要 VS Code >= 1.90.0）
    const participant = vscode.chat.createChatParticipant('feishu-notifier.report', handleChatRequest);
    participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'feishu-icon.png');
    context.subscriptions.push(participant, vscode.commands.registerCommand('feishu-notifier.reportNow', reportNow), vscode.commands.registerCommand('feishu-notifier.endSession', endSession), vscode.commands.registerCommand('feishu-notifier.testConnection', testConnection), vscode.commands.registerCommand('feishu-notifier.settings', () => vscode.commands.executeCommand('workbench.action.openSettings', 'feishuNotifier')));
    console.log('[飞书 AI 汇报器] 扩展已激活');
}
function deactivate() {
    console.log('[飞书 AI 汇报器] 扩展已停用');
    // 不自动发送，由用户主动执行 /end 或命令面板【结束会话并汇总】
}
// ─────────────────────────────────────────────
// 读取最新的 Chat 会话文件
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// 读取最新的 Chat 会话文件（多路径尝试）
// ─────────────────────────────────────────────
async function readLatestChatSession() {
    try {
        if (!extensionContext)
            return null;
        // 尝试多个可能的路径
        const possiblePaths = [];
        // 路径 1: extensionContext.storageUri/chatSessions
        if (extensionContext.storageUri) {
            possiblePaths.push(path.join(extensionContext.storageUri.fsPath, 'chatSessions'));
        }
        // 路径 2: 全局存储 %APPDATA%/Code/User/workspaceStorage/*/chatSessions
        const userHome = process.env.APPDATA || process.env.HOME;
        if (userHome) {
            const globalStoragePath = path.join(userHome, 'Code', 'User', 'workspaceStorage');
            if (fs.existsSync(globalStoragePath)) {
                const workspaceDirs = fs.readdirSync(globalStoragePath);
                for (const dir of workspaceDirs) {
                    possiblePaths.push(path.join(globalStoragePath, dir, 'chatSessions'));
                }
            }
        }
        console.log('[飞书汇报器] 尝试读取 Chat 会话，路径:', possiblePaths);
        for (const chatSessionDir of possiblePaths) {
            if (!fs.existsSync(chatSessionDir))
                continue;
            const files = fs.readdirSync(chatSessionDir).filter(f => f.endsWith('.json'));
            if (files.length === 0)
                continue;
            // 获取最新修改的文件
            let latestFile = files[0];
            let latestTime = fs.statSync(path.join(chatSessionDir, files[0])).mtime.getTime();
            for (const file of files.slice(1)) {
                const mtime = fs.statSync(path.join(chatSessionDir, file)).mtime.getTime();
                if (mtime > latestTime) {
                    latestTime = mtime;
                    latestFile = file;
                }
            }
            const filePath = path.join(chatSessionDir, latestFile);
            const content = fs.readFileSync(filePath, 'utf-8');
            console.log('[飞书汇报器] 成功读取 Chat 会话文件:', filePath);
            return content;
        }
        console.log('[飞书汇报器] 未找到 Chat 会话文件，降级使用 sessionLog');
        return null;
    }
    catch (err) {
        console.error('[飞书汇报器] 读取 Chat 会话失败:', err);
        return null;
    }
}
// ─────────────────────────────────────────────
// 从 Chat 会话文件中提取对话内容
// ─────────────────────────────────────────────
function extractChatHistory(sessionContent) {
    try {
        const session = JSON.parse(sessionContent);
        let messages = [];
        // 尝试多种可能的结构
        if (Array.isArray(session)) {
            messages = session;
        }
        else if (session.requests && Array.isArray(session.requests)) {
            messages = session.requests;
        }
        else if (session.messages && Array.isArray(session.messages)) {
            messages = session.messages;
        }
        else if (session.history && Array.isArray(session.history)) {
            messages = session.history;
        }
        else if (session.turns && Array.isArray(session.turns)) {
            messages = session.turns;
        }
        if (messages.length === 0) {
            console.log('[飞书汇报器] 未识别 Chat 会话结构');
            return '';
        }
        // 构建对话文本
        const dialog = messages
            .map((msg, idx) => {
            let role = '';
            let text = '';
            // 识别角色
            if (msg.kind === 'usermessage' || msg.role === 'user') {
                role = '👤 我说：';
            }
            else if (msg.kind === 'assistantmessage' || msg.role === 'assistant') {
                role = '🤖 Copilot 回复：';
            }
            else {
                return '';
            }
            // 提取文本内容
            if (msg.message) {
                if (typeof msg.message === 'string') {
                    text = msg.message;
                }
                else if (Array.isArray(msg.message)) {
                    text = msg.message.map((m) => m.text || m.content || m.value || '').join('\n');
                }
            }
            else if (msg.prompt) {
                text = msg.prompt;
            }
            else if (msg.response) {
                text = msg.response;
            }
            else if (msg.text) {
                text = msg.text;
            }
            else if (msg.content) {
                text = msg.content;
            }
            return text.trim() ? `${role}\n${text}` : '';
        })
            .filter((t) => t.length > 0)
            .join('\n\n---\n\n');
        console.log('[飞书汇报器] 成功提取 Chat 历史，长度:', dialog.length);
        return dialog;
    }
    catch (err) {
        console.error('[飞书汇报器] 解析 Chat 会话失败:', err);
        return '';
    }
}
// ─────────────────────────────────────────────
// 会话结束自动汇总（将 Chat 历史转换为工作汇总）
// ─────────────────────────────────────────────
async function sendSessionEndSummary() {
    const notifier = getNotifier();
    if (!notifier)
        throw new Error('飞书集成未配置');
    console.log('[飞书汇报器] 开始生成会话总结...');
    // 尝试读取最新的 Chat 会话文件
    const sessionContent = await readLatestChatSession();
    let dialogHistory = '';
    if (sessionContent) {
        dialogHistory = extractChatHistory(sessionContent);
    }
    console.log('[飞书汇报器] Chat 历史长度:', dialogHistory.length, '字符');
    // 如果文件读取失败或为空，降级到 sessionLog
    if (!dialogHistory && sessionLog.length === 0) {
        console.warn('[飞书汇报器] 无可用的汇报内容');
        throw new Error('本次会话没有任何汇报记录');
    }
    let summary = '';
    let dataSource = '';
    if (dialogHistory && dialogHistory.length > 100) {
        // 使用 Chat 历史生成汇总
        dataSource = '（从完整 Chat 历史提取）';
        try {
            console.log('[飞书汇报器] 使用 AI 整理 Chat 历史...');
            summary = await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: '飞书汇报器', cancellable: false }, (progress) => {
                progress.report({ message: '正在整理 Chat 会话...' });
                return generateSummary(`请根据以下本次 VS Code Chat 工作会话的完整对话，总结我的工作成果和进展。` +
                    `忽略闲聊内容，重点提取技术工作、代码改动、问题解决等工作成果。\n\n${dialogHistory}`, new vscode.CancellationTokenSource().token);
            });
        }
        catch (e) {
            console.error('[飞书汇报器] AI 整理失败，降级使用原始历史:', e);
            summary = dialogHistory.substring(0, 1000); // 截取前 1000 字
            dataSource = '（Chat 历史原文）';
        }
    }
    else if (sessionLog.length > 0) {
        // 使用 sessionLog（备选）
        dataSource = '（从 Feishu 标记提取）';
        const header = `本次 VS Code 会话共发起 **${sessionLog.length}** 次汇报：`;
        const body = sessionLog
            .map((e, i) => `**${i + 1}.** [${e.time}]\n${e.summary}`)
            .join('\n\n---\n\n');
        summary = `${header}\n\n${body}`;
    }
    if (!summary) {
        throw new Error('无法生成汇总内容');
    }
    console.log('[飞书汇报器] 汇总已生成，正在发送到飞书...');
    await notifier.send({
        event: 'chat_session_end',
        status: 'info',
        title: `📝 工作会话总结`,
        summary: `${summary}\n\n---\n\n**📊 数据来源：** ${dataSource}`,
    });
    console.log('[飞书汇报器] 会话总结已成功发送');
    sessionLog.length = 0; // 清空日志
}
//# sourceMappingURL=extension.js.map