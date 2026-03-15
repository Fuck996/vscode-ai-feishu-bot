const API_BASE_URL = '';

export interface ReportTaskItem {
  id: string;
  name: string;
  description: string;
  weekdays: number[];
  sendTime: string;
  rangeType: '7d' | '14d' | '30d' | 'week' | 'month';
  robotId: string;
  robotName: string;
  integrationIds: string[];
  integrations: Array<{ id: string; name: string; type: string }>;
  notificationStatuses: string[];
  modelConfigId: string;
  modelName: string;
  promptTemplateId: string;
  promptName: string;
  status: 'active' | 'inactive';
  maxNotifications?: number;
  lastSentAt?: string;
  nextRunAt?: string;
  scheduleText: string;
}

export interface ReportTaskHistoryItem {
  id: string;
  taskId: string;
  taskName: string;
  periodLabel: string;
  notificationCount: number;
  summary: string;
  status: 'success' | 'failed';
  modelName: string;
  promptName: string;
  createdAt: string;
}

export interface ReportTaskMeta {
  robots: Array<{ id: string; name: string; status: string }>;
  integrations: Array<{ id: string; robotId: string; projectName: string; projectType: string; status: string }>;
  models: Array<{ id: string; name: string; provider: string; modelId?: string; status: string }>;
  prompts: Array<{ id: string; name: string; isBuiltIn: boolean }>;
}

export interface ReportTaskPayload {
  name: string;
  description: string;
  weekdays: number[];
  sendTime: string;
  rangeType: '7d' | '14d' | '30d' | 'week' | 'month';
  robotId: string;
  integrationIds: string[];
  notificationStatuses: string[];
  modelConfigId: string;
  promptTemplateId: string;
  status?: 'active' | 'inactive';
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ReportTasksService {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  async getMeta(): Promise<ApiResponse<ReportTaskMeta>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/services/report-tasks/meta`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await response.json();
    } catch (error) {
      console.error('获取任务元数据失败:', error);
      return { success: false, error: '获取任务元数据失败' };
    }
  }

  async getTasks(): Promise<ApiResponse<ReportTaskItem[]>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/services/report-tasks`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await response.json();
    } catch (error) {
      console.error('获取任务列表失败:', error);
      return { success: false, error: '获取任务列表失败' };
    }
  }

  async getHistory(): Promise<ApiResponse<ReportTaskHistoryItem[]>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/services/report-task-history`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await response.json();
    } catch (error) {
      console.error('获取任务历史失败:', error);
      return { success: false, error: '获取任务历史失败' };
    }
  }

  async createTask(payload: ReportTaskPayload): Promise<ApiResponse<ReportTaskItem>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/services/report-tasks`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      return await response.json();
    } catch (error) {
      console.error('创建任务失败:', error);
      return { success: false, error: '创建任务失败' };
    }
  }

  async updateTask(id: string, payload: ReportTaskPayload): Promise<ApiResponse<ReportTaskItem>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/services/report-tasks/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      return await response.json();
    } catch (error) {
      console.error('更新任务失败:', error);
      return { success: false, error: '更新任务失败' };
    }
  }

  async updateTaskStatus(id: string, status: 'active' | 'inactive'): Promise<ApiResponse<ReportTaskItem>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/services/report-tasks/${id}/status`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ status }),
      });

      return await response.json();
    } catch (error) {
      console.error('切换任务状态失败:', error);
      return { success: false, error: '切换任务状态失败' };
    }
  }

  async runTask(id: string): Promise<ApiResponse<ReportTaskHistoryItem>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/services/report-tasks/${id}/run`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      return await response.json();
    } catch (error) {
      console.error('手动执行任务失败:', error);
      return { success: false, error: '手动执行任务失败' };
    }
  }

  async deleteTask(id: string): Promise<ApiResponse<null>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/services/report-tasks/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      return await response.json();
    } catch (error) {
      console.error('删除任务失败:', error);
      return { success: false, error: '删除任务失败' };
    }
  }
}

export default new ReportTasksService();