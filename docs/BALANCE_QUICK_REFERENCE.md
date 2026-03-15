# 🚀 API 余额查询快速参考

**文档版本**：v1.0 | **更新时间**：2026-03-15

---

## 📱 一页纸总结

| 方面 | DeepSeek ✅ | OpenAI ⚠️ | Google Gemini ⚠️ |
|------|------------|-----------|------------------|
| **API 余额端点** | `GET /user/balance` | ❌ 无 | ❌ 无 |
| **认证方式** | Bearer Token | Bearer Token | API Key |
| **实现难度** | 🟢 简单 (5 分钟) | 🔴 困难 (需爬虫) | 🔴 困难 (需 SA) |
| **可靠性** | 🟢 99.9% | ⚠️ Web 界面 | ⚠️ Web 界面 |
| **推荐度** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐ |

---

## 🔧 快速代码片段

### DeepSeek（推荐）

```bash
# 简单 CURL 示例
curl -X GET "https://api.deepseek.com/user/balance" \
  -H "Authorization: Bearer sk-abc123"
```

**响应**
```json
{
  "is_available": true,
  "balance_log_list": [{
    "total_balance": 100.50,
    "granted_balance": 0.00,
    "topped_up_balance": 100.50,
    "currency": "CNY"
  }]
}
```

### OpenAI（无 API）

```bash
# 🚫 无官方端点，无法通过 API 查询

# 替代方案：Web Dashboard
# https://platform.openai.com/usage
```

### Google Gemini（无 API）

```bash
# 🚫 无官方端点，无法通过 API 查询

# 替代方案：AI Studio
# https://aistudio.google.com/usage
```

---

## 💻 TypeScript 一行代码

### DeepSeek
```typescript
const balance = await (await fetch('https://api.deepseek.com/user/balance', 
  { headers: { 'Authorization': `Bearer ${KEY}` } })).json();
console.log(balance.balance_log_list[0].total_balance);
```

### OpenAI
```typescript
// ❌ 无 API，只能访问 Web 或使用 SDK 追踪单次请求
const { usage } = await openai.chat.completions.create({...});
console.log(usage.total_tokens); // 仅当前请求
```

### Gemini
```typescript
// ❌ 无 API，只能访问 Web Dashboard
// 访问: https://aistudio.google.com/usage
```

---

## 📊 功能对比表

```
┌─────────────────┬──────────┬──────────┬──────────┐
│      功能       │ DeepSeek │ OpenAI   │  Gemini  │
├─────────────────┼──────────┼──────────┼──────────┤
│ 总余额          │    ✅    │    ❌    │    ❌    │
│ 赠送额度        │    ✅    │    ❌    │    ❌    │
│ 充值余额        │    ✅    │    ❌    │    ❌    │
│ 月度使用量      │    ✅    │   ⚠️     │   ⚠️     │
│ 成本计算        │    ✅    │   ⚠️     │   ⚠️     │
│ 实时更新        │    ✅    │    ❌    │    ❌    │
│ 自动化监控      │    ✅    │    ❌    │    ❌    │
│ API 难度        │   简单   │   困难   │   困难   │
└─────────────────┴──────────┴──────────┴──────────┘
```

---

## ⚡ 决策树

```
需要查询 API 余额？
│
├─ 只用 DeepSeek？
│  └─ ✅ 使用官方 API: GET /user/balance
│
├─ 只用 OpenAI？
│  ├─ 需要自动化？
│  │  └─ 🔴 无法实现，建议手动监控
│  └─ 可以手动查看？
│     └─ 访问 https://platform.openai.com/usage
│
├─ 只用 Gemini？
│  └─ 访问 https://aistudio.google.com/usage
│
└─ 混合使用？
   ├─ ✅ DeepSeek → 官方 API
   ├─ 📝 OpenAI → 记录历史使用
   └─ 📝 Gemini → Web 手动查看
```

---

## 🎯 推荐方案

### 场景 1：仅需 DeepSeek

**方案**：直接调用官方 API
```typescript
import { DeepSeekBalanceService } from './deepseekBalance';

const service = new DeepSeekBalanceService(process.env.DEEPSEEK_API_KEY!);
const balance = await service.getBalance();
```

**实现时间**：5 分钟 ✅
**可靠性**：99.9% ✅

---

### 场景 2：OpenAI + DeepSeek

**方案**：

1️⃣ **DeepSeek** → 官方 API
```typescript
const deepseek = await new DeepSeekBalanceService(key).getBalance();
```

2️⃣ **OpenAI** → 数据库追踪 + Web 告警
```typescript
// 每次调用时记录使用情况
await tracker.recordUsage({ model, tokens, cost });

// 手动告警：设置 https://platform.openai.com/settings/organization/limits
```

**实现时间**：30 分钟 ⚠️
**可靠性**：DeepSeek 100%，OpenAI 需手动

---

### 场景 3：完整集成（三个供应商）

**方案**：

1️⃣ **DeepSeek** → API（自动）✅
2️⃣ **OpenAI** → 数据库 + Web 提醒
3️⃣ **Gemini** → Web Dashboard 提醒

```typescript
const service = new UnifiedBalanceService(...);
app.get('/api/balance/alerts', async (req, res) => {
  const alerts = await service.getBalanceAlerts();
  res.json({ alerts });
});

// 每天 09:00 发送飞书通知
new BalanceNotificationTask(service).start();
```

**实现时间**：2 小时
**可靠性**：DeepSeek 自动，其他需手动

---

## 🔗 重要链接

### 官方文档
- DeepSeek API 文档：https://platform.deepseek.com/api-docs
- OpenAI 计费指南：https://developers.openai.com/docs/guides/billing-overview
- Gemini 结算指南：https://ai.google.dev/gemini-api/docs/billing

### Web 仪表板
- DeepSeek：https://platform.deepseek.com/usage
- OpenAI：https://platform.openai.com/usage
- Gemini：https://aistudio.google.com/usage

### 配额管理
- OpenAI 限额：https://platform.openai.com/settings/organization/limits
- Gemini 配额：https://console.cloud.google.com/apis

---

## ⚙️ 环境变量配置

```env
# DeepSeek (✅ 推荐配置)
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxx

# OpenAI (⚠️ 有限支持)
OPENAI_API_KEY=sk-xxxxxxxxxxxxx

# Google Gemini (⚠️ 有限支持)
GOOGLE_CLOUD_PROJECT_ID=xxxxxxxxxxxxx
GOOGLE_CLOUD_KEY_FILE=/path/to/key.json

# 监控设置
BALANCE_CHECK_INTERVAL=86400  # 每天检查一次（秒）
BALANCE_ALERT_THRESHOLD=20    # DeepSeek 余额警告阈值（元）
OPENAI_COST_ALERT=10          # OpenAI 月度成本警告阈值（美元）
```

---

## 📞 故障排查

### DeepSeek 无法查询

**错误**：`401 Unauthorized`
```
解决：检查 API Key 是否正确，确认前缀为 "sk-"
```

**错误**：`Connection timeout`
```
解决：检查网络连接或使用代理
```

### OpenAI 无法获取余额

**症状**：总是查询不到余额
```
📌 这是正常的！OpenAI 官方 API 不提供此功能
✅ 解决方案：
  1. 手动访问 https://platform.openai.com/usage
  2. 或在代码中追踪 API 响应的 usage 字段
```

### Gemini 无法获取余额

**症状**：无法通过 API 查询
```
📌 这是正常的！Gemini 官方 API 不提供此功能
✅ 解决方案：
  1. 访问 AI Studio Dashboard
  2. 或配置 Google Cloud Billing API（企业用户）
```

---

## 🎓 学习资源

### 代码示例
- 完整实现：见 `docs/BALANCE_IMPLEMENTATION.md`
- API 对比：见 `docs/API_BALANCE_COMPARISON.md`

### 文档结构
```
docs/
├── API_BALANCE_COMPARISON.md      # 详细对比分析
├── BALANCE_IMPLEMENTATION.md      # 完整代码示例
├── BALANCE_QUICK_REFERENCE.md     # 本文件（快速参考）
└── REQUIREMENTS.md                # 项目需求文档
```

---

## 💡 最佳实践

### ✅ 推荐做法

1. **优先使用 DeepSeek 官方 API**
   ```typescript
   // 简单直接，无需额外维护
   const balance = await deepseek.getBalance();
   ```

2. **为 OpenAI 启用成本警告**
   ```
   https://platform.openai.com/settings/organization/limits
   → 设置 "Usage limits" 和 "Email alerts"
   ```

3. **定期备份 API 密钥**
   ```bash
   # 存储在安全的密钥管理服务中
   - AWS Secrets Manager
   - Azure Key Vault
   - HashiCorp Vault
   ```

### ❌ 避免做法

1. **不要在代码中硬编码 API Key**
   ```typescript
   // ❌ 错误
   const key = "sk-abc123";
   
   // ✅ 正确
   const key = process.env.DEEPSEEK_API_KEY;
   ```

2. **不要频繁调用余额 API**
   ```typescript
   // ❌ 错误：每次请求都调用
   for (const item of items) {
     const balance = await getBalance(); // 浪费！
   }
   
   // ✅ 正确：每小时检查一次
   setInterval(() => getBalance(), 3600000);
   ```

3. **不要忽视 OpenAI/Gemini 的 Web 监控**
   ```
   ❌ 完全不检查 → 可能账户被禁用
   ✅ 定期查看   → 及时发现问题
   ```

---

## 📈 性能对比

```
API 调用耗时：
├─ DeepSeek: ~200ms (实时 API)
├─ OpenAI:   N/A (无 API，需 Web)
└─ Gemini:   N/A (无 API，需 Web)

可用性：
├─ DeepSeek: 99.9%
├─ OpenAI:   N/A (Web 界面偶尔维护)
└─ Gemini:   N/A (Web 界面偶尔维护)

推荐监控频率：
├─ DeepSeek: 每小时一次 (API 调用成本极低)
├─ OpenAI:   每日手动检查
└─ Gemini:   每日手动检查
```

---

## 🎯 下一步

1. **立即实施**
   - [ ] 配置 DeepSeek API Key
   - [ ] 启用 OpenAI 成本告警
   - [ ] 收藏 Gemini Web Dashboard

2. **本周完成**
   - [ ] 部署 DeepSeek 自动监控
   - [ ] 集成飞书通知
   - [ ] 设置定期检查任务

3. **本月完成**
   - [ ] 实现 OpenAI 使用追踪数据库
   - [ ] 创建统一的余额监控面板
   - [ ] 完成文档和培训

