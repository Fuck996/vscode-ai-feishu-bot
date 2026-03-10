import axios, { AxiosError } from 'axios';
import { FeishuNotifierConfig, NotifyOptions, NotificationResponse } from './types';

export class FeishuNotifier {
  private config: FeishuNotifierConfig;

  constructor(config: FeishuNotifierConfig) {
    if (!config.serverUrl) {
      throw new Error('serverUrl is required');
    }
    this.config = config;
  }

  async notify(options: NotifyOptions): Promise<NotificationResponse> {
    const payload = {
      title: options.title,
      summary: options.summary,
      status: options.status,
      action: options.action,
      details: options.details,
      timestamp: options.timestamp || new Date().toISOString(),
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiToken) {
      headers['Authorization'] = `Bearer ${this.config.apiToken}`;
    }

    try {
      const response = await axios.post<NotificationResponse>(
        `${this.config.serverUrl}/api/notify`,
        payload,
        { headers, timeout: 10000 }
      );

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async notifyPullResult(options: {
    repository: string;
    branch: string;
    commitCount?: number;
    summary?: string;
  }): Promise<NotificationResponse> {
    return this.notify({
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
  }): Promise<NotificationResponse> {
    return this.notify({
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
  }): Promise<NotificationResponse> {
    const status = options.status || 'success';
    return this.notify({
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

  async notifyBuildResult(options: {
    projectName: string;
    status?: 'success' | 'error' | 'warning';
    duration?: number;
    summary?: string;
    details?: Record<string, any>;
  }): Promise<NotificationResponse> {
    const status = options.status || 'success';
    return this.notify({
      title: `Build: ${options.projectName}`,
      summary: options.summary || `Build completed with ${status} status`,
      status,
      action: 'build',
      details: {
        projectName: options.projectName,
        duration: options.duration,
        ...options.details,
        timestamp: new Date().toISOString(),
      },
    });
  }

  async notifyTestResult(options: {
    projectName: string;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    summary?: string;
    details?: Record<string, any>;
  }): Promise<NotificationResponse> {
    const status = options.failedTests === 0 ? 'success' : 'error';
    return this.notify({
      title: `Tests: ${options.projectName}`,
      summary:
        options.summary ||
        `${options.passedTests}/${options.totalTests} tests passed`,
      status,
      action: 'test',
      details: {
        projectName: options.projectName,
        totalTests: options.totalTests,
        passedTests: options.passedTests,
        failedTests: options.failedTests,
        ...options.details,
        timestamp: new Date().toISOString(),
      },
    });
  }

  async testConnection(): Promise<boolean> {
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

  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      if (error.response?.data?.error) {
        return new Error(error.response.data.error);
      }
      if (error.message) {
        return new Error(error.message);
      }
    }
    return new Error('Unknown error occurred');
  }
}
