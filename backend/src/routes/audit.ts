import { Router } from 'express';
import db from '../database';
import { AuthPayload } from './auth';

const router = Router();

// 验证 Token 中间件
function verifyToken(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: '未认证' });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: '无效的 Token' });
  }
}

// 管理员权限验证中间件
async function verifyAdminRole(req: any, res: any, next: any) {
  const user = await db.getUserById(req.user.userId);
  
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ success: false, error: '无权限访问审计日志，需要管理员角色' });
  }
  
  next();
}

// 获取所有审计日志（管理员专属）
router.get('/', verifyToken, verifyAdminRole, async (req: any, res: any) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const resourceType = req.query.resourceType;
    
    let logs;
    if (resourceType) {
      logs = await db.getAuditLogsByType(resourceType, limit, offset);
    } else {
      logs = await db.getAuditLogs(limit, offset);
    }
    
    res.json({ success: true, data: logs });
  } catch (err: any) {
    console.error('Failed to get audit logs:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 获取特定用户的审计日志（管理员专属）
router.get('/user/:userId', verifyToken, verifyAdminRole, async (req: any, res: any) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const logs = await db.getAuditLogsByUser(userId, limit, offset);
    
    res.json({ success: true, data: logs });
  } catch (err: any) {
    console.error('Failed to get user audit logs:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
