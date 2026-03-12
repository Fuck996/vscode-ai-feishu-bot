import path from 'path';
import * as fs from 'fs';
import { config } from './config';
import * as crypto from 'crypto';

export interface User {
  id: string;
  username: string;
  email?: string;
  nickname?: string;
  passwordHash: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
  passwordChanged: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface Robot {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  webhookUrl: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  userId: string;
}

export interface Integration {
  id: string;
  robotId: string;
  projectName: string;
  projectSubName?: string;               // 子项目名/分支等
  projectType: 'vercel' | 'railway' | 'github' | 'gitlab' | 'vscode-chat' | 'api' | 'custom';
  config: Record<string, unknown>;       // 项目类型特定配置（仓库地址、AI 配置等）
  webhookSecret: string;                 // 自动生成，用于验证外部平台推送的签名
  triggeredEvents: string[];             // 触发事件类型
  notifyOn: 'success' | 'failure' | 'always' | 'changes';
  messageTemplate?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id?: number;
  title: string;
  summary: string;
  status: 'success' | 'error' | 'warning' | 'info';
  details?: string;
  action?: string;
  robotName?: string;
  source?: string;
  createdAt?: string;
}

export interface AuditLog {
  id?: string;
  userId: string;
  username: string;
  action: string;
  description: string;
  resourceType: 'user' | 'robot' | 'integration' | 'notification' | 'system';
  resourceId?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure';
  createdAt?: string;
}

class DatabaseService {
  private dbPath: string;
  private notifications: (Notification & { id: number; createdAt: string })[] = [];
  private users: User[] = [];
  private robots: Robot[] = [];
  private integrations: Integration[] = [];
  private auditLogs: AuditLog[] = [];
  private nextId: number = 1;

  constructor() {
    this.dbPath = config.database.path;
  }

  async initialize(): Promise<void> {
    const dir = path.dirname(this.dbPath);
    
    // 确保目录存在
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 加载现有数据
    if (fs.existsSync(this.dbPath)) {
      try {
        const data = fs.readFileSync(this.dbPath, 'utf-8');
        const parsed = JSON.parse(data);
        this.notifications = parsed.notifications || [];
        this.users = parsed.users || [];
        this.robots = parsed.robots || [];
        this.integrations = parsed.integrations || [];
        this.auditLogs = parsed.auditLogs || [];
        this.nextId = parsed.nextId || 1;
        
        // 找到最大的ID
        if (this.notifications.length > 0) {
          this.nextId = Math.max(...this.notifications.map(n => n.id || 0)) + 1;
        }
      } catch (err) {
        console.error('Failed to load database file:', err);
        this.notifications = [];
        this.users = [];
        this.robots = [];
        this.nextId = 1;
      }
    }

    // 初始化admin用户（如果不存在）
    await this.initializeAdminUser();

    // 初始化示例机器人和通知（如果数据库为空）
    await this.initializeSampleData();

    console.log('✓ Database initialized with', this.notifications.length, 'notifications and', this.users.length, 'users');
  }

  private async initializeSampleData(): Promise<void> {
    // 不自动创建任何示例数据
    // 系统以真实空白开始，用户需要通过 API 创建真实数据
    return;
  }

  private async initializeAdminUser(): Promise<void> {
    const existingAdmin = this.users.find(u => u.username === 'admin');
    
    if (!existingAdmin) {
      // 创建初始admin用户
      const adminUser: User = {
        id: crypto.randomUUID(),
        username: 'admin',
        passwordHash: this.hashPassword('admin'),
        role: 'admin',
        status: 'active',
        passwordChanged: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      this.users.push(adminUser);
      await this.saveToFile();
      
      // 重要: 输出初始密码信息到控制台
      console.log('\n╔═══════════════════════════════════════════════════╗');
      console.log('║ ✓ Admin 用户已初始化                              ║');
      console.log('╠═══════════════════════════════════════════════════╣');
      console.log('║ 初始凭证 (INITIAL CREDENTIALS):                  ║');
      console.log('║   用户名 (Username): admin                        ║');
      console.log('║   密码 (Password): admin                          ║');
      console.log('║                                                   ║');
      console.log('║ ⚠️  首次登录后请立即修改密码!                    ║');
      console.log('║ ⚠️  Change password immediately after first login ║');
      console.log('╚═══════════════════════════════════════════════════╝\n');
    }
  }

  private hashPassword(password: string): string {
    // 简单的哈希实现（开发用）
    // 生产环境应该使用 bcrypt
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  private async saveToFile(): Promise<void> {
    const data = {
      users: this.users,
      robots: this.robots,
      integrations: this.integrations,
      notifications: this.notifications,
      auditLogs: this.auditLogs,
      nextId: this.nextId,
      lastUpdated: new Date().toISOString(),
    };
    
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2));
  }

  // ===== User 相关操作 =====

  async getUserByUsername(username: string): Promise<User | null> {
    return this.users.find(u => u.username === username) || null;
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return this.hashPassword(password) === hash;
  }

  async updateUserPassword(userId: string, newPasswordHash: string): Promise<void> {
    const user = this.users.find(u => u.id === userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    user.passwordHash = newPasswordHash;
    user.passwordChanged = true;
    user.updatedAt = new Date().toISOString();
    
    await this.saveToFile();
  }

  async updateLastLogin(userId: string): Promise<void> {
    const user = this.users.find(u => u.id === userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    user.lastLoginAt = new Date().toISOString();
    await this.saveToFile();
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.users.find(u => u.id === userId) || null;
  }

  async updateUserProfile(userId: string, profile: { email?: string; nickname?: string }): Promise<void> {
    const user = this.users.find(u => u.id === userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    if (profile.email !== undefined) {
      user.email = profile.email;
    }
    if (profile.nickname !== undefined) {
      user.nickname = profile.nickname;
    }
    user.updatedAt = new Date().toISOString();
    
    await this.saveToFile();
  }

  // ===== Robot 相关操作 =====

  async createRobot(robot: Omit<Robot, 'id' | 'createdAt' | 'updatedAt'>): Promise<Robot> {
    const newRobot: Robot = {
      ...robot,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    this.robots.push(newRobot);
    await this.saveToFile();
    return newRobot;
  }

  async getRobots(userId: string): Promise<Robot[]> {
    return this.robots.filter(r => r.userId === userId);
  }

  async getRobotById(robotId: string): Promise<Robot | null> {
    return this.robots.find(r => r.id === robotId) || null;
  }

  async updateRobot(robotId: string, updates: Partial<Robot>): Promise<void> {
    const robot = this.robots.find(r => r.id === robotId);
    if (!robot) {
      throw new Error('Robot not found');
    }
    
    Object.assign(robot, updates, { updatedAt: new Date().toISOString() });
    await this.saveToFile();
  }

  async deleteRobot(robotId: string): Promise<void> {
    const index = this.robots.findIndex(r => r.id === robotId);
    if (index === -1) {
      throw new Error('Robot not found');
    }
    
    this.robots.splice(index, 1);
    await this.saveToFile();
  }

  // ===== Integration 相关操作 =====

  async createIntegration(integration: Omit<Integration, 'id' | 'createdAt' | 'updatedAt' | 'webhookSecret'> & { webhookSecret?: string }): Promise<Integration> {
    const newIntegration: Integration = {
      ...integration,
      id: crypto.randomUUID(),
      // 若调用方未传入 secret，则自动生成 48 字符十六进制串
      webhookSecret: integration.webhookSecret || crypto.randomBytes(24).toString('hex'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.integrations.push(newIntegration);
    await this.saveToFile();
    return newIntegration;
  }

  async getIntegrationsByRobotId(robotId: string): Promise<Integration[]> {
    return this.integrations.filter(i => i.robotId === robotId);
  }

  async getIntegrationById(integrationId: string): Promise<Integration | null> {
    return this.integrations.find(i => i.id === integrationId) || null;
  }

  async updateIntegration(integrationId: string, updates: Partial<Integration>): Promise<Integration> {
    const integration = this.integrations.find(i => i.id === integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }
    Object.assign(integration, updates, { updatedAt: new Date().toISOString() });
    await this.saveToFile();
    return integration;
  }

  async deleteIntegration(integrationId: string): Promise<void> {
    const index = this.integrations.findIndex(i => i.id === integrationId);
    if (index === -1) {
      throw new Error('Integration not found');
    }
    this.integrations.splice(index, 1);
    await this.saveToFile();
  }

  async getIntegrationCount(robotId: string): Promise<number> {
    return this.integrations.filter(i => i.robotId === robotId).length;
  }

  async findIntegrationBySecret(secret: string): Promise<Integration | null> {
    return this.integrations.find(i => i.webhookSecret === secret && i.status === 'active') ?? null;
  }

  // ===== Notification 相关操作 =====


  async saveNotification(notification: Notification): Promise<number> {
    const id = this.nextId++;
    const record = {
      ...notification,
      id,
      createdAt: new Date().toISOString(),
    };
    
    this.notifications.push(record);
    await this.saveToFile();
    
    return id;
  }

  async getNotifications(
    limit: number = 50,
    offset: number = 0,
    status?: string
  ): Promise<Notification[]> {
    let results = [...this.notifications];
    
    if (status) {
      results = results.filter(n => n.status === status);
    }
    
    // 按创建时间倒序排列
    results.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    
    return results.slice(offset, offset + limit);
  }

  async getNotificationStats(): Promise<Record<string, number>> {
    const result: Record<string, number> = {
      success: 0,
      error: 0,
      warning: 0,
      info: 0,
      total: this.notifications.length,
    };

    for (const notification of this.notifications) {
      if (notification.status in result) {
        result[notification.status]++;
      }
    }

    return result;
  }

  async verifyApiKey(key: string): Promise<boolean> {
    // 简化版本 - 在开发模式下，任何key都被接受
    // 在生产环境中，应该验证真实的API key
    return !!(key && key.length > 0);
  }

  // ===== AuditLog 相关操作 =====

  async createAuditLog(log: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog> {
    const newLog: AuditLog = {
      ...log,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    
    this.auditLogs.push(newLog);
    await this.saveToFile();
    return newLog;
  }

  async getAuditLogs(limit: number = 50, offset: number = 0): Promise<AuditLog[]> {
    const results = [...this.auditLogs];
    
    // 按创建时间倒序排列
    results.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    
    return results.slice(offset, offset + limit);
  }

  async getAuditLogsByUser(userId: string, limit: number = 50, offset: number = 0): Promise<AuditLog[]> {
    const results = this.auditLogs.filter(log => log.userId === userId);
    
    results.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    
    return results.slice(offset, offset + limit);
  }

  async getAuditLogsByType(resourceType: string, limit: number = 50, offset: number = 0): Promise<AuditLog[]> {
    const results = this.auditLogs.filter(log => log.resourceType === resourceType);
    
    results.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    
    return results.slice(offset, offset + limit);
  }

  async close(): Promise<void> {
    await this.saveToFile();
  }
}

export default new DatabaseService();
