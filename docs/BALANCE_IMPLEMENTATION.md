# API 余额查询实现指南

**文档版本**：v1.0 | **更新时间**：2026-03-15 | **内容**：三个 AI API 供应商的余额查询集成实现代码示例

---

## 📦 项目结构

```
backend/src/
├── services/
│   ├── balanceService.ts          # 统一余额查询服务
│   ├── providers/
│   │   ├── deepseekBalance.ts      # DeepSeek 余额查询
│   │   ├── openaiBalance.ts        # OpenAI 成本监控
│   │   └── geminiBalance.ts        # Google Gemini 配额查询
│   └── notificationService.ts      # 余额告警通知
├── routes/
│   └── balanceRoutes.ts            # API 路由定义
└── config/
    └── balanceConfig.ts            # 配置常量
```

---

## 1️⃣ **DeepSeek 余额查询**（✅ 推荐）

### 安装依赖

```bash
npm install axios dotenv
```

### 实现代码

**deepseekBalance.ts**
```typescript
import axios from 'axios';

interface DeepSeekBalance {
  isAvailable: boolean;
  totalBalance: number;
  grantedBalance: number;
  toppedUpBalance: number;
  lastUpdated: Date;
  currency: string;
}

export class DeepSeekBalanceService {
  private apiKey: string;
  private baseUrl = 'https://api.deepseek.com';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('DeepSeek API key is required');
    }
    this.apiKey = apiKey;
  }

  /**
   * 查询 DeepSeek 账户余额
   * @returns 余额信息
   */
  async getBalance(): Promise<DeepSeekBalance> {
    try {
      const response = await axios.get(`${this.baseUrl}/user/balance`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'FeiShuAIBot/1.0'
        },
        timeout: 10000
      });

      const data = response.data;

      if (!data.is_available || !data.balance_log_list?.length) {
        throw new Error('Invalid response format from DeepSeek API');
      }

      const balanceLog = data.balance_log_list[0];

      return {
        isAvailable: data.is_available,
        totalBalance: parseFloat(balanceLog.total_balance),
        grantedBalance: parseFloat(balanceLog.granted_balance),
        toppedUpBalance: parseFloat(balanceLog.topped_up_balance),
        lastUpdated: new Date(balanceLog.last_updated_timestamp * 1000),
        currency: balanceLog.currency
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `DeepSeek API Error: ${error.response?.status} - ${error.response?.data?.message || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * 检查余额是否低于阈值
   * @param threshold 阈值（元）
   */
  async isBalanceLow(threshold: number = 10): Promise<boolean> {
    const balance = await this.getBalance();
    return balance.totalBalance < threshold;
  }

  /**
   * 格式化输出余额信息
   */
  async getFormattedBalance(): Promise<string> {
    const balance = await this.getBalance();
    return `
DeepSeek 账户余额
━━━━━━━━━━━━━━━━━━━━━━━━
💰 总余额: ${balance.totalBalance.toFixed(2)} ${balance.currency}
  │
  ├─ 赠送额度: ${balance.grantedBalance.toFixed(2)} ${balance.currency}
  └─ 充值余额: ${balance.toppedUpBalance.toFixed(2)} ${balance.currency}
  
📅 最后更新: ${balance.lastUpdated.toLocaleString('zh-CN')}
    `;
  }
}
```

### 使用示例

```typescript
const deepseekService = new DeepSeekBalanceService(process.env.DEEPSEEK_API_KEY);

// 获取余额
const balance = await deepseekService.getBalance();
console.log(balance);

// 检查余额是否不足 20 元
if (await deepseekService.isBalanceLow(20)) {
  console.warn('⚠️ DeepSeek 余额不足，请及时充值');
}

// 获取格式化输出
console.log(await deepseekService.getFormattedBalance());
```

---

## 2️⃣ **OpenAI 成本监控**（⚠️ 无官方 API）

### 方案 A：从 API 响应提取使用信息

**openaiBalance.ts - 方案 A**
```typescript
import OpenAI from 'openai';

interface OpenAIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

export class OpenAIBalanceService {
  private client: OpenAI;
  private tokenCosts = {
    'gpt-4o': {
      input: 0.003,    // $0.003 per 1K tokens
      output: 0.006    // $0.006 per 1K tokens
    },
    'gpt-4': {
      input: 0.03,
      output: 0.06
    },
    'gpt-3.5-turbo': {
      input: 0.0005,
      output: 0.0015
    }
  };

  constructor(apiKey?: string) {
    this.client = new OpenAI({ apiKey });
  }

  /**
   * 从 API 响应获取使用信息（仅当前请求）
   * ⚠️ 注意：这只能获取单次请求的 token 使用，无法查询账户总余额
   */
  async getRequestUsage(
    model: string,
    messages: Array<{ role: string; content: string }>
  ): Promise<OpenAIUsage> {
    try {
      const response = await this.client.chat.completions.create({
        model: model as any,
        messages: messages as any,
        temperature: 0.7
      });

      const usage = response.usage;
      const costs = this.tokenCosts[model as keyof typeof this.tokenCosts] || {
        input: 0.0001,
        output: 0.0003
      };

      const estimatedCost =
        (usage.prompt_tokens / 1000) * costs.input +
        (usage.completion_tokens / 1000) * costs.output;

      return {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        estimatedCost: estimatedCost
      };
    } catch (error) {
      throw new Error(`OpenAI API Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 获取本月 token 成本估算（需要手动维护记录）
   * ⚠️ 此功能需要在数据库中追踪历史使用情况
   */
  async getMonthlyEstimate(database: any): Promise<number> {
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const queryResult = await database.query(
      `SELECT SUM(estimated_cost) as total FROM openai_usage WHERE month = ?`,
      [currentMonth]
    );

    return queryResult[0]?.total || 0;
  }

  /**
   * 形成告警信息
   * ❌ 无法通过 API 获取账户余额，建议手动监控或使用第三方工具
   */
  getWarningMessage(): string {
    return `
⚠️ OpenAI 余额查询说明
━━━━━━━━━━━━━━━━━━━━━━━━
❌ OpenAI API 不提供余额查询端点

可用方案：
1. 手动查看: https://platform.openai.com/usage
2. API 追踪: 通过每次请求的 usage 字段累计
3. 第三方工具: 使用 Selenium 自动化爬虫

⚠️ 建议：
- 定期检查 Usage Dashboard
- 启用 "Spend Limits" 自动告警
- 监控 API 响应中的 token 使用情况
    `;
  }
}
```

### 方案 B：记录历史使用（推荐）

**OpenAI 使用记录管理**
```typescript
interface OpenAIUsageRecord {
  id: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  estimatedCost: number;
  timestamp: Date;
  month: string;
}

export class OpenAIUsageTracker {
  private db: any; // 数据库连接

  constructor(database: any) {
    this.db = database;
  }

  /**
   * 记录使用情况
   */
  async recordUsage(record: Omit<OpenAIUsageRecord, 'id' | 'month'>) {
    const month = new Date().toISOString().slice(0, 7);
    const id = `openai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await this.db.query(
      `INSERT INTO openai_usage_history 
       (id, model, prompt_tokens, completion_tokens, estimated_cost, timestamp, month)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        record.model,
        record.promptTokens,
        record.completionTokens,
        record.estimatedCost,
        record.timestamp,
        month
      ]
    );
  }

  /**
   * 获取本月使用统计
   */
  async getMonthlyStats() {
    const currentMonth = new Date().toISOString().slice(0, 7);

    const stats = await this.db.query(
      `SELECT 
        COUNT(*) as request_count,
        SUM(prompt_tokens) as total_prompt_tokens,
        SUM(completion_tokens) as total_completion_tokens,
        SUM(estimated_cost) as total_cost
       FROM openai_usage_history 
       WHERE month = ?`,
      [currentMonth]
    );

    return stats[0];
  }

  /**
   * 获取模型使用分布
   */
  async getModelBreakdown() {
    const currentMonth = new Date().toISOString().slice(0, 7);

    return await this.db.query(
      `SELECT 
        model,
        COUNT(*) as usage_count,
        SUM(estimated_cost) as cost
       FROM openai_usage_history 
       WHERE month = ?
       GROUP BY model`,
      [currentMonth]
    );
  }
}
```

---

## 3️⃣ **Google Gemini 配额查询**（⚠️ 无官方 API）

### 方案 A：查询配额信息

**geminiBalance.ts - 方案 A**
```typescript
interface GeminiQuotaInfo {
  model: string;
  requestsPerMinute: number;
  tokensPerMinute: number;
  requestsPerDay: number;
  currentTier: string;
  status: string;
}

/**
 * ⚠️ 注意：Gemini API 不提供余额查询
 * 需要使用 Google Cloud API 进行配额和计费查询
 */
export class GeminiBalanceService {
  private projectId: string;
  private googleCloudClient: any; // Google Cloud Client

  constructor(projectId: string, credentialsPath: string) {
    this.projectId = projectId;
    // 需要配置 Google Cloud SDK
  }

  /**
   * 获取 Gemini API 配额信息
   * 需要 Google Cloud Billing API 权限
   */
  async getQuotaInfo(): Promise<GeminiQuotaInfo[]> {
    // 这需要通过 Google Cloud API 实现
    // 实现需要服务账户和特定权限
    throw new Error('Not implemented - requires Google Cloud setup');
  }

  /**
   * 通过 Cloud Billing API 查询费用
   * 企业级用户专用
   */
  async getBillingInfo() {
    // 需要配置 Google Cloud Billing API
    // 仅适用于 Google Cloud 用户（非普通开发者）
    throw new Error(
      'Not implemented - requires Google Cloud Billing API setup\n' +
      'See: https://cloud.google.com/billing/docs/reference/rest'
    );
  }

  /**
   * 获取配额监控说明
   */
  getQuotaMonitoringGuide(): string {
    return `
Gemini API 配额监控指南
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ 无原生 API 余额查询

推荐监控方式：
1. 📊 AI Studio 仪表板 (开发者友好)
   - 访问: https://aistudio.google.com/usage
   - 可查看: 当前 Token 消耗、配额等级
   - 延迟: ~10 分钟

2. 💰 Google Cloud Console (企业级)
   - 访问: https://console.cloud.google.com/billing
   - 需要: 配置 Cloud Billing 账户
   - 支持: 详细成本分析和预算管理

3. 📌 配额管理
   - 访问: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas
   - 可查看: RPM/TPM 限制
   - 可操作: 请求增加配额

手动检查步骤：
1. 登录 Google Account
2. 前往 AI Studio
3. 进入 "API Keys" 页面
4. 查看 "Quota Tier" 列（第1/2/3级或需要操作）
5. 点击 "Learn More" 了解配额详情
    `;
  }
}
```

---

## 4️⃣ **统一余额查询服务**

### 核心服务

**balanceService.ts**
```typescript
import { DeepSeekBalanceService } from './providers/deepseekBalance';
import { OpenAIBalanceService, OpenAIUsageTracker } from './providers/openaiBalance';
import { GeminiBalanceService } from './providers/geminiBalance';

interface UnifiedBalance {
  provider: string;
  status: 'success' | 'error' | 'unavailable';
  data?: any;
  error?: string;
  timestamp: Date;
}

export class UnifiedBalanceService {
  private deepseek: DeepSeekBalanceService;
  private openai: OpenAIBalanceService;
  private gemini: GeminiBalanceService;
  private openaiTracker: OpenAIUsageTracker;
  private db: any;

  constructor(
    deepseekKey: string,
    openaiKey: string,
    geminiProjectId: string,
    database: any
  ) {
    this.deepseek = new DeepSeekBalanceService(deepseekKey);
    this.openai = new OpenAIBalanceService(openaiKey);
    this.gemini = new GeminiBalanceService(geminiProjectId, '');
    this.db = database;
    this.openaiTracker = new OpenAIUsageTracker(database);
  }

  /**
   * 查询所有供应商的余额
   */
  async getAllBalances(): Promise<UnifiedBalance[]> {
    const results: UnifiedBalance[] = [];

    // 1. DeepSeek (✅ 支持)
    try {
      const deepseekBalance = await this.deepseek.getBalance();
      results.push({
        provider: 'DeepSeek',
        status: 'success',
        data: deepseekBalance,
        timestamp: new Date()
      });
    } catch (error) {
      results.push({
        provider: 'DeepSeek',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }

    // 2. OpenAI (⚠️ 需要手动查看)
    try {
      const monthlyStats = await this.openaiTracker.getMonthlyStats();
      results.push({
        provider: 'OpenAI',
        status: monthlyStats ? 'success' : 'unavailable',
        data: {
          ...monthlyStats,
          note: '⚠️ 仅记录历史使用，不包括账户余额'
        },
        timestamp: new Date()
      });
    } catch (error) {
      results.push({
        provider: 'OpenAI',
        status: 'unavailable',
        error: 'OpenAI API 不提供余额查询接口，建议访问: https://platform.openai.com/usage',
        timestamp: new Date()
      });
    }

    // 3. Gemini (⚠️ 需要手动查看或 Cloud API)
    results.push({
      provider: 'Google Gemini',
      status: 'unavailable',
      error: 'Gemini API 不提供官方余额查询\n建议访问: https://aistudio.google.com/usage',
      timestamp: new Date()
    });

    return results;
  }

  /**
   * 获取综合告警信息（用于飞书通知）
   */
  async getBalanceAlerts(): Promise<string> {
    const balances = await this.getAllBalances();

    let alerts = '🔍 AI API 余额检查报告\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    for (const item of balances) {
      alerts += this.formatProviderStatus(item);
      alerts += '\n';
    }

    return alerts;
  }

  private formatProviderStatus(item: UnifiedBalance): string {
    switch (item.provider) {
      case 'DeepSeek':
        if (item.status === 'success') {
          const data = item.data;
          const isLow = data.totalBalance < 20;
          const icon = isLow ? '⚠️' : '✅';
          return (
            `${icon} DeepSeek\n` +
            `  💰 余额: ${data.totalBalance.toFixed(2)} ${data.currency}\n` +
            `     ├─ 赠送: ${data.grantedBalance.toFixed(2)}\n` +
            `     └─ 充值: ${data.toppedUpBalance.toFixed(2)}`
          );
        } else {
          return `❌ DeepSeek\n  错误: ${item.error}`;
        }

      case 'OpenAI':
        if (item.status === 'success') {
          const data = item.data;
          return (
            `📝 OpenAI (当月使用统计)\n` +
            `  请求数: ${data.request_count}\n` +
            `  Token: ${data.total_prompt_tokens + data.total_completion_tokens}\n` +
            `  费用: $${(data.total_cost || 0).toFixed(4)}\n` +
            `  ⚠️ 提示: 无余额 API，请手动查看 https://platform.openai.com/usage`
          );
        } else {
          return `⚠️ OpenAI\n  ${item.error}`;
        }

      case 'Google Gemini':
        return (
          `⚠️ Google Gemini\n` +
          `  提示: 无官方余额 API\n` +
          `  📊 查看: https://aistudio.google.com/usage\n` +
          `  💼 配额: https://console.cloud.google.com/apis`
        );

      default:
        return `❓ ${item.provider}\n  未知状态`;
    }
  }
}
```

---

## 5️⃣ **API 路由定义**

**balanceRoutes.ts**
```typescript
import { Router, Request, Response } from 'express';
import { UnifiedBalanceService } from '../services/balanceService';

export function createBalanceRoutes(balanceService: UnifiedBalanceService): Router {
  const router = Router();

  /**
   * GET /api/balance/all
   * 查询所有供应商的余额
   */
  router.get('/all', async (req: Request, res: Response) => {
    try {
      const balances = await balanceService.getAllBalances();
      res.json({
        success: true,
        timestamp: new Date(),
        data: balances
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/balance/deepseek
   * 查询 DeepSeek 余额 (✅ 推荐)
   */
  router.get('/deepseek', async (req: Request, res: Response) => {
    try {
      // 需要直接调用 DeepSeekBalanceService
      // 这里仅作示例
      res.json({
        success: true,
        message: '请查看 /api/balance/all 获取完整数据'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/balance/alerts
   * 获取余额告警信息（用于飞书通知）
   */
  router.get('/alerts', async (req: Request, res: Response) => {
    try {
      const alerts = await balanceService.getBalanceAlerts();
      res.json({
        success: true,
        data: alerts,
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}
```

---

## 6️⃣ **集成到飞书通知**

### 定期检测任务

**balanceNotificationTask.ts**
```typescript
import { CronJob } from 'cron';
import { UnifiedBalanceService } from '../services/balanceService';

export class BalanceNotificationTask {
  private job: CronJob | null = null;
  private balanceService: UnifiedBalanceService;

  constructor(balanceService: UnifiedBalanceService) {
    this.balanceService = balanceService;
  }

  /**
   * 启动定期检测任务（每天 09:00 检查一次）
   */
  start() {
    if (this.job) {
      console.log('⚠️  Balance notification task already running');
      return;
    }

    this.job = new CronJob('0 9 * * *', async () => {
      try {
        console.log('🔄 Running balance check...');
        const alerts = await this.balanceService.getBalanceAlerts();

        // 调用飞书通知接口
        await this.sendFeishuNotification(alerts);

        console.log('✅ Balance check completed');
      } catch (error) {
        console.error('❌ Balance check failed:', error);
      }
    });

    this.job.start();
    console.log('✅ Balance notification task started');
  }

  stop() {
    if (this.job) {
      this.job.stop();
      this.job = null;
      console.log('⏹️  Balance notification task stopped');
    }
  }

  /**
   * 发送飞书通知
   */
  private async sendFeishuNotification(message: string) {
    // 调用后端飞书 webhook
    // 具体实现见项目的飞书集成模块
    console.log('📨 Sending to Feishu:', message);
  }
}
```

---

## 📊 对比总结

| 供应商 | 实现难度 | API 可靠性 | 维护成本 | 实时性 |
|--------|---------|----------|---------|--------|
| **DeepSeek** | 🟢 简单 | 🟢 高 | 🟢 低 | 🟢 实时 |
| **OpenAI** | 🟠 中等 | 🔴 低 | 🔴 高 | 🟡 延迟 |
| **Gemini** | 🔴 复杂 | 🔴 低 | 🔴 高 | 🟡 延迟 |

---

## 🚀 部署步骤

1. **安装依赖**
```bash
npm install axios dotenv openai @google-cloud/billing
```

2. **配置环境变量**
```env
DEEPSEEK_API_KEY=sk-xxxxx
OPENAI_API_KEY=sk-xxxxx
GOOGLE_PROJECT_ID=xxxxx
GOOGLE_CREDENTIALS_PATH=/path/to/credentials.json
```

3. **初始化服务**
```typescript
const balanceService = new UnifiedBalanceService(
  process.env.DEEPSEEK_API_KEY!,
  process.env.OPENAI_API_KEY!,
  process.env.GOOGLE_PROJECT_ID!,
  database
);
```

4. **启动定期任务**
```typescript
const notificationTask = new BalanceNotificationTask(balanceService);
notificationTask.start();
```

