/**
 * MCP 模型配置管理路由
 * 
 * 处理内置模型和自定义模型的配置、获取、删除等操作
 */

import { Router, Request, Response } from 'express';
import database, { ModelConfig } from '../database';
import { authMiddleware } from '../middleware/auth';
import logger from '../logger';
import * as crypto from 'crypto';

const router = Router();

// 应用认证中间件
router.use(authMiddleware);

/**
 * 获取所有模型配置（含内置和自定义）
 * GET /api/mcp/models
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const models = await database.getAllModelConfigs();
    res.json({ success: true, data: models });
  } catch (error) {
    logger.error({ error }, '获取模型配置失败');
    res.status(500).json({ success: false, error: '获取模型配置失败' });
  }
});

/**
 * 获取内置模型
 * GET /api/mcp/models/built-in
 */
router.get('/built-in', async (req: Request, res: Response) => {
  try {
    const models = await database.getBuiltInModels();
    res.json({ success: true, data: models });
  } catch (error) {
    logger.error({ error }, '获取内置模型失败');
    res.status(500).json({ success: false, error: '获取内置模型失败' });
  }
});

/**
 * 获取自定义模型
 * GET /api/mcp/models/custom
 */
router.get('/custom', async (req: Request, res: Response) => {
  try {
    const models = await database.getCustomModels();
    res.json({ success: true, data: models });
  } catch (error) {
    logger.error({ error }, '获取自定义模型失败');
    res.status(500).json({ success: false, error: '获取自定义模型失败' });
  }
});

/**
 * 获取单个模型配置
 * GET /api/mcp/models/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const model = await database.getModelConfig(id);
    
    if (!model) {
      return res.status(404).json({ success: false, error: '模型不存在' });
    }
    
    res.json({ success: true, data: model });
  } catch (error) {
    logger.error({ error }, '获取模型配置失败');
    res.status(500).json({ success: false, error: '获取模型配置失败' });
  }
});

/**
 * 保存模型配置（更新或创建）
 * POST /api/mcp/models
 * 
 * Body:
 * {
 *   name: string,
 *   apiUrl: string,
 *   apiKey?: string,
 *   isBuiltIn?: boolean
 * }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, apiUrl, apiKey, isBuiltIn = false } = req.body;
    
    // 验证必填字段
    if (!name || !apiUrl) {
      return res.status(400).json({ success: false, error: '缺少必填字段：name, apiUrl' });
    }
    
    const config: ModelConfig = {
      id: crypto.randomUUID(),
      name,
      apiUrl,
      apiKey,
      isBuiltIn,
      status: 'unconfigured',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const saved = await database.saveModelConfig(config);
    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    logger.error({ error }, '保存模型配置失败');
    res.status(500).json({ success: false, error: '保存模型配置失败' });
  }
});

/**
 * 更新模型配置
 * PUT /api/mcp/models/:id
 * 
 * Body:
 * {
 *   name?: string,
 *   apiUrl?: string,
 *   apiKey?: string,
 *   status?: 'connected' | 'testing' | 'disconnected' | 'unconfigured'
 * }
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, apiUrl, apiKey, status } = req.body;
    
    const existing = await database.getModelConfig(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: '模型不存在' });
    }
    
    const updated: ModelConfig = {
      ...existing,
      name: name || existing.name,
      apiUrl: apiUrl || existing.apiUrl,
      apiKey: apiKey !== undefined ? apiKey : existing.apiKey,
      status: status || existing.status,
      updatedAt: new Date().toISOString(),
    };
    
    const saved = await database.saveModelConfig(updated);
    res.json({ success: true, data: saved });
  } catch (error) {
    logger.error({ error }, '更新模型配置失败');
    res.status(500).json({ success: false, error: '更新模型配置失败' });
  }
});

/**
 * 测试模型连接
 * POST /api/mcp/models/:id/test
 * 
 * Body:
 * {
 *   apiKey?: string  // 可选，如果不提供则使用已保存的 Key
 * }
 */
router.post('/:id/test', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { apiKey } = req.body;
    
    const model = await database.getModelConfig(id);
    if (!model) {
      return res.status(404).json({ success: false, error: '模型不存在' });
    }
    
    const keyToUse = apiKey || model.apiKey;
    if (!keyToUse && !model.isBuiltIn) {
      return res.status(400).json({ success: false, error: 'API Key 未提供' });
    }
    
    // 更新状态为测试中
    model.status = 'testing';
    await database.saveModelConfig(model);
    
    // 实现真实的连接测试逻辑
    let testResult = false;
    let errorMessage = '';
    
    try {
      switch (id) {
        case 'ollama':
          // Ollama: GET /api/tags
          try {
            const response = await fetch(`${model.apiUrl.replace('/v1', '')}/api/tags`);
            if (response.ok) {
              const data = await response.json();
              testResult = data.models && Array.isArray(data.models) && data.models.length > 0;
            }
          } catch (err) {
            errorMessage = 'Ollama 连接失败，请确保本地服务运行在正确地址';
          }
          break;
          
        case 'lm-studio':
          // LM Studio: GET /api/models 或 /v1/models
          try {
            let response = await fetch(`${model.apiUrl}/models`);
            if (!response.ok) {
              response = await fetch(model.apiUrl.includes('/v1') 
                ? `${model.apiUrl}/models` 
                : `${model.apiUrl}/v1/models`);
            }
            if (response.ok) {
              const data = await response.json();
              testResult = (data.data && Array.isArray(data.data)) || (data.models && Array.isArray(data.models));
            }
          } catch (err) {
            errorMessage = 'LM Studio 连接失败，请确保本地服务运行在正确地址';
          }
          break;
          
        case 'openai':
        case 'deepseek':
        case 'moonshot':
          // OpenAI/Deepseek/Moonshot: GET /v1/models，需要 Authorization header
          try {
            const headers: Record<string, string> = {
              'Authorization': `Bearer ${keyToUse}`,
              'Content-Type': 'application/json',
            };
            const response = await fetch(`${model.apiUrl}/models`, { headers });
            if (response.status === 401 || response.status === 403) {
              errorMessage = 'API Key 无效或无权限';
            } else if (response.ok) {
              const data = await response.json();
              testResult = data.data && Array.isArray(data.data) && data.data.length > 0;
            } else {
              errorMessage = `API 返回错误: ${response.status}`;
            }
          } catch (err) {
            errorMessage = `连接到 ${model.apiUrl} 失败`;
          }
          break;
          
        case 'claude':
          // Claude: GET /v1/models，需要 x-api-key header
          try {
            const headers: Record<string, string> = {
              'x-api-key': keyToUse || '',
              'Content-Type': 'application/json',
            };
            const response = await fetch(`${model.apiUrl}/models`, { headers });
            if (response.status === 401 || response.status === 403) {
              errorMessage = 'API Key 无效';
            } else if (response.ok) {
              const data = await response.json();
              testResult = data.data && Array.isArray(data.data);
            } else {
              errorMessage = `API 返回错误: ${response.status}`;
            }
          } catch (err) {
            errorMessage = `连接失败: ${err instanceof Error ? err.message : '未知错误'}`;
          }
          break;
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : '未知错误';
    }
    
    if (testResult) {
      model.status = 'connected';
      model.lastTestedAt = new Date().toISOString();
    } else {
      model.status = 'disconnected';
      if (!errorMessage) {
        errorMessage = '连接测试失败';
      }
    }
    
    const updated = await database.saveModelConfig(model);
    res.json({ 
      success: testResult,
      data: updated,
      message: testResult ? '连接测试成功' : errorMessage || '连接测试失败'
    });
  } catch (error) {
    logger.error({ error }, '测试模型连接失败');
    res.status(500).json({ success: false, error: '测试模型连接失败' });
  }
});

/**
 * 删除模型配置
 * DELETE /api/mcp/models/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const model = await database.getModelConfig(id);
    if (!model) {
      return res.status(404).json({ success: false, error: '模型不存在' });
    }
    
    // 禁止删除内置模型
    if (model.isBuiltIn) {
      return res.status(403).json({ success: false, error: '内置模型不能删除' });
    }
    
    const deleted = await database.deleteModelConfig(id);
    if (deleted) {
      res.json({ success: true, message: '模型配置已删除' });
    } else {
      res.status(404).json({ success: false, error: '模型不存在' });
    }
  } catch (error) {
    logger.error({ error }, '删除模型配置失败');
    res.status(500).json({ success: false, error: '删除模型配置失败' });
  }
});

export default router;
