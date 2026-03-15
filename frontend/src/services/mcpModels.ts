/**
 * MCP 模型配置服务 - 处理模型配置相关的 API 调用
 */

const API_BASE_URL = '';

export type ModelProvider = 'deepseek' | 'google' | 'openai' | 'custom';

export interface ModelConfig {
  id: string;
  name: string;
  provider: ModelProvider;
  apiUrl: string;
  apiKey?: string;
  modelId?: string;
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
  message?: string;
}

export interface GetModelsResponse {
  success: boolean;
  data?: ModelConfig[];
  error?: string;
}

export interface DiscoverModelsResponse {
  success: boolean;
  data?: string[];
  error?: string;
  message?: string;
}

export interface ModelConfigPayload {
  provider: ModelProvider;
  apiUrl: string;
  apiKey: string;
  modelId: string;
  isBuiltIn?: boolean;
}

class McpModelsService {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  async getAllModels(): Promise<GetModelsResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/mcp/models`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await response.json();
    } catch (error) {
      console.error('获取模型配置失败:', error);
      return { success: false, error: '获取模型配置失败' };
    }
  }

  async getBuiltInModels(): Promise<GetModelsResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/mcp/models/built-in`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await response.json();
    } catch (error) {
      console.error('获取推荐模型失败:', error);
      return { success: false, error: '获取推荐模型失败' };
    }
  }

  async getCustomModels(): Promise<GetModelsResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/mcp/models/custom`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await response.json();
    } catch (error) {
      console.error('获取自定义模型失败:', error);
      return { success: false, error: '获取自定义模型失败' };
    }
  }

  async getModel(id: string): Promise<SaveModelConfigResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/mcp/models/${id}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await response.json();
    } catch (error) {
      console.error('获取模型配置失败:', error);
      return { success: false, error: '获取模型配置失败' };
    }
  }

  async discoverModels(payload: Pick<ModelConfigPayload, 'provider' | 'apiUrl' | 'apiKey'>): Promise<DiscoverModelsResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/mcp/models/discover`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      return await response.json();
    } catch (error) {
      console.error('获取模型列表失败:', error);
      return { success: false, error: '获取模型列表失败' };
    }
  }

  async saveModel(payload: ModelConfigPayload): Promise<SaveModelConfigResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/mcp/models`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      return await response.json();
    } catch (error) {
      console.error('保存模型配置失败:', error);
      return { success: false, error: '保存模型配置失败' };
    }
  }

  async updateModel(id: string, payload: Partial<ModelConfigPayload>): Promise<SaveModelConfigResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/mcp/models/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      return await response.json();
    } catch (error) {
      console.error('更新模型配置失败:', error);
      return { success: false, error: '更新模型配置失败' };
    }
  }

  async testModel(id: string, apiKey?: string): Promise<SaveModelConfigResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/mcp/models/${id}/test`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ apiKey }),
      });

      return await response.json();
    } catch (error) {
      console.error('测试模型连接失败:', error);
      return { success: false, error: '测试模型连接失败' };
    }
  }

  async deleteModel(id: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/mcp/models/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      return await response.json();
    } catch (error) {
      console.error('删除模型配置失败:', error);
      return { success: false, error: '删除模型配置失败' };
    }
  }
}

export default new McpModelsService();