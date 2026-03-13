/**
 * MCP 配置管理路由
 * 
 * 由后端集中管理 MCP 的配置，MCP 服务器启动时从此端点获取参数
 */

import { Router, Request, Response } from 'express';
import { config } from '../config';
import database from '../database';

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

/**
 * GET /api/mcp/config
 * 获取默认的 MCP 配置（第一个活跃集成）
 * 
 * 由 MCP Server 在启动时调用（无需认证，因为是初始化阶段）
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    // 获取第一个活跃集成，如果没有则返回任何可用的集成
    const integration = await database.getFirstActiveIntegration();
    
    if (!integration) {
      return res.status(400).json({
        success: false,
        error: '没有可用的集成，请先在前端创建一个'
      });
    }

    res.json({
      success: true,
      data: {
        integrationId: integration.id,
        webhookEndpoint: `${getPublicBase(req)}/api/webhook/${integration.id}`,
        triggerToken: integration.webhookSecret || '',
        projectName: integration.projectName,
        projectType: integration.projectType,
      }
    });
  } catch (error) {
    console.error('获取 MCP 配置错误:', error);
    res.status(500).json({ success: false, error: '内部服务器错误' });
  }
});

/**
 * GET /api/mcp/config/:integrationId
 * 获取特定集成的 MCP 配置
 */
router.get('/config/:integrationId', async (req: Request, res: Response) => {
  try {
    const { integrationId } = req.params;
    const integration = await database.getIntegrationById(integrationId);

    if (!integration) {
      return res.status(404).json({ success: false, error: '集成不存在' });
    }

    res.json({
      success: true,
      data: {
        integrationId: integration.id,
        webhookEndpoint: `${getPublicBase(req)}/api/webhook/${integration.id}`,
        triggerToken: integration.webhookSecret || '',
        projectName: integration.projectName,
        projectType: integration.projectType,
      }
    });
  } catch (error) {
    console.error('获取集成配置错误:', error);
    res.status(500).json({ success: false, error: '内部服务器错误' });
  }
});

export default router;
