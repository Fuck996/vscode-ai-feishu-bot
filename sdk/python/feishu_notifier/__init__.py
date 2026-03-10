import requests
from typing import Optional, Dict, Any
from datetime import datetime

class FeishuNotifier:
    """飞书 AI 通知器 SDK"""

    def __init__(
        self,
        server_url: str,
        api_token: Optional[str] = None,
        timeout: int = 10
    ):
        """
        初始化通知器

        Args:
            server_url: 服务器地址
            api_token: API 令牌 (可选)
            timeout: 请求超时 (秒)
        """
        if not server_url:
            raise ValueError('server_url is required')

        self.server_url = server_url.rstrip('/')
        self.api_token = api_token
        self.timeout = timeout

    def notify(
        self,
        title: str,
        summary: str,
        status: str = 'info',
        action: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        timestamp: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        发送通知

        Args:
            title: 通知标题
            summary: 通知摘要
            status: 状态 (success/error/warning/info)
            action: 操作类型 (pull/push/deploy/build/test)
            details: 详细信息
            timestamp: 时间戳

        Returns:
            API 响应
        """
        payload = {
            'title': title,
            'summary': summary,
            'status': status,
            'action': action,
            'details': details or {},
            'timestamp': timestamp or datetime.utcnow().isoformat() + 'Z'
        }

        return self._post('/api/notify', payload)

    def notify_pull_result(
        self,
        repository: str,
        branch: str,
        commit_count: Optional[int] = None,
        summary: Optional[str] = None
    ) -> Dict[str, Any]:
        """发送 Pull 结果"""
        default_summary = f"Pulled {commit_count or 1} commits from {branch}"
        return self.notify(
            title=f"Pull: {repository}",
            summary=summary or default_summary,
            status='success',
            action='pull',
            details={
                'repository': repository,
                'branch': branch,
                'commitCount': commit_count
            }
        )

    def notify_push_result(
        self,
        repository: str,
        branch: str,
        commit_count: Optional[int] = None,
        summary: Optional[str] = None
    ) -> Dict[str, Any]:
        """发送 Push 结果"""
        default_summary = f"Pushed {commit_count or 1} commits to {branch}"
        return self.notify(
            title=f"Push: {repository}",
            summary=summary or default_summary,
            status='success',
            action='push',
            details={
                'repository': repository,
                'branch': branch,
                'commitCount': commit_count
            }
        )

    def notify_deploy_result(
        self,
        service: str,
        version: str,
        environment: str = 'production',
        status: str = 'success',
        duration: Optional[int] = None,
        summary: Optional[str] = None
    ) -> Dict[str, Any]:
        """发送部署结果"""
        default_summary = f"Deployment to {environment} completed"
        return self.notify(
            title=f"Deploy: {service} v{version}",
            summary=summary or default_summary,
            status=status,
            action='deploy',
            details={
                'service': service,
                'version': version,
                'environment': environment,
                'duration': duration
            }
        )

    def notify_build_result(
        self,
        project_name: str,
        status: str = 'success',
        duration: Optional[int] = None,
        summary: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """发送构建结果"""
        default_summary = f"Build completed with {status} status"
        merged_details = {
            'projectName': project_name,
            'duration': duration
        }
        if details:
            merged_details.update(details)

        return self.notify(
            title=f"Build: {project_name}",
            summary=summary or default_summary,
            status=status,
            action='build',
            details=merged_details
        )

    def notify_test_result(
        self,
        project_name: str,
        total_tests: int,
        passed_tests: int,
        failed_tests: int,
        summary: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """发送测试结果"""
        status = 'success' if failed_tests == 0 else 'error'
        default_summary = f"{passed_tests}/{total_tests} tests passed"
        merged_details = {
            'projectName': project_name,
            'totalTests': total_tests,
            'passedTests': passed_tests,
            'failedTests': failed_tests
        }
        if details:
            merged_details.update(details)

        return self.notify(
            title=f"Tests: {project_name}",
            summary=summary or default_summary,
            status=status,
            action='test',
            details=merged_details
        )

    def test_connection(self) -> bool:
        """测试服务器连接"""
        try:
            response = requests.get(
                f"{self.server_url}/api/health",
                timeout=5
            )
            return response.status_code == 200
        except Exception:
            return False

    def _post(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """发送 POST 请求"""
        url = f"{self.server_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}

        if self.api_token:
            headers['Authorization'] = f"Bearer {self.api_token}"

        response = requests.post(
            url,
            json=data,
            headers=headers,
            timeout=self.timeout
        )

        if response.status_code >= 400:
            raise Exception(f"Request failed: {response.text}")

        return response.json()
