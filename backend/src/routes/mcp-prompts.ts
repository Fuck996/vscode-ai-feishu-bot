/**
 * MCP 提示词模板管理路由
 */

import { Router, Request, Response } from 'express';
import * as crypto from 'crypto';
import { authMiddleware } from '../middleware/auth';
import db from '../database';
import logger from '../logger';

const router = Router();

// 应用认证中间件到所有路由
router.use(authMiddleware);

/**
 * GET /api/mcp/prompts
 * 获取所有提示词模板
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const prompts = await db.getAllPromptTemplates();
    logger.info('获取所有提示词模板成功', { count: prompts.length });
    res.json({ success: true, data: prompts });
  } catch (error) {
    logger.error('获取提示词模板失败', error);
    res.status(500).json({ success: false, error: '获取提示词模板失败' });
  }
});

/**
 * GET /api/mcp/prompts/built-in
 * 获取内置提示词模板
 */
router.get('/built-in', async (req: Request, res: Response) => {
  try {
    const prompts = await db.getBuiltInPromptTemplates();
    logger.info('获取内置提示词模板成功', { count: prompts.length });
    res.json({ success: true, data: prompts });
  } catch (error) {
    logger.error('获取内置提示词模板失败', error);
    res.status(500).json({ success: false, error: '获取内置提示词模板失败' });
  }
});

/**
 * GET /api/mcp/prompts/custom
 * 获取自定义提示词模板
 */
router.get('/custom', async (req: Request, res: Response) => {
  try {
    const prompts = await db.getCustomPromptTemplates();
    logger.info('获取自定义提示词模板成功', { count: prompts.length });
    res.json({ success: true, data: prompts });
  } catch (error) {
    logger.error('获取自定义提示词模板失败', error);
    res.status(500).json({ success: false, error: '获取自定义提示词模板失败' });
  }
});

/**
 * GET /api/mcp/prompts/:id
 * 获取单个提示词模板
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const prompt = await db.getPromptTemplate(id);

    if (!prompt) {
      return res.status(404).json({ success: false, error: '提示词模板不存在' });
    }

    logger.info('获取提示词模板成功', { id });
    res.json({ success: true, data: prompt });
  } catch (error) {
    logger.error('获取提示词模板失败', error);
    res.status(500).json({ success: false, error: '获取提示词模板失败' });
  }
});

/**
 * POST /api/mcp/prompts
 * 创建新的提示词模板
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, purpose, content, isBuiltIn } = req.body;

    // 验证必需字段
    if (!name || !purpose || !content) {
      return res.status(400).json({
        success: false,
        error: '缺少必需字段: name, purpose, content',
      });
    }

    // 验证 purpose 值
    const validPurposes = ['vscode-chat', 'daily', 'weekly', 'incident', 'optimization', 'custom'];
    if (!validPurposes.includes(purpose)) {
      return res.status(400).json({
        success: false,
        error: `无效的 purpose 值。允许值: ${validPurposes.join(', ')}`,
      });
    }

    // 创建提示词模板
    const promptTemplate = {
      id: crypto.randomUUID(),
      name,
      purpose,
      content,
      isBuiltIn: isBuiltIn || false,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.savePromptTemplate(promptTemplate);
    logger.info('创建提示词模板成功', { id: promptTemplate.id, name });

    res.status(201).json({ success: true, data: promptTemplate });
  } catch (error) {
    logger.error('创建提示词模板失败', error);
    res.status(500).json({ success: false, error: '创建提示词模板失败' });
  }
});

/**
 * PUT /api/mcp/prompts/:id
 * 更新提示词模板
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, purpose, content } = req.body;

    const existingPrompt = await db.getPromptTemplate(id);
    if (!existingPrompt) {
      return res.status(404).json({ success: false, error: '提示词模板不存在' });
    }

    // 验证 purpose 值（如果提供了）
    if (purpose) {
      const validPurposes = ['vscode-chat', 'daily', 'weekly', 'incident', 'optimization', 'custom'];
      if (!validPurposes.includes(purpose)) {
        return res.status(400).json({
          success: false,
          error: `无效的 purpose 值。允许值: ${validPurposes.join(', ')}`,
        });
      }
    }

    const updatedPrompt = {
      ...existingPrompt,
      name: name || existingPrompt.name,
      purpose: purpose || existingPrompt.purpose,
      content: content || existingPrompt.content,
      updatedAt: new Date().toISOString(),
    };

    await db.savePromptTemplate(updatedPrompt);
    logger.info('更新提示词模板成功', { id });

    res.json({ success: true, data: updatedPrompt });
  } catch (error) {
    logger.error('更新提示词模板失败', error);
    res.status(500).json({ success: false, error: '更新提示词模板失败' });
  }
});

/**
 * DELETE /api/mcp/prompts/:id
 * 删除提示词模板（禁止删除内置模板）
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const prompt = await db.getPromptTemplate(id);
    if (!prompt) {
      return res.status(404).json({ success: false, error: '提示词模板不存在' });
    }

    // 禁止删除内置模板
    if (prompt.isBuiltIn) {
      return res.status(403).json({ success: false, error: '无法删除内置提示词模板' });
    }

    await db.deletePromptTemplate(id);
    logger.info('删除提示词模板成功', { id });

    res.json({ success: true, message: '提示词模板已删除' });
  } catch (error) {
    logger.error('删除提示词模板失败', error);
    res.status(500).json({ success: false, error: '删除提示词模板失败' });
  }
});

export default router;
