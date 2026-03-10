# Python SDK

## 安装

```bash
pip install feishu-notifier
```

## 快速开始

```python
from feishu_notifier import FeishuNotifier

notifier = FeishuNotifier(
    server_url='http://your-server',
    api_token='your-api-token'  # 可选
)

# 发送通知
await notifier.notify(
    title='构建完成',
    summary='项目成功构建',
    status='success'
)

# 发送部署结果
await notifier.notify_deploy_result(
    service='my-app',
    version='1.2.0',
    environment='production',
    status='success'
)
```

## 完整 API

见 `feishu_notifier/__init__.py`
