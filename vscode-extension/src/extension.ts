import * as vscode from 'vscode';
import { FeishuNotifier } from './feishuNotifier';

let notifier: FeishuNotifier;

function getConfig() {
  const config = vscode.workspace.getConfiguration('feishu-notifier');
  return {
    serverUrl: config.get<string>('serverUrl') || 'http://localhost:3000',
    apiToken: config.get<string>('apiToken'),
  };
}

function initNotifier() {
  const config = getConfig();
  notifier = new FeishuNotifier(config);
}

async function sendCustomNotification() {
  const title = await vscode.window.showInputBox({
    prompt: 'Enter notification title',
    placeHolder: 'e.g., Build Complete',
  });

  if (!title) return;

  const summary = await vscode.window.showInputBox({
    prompt: 'Enter notification summary',
    placeHolder: 'e.g., Successfully built project',
  });

  if (!summary) return;

  const statusOptions = ['success', 'error', 'warning', 'info'];
  const status = await vscode.window.showQuickPick(statusOptions, {
    placeHolder: 'Select notification status',
  });

  if (!status) return;

  try {
    await notifier.notify({
      title,
      summary,
      status: status as 'success' | 'error' | 'warning' | 'info',
    });

    vscode.window.showInformationMessage('✅ Notification sent!');
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to send notification: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function sendPullResult() {
  const repository = await vscode.window.showInputBox({
    prompt: 'Repository name',
    placeHolder: 'e.g., my-project',
  });

  if (!repository) return;

  const branch = await vscode.window.showInputBox({
    prompt: 'Branch name',
    placeHolder: 'e.g., main',
  });

  if (!branch) return;

  const commitment = await vscode.window.showInputBox({
    prompt: 'Number of commits (optional)',
    placeHolder: '10',
  });

  try {
    await notifier.notifyPullResult({
      repository,
      branch,
      commitCount: commitment ? parseInt(commitment, 10) : 1,
    });

    vscode.window.showInformationMessage('✅ Pull result sent!');
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function sendDeployResult() {
  const service = await vscode.window.showInputBox({
    prompt: 'Service name',
    placeHolder: 'e.g., api-server',
  });

  if (!service) return;

  const version = await vscode.window.showInputBox({
    prompt: 'Version',
    placeHolder: 'e.g., v1.2.0',
  });

  if (!version) return;

  const environment = await vscode.window.showInputBox({
    prompt: 'Environment (optional)',
    placeHolder: 'e.g., production',
  });

  const deployStatus = await vscode.window.showQuickPick(
    ['success', 'error', 'warning'],
    { placeHolder: 'Select deployment status' }
  );

  if (!deployStatus) return;

  try {
    await notifier.notifyDeployResult({
      service,
      version,
      environment: environment || undefined,
      status: deployStatus as 'success' | 'error' | 'warning',
    });

    vscode.window.showInformationMessage('✅ Deploy result sent!');
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function testConnection() {
  try {
    const connected = await notifier.testConnection();
    if (connected) {
      vscode.window.showInformationMessage(
        '✅ Connected to Feishu Notifier server!'
      );
    } else {
      vscode.window.showErrorMessage('❌ Failed to connect to server');
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

function openSettings() {
  vscode.commands.executeCommand(
    'workbench.action.openSettings',
    'feishu-notifier'
  );
}

export function activate(context: vscode.ExtensionContext) {
  initNotifier();

  const commands = [
    vscode.commands.registerCommand(
      'feishu-notifier.sendNotification',
      sendCustomNotification
    ),
    vscode.commands.registerCommand(
      'feishu-notifier.sendPullResult',
      sendPullResult
    ),
    vscode.commands.registerCommand(
      'feishu-notifier.sendDeployResult',
      sendDeployResult
    ),
    vscode.commands.registerCommand(
      'feishu-notifier.testWebhook',
      testConnection
    ),
    vscode.commands.registerCommand(
      'feishu-notifier.settings',
      openSettings
    ),
  ];

  commands.forEach((cmd) => context.subscriptions.push(cmd));

  // 监听配置日改变
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('feishu-notifier')) {
        initNotifier();
      }
    })
  );

  console.log('Feishu AI Notifier extension activated');
}

export function deactivate() {
  console.log('Feishu AI Notifier extension deactivated');
}
