/**
 * MCP 配置管理路由
 * 
 * 由后端集中管理 MCP 的配置，MCP 服务器启动时从此端点获取参数
 */

import { Router, Request, Response } from 'express';
import { config } from '../config';
import database from '../database';
import { authMiddleware } from '../middleware/auth';

function normalizeForwardedHeader(value: string | string[] | undefined): string {
  const rawValue = Array.isArray(value) ? value[0] : value;
  return (rawValue || '').split(',')[0].trim();
}

// 动态构建对外可访问的基础地址。
// 优先使用显式公开地址，其次使用反向代理转发头，避免返回容器/内网地址。
function getPublicBase(req: Request): string {
  const configuredPublicBase = (process.env.PUBLIC_BASE_URL || '').trim().replace(/\/$/, '');
  if (configuredPublicBase) return configuredPublicBase;

  const proto = normalizeForwardedHeader(req.headers['x-forwarded-proto']) || req.protocol || 'http';
  const host = normalizeForwardedHeader(req.headers['x-forwarded-host']) || req.get('host') || `localhost:${config.port}`;
  return `${proto}://${host}`;
}

const router = Router();

function buildMcpConfigResponse(req: Request, integration: any) {
  return {
    integrationId: integration.id,
    webhookEndpoint: `${getPublicBase(req)}/api/webhook/${integration.id}`,
    triggerToken: integration.webhookSecret || '',
    projectName: integration.projectName,
    projectType: integration.projectType,
  };
}

async function resolveUserMcpIntegration(userId: string, integrationId?: string) {
  if (integrationId) {
    const integration = await database.getOwnedIntegrationById(userId, integrationId);
    if (!integration) {
      return { status: 404, error: '集成不存在或无权访问' };
    }

    if (integration.projectType !== 'vscode-chat') {
      return { status: 400, error: '该集成不是 VS Code Chat 类型，不能用作 MCP 配置' };
    }

    if (integration.status !== 'active') {
      return { status: 400, error: '该集成未启用，请先启用后再配置 MCP' };
    }

    return { integration };
  }

  const integrations = await database.getUserIntegrations(userId, {
    projectType: 'vscode-chat',
    status: 'active',
  });

  if (integrations.length === 0) {
    return { status: 400, error: '当前用户没有可用的 VS Code Chat 集成，请先创建并启用一个' };
  }

  return { integration: integrations[0] };
}

/**
 * GET /api/mcp/config
 * 获取当前登录用户的 MCP 配置
 */
router.get('/config', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string | undefined;
    const integrationId = typeof req.query.integrationId === 'string' ? req.query.integrationId : undefined;

    if (!userId) {
      return res.status(401).json({ success: false, error: '未认证' });
    }

    const result = await resolveUserMcpIntegration(userId, integrationId);
    if (!result.integration) {
      return res.status(result.status || 400).json({
        success: false,
        error: result.error || '没有可用的 MCP 集成',
      });
    }

    res.json({
      success: true,
      data: buildMcpConfigResponse(req, result.integration),
    });
  } catch (error) {
    console.error('获取 MCP 配置错误:', error);
    res.status(500).json({ success: false, error: '内部服务器错误' });
  }
});

/**
 * GET /api/mcp/config/:integrationId
 * 获取当前登录用户指定集成的 MCP 配置
 */
router.get('/config/:integrationId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string | undefined;
    const { integrationId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: '未认证' });
    }

    const result = await resolveUserMcpIntegration(userId, integrationId);
    if (!result.integration) {
      return res.status(result.status || 400).json({
        success: false,
        error: result.error || '没有可用的 MCP 集成',
      });
    }

    res.json({
      success: true,
      data: buildMcpConfigResponse(req, result.integration),
    });
  } catch (error) {
    console.error('获取 MCP 配置错误:', error);
    res.status(500).json({ success: false, error: '内部服务器错误' });
  }
});

export default router;
