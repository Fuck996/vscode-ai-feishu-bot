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
  recoveryRobotId?: string;
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
  projectType: 'vercel' | 'railway' | 'github' | 'gitlab' | 'vscode-chat' | 'api' | 'custom' | 'synology';
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

export type ModelProvider = 'deepseek' | 'google' | 'openai' | 'custom';

export interface ModelConfig {
  id: string;
  name: string;                          // 配置名称
  provider: ModelProvider;               // 模型服务商
  apiUrl: string;                        // API 基础地址
  apiKey?: string;                       // API Key
  modelId?: string;                      // 已选择的模型 ID
  isBuiltIn: boolean;                    // 是否推荐模型
  status: 'connected' | 'testing' | 'disconnected' | 'unconfigured';  // 连接状态
  lastTestedAt?: string;                 // 最后测试时间
  createdAt: string;
  updatedAt: string;
}

export interface PromptTemplate {
  id: string;
  name: string;                          // 模板名称
  purpose: 'vscode-chat' | 'daily' | 'weekly' | 'incident' | 'optimization' | 'custom';  // 用途
  content: string;                       // 模板内容
  isBuiltIn: boolean;                    // 是否内置模板
  usageCount: number;                    // 使用次数
  createdAt: string;
  updatedAt: string;
}

class DatabaseService {
  private dbPath: string;
  private notifications: (Notification & { id: number; createdAt: string })[] = [];
  private users: User[] = [];
  private robots: Robot[] = [];
  private integrations: Integration[] = [];
  private auditLogs: AuditLog[] = [];
  private modelConfigs: ModelConfig[] = [];
  private promptTemplates: PromptTemplate[] = [];
  private nextId: number = 1;

  constructor() {
    this.dbPath = config.database.path;
  }

  private getProviderLabel(provider: ModelProvider): string {
    const labels: Record<ModelProvider, string> = {
      deepseek: 'DeepSeek',
      google: 'Google',
      openai: 'OpenAI',
      custom: '自定义',
    };

    return labels[provider];
  }

  private normalizeModelApiUrl(provider: ModelProvider, apiUrl: string | undefined): string {
    const trimmed = (apiUrl || '').trim().replace(/\/+$/, '');

    if (!trimmed) {
      return '';
    }

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

  private inferModelProvider(model: Partial<ModelConfig> & { apiUrl?: string; id?: string; name?: string }): ModelProvider {
    const fingerprint = `${model.id || ''} ${model.name || ''} ${model.apiUrl || ''}`.toLowerCase();

    if (fingerprint.includes('deepseek')) {
      return 'deepseek';
    }

    if (fingerprint.includes('google') || fingerprint.includes('gemini') || fingerprint.includes('generativelanguage.googleapis.com')) {
      return 'google';
    }

    if (fingerprint.includes('openai')) {
      return 'openai';
    }

    return 'custom';
  }

  private normalizeExistingModelConfig(rawModel: any): ModelConfig {
    const provider = (typeof rawModel.provider === 'string' ? rawModel.provider : this.inferModelProvider(rawModel)) as ModelProvider;
    const apiKey = typeof rawModel.apiKey === 'string' && rawModel.apiKey.trim() !== ''
      ? rawModel.apiKey.trim()
      : undefined;
    const modelId = typeof rawModel.modelId === 'string' && rawModel.modelId.trim() !== ''
      ? rawModel.modelId.trim()
      : undefined;
    const apiUrl = this.normalizeModelApiUrl(provider, rawModel.apiUrl);
    const hasCompleteConfig = Boolean(apiUrl && apiKey && modelId);
    const nextStatus = hasCompleteConfig
      ? (rawModel.status === 'testing' || rawModel.status === 'disconnected' || rawModel.status === 'connected'
        ? rawModel.status
        : 'connected')
      : 'unconfigured';

    return {
      id: String(rawModel.id || crypto.randomUUID()),
      name: rawModel.isBuiltIn
        ? 'DeepSeek 推荐模型'
        : String(rawModel.name || `${this.getProviderLabel(provider)} / ${modelId || '未选择模型'}`),
      provider,
      apiUrl,
      apiKey,
      modelId,
      isBuiltIn: Boolean(rawModel.isBuiltIn),
      status: nextStatus,
      lastTestedAt: rawModel.lastTestedAt,
      createdAt: String(rawModel.createdAt || new Date().toISOString()),
      updatedAt: String(rawModel.updatedAt || new Date().toISOString()),
    };
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
        this.modelConfigs = parsed.modelConfigs || [];
        this.promptTemplates = parsed.promptTemplates || [];
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
    // 定义预置提示词模板
    const builtInPrompts = [
      {
        id: 'vscode-chat-report',
        name: 'VS Code Chat 汇报',
        purpose: 'vscode-chat' as const,
        content: `你是一个专业的技术总结专家。请根据我提供的信息，生成一份结构清晰的工作汇报。

汇报格式要求：
1. **完成的事项** - 列出已完成的工作
2. **遇到的问题** - 列出碰到的主要问题和解决方案
3. **后续计划** - 列出接下来的工作安排
4. **资源需求** - 如需要的工具、文档、审批等

请确保汇报简洁专业，每个要点不超过2行，总长度不超过500字。`,
        isBuiltIn: true,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'daily-digest',
        name: '日报快报',
        purpose: 'daily' as const,
        content: `你是一个日报编辑。请根据以下信息生成一份精准的日报快报。

日报格式：
## 📋 今日速览

**重点事项（3条以内）：**
- 事项1
- 事项2
- 事项3

**数据统计：**
- 指标1：数值
- 指标2：数值

**待办提醒：**
- 明日重点

要求：
- 精炼表达，避免冗余
- 突出重点和关键指标
- 字数控制在300字以内`,
        isBuiltIn: true,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'weekly-summary',
        name: '周报总结',
        purpose: 'weekly' as const,
        content: `你是一个周报撰写助手。请根据本周数据生成一份完整的周报总结。

周报结构：
## 📊 本周总结

### 🎯 周目标完成度
本周计划：[列出本周3-5个主要目标]
完成情况：[描述每个目标的完成进度]

### ✅ 主要成就
- 成就1
- 成就2
- 成就3

### ⚠️ 遇到的挑战
- 挑战1：解决方案
- 挑战2：解决方案

### 📈 关键数据
- 指标体系概览
- 周环比分析
- 趋势判断

### 🔜 下周计划
- 重点工作1
- 重点工作2
- 重点工作3

要求：突出数据支撑，字数800字以内`,
        isBuiltIn: true,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'incident-report',
        name: '事件报告',
        purpose: 'incident' as const,
        content: `你是事件管理专家。请根据事件信息生成一份专业的事件报告。

事件报告格式：
## 🚨 事件报告

**事件等级：** [P1/P2/P3]
**状态：** [进行中/已解决]

### 事件描述
- 发生时间
- 受影响范围
- 用户影响数量

### 根本原因分析
- 直接原因
- 根本原因

### 处理过程
- 发现时间
- 处理时间
- 恢复时间
- 采取的措施

### 预防措施
- 短期措施（1周内）
- 长期措施（1月内）

### 后续跟进
- 监控指标
- 跟进时间

要求：数据准确，逻辑清晰，字数控制在400字以内`,
        isBuiltIn: true,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'optimization-suggestion',
        name: '优化建议',
        purpose: 'optimization' as const,
        content: `你是产品优化顾问。请根据提供的信息提出专业的优化建议。

优化建议框架：
## 💡 优化建议

### 📊 现状分析
- 当前指标
- 存在的问题
- 对比均值分析

### 💭 优化思路
**优化方向1：** [具体方案]
- 预期效果
- 实施难度：☆☆☆
- 优先级：P1

**优化方向2：** [具体方案]
- 预期效果
- 实施难度：☆☆☆
- 优先级：P1

### 📈 预期收益
- 指标提升
- 用户体验改进
- 业务价值

### 🚀 实施计划
- Phase 1：计划
- Phase 2：执行
- Phase 3：验证

要求：方案可行性强，有具体数据支撑，字数500字以内`,
        isBuiltIn: true,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // 为每个预置提示词检查是否存在，不存在则添加（兼容旧数据库）
    for (const prompt of builtInPrompts) {
      if (!this.promptTemplates.find(p => p.id === prompt.id)) {
        this.promptTemplates.push(prompt);
      }
    }

    // ─── 数据迁移：删除旧方案中的错误内置模型，仅保留新的推荐模型方案 ───
    const legacyBuiltInIds = new Set(['deepseek', 'openai', 'claude', 'moonshot', 'ollama', 'lm-studio']);
    this.modelConfigs = this.modelConfigs
      .filter(model => !legacyBuiltInIds.has(model.id))
      .map(model => this.normalizeExistingModelConfig(model));

    // ─── 数据完整性检查：缺少基础 URL、Key 或模型 ID 的配置一律视为未完成 ───
    for (const model of this.modelConfigs) {
      if (!model.apiUrl || !model.apiKey || !model.modelId) {
        if (model.status !== 'unconfigured') {
          model.status = 'unconfigured';
          model.updatedAt = new Date().toISOString();
        }
      }
    }

    // 定义推荐模型：当前仅保留 DeepSeek
    const recommendedModel: ModelConfig = {
      id: 'recommended-deepseek',
      name: 'DeepSeek 推荐模型',
      provider: 'deepseek',
      apiUrl: 'https://api.deepseek.com',
      apiKey: undefined,
      modelId: undefined,
      isBuiltIn: true,
      status: 'unconfigured',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const existingRecommendedModel = this.modelConfigs.find(model => model.id === recommendedModel.id);
    if (existingRecommendedModel) {
      existingRecommendedModel.name = recommendedModel.name;
      existingRecommendedModel.provider = 'deepseek';
      existingRecommendedModel.apiUrl = recommendedModel.apiUrl;
      existingRecommendedModel.isBuiltIn = true;
      if (!existingRecommendedModel.apiKey || !existingRecommendedModel.modelId) {
        existingRecommendedModel.status = 'unconfigured';
      }
      existingRecommendedModel.updatedAt = new Date().toISOString();
    } else {
      this.modelConfigs.unshift(recommendedModel);
    }

    // 保存到文件（如果有新增数据）
    await this.saveToFile();
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

  private async saveToFile(skipPrune = false): Promise<void> {
    const data = {
      users: this.users,
      robots: this.robots,
      integrations: this.integrations,
      notifications: this.notifications,
      auditLogs: this.auditLogs,
      modelConfigs: this.modelConfigs,
      promptTemplates: this.promptTemplates,
      nextId: this.nextId,
      lastUpdated: new Date().toISOString(),
    };
    
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2));

    // 超过500MB时按时间顺序清理最旧的记录
    if (!skipPrune) {
      await this.pruneBySize();
    }
  }

  // 数据库容量管理：超过500MB时删除最旧的通知和审计日志
  private async pruneBySize(): Promise<void> {
    const MAX_SIZE_BYTES = 500 * 1024 * 1024; // 500MB
    
    if (!fs.existsSync(this.dbPath)) return;
    
    const stat = fs.statSync(this.dbPath);
    if (stat.size <= MAX_SIZE_BYTES) return;

    // 按时间升序排列，删除最旧的10%通知
    this.notifications.sort((a, b) =>
      new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    );
    const notifTrimCount = Math.max(Math.ceil(this.notifications.length * 0.1), 1);
    this.notifications.splice(0, notifTrimCount);

    // 按时间升序排列，删除最旧的10%审计日志
    this.auditLogs.sort((a, b) =>
      new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    );
    const logTrimCount = Math.max(Math.ceil(this.auditLogs.length * 0.1), 1);
    this.auditLogs.splice(0, logTrimCount);

    console.log(`[数据库清理] 数据库超出500MB，已删除 ${notifTrimCount} 条通知、${logTrimCount} 条审计日志`);

    // 跳过再次检查，避免递归
    await this.saveToFile(true);
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

  async getUserIntegrations(
    userId: string,
    filters: { projectType?: Integration['projectType']; status?: Integration['status'] } = {}
  ): Promise<Integration[]> {
    const userRobotIds = new Set(
      this.robots.filter(robot => robot.userId === userId).map(robot => robot.id)
    );

    return this.integrations.filter(integration => {
      if (!userRobotIds.has(integration.robotId)) {
        return false;
      }

      if (filters.projectType && integration.projectType !== filters.projectType) {
        return false;
      }

      if (filters.status && integration.status !== filters.status) {
        return false;
      }

      return true;
    });
  }

  async getOwnedIntegrationById(userId: string, integrationId: string): Promise<Integration | null> {
    const integration = await this.getIntegrationById(integrationId);
    if (!integration) {
      return null;
    }

    const robot = await this.getRobotById(integration.robotId);
    if (!robot || robot.userId !== userId) {
      return null;
    }

    return integration;
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

  async getAllIntegrations(): Promise<Integration[]> {
    return this.integrations;
  }

  async getFirstActiveIntegration(): Promise<Integration | null> {
    return this.integrations.find(i => i.status === 'active') || this.integrations[0] || null;
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

  // ===== 用户管理操作（管理员专用）=====

  async getAllUsers(): Promise<Omit<User, 'passwordHash'>[]> {
    return this.users.map(u => {
      const { passwordHash, ...rest } = u;
      return rest;
    });
  }

  async createUser(data: { username: string; password: string; role: 'admin' | 'user'; nickname?: string }): Promise<Omit<User, 'passwordHash'>> {
    const existing = this.users.find(u => u.username === data.username);
    if (existing) {
      throw new Error('用户名已存在');
    }
    const newUser: User = {
      id: crypto.randomUUID(),
      username: data.username,
      passwordHash: this.hashPassword(data.password),
      role: data.role,
      nickname: data.nickname || '',
      status: 'active',
      passwordChanged: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.push(newUser);
    await this.saveToFile();
    const { passwordHash, ...rest } = newUser;
    return rest;
  }

  async updateUserByAdmin(userId: string, updates: { role?: 'admin' | 'user'; status?: 'active' | 'inactive'; nickname?: string }): Promise<void> {
    const user = this.users.find(u => u.id === userId);
    if (!user) throw new Error('用户不存在');
    if (updates.role !== undefined) user.role = updates.role;
    if (updates.status !== undefined) user.status = updates.status;
    if (updates.nickname !== undefined) user.nickname = updates.nickname;
    user.updatedAt = new Date().toISOString();
    await this.saveToFile();
  }

  async deleteUser(userId: string): Promise<void> {
    const index = this.users.findIndex(u => u.id === userId);
    if (index === -1) throw new Error('用户不存在');
    this.users.splice(index, 1);
    await this.saveToFile();
  }

  async getNotificationCountByUserId(userId: string): Promise<number> {
    // 通过该用户的机器人统计通知数
    const userRobots = this.robots.filter(r => r.userId === userId);
    const robotNames = new Set(userRobots.map(r => r.name));
    return this.notifications.filter(n => n.robotName && robotNames.has(n.robotName)).length;
  }

  async updateRecoveryRobot(userId: string, recoveryRobotId: string): Promise<void> {
    const user = this.users.find(u => u.id === userId);
    if (!user) throw new Error('用户不存在');
    user.recoveryRobotId = recoveryRobotId;
    user.updatedAt = new Date().toISOString();
    await this.saveToFile();
  }

  // ===== 密码重置码（内存存储，服务重启后失效）=====
  private passwordResetCodes: Map<string, { code: string; username: string; expiresAt: number }> = new Map();

  createPasswordResetCode(username: string): string {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10分钟
    this.passwordResetCodes.set(username.toLowerCase(), { code, username, expiresAt });
    return code;
  }

  verifyPasswordResetCode(username: string, code: string): boolean {
    const entry = this.passwordResetCodes.get(username.toLowerCase());
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.passwordResetCodes.delete(username.toLowerCase());
      return false;
    }
    return entry.code === code;
  }

  deletePasswordResetCode(username: string): void {
    this.passwordResetCodes.delete(username.toLowerCase());
  }

  // ===== 模型配置管理 =====
  async saveModelConfig(config: ModelConfig): Promise<ModelConfig> {
    const existingIndex = this.modelConfigs.findIndex(m => m.id === config.id);
    if (existingIndex >= 0) {
      config.updatedAt = new Date().toISOString();
      this.modelConfigs[existingIndex] = config;
    } else {
      config.createdAt = config.createdAt || new Date().toISOString();
      config.updatedAt = new Date().toISOString();
      this.modelConfigs.push(config);
    }
    await this.saveToFile();
    return config;
  }

  async getModelConfig(id: string): Promise<ModelConfig | null> {
    return this.modelConfigs.find(m => m.id === id) || null;
  }

  async getAllModelConfigs(): Promise<ModelConfig[]> {
    return this.modelConfigs;
  }

  async getBuiltInModels(): Promise<ModelConfig[]> {
    return this.modelConfigs.filter(m => m.isBuiltIn);
  }

  async getCustomModels(): Promise<ModelConfig[]> {
    return this.modelConfigs.filter(m => !m.isBuiltIn);
  }

  async deleteModelConfig(id: string): Promise<boolean> {
    const index = this.modelConfigs.findIndex(m => m.id === id);
    if (index >= 0) {
      this.modelConfigs.splice(index, 1);
      await this.saveToFile();
      return true;
    }
    return false;
  }

  // ===== 提示词模板管理 =====
  async savePromptTemplate(template: PromptTemplate): Promise<PromptTemplate> {
    const existingIndex = this.promptTemplates.findIndex(t => t.id === template.id);
    if (existingIndex >= 0) {
      template.updatedAt = new Date().toISOString();
      this.promptTemplates[existingIndex] = template;
    } else {
      template.createdAt = template.createdAt || new Date().toISOString();
      template.updatedAt = new Date().toISOString();
      this.promptTemplates.push(template);
    }
    await this.saveToFile();
    return template;
  }

  async getPromptTemplate(id: string): Promise<PromptTemplate | null> {
    return this.promptTemplates.find(t => t.id === id) || null;
  }

  async getAllPromptTemplates(): Promise<PromptTemplate[]> {
    return this.promptTemplates;
  }

  async getBuiltInPromptTemplates(): Promise<PromptTemplate[]> {
    return this.promptTemplates.filter(t => t.isBuiltIn);
  }

  async getCustomPromptTemplates(): Promise<PromptTemplate[]> {
    return this.promptTemplates.filter(t => !t.isBuiltIn);
  }

  async deletePromptTemplate(id: string): Promise<boolean> {
    const index = this.promptTemplates.findIndex(t => t.id === id);
    if (index >= 0) {
      this.promptTemplates.splice(index, 1);
      await this.saveToFile();
      return true;
    }
    return false;
  }

  // ===== 密码哈希公开方法（供路由使用）=====
  hashPasswordPublic(password: string): string {
    return this.hashPassword(password);
  }

  async close(): Promise<void> {
    await this.saveToFile();
  }
}

export default new DatabaseService();
