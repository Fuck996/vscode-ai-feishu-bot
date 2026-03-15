/**
 * MCP 提示词模板服务 - 处理提示词模板相关的API调用
 */

const API_BASE_URL = '';

export interface PromptTemplate {
  id: string;
  name: string;
  purpose: 'vscode-chat' | 'daily' | 'weekly' | 'incident' | 'optimization' | 'custom';
  content: string;
  isBuiltIn: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SavePromptTemplateResponse {
  success: boolean;
  data?: PromptTemplate;
  error?: string;
}

export interface GetPromptsResponse {
  success: boolean;
  data?: PromptTemplate[];
  error?: string;
}

class McpPromptsService {
  /**
   * 获取所有提示词模板
   */
  async getAllPrompts(): Promise<GetPromptsResponse> {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/mcp/prompts`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取提示词模板失败:', error);
      return { success: false, error: '获取提示词模板失败' };
    }
  }

  /**
   * 获取内置提示词
   */
  async getBuiltInPrompts(): Promise<GetPromptsResponse> {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/mcp/prompts/built-in`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取内置提示词失败:', error);
      return { success: false, error: '获取内置提示词失败' };
    }
  }

  /**
   * 获取自定义提示词
   */
  async getCustomPrompts(): Promise<GetPromptsResponse> {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/mcp/prompts/custom`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取自定义提示词失败:', error);
      return { success: false, error: '获取自定义提示词失败' };
    }
  }

  /**
   * 获取单个提示词
   */
  async getPrompt(id: string): Promise<SavePromptTemplateResponse> {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/mcp/prompts/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取提示词失败:', error);
      return { success: false, error: '获取提示词失败' };
    }
  }

  /**
   * 保存新提示词
   */
  async savePrompt(prompt: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavePromptTemplateResponse> {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/mcp/prompts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(prompt),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('保存提示词失败:', error);
      return { success: false, error: '保存提示词失败' };
    }
  }

  /**
   * 更新提示词
   */
  async updatePrompt(id: string, prompt: Partial<PromptTemplate>): Promise<SavePromptTemplateResponse> {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/mcp/prompts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(prompt),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('更新提示词失败:', error);
      return { success: false, error: '更新提示词失败' };
    }
  }

  /**
   * 删除提示词
   */
  async deletePrompt(id: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/mcp/prompts/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('删除提示词失败:', error);
      return { success: false, error: '删除提示词失败' };
    }
  }
}

export default new McpPromptsService();
