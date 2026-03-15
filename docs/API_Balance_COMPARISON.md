# AI API 供应商账户余额查询支持情况对比

**文档版本**：v1.0 | **更新时间**：2026-03-15 | **内容**：OpenAI、Google Gemini、DeepSeek 余额查询 API 支持情况

---

## 📋 总体对比

| 供应商 | 官方 API 余额端点 | 月度使用查询 | 额度查询 | 支持方式 | 优先级 |
|--------|------------------|-----------|---------|--------|--------|
| **DeepSeek** | ✅ **支持** | ✅ 支持 | ✅ 支持 | REST API | 🟢 推荐 |
| **OpenAI** | ❌ **不支持** | ⚠️ 仅 Web | ❌ 不支持 | Dashboard 只读 | 🔴 无 API |
| **Google Gemini** | ❌ **不支持** | ⚠️ 仅 Web | ⚠️ 配额管理 | Cloud Console 只读 | 🔴 无 API |

---

## 1️⃣ **DeepSeek API** ✅ 已确认支持

### 端点信息

**端点 URL**
```
GET https://api.deepseek.com/user/balance
```

**认证方式**
```
Authorization: Bearer {API_KEY}
```

**请求示例**
```bash
curl -X GET "https://api.deepseek.com/user/balance" \
  -H "Authorization: Bearer sk-xxxxxxxxxxxxx"
```

**响应格式**
```json
{
  "is_available": true,
  "balance_log_list": [
    {
      "currency": "CNY",
      "total_balance": 100.00,      // 总余额
      "granted_balance": 0.00,      // 赠送额度
      "topped_up_balance": 100.00,  // 充值额度
      "last_updated_timestamp": 1710520800
    }
  ]
}
```

**关键字段说明**
- `total_balance`: 账户总余额（元）
- `granted_balance`: 免费试用额度
- `topped_up_balance`: 充值余额
- `last_updated_timestamp`: 最后更新时间戳

---

## 2️⃣ **OpenAI API** ❌ 不支持专用余额查询端点

### 现状分析

**❌ 无原生 API 端点**
- OpenAI 官方 API 中 **不提供** `/account/balance` 或 `/billing/usage` 端点
- 不支持通过 REST API 查询账户余额和信用额度

**⚠️ 替代方案**

#### 方案 A：通过 API 响应获取使用数据（仅当前请求）

**端点**：任何 API 调用都返回该次请求的使用数据

**响应格式**
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1677858242,
  "model": "gpt-4o",
  "usage": {
    "prompt_tokens": 13,
    "completion_tokens": 7,
    "total_tokens": 20
  },
  "choices": [...]
}
```

**用途**：
- ✅ 追踪单次请求消费
- ❌ 不能查询账户余额
- ❌ 不能查询总体使用量

#### 方案 B：Web Dashboard（需要登录，无 API）

**访问方式**
```
https://platform.openai.com/usage
https://platform.openai.com/account/billing/overview
```

**可查看内容**
- 📊 当前计费周期使用情况
- 💰 月度成本估算
- 📈 使用趋势图表
- ⚙️ 使用量警告阈值设置

**限制**
- 仅支持 Web 界面访问，无 API 接口
- 无法集成到应用程序
- 需要手动登录查看

### 认证信息

```
Header: Authorization: Bearer {API_KEY}
```

### 已知的 v1 API 端点（**不包括计费相关**）

```
POST /v1/chat/completions
POST /v1/completions
POST /v1/embeddings
GET /v1/models
POST /v1/images/generations
... (其他功能端点)
```

---

## 3️⃣ **Google Gemini API** ❌ 不支持专用余额查询端点

### 现状分析

**❌ 无原生 API 端点**
- Gemini API 官方文档中 **不提供** 余额查询接口
- 计费由 Google Cloud Billing 系统管理

**⚠️ 替代方案**

#### 方案 A：Google AI Studio 仪表板（Web 专用）

**访问方式**
```
https://aistudio.google.com/usage
https://aistudio.google.com/spend
https://aistudio.google.com/api-keys
```

**可查看内容**
- 📊 当前使用情况（Token 消耗）
- 💰 项目支出上限设置
- 📈 费用监控
- ⚙️ 配额层级信息

**限制**
- 仅支持 Web 界面，无 API
- 结算数据延迟 ~10 分钟
- 需要 Google 账号登录

#### 方案 B：Google Cloud Billing API（企业级）

**适用场景**：Google Cloud 端用户（非免费开发者）

**配置位置**
```
https://console.cloud.google.com/billing
```

**支持的操作**
- ✅ 通过 Google Cloud Billing API 查询项目费用
- ✅ 配置结算账户和支付方式
- ⚠️ **但与 Gemini API 无直接关系**

**Billing API 端点**（Google Cloud 提供）
```
GET /v1/billingAccounts/{billing_account_id}/budgets
GET /v1/billingAccounts/{billing_account_id}/costAnalysis
```

**认证**
```
Authorization: Bearer {GOOGLE_CLOUD_SERVICE_ACCOUNT_TOKEN}
```

### 关键限制

| 功能 | 支持度 | 说明 |
|-----|----- |------|
| API 余额查询 | ❌ 无 | Gemini API 不提供此功能 |
| Web 控制板 | ✅ 有 | AI Studio 提供可视化监控 |
| 配额查询 | ✅ 有 | 可查看 RPM/TPM 限制 |
| 成本预算 | ✅ 有 | 可设置月度支出上限 |
| 自动结算 | ✅ 有 | Cloud Billing 支持 |

---

## 📊 功能矩阵

| 功能需求 | DeepSeek | OpenAI | Google Gemini |
|---------|----------|--------|---------------|
| **API 余额端点** | ✅ `GET /user/balance` | ❌ 无 | ❌ 无 |
| **认证方式** | Bearer Token | Bearer Token | API Key |
| **账户余额** | ✅ 可查询 | ❌ 无法获取 | ❌ 无法获取 |
| **赠送额度** | ✅ 可查询 | ❌ 无 | ⚠️ Free Tier 只读 |
| **充值余额** | ✅ 可查询 | ⚠️ 仅 Web 显示 | ⚠️ 仅 Web 显示 |
| **实时性** | 📡 实时 API | ⏱️ 延迟（Web 手动查看） | ⏱️ 延迟 ~10 分钟 |
| **集成难度** | 🟢 简单 | 🔴 无法集成 | 🔴 无法集成 |
| **监控成本** | ✅ API 监控 | ⚠️ 仅 Dashboard | ⚠️ 仅 Dashboard |

---

## 🔌 集成方案建议

### 场景 1：需要自动监控 API 余额

**推荐**：**DeepSeek** ✅

```typescript
// TypeScript 示例
async function checkBalance(apiKey: string) {
  const response = await fetch('https://api.deepseek.com/user/balance', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  return {
    total: data.balance_log_list[0].total_balance,
    granted: data.balance_log_list[0].granted_balance,
    topped_up: data.balance_log_list[0].topped_up_balance
  };
}
```

### 场景 2：OpenAI + Gemini 集成

**方案**：使用 Python 脚本定期爬取 Web Dashboard

```python
# Python 示例 - 需要手动定期查看
# 无法自动化，建议使用第三方工具如 Selenium

def get_openai_usage():
    # 方案 A：从单次 API 调用获取 token 使用
    from openai import OpenAI
    
    client = OpenAI(api_key="sk-...")
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": "test"}]
    )
    
    return {
        "prompt_tokens": response.usage.prompt_tokens,
        "completion_tokens": response.usage.completion_tokens
        # ❌ 无法获取账户余额和总月度使用量
    }

def get_gemini_usage():
    # ❌ 官方 API 无余额查询
    # 可选：通过 Google Cloud Billing API 查询
    # 但需要专门的服务账户配置
```

### 场景 3：监控系统集成

**建议架构**
```
┌─────────────────────────────────┐
│   Notification System (飞书)     │
│   后端负责定期检查各API余额      │
└────────────────┬────────────────┘
         │         │        │
    ╔────▼──────────▼────────▼────╗
    ║  DeepSeek Balance API ✅     ║ → GET /user/balance (自动化)
    ║  OpenAI Web Scraper ⚠️       ║ → 手动或 Selenium 爬虫
    ║  Gemini Cloud Billing ⚠️    ║ → 手动或服务账户认证
    ╚─────────────────────────────╝
```

---

## 🚀 实现建议

| 优先级 | 功能 | 实现方式 | 难度 |
|--------|------|---------|------|
| 🔴 **高** | DeepSeek 余额监控 | 直接调用官方 API | 🟢 简单 |
| 🟡 **中** | OpenAI 成本监控 | 定期爬虫或定时提醒 | 🔴 复杂 |
| 🟡 **中** | Gemini 额度监控 | Google Cloud 服务账户 | 🔴 复杂 |
| 🟢 **低** | 统一面板 | 聚合显示多个供应商数据 | 🟠 中等 |

---

## ⚠️ 注意事项

### OpenAI

1. **无官方 API 余额接口** - 不支持通过代码自动查询余额
2. **Web 界面只读** - 只能手动登录 https://platform.openai.com/usage 查看
3. **使用追踪** - API 响应中包含 `usage` 字段，但这只是单次请求，不是总使用量

### Google Gemini

1. **管理费用的两种方式**：
   - AI Studio（开发者友好）
   - Google Cloud Billing（企业级，需服务账户）
2. **结算延迟** - ~10 分钟延迟，非实时
3. **无直接 API** - 所有查询都需要通过 Web 或 Cloud Billing 系统

### DeepSeek

1. **API 支持最完善** - 唯一提供原生余额查询端点的
2. **实时准确** - 缓存更新通常 < 1 秒
3. **易于集成** - 标准 REST API 设计

---

## 📚 参考资源

- **DeepSeek API 文档**: https://platform.deepseek.com/api-docs
- **OpenAI 计费指南**: https://developers.openai.com/docs/guides/billing-overview
- **Google Gemini 结算文档**: https://ai.google.dev/gemini-api/docs/billing
- **Google Cloud Billing API**: https://cloud.google.com/billing/docs/reference/rest

---

## 🔄 后续行动

如需在项目中实现余额监控，建议：

1. ✅ **优先实现** DeepSeek 的官方 API 调用
2. ⚠️ **备用方案** OpenAI 使用 Web 抓取或定时告警
3. ⚠️ **长期计划** Google Gemini 集成 Cloud Billing API（企业场景）
4. 📊 **统一面板** 将三个供应商的数据聚合显示

