/**
 * MCP 配置管理路由
 * 
 * 由后端集中管理 MCP 的配置，MCP 服务器启动时从此端点获取参数
 */

import { Router, Request, Response } from 'express';
import database from '../database';

const router = Router();

/**
 * GET /api/mcp/config
 * 获取默认的 MCP 配置（第一个活跃集成）
 * 
 * 由 MCP Server 在启动时调用（无需认证，因为是初始化阶段）
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    // 获取所有集成（直接从数据库），找第一个活跃的
    const allIntegrations = (database as any).integrations || [];
    
    if (allIntegrations.length === 0) {
      return res.status(400).json({
        success: false,
        error: '没有可用的集成，请先在前端创建一个'
      });
    }

    // 找第一个活跃集成
    const integration = allIntegrations.find((i: any) => i.status === 'active') || allIntegrations[0];
    
    if (!integration) {
      return res.status(400).json({
        success: false,
        error: '没有可用的集成'
      });
    }

    res.json({
      success: true,
      data: {
        integrationId: integration.id,
        webhookEndpoint: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/webhook/${integration.id}`,
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
        webhookEndpoint: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/webhook/${integration.id}`,
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
