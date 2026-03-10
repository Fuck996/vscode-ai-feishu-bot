# API 文档

## 基础信息

- **基础 URL**: `http://your-server/api`
- **内容类型**: `application/json`
- **认证**: 可选 JWT Token (Bearer)

---

## 端点列表

### 1. 发送通知

**请求**

```http
POST /api/notify
Content-Type: application/json

{
  "title": "string",
  "summary": "string",
  "status": "success|error|warning|info",
  "action": "pull|push|deploy|build|test|other",
  "details": {
    "key": "value"
  },
  "timestamp": "2026-03-10T10:00:00.000Z"
}
```

**参数说明**

| 字段 | 类型 | 必需 | 限制 | 说明 |
|-----|------|------|------|------|
| title | string | ✓ | 1-200 字符 | 通知标题 |
| summary | string | ✓ | 1-1000 字符 | 通知摘要 |
| status | string | ✓ | 枚举值 | 通知状态 |
| action | string | ✗ | 枚举值 | 操作类型 |
| details | object | ✗ | JSON 对象 | 详细信息 |
| timestamp | string | ✗ | ISO 8601 | 时间戳 |

**响应**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Notification sent",
  "notificationId": 123
}
```

**错误响应**

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "Invalid status value"
}
```

**示例**

```bash
curl -X POST http://localhost:3000/api/notify \
  -H "Content-Type: application/json" \
  -d '{
    "title": "部署完成",
    "summary": "my-app v1.2.0 已部署到生产环境",
    "status": "success",
    "action": "deploy",
    "details": {
      "service": "my-app",
      "version": "1.2.0",
      "environment": "production",
      "duration": 120
    }
  }'
```

---

### 2. 查询通知历史

**请求**

```http
GET /api/notifications?limit=50&offset=0&status=success
```

**查询参数**

| 参数 | 类型 | 默认值 | 说明 |
|-----|------|--------|------|
| limit | number | 50 | 返回个数 (最多 200) |
| offset | number | 0 | 分页偏移量 |
| status | string | - | 筛选状态 (可选) |

**响应**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "部署完成",
      "summary": "v1.2.0 已部署",
      "status": "success",
      "action": "deploy",
      "details": {
        "version": "1.2.0"
      },
      "createdAt": "2026-03-10T10:00:00.000Z"
    }
  ],
  "limit": 50,
  "offset": 0
}
```

**示例**

```bash
# 获取最新 20 个通知
curl http://localhost:3000/api/notifications?limit=20

# 获取所有成功的通知
curl http://localhost:3000/api/notifications?status=success

# 分页查询
curl http://localhost:3000/api/notifications?limit=10&offset=10
```

---

### 3. 获取统计数据

**请求**

```http
GET /api/stats
```

**响应**

```json
{
  "success": true,
  "data": {
    "success": 45,
    "error": 5,
    "warning": 8,
    "info": 12,
    "total": 70
  }
}
```

说明: 统计过去 7 天的数据

**示例**

```bash
curl http://localhost:3000/api/stats
```

---

### 4. 测试 Webhook

**请求**

```http
POST /api/webhooks/test
```

**响应**

```json
{
  "success": true,
  "message": "Test notification sent successfully",
  "notificationId": 123
}
```

**示例**

```bash
curl -X POST http://localhost:3000/api/webhooks/test
```

---

### 5. 健康检查

**请求**

```http
GET /api/health
```

**响应**

```json
{
  "status": "ok",
  "timestamp": "2026-03-10T10:00:00.000Z"
}
```

**示例**

```bash
curl http://localhost:3000/api/health
```

---

## 状态码

| 代码 | 含义 | 说明 |
|-----|------|------|
| 200 | OK | 请求成功 |
| 207 | Multi-Status | 部分成功（已保存但飞书发送失败） |
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 认证失败 |
| 429 | Too Many Requests | 请求过于频繁 |
| 500 | Internal Server Error | 服务器错误 |

---

## 错误处理

### 常见错误

**参数验证失败**

```json
{
  "error": "\"title\" is required"
}
```

**连接超时**

```json
{
  "error": "Failed to send notification: Request timeout"
}
```

**服务器错误**

```json
{
  "error": "Internal Server Error",
  "status": 500
}
```

### 处理建议

1. 检查响应状态码
2. 读取 `error` 字段了解失败原因
3. 根据状态码进行相应处理
4. 记录完整的请求和响应用于调试

```javascript
try {
  const response = await fetch('/api/notify', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (response.status === 200) {
    console.log('通知发送成功');
  } else if (response.status === 207) {
    console.log('通知已保存但飞书发送失败');
  } else {
    const error = await response.json();
    console.error('错误:', error.error);
  }
} catch (error) {
  console.error('网络错误:', error);
}
```

---

## 认证

### JWT Token 认证

如果启用了认证，需要在请求头中添加 Token：

```bash
curl -X POST http://localhost:3000/api/notify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

### 获取 Token

联系系统管理员获取 Token 或通过管理界面生成。

---

## 速率限制

系统默认对每个 IP 地址进行限流：

- **限制**: 15 分钟内最多 100 个请求
- **响应头**: `X-RateLimit-*` 头显示限流信息

**示例**

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1615123456
```

如果超过限制：

```json
{
  "error": "Too many requests, please try again later."
}
```

---

## 完整示例

### JavaScript/TypeScript

```typescript
async function sendNotification() {
  const payload = {
    title: '部署完成',
    summary: 'v1.2.0 部署成功',
    status: 'success',
    action: 'deploy',
    details: {
      service: 'api',
      version: '1.2.0'
    }
  };

  try {
    const response = await fetch('http://localhost:3000/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ 通知已发送:', data.notificationId);
    } else {
      console.error('❌ 发送失败:', data.error);
    }
  } catch (error) {
    console.error('❌ 网络错误:', error);
  }
}
```

### Python

```python
import requests
import json

def send_notification():
    payload = {
        'title': '部署完成',
        'summary': 'v1.2.0 部署成功',
        'status': 'success',
        'action': 'deploy',
        'details': {
            'service': 'api',
            'version': '1.2.0'
        }
    }

    try:
        response = requests.post(
            'http://localhost:3000/api/notify',
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )

        if response.status_code == 200:
            data = response.json()
            print(f"✅ 通知已发送: {data['notificationId']}")
        else:
            print(f"❌ 发送失败: {response.json()['error']}")
    except requests.RequestException as e:
        print(f"❌ 网络错误: {e}")

if __name__ == '__main__':
    send_notification()
```

### cURL

```bash
# 发送通知
curl -X POST http://localhost:3000/api/notify \
  -H "Content-Type: application/json" \
  -d '{
    "title": "部署完成",
    "summary": "v1.2.0 部署成功",
    "status": "success",
    "action": "deploy",
    "details": {
      "service": "api",
      "version": "1.2.0"
    }
  }'

# 查询通知
curl 'http://localhost:3000/api/notifications?limit=10'

# 获取统计数据
curl http://localhost:3000/api/stats

# 健康检查
curl http://localhost:3000/api/health
```

---

## 最佳实践

1. **总是检查响应状态码**
   ```javascript
   if (response.status >= 400) {
     // 处理错误
   }
   ```

2. **设置合理的超时**
   ```javascript
   fetch(url, { 
     method: 'POST',
     signal: AbortSignal.timeout(5000)
   })
   ```

3. **实现重试机制**
   ```javascript
   async function sendWithRetry(payload, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         const response = await fetch('/api/notify', { ... });
         if (response.ok) return response.json();
       } catch (error) {
         if (i === maxRetries - 1) throw error;
         await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
       }
     }
   }
   ```

4. **记录完整的请求信息用于调试**
   ```javascript
   console.log('Request:', {
     url: '/api/notify',
     method: 'POST',
     body: payload,
     timestamp: new Date().toISOString()
   });
   ```

5. **使用 details 字段存储结构化信息**
   ```json
   {
     "title": "构建成功",
     "summary": "main 分支构建成功",
     "status": "success",
     "details": {
       "branch": "main",
       "commit": "abc123def",
       "author": "John Doe",
       "commitMessage": "Add new feature"
     }
   }
   ```

---

## API 更新日志

### v1.0.0 (2026-03-10)

- ✅ 初始版本发布
- ✅ 支持基础通知发送
- ✅ 历史查询和统计功能
- ✅ 速率限制和认证

---

## 支持

- 📧 Email: support@example.com
- 🐛 Issues: GitHub Issues
- 💬 讨论: GitHub Discussions
