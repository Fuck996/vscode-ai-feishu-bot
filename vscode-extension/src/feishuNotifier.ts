import axios from 'axios';

export interface NotifyOptions {
  title: string;
  summary: string;
  status: 'success' | 'error' | 'warning' | 'info';
  action?: string;
  details?: Record<string, any>;
}

export interface FeishuNotifierConfig {
  serverUrl: string;
  apiToken?: string;
}

export class FeishuNotifier {
  private config: FeishuNotifierConfig;

  constructor(config: FeishuNotifierConfig) {
    this.config = config;
  }

  async notify(options: NotifyOptions): Promise<void> {
    if (!this.config.serverUrl) {
      throw new Error('Server URL not configured');
    }

    const url = `${this.config.serverUrl}/api/notify`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiToken) {
      headers['Authorization'] = `Bearer ${this.config.apiToken}`;
    }

    const response = await axios.post(url, options, { headers });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to send notification');
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.config.serverUrl) {
      throw new Error('Server URL not configured');
    }

    try {
      const response = await axios.get(
        `${this.config.serverUrl}/api/health`,
        { timeout: 5000 }
      );
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async notifyPullResult(options: {
    repository: string;
    branch: string;
    commitCount?: number;
    summary?: string;
  }): Promise<void> {
    await this.notify({
      title: `Pull: ${options.repository}`,
      summary:
        options.summary ||
        `Pulled ${options.commitCount || 1} commits from ${options.branch}`,
      status: 'success',
      action: 'pull',
      details: {
        repository: options.repository,
        branch: options.branch,
        commitCount: options.commitCount,
        timestamp: new Date().toISOString(),
      },
    });
  }

  async notifyPushResult(options: {
    repository: string;
    branch: string;
    commitCount?: number;
    summary?: string;
  }): Promise<void> {
    await this.notify({
      title: `Push: ${options.repository}`,
      summary:
        options.summary ||
        `Pushed ${options.commitCount || 1} commits to ${options.branch}`,
      status: 'success',
      action: 'push',
      details: {
        repository: options.repository,
        branch: options.branch,
        commitCount: options.commitCount,
        timestamp: new Date().toISOString(),
      },
    });
  }

  async notifyDeployResult(options: {
    service: string;
    version: string;
    environment?: string;
    duration?: number;
    status?: 'success' | 'error' | 'warning';
    summary?: string;
  }): Promise<void> {
    const status = options.status || 'success';
    await this.notify({
      title: `Deploy: ${options.service} v${options.version}`,
      summary:
        options.summary ||
        `Deployment to ${options.environment || 'production'} completed`,
      status,
      action: 'deploy',
      details: {
        service: options.service,
        version: options.version,
        environment: options.environment || 'production',
        duration: options.duration,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
