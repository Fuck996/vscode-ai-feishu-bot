export interface NotifyOptions {
  title: string;
  summary: string;
  status: 'success' | 'error' | 'warning' | 'info';
  action?: string;
  details?: Record<string, any>;
  timestamp?: string;
}

export interface FeishuNotifierConfig {
  serverUrl: string;
  apiToken?: string;
}

export interface NotificationResponse {
  success: boolean;
  message: string;
  notificationId: number;
  error?: string;
}
