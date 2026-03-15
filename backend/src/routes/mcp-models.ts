/**
 * MCP 模型配置管理路由
 *
 * 处理推荐模型和自定义模型的配置、获取、删除与模型列表发现。
 */

import { Router, Request, Response } from 'express';
import * as crypto from 'crypto';

import database, { ModelConfig, ModelProvider } from '../database';
import { authMiddleware } from '../middleware/auth';
import logger from '../logger';

const router = Router();

router.use(authMiddleware);

const PROVIDER_LABELS: Record<ModelProvider, string> = {
  deepseek: 'DeepSeek',
  google: 'Google',
  openai: 'OpenAI',
  custom: '自定义',
};

function sanitizeModelConfig(model: ModelConfig): ModelConfig {
  return {
    ...model,
    apiKey: undefined,
    hasApiKey: Boolean(model.apiKey),
  };
}

function isSupportedProvider(value: unknown): value is ModelProvider {
  return value === 'deepseek' || value === 'google' || value === 'openai' || value === 'custom';
}

function normalizeApiUrl(provider: ModelProvider, apiUrl: string): string {
  const trimmed = apiUrl.trim().replace(/\/+$/, '');

  if (provider === 'deepseek' && trimmed === 'https://api.deepseek.com/v1') {
    return 'https://api.deepseek.com';
  }

  if (provider === 'openai' && trimmed === 'https://api.openai.com/v1') {
    return 'https://api.openai.com';
  }

  if (provider === 'google') {
    return trimmed.replace(/\/v1beta(?:\/openai)?$/i, '');
  }

  return trimmed;
}

function buildModelListEndpoint(provider: ModelProvider, apiUrl: string): string {
  const normalized = normalizeApiUrl(provider, apiUrl);

  if (provider === 'google') {
    return `${normalized}/v1beta/models`;
  }

  if (provider === 'deepseek' || provider === 'openai') {
    return `${normalized}/v1/models`;
  }

  return `${normalized}/models`;
}

function buildModelConfigName(provider: ModelProvider, modelId: string, isBuiltIn: boolean): string {
  if (isBuiltIn) {
    return 'DeepSeek';
  }

  return `${PROVIDER_LABELS[provider]} / ${modelId}`;
}

async function discoverProviderModels(provider: ModelProvider, apiUrl: string, apiKey: string): Promise<string[]> {
  const endpoint = buildModelListEndpoint(provider, apiUrl);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (provider === 'google') {
    headers['x-goog-api-key'] = apiKey;
  } else {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await fetch(endpoint, { method: 'GET', headers });
  if (response.status === 401 || response.status === 403) {
    throw new Error('API Key 无效或无权限');
  }

  if (!response.ok) {
    throw new Error(`API 返回错误: ${response.status} - ${response.statusText}`);
  }

  const data = await response.json() as {
    data?: Array<{ id?: string }>;
    models?: Array<{ name?: string }>;
  };

  const models = provider === 'google'
    ? (data.models || []).map(item => String(item.name || '').replace(/^models\//, '').trim())
    : (data.data || []).map(item => String(item.id || '').trim());

  return Array.from(new Set(models.filter(Boolean))).sort((left, right) => left.localeCompare(right));
}

async function validateConfigPayload(payload: {
  provider: unknown;
  apiUrl: unknown;
  apiKey: unknown;
  modelId: unknown;
}): Promise<{
  provider: ModelProvider;
  apiUrl: string;
  apiKey: string;
  modelId: string;
  availableModels: string[];
}> {
  if (!isSupportedProvider(payload.provider)) {
    throw new Error('不支持的模型提供商');
  }

  const apiUrl = typeof payload.apiUrl === 'string' ? normalizeApiUrl(payload.provider, payload.apiUrl) : '';
  const apiKey = typeof payload.apiKey === 'string' ? payload.apiKey.trim() : '';
  const modelId = typeof payload.modelId === 'string' ? payload.modelId.trim() : '';

  if (!apiUrl || !apiKey || !modelId) {
    throw new Error('缺少必填字段：provider, apiUrl, apiKey, modelId');
  }

  const availableModels = await discoverProviderModels(payload.provider, apiUrl, apiKey);
  if (!availableModels.includes(modelId)) {
    throw new Error('所选模型不在当前服务商返回的模型列表中');
  }

  return {
    provider: payload.provider,
    apiUrl,
    apiKey,
    modelId,
    availableModels,
  };
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const models = await database.getAllModelConfigs();
    res.json({ success: true, data: models.map(sanitizeModelConfig) });
  } catch (error) {
    logger.error({ error }, '获取模型配置失败');
    res.status(500).json({ success: false, error: '获取模型配置失败' });
  }
});

router.get('/built-in', async (_req: Request, res: Response) => {
  try {
    const models = await database.getBuiltInModels();
    res.json({ success: true, data: models.map(sanitizeModelConfig) });
  } catch (error) {
    logger.error({ error }, '获取推荐模型失败');
    res.status(500).json({ success: false, error: '获取推荐模型失败' });
  }
});

router.get('/custom', async (_req: Request, res: Response) => {
  try {
    const models = await database.getCustomModels();
    res.json({ success: true, data: models.map(sanitizeModelConfig) });
  } catch (error) {
    logger.error({ error }, '获取自定义模型失败');
    res.status(500).json({ success: false, error: '获取自定义模型失败' });
  }
});

router.post('/discover', async (req: Request, res: Response) => {
  try {
    const { provider, apiUrl, apiKey } = req.body;

    if (!isSupportedProvider(provider)) {
      return res.status(400).json({ success: false, error: '不支持的模型提供商' });
    }

    const normalizedApiUrl = typeof apiUrl === 'string' ? normalizeApiUrl(provider, apiUrl) : '';
    const normalizedApiKey = typeof apiKey === 'string' ? apiKey.trim() : '';

    if (!normalizedApiUrl || !normalizedApiKey) {
      return res.status(400).json({ success: false, error: '请先填写基础 URL 和 API Key' });
    }

    const models = await discoverProviderModels(provider, normalizedApiUrl, normalizedApiKey);
    if (models.length === 0) {
      return res.status(400).json({ success: false, error: '成功连接但未获取到模型列表' });
    }

    res.json({ success: true, data: models, message: '模型列表获取成功' });
  } catch (error) {
    logger.error({ error }, '获取模型列表失败');
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '获取模型列表失败' });
  }
});

router.post('/:id/discover', async (req: Request, res: Response) => {
  try {
    const model = await database.getModelConfig(req.params.id);
    if (!model) {
      return res.status(404).json({ success: false, error: '模型不存在' });
    }

    const apiKey = typeof req.body.apiKey === 'string' && req.body.apiKey.trim() !== ''
      ? req.body.apiKey.trim()
      : model.apiKey;

    if (!apiKey) {
      return res.status(400).json({ success: false, error: '请先填写 API Key' });
    }

    const models = await discoverProviderModels(model.provider, model.apiUrl, apiKey);
    res.json({ success: true, data: models, message: '模型列表获取成功' });
  } catch (error) {
    logger.error({ error }, '获取模型列表失败');
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '获取模型列表失败' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const model = await database.getModelConfig(id);

    if (!model) {
      return res.status(404).json({ success: false, error: '模型不存在' });
    }

    res.json({ success: true, data: sanitizeModelConfig(model) });
  } catch (error) {
    logger.error({ error }, '获取模型配置失败');
    res.status(500).json({ success: false, error: '获取模型配置失败' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { isBuiltIn = false } = req.body;

    if (isBuiltIn) {
      return res.status(403).json({ success: false, error: '推荐模型只能更新，不能新建' });
    }

    const validated = await validateConfigPayload(req.body);
    const now = new Date().toISOString();
    const config: ModelConfig = {
      id: crypto.randomUUID(),
      name: buildModelConfigName(validated.provider, validated.modelId, false),
      provider: validated.provider,
      apiUrl: validated.apiUrl,
      apiKey: validated.apiKey,
      modelId: validated.modelId,
      isBuiltIn: false,
      status: 'connected',
      lastTestedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const saved = await database.saveModelConfig(config);
    res.status(201).json({ success: true, data: sanitizeModelConfig(saved), message: '模型配置已保存' });
  } catch (error) {
    logger.error({ error }, '保存模型配置失败');
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : '保存模型配置失败' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await database.getModelConfig(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: '模型不存在' });
    }

    const mergedProvider = req.body.provider ?? existing.provider;
    const mergedApiUrl = req.body.apiUrl ?? existing.apiUrl;
    const mergedApiKey = typeof req.body.apiKey === 'string'
      ? (req.body.apiKey.trim() !== '' ? req.body.apiKey : existing.apiKey)
      : existing.apiKey;
    const mergedModelId = req.body.modelId ?? existing.modelId;

    if (existing.isBuiltIn && mergedProvider !== 'deepseek') {
      return res.status(400).json({ success: false, error: '推荐模型的提供商固定为 DeepSeek' });
    }

    const validated = await validateConfigPayload({
      provider: mergedProvider,
      apiUrl: existing.isBuiltIn ? 'https://api.deepseek.com' : mergedApiUrl,
      apiKey: mergedApiKey,
      modelId: mergedModelId,
    });

    const updated: ModelConfig = {
      ...existing,
      name: buildModelConfigName(validated.provider, validated.modelId, existing.isBuiltIn),
      provider: validated.provider,
      apiUrl: existing.isBuiltIn ? 'https://api.deepseek.com' : validated.apiUrl,
      apiKey: validated.apiKey,
      modelId: validated.modelId,
      status: 'connected',
      lastTestedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await database.saveModelConfig(updated);
    res.json({ success: true, data: sanitizeModelConfig(saved), message: '模型配置已更新' });
  } catch (error) {
    logger.error({ error }, '更新模型配置失败');
    res.status(400).json({ success: false, error: error instanceof Error ? error.message : '更新模型配置失败' });
  }
});

router.post('/:id/test', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const model = await database.getModelConfig(id);
    if (!model) {
      return res.status(404).json({ success: false, error: '模型不存在' });
    }

    const apiKey = typeof req.body.apiKey === 'string' && req.body.apiKey.trim() !== ''
      ? req.body.apiKey.trim()
      : model.apiKey;

    if (!apiKey) {
      return res.status(400).json({ success: false, message: '请先配置 API Key 后再测试连接' });
    }

    model.status = 'testing';
    await database.saveModelConfig(model);

    const models = await discoverProviderModels(model.provider, model.apiUrl, apiKey);
    const matched = !model.modelId || models.includes(model.modelId);

    model.apiKey = apiKey;
    model.status = matched ? 'connected' : 'disconnected';
    model.lastTestedAt = new Date().toISOString();

    const updated = await database.saveModelConfig(model);
    res.json({
      success: matched,
      data: sanitizeModelConfig(updated),
      message: matched ? '连接测试成功' : '当前已保存模型不在服务商返回的模型列表中',
    });
  } catch (error) {
    logger.error({ error }, '测试模型连接失败');
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : '测试模型连接失败' });
  }
});

router.get('/:id/balance', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const model = await database.getModelConfig(id);
    if (!model) {
      return res.status(404).json({ success: false, error: '模型不存在' });
    }

    // 只有 DeepSeek 支持余额查询
    if (model.provider !== 'deepseek') {
      return res.status(200).json({
        success: true,
        data: {
          balance: null,
          currency: 'CNY',
          message: '模型不支持余额查询或查询失败',
        },
      });
    }

    if (!model.apiKey) {
      return res.status(200).json({
        success: true,
        data: {
          balance: null,
          currency: 'CNY',
          message: '模型不支持余额查询或查询失败',
        },
      });
    }

    try {
      const response = await fetch('https://api.deepseek.com/user/balance', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${model.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        logger.warn({ status: response.status, model: model.id }, 'DeepSeek 余额查询失败');
        return res.status(200).json({
          success: true,
          data: {
            balance: null,
            currency: 'CNY',
            message: '模型不支持余额查询或查询失败',
          },
        });
      }

      const data = await response.json() as {
        is_available?: boolean;
        balance_log_list?: Array<{ total_balance?: number }>;
        balance_infos?: Array<{ total_balance?: number }>;
      };

      // 提取总余额
      let totalBalance: number | null = null;
      if (data.balance_log_list && data.balance_log_list.length > 0) {
        totalBalance = data.balance_log_list[0].total_balance ?? null;
      } else if (data.balance_infos && data.balance_infos.length > 0) {
        totalBalance = data.balance_infos[0].total_balance ?? null;
      }

      return res.status(200).json({
        success: true,
        data: {
          balance: totalBalance,
          currency: 'CNY',
          provider: 'deepseek',
        },
      });
    } catch (apiError) {
      logger.error({ error: apiError, model: model.id }, 'DeepSeek 余额查询异常');
      return res.status(200).json({
        success: true,
        data: {
          balance: null,
          currency: 'CNY',
          message: '模型不支持余额查询或查询失败',
        },
      });
    }
  } catch (error) {
    logger.error({ error }, '查询模型余额失败');
    res.status(500).json({ success: false, error: '查询模型余额失败' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const model = await database.getModelConfig(id);
    if (!model) {
      return res.status(404).json({ success: false, error: '模型不存在' });
    }

    if (model.isBuiltIn) {
      return res.status(403).json({ success: false, error: '推荐模型不能删除' });
    }

    const deleted = await database.deleteModelConfig(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: '模型不存在' });
    }

    res.json({ success: true, message: '模型配置已删除' });
  } catch (error) {
    logger.error({ error }, '删除模型配置失败');
    res.status(500).json({ success: false, error: '删除模型配置失败' });
  }
});

export default router;