/**
 * MCP 日志服务 - 处理 MCP 日志相关的 API 调用
 */

const API_BASE_URL = '';

export interface McpLog {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  details?: any;
}

export interface GetLogsResponse {
  success: boolean;
  data?: McpLog[];
  total?: number;
  error?: string;
}

class McpLogsService {
  /**
   * 获取所有 MCP 日志
   */
  async getAllLogs(limit: number = 100, offset: number = 0): Promise<GetLogsResponse> {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${API_BASE_URL}/api/mcp/logs?limit=${limit}&offset=${offset}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取 MCP 日志失败:', error);
      return { success: false, error: '获取日志失败' };
    }
  }

  /**
   * 获取指定级别的 MCP 日志
   */
  async getLogsByLevel(level: 'INFO' | 'WARN' | 'ERROR', limit: number = 100): Promise<GetLogsResponse> {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${API_BASE_URL}/api/mcp/logs/${level}?limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`获取 ${level} 级别日志失败:`, error);
      return { success: false, error: `获取 ${level} 级别日志失败` };
    }
  }

  /**
   * 清空所有 MCP 日志
   */
  async clearLogs(): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/mcp/logs`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('清空 MCP 日志失败:', error);
      return { success: false, error: '清空日志失败' };
    }
  }
}

const mcpLogsService = new McpLogsService();
export default mcpLogsService;
