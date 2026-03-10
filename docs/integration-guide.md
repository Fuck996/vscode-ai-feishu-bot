# 跨工程集成指南

## 概述

本指南介绍如何在不同的项目和工具中集成飞书 AI 通知系统，实现跨工程调用。

---

## 方式一：HTTP REST API

最简单的集成方式，任何可以发送 HTTP 请求的工具都可以使用。

### 基础请求

```bash
curl -X POST http://your-server/api/notify \
  -H "Content-Type: application/json" \
  -d '{
    "title": "构建完成",
    "summary": "项目成功构建",
    "status": "success",
    "action": "build",
    "details": {
      "duration": 120,
      "commit": "abc123"
    }
  }'
```

### 请求格式

| 字段 | 类型 | 必需 | 说明 |
|-----|------|------|------|
| title | string | ✓ | 通知标题 (最大200字符) |
| summary | string | ✓ | 通知摘要 (最大1000字符) |
| status | string | ✓ | 状态: success/error/warning/info |
| action | string | ✗ | 操作类型: pull/push/deploy/build/test |
| details | object | ✗ | 详细信息 (JSON 对象) |
| timestamp | string | ✗ | ISO 8601 时间戳 |

### 响应格式

**成功 (200)**：
```json
{
  "success": true,
  "message": "Notification sent",
  "notificationId": 123
}
```

**失败 (400)**：
```json
{
  "error": "Invalid status value"
}
```

---

## 方式二：SDK 集成

### TypeScript/JavaScript SDK

#### 安装

```bash
npm install @feishu-bot/sdk
```

#### 使用

```typescript
import { FeishuNotifier } from '@feishu-bot/sdk';

const notifier = new FeishuNotifier({
  serverUrl: 'http://your-server',
  apiToken: process.env.FEISHU_API_TOKEN // 可选
});

// 发送自定义通知
await notifier.notify({
  title: '部署完成',
  summary: 'v1.2.0 已部署到生产环境',
  status: 'success',
  action: 'deploy',
  details: {
    service: 'api-server',
    version: '1.2.0',
    environment: 'production'
  }
});

// 发送 Pull 结果
await notifier.notifyPullResult({
  repository: 'my-repo',
  branch: 'main',
  commitCount: 5,
  summary: '从 main 分支拉取了 5 个提交'
});

// 发送 Push 结果
await notifier.notifyPushResult({
  repository: 'my-repo',
  branch: 'feature/new-feature',
  commitCount: 3
});

// 发送部署结果
await notifier.notifyDeployResult({
  service: 'my-app',
  version: '1.2.0',
  environment: 'production',
  status: 'success',
  duration: 180
});

// 测试连接
const connected = await notifier.testConnection();
```

### Python SDK

#### 安装

```bash
pip install feishu-notifier
```

#### 使用

```python
from feishu_notifier import FeishuNotifier

notifier = FeishuNotifier(
    server_url='http://your-server',
    api_token=os.getenv('FEISHU_API_TOKEN')
)

# 发送通知
notifier.notify(
    title='构建完成',
    summary='项目成功构建',
    status='success',
    action='build',
    details={
        'duration': 120,
        'branch': 'main'
    }
)

# 发送部署结果
notifier.notify_deploy_result(
    service='my-service',
    version='1.2.0',
    environment='production',
    status='success'
)
```

---

## 方式三：CI/CD 集成

### GitHub Actions

在 `.github/workflows/ci.yml` 中：

```yaml
name: CI/CD

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install dependencies
        run: npm install
      
      - name: Build
        run: npm run build
      
      - name: 发送构建成功通知
        if: success()
        run: |
          curl -X POST ${{ secrets.FEISHU_WEBHOOK_URL }} \
            -H "Content-Type: application/json" \
            -d '{
              "title": "构建成功",
              "summary": "${{ github.repository }} - ${{ github.ref_name }}",
              "status": "success",
              "action": "build",
              "details": {
                "commit": "${{ github.sha }}",
                "commit_message": "${{ github.event.head_commit.message }}"
              }
            }'
      
      - name: 发送构建失败通知
        if: failure()
        run: |
          curl -X POST ${{ secrets.FEISHU_WEBHOOK_URL }} \
            -H "Content-Type: application/json" \
            -d '{
              "title": "构建失败",
              "summary": "${{ github.repository }} - ${{ github.ref_name }}",
              "status": "error",
              "action": "build"
            }'
```

### GitLab CI

在 `.gitlab-ci.yml` 中：

```yaml
stages:
  - build
  - deploy

variables:
  FEISHU_SERVER: "http://your-server"

build_job:
  stage: build
  script:
    - npm install
    - npm run build
  after_script:
    - |
      if [ $CI_JOB_STATUS = "success" ]; then
        curl -X POST $FEISHU_SERVER/api/notify \
          -H "Content-Type: application/json" \
          -d "{
            \"title\": \"构建成功\",
            \"summary\": \"$CI_PROJECT_NAME - $CI_COMMIT_REF_NAME\",
            \"status\": \"success\",
            \"action\": \"build\",
            \"details\": {
              \"commit\": \"$CI_COMMIT_SHA\"
            }
          }"
      fi
```

### Jenkins

在 `Jenkinsfile` 中：

```groovy
pipeline {
  agent any
  
  post {
    always {
      script {
        def status = currentBuild.result == 'SUCCESS' ? 'success' : 'error'
        def title = currentBuild.result == 'SUCCESS' ? '构建成功' : '构建失败'
        
        sh '''
          curl -X POST ${FEISHU_SERVER_URL}/api/notify \
            -H "Content-Type: application/json" \
            -d '{
              "title": "''' + title + '''",
              "summary": "''' + env.JOB_NAME + ''' - Build #''' + env.BUILD_NUMBER + '''",
              "status": "''' + status + '''",
              "action": "build"
            }'
        '''
      }
    }
  }
  
  stages {
    stage('Build') {
      steps {
        sh 'npm install && npm run build'
      }
    }
  }
}
```

---

## 方式四：VSCode 集成

### 快捷命令

在 VSCode 中按 `Ctrl+Shift+P`（Mac: `Cmd+Shift+P`），选择：

- **Feishu: Send Notification** - 发送自定义通知
- **Feishu: Notify Pull Result** - 发送 Pull 结果
- **Feishu: Notify Push Result** - 发送 Push 结果
- **Feishu: Notify Deploy Result** - 发送部署结果

### 快捷键

```
Ctrl+Shift+F (Windows/Linux)
Cmd+Shift+F (Mac)
```

### 配置

在 VSCode 设置中配置：

```json
{
  "feishu-notifier.serverUrl": "http://your-server",
  "feishu-notifier.apiToken": "your-api-token",
  "feishu-notifier.autoSave": true
}
```

---

## 方式五：脚本集成

### Bash 脚本

创建 `scripts/notify.sh`：

```bash
#!/bin/bash

SERVER_URL="http://your-server"
TITLE="$1"
SUMMARY="$2"
STATUS="${3:-info}"
ACTION="${4:-other}"

curl -X POST "$SERVER_URL/api/notify" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"$TITLE\",
    \"summary\": \"$SUMMARY\",
    \"status\": \"$STATUS\",
    \"action\": \"$ACTION\"
  }"
```

使用：

```bash
./scripts/notify.sh "部署完成" "v1.2.0 已部署" "success" "deploy"
```

### Python 脚本

```python
#!/usr/bin/env python3

import requests
import sys
import json

def notify(title, summary, status='info', action=None, details=None):
    server_url = 'http://your-server'
    
    payload = {
        'title': title,
        'summary': summary,
        'status': status,
        'action': action,
        'details': details or {}
    }
    
    response = requests.post(
        f'{server_url}/api/notify',
        json=payload,
        headers={'Content-Type': 'application/json'}
    )
    
    return response.json()

if __name__ == '__main__':
    title = sys.argv[1]
    summary = sys.argv[2]
    status = sys.argv[3] if len(sys.argv) > 3 else 'info'
    
    result = notify(title, summary, status)
    print(json.dumps(result, indent=2))
```

---

## 使用示例

### 示例 1：部署流程

```typescript
// deploy.ts
import { exec } from 'child_process';
import { FeishuNotifier } from '@feishu-bot/sdk';

const notifier = new FeishuNotifier({
  serverUrl: process.env.FEISHU_SERVER_URL,
});

async function deploy() {
  const startTime = Date.now();
  
  try {
    // 执行部署命令...
    console.log('开始部署...');
    
    // 模拟部署
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const duration = Date.now() - startTime;
    
    // 发送成功通知
    await notifier.notifyDeployResult({
      service: 'my-api',
      version: '1.2.0',
      environment: 'production',
      status: 'success',
      duration: Math.round(duration / 1000)
    });
    
    console.log('✅ 部署完成！');
  } catch (error) {
    await notifier.notifyDeployResult({
      service: 'my-api',
      version: '1.2.0',
      environment: 'production',
      status: 'error'
    });
    
    console.error('❌ 部署失败:', error);
    process.exit(1);
  }
}

deploy();
```

### 示例 2：测试报告

```python
# tests.py
import pytest
from feishu_notifier import FeishuNotifier

notifier = FeishuNotifier(server_url='http://your-server')

@pytest.fixture(scope='session')
def notify_results(request):
    def fin():
        # 在所有测试完成后发送通知
        stats = {
            'total': 0,
            'passed': 0,
            'failed': 0
        }
        
        # 计算测试统计...
        
        status = 'success' if stats['failed'] == 0 else 'error'
        
        notifier.notify(
            title='测试报告',
            summary=f"通过: {stats['passed']}/{stats['total']}",
            status=status,
            action='test',
            details=stats
        )
    
    request.addfinalizer(fin)

def test_example():
    assert True
```

---

## 测试连接

### API 测试

```bash
# 测试健康检查
curl http://your-server/api/health

# 测试通知
curl -X POST http://your-server/api/webhooks/test

# 运行单个测试通知
curl -X POST http://your-server/api/notify \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试通知",
    "summary": "这是一条测试消息",
    "status": "info"
  }'
```

### 查看历史

访问前端仪表板查看已发送的通知：

```
http://your-server:5173
```

---

## 常见问题

### Q: 如何知道通知是否成功发送？

A: 检查响应状态码
- 200: 成功发送到飞书
- 207: 已保存但飞书发送失败
- 400: 请求格式错误

### Q: 支持吗加认证？

A: 是的，可以通过 JWT Token：

```bash
curl -X POST http://your-server/api/notify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

### Q: 如何禁用飞书发送，仅保存到数据库？

A: 不配置 FEISHU_WEBHOOK_URL 即可

### Q: 支持批量发送吗？

A: 不支持，但可以编写脚本循环调用

---

## 最佳实践

1. ✅ 使用环境变量存储服务器 URL
2. ✅ 添加超时和重试机制
3. ✅ 记录通知 ID 用于追踪
4. ✅ 在关键流程中添加通知（部署前后、测试完成等）
5. ✅ 定期检查通知历史确保系统正常
6. ✅ 在生产环境启用认证
7. ✅ 监控飞书发送失败率

---

## 支持的工具

✅ GitHub Actions
✅ GitLab CI/CD
✅ Jenkins
✅ CircleCI
✅ Travis CI
✅ Bash 脚本
✅ Python 脚本
✅ Node.js 脚本
✅ Ruby/Golang/Java（通过 HTTP API）
✅ VSCode
✅ 自定义应用

---

## 技术支持

- 📖 查看 API 文档
- 🐛 报告 Bug
- 💡 提交建议
