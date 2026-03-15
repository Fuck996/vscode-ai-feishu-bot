/**
 * MCP 模型配置服务 - 处理模型配置相关的API调用
 */

const API_BASE_URL = '';

export interface ModelConfig {
  id: string;
  name: string;
  apiUrl: string;
  apiKey?: string;
  isBuiltIn: boolean;
  status: 'connected' | 'testing' | 'disconnected' | 'unconfigured';
  lastTestedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveModelConfigResponse {
  success: boolean;
  data?: ModelConfig;
  error?: string;
}

export interface GetModelsResponse {
  success: boolean;
  data?: ModelConfig[];
  error?: string;
}

class McpModelsService {
  /**
   * 获取所有模型配置
   */
  async getAllModels(): Promise<GetModelsResponse> {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/mcp/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取模型配置失败:', error);
      return { success: false, error: '获取模型配置失败' };
    }
  }

  /**
   * 获取内置模型
   */
  async getBuiltInModels(): Promise<GetModelsResponse> {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/mcp/models/built-in`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取内置模型失败:', error);
      return { success: false, error: '获取内置模型失败' };
    }
  }

  /**
   * 获取自定义模型
   */
  async getCustomModels(): Promise<GetModelsResponse> {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/mcp/models/custom`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取自定义模型失败:', error);
      return { success: false, error: '获取自定义模型失败' };
    }
  }

  /**
   * 获取单个模型配置
   */
  async getModel(id: string): Promise<SaveModelConfigResponse> {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/mcp/models/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取模型配置失败:', error);
      return { success: false, error: '获取模型配置失败' };
    }
  }

  /**
   * 保存新模型配置
   */
  async saveModel(config: Omit<ModelConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<SaveModelConfigResponse> {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/mcp/models`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('保存模型配置失败:', error);
      return { success: false, error: '保存模型配置失败' };
    }
  }

  /**
   * 更新模型配置
   */
  async updateModel(id: string, config: Partial<ModelConfig>): Promise<SaveModelConfigResponse> {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/mcp/models/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('更新模型配置失败:', error);
      return { success: false, error: '更新模型配置失败' };
    }
  }

  /**
   * 测试模型连接
   */
  async testModel(id: string, apiKey?: string): Promise<SaveModelConfigResponse> {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/mcp/models/${id}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ apiKey }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('测试模型连接失败:', error);
      return { success: false, error: '测试模型连接失败' };
    }
  }

  /**
   * 删除模型配置
   */
  async deleteModel(id: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/mcp/models/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('删除模型配置失败:', error);
      return { success: false, error: '删除模型配置失败' };
    }
  }
}

export default new McpModelsService();
