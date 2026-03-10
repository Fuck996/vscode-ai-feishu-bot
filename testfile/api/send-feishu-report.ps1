# 发送测试消息到飞书
# 使用 PowerShell 的正确 UTF-8 编码

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$uri = "http://localhost:3000/api/webhook/b81d4b78-f87c-4afd-b39d-abd6b9763847"
$trigger_token = "4cd8847ce224f31decc20ebeb972392ce9ff478ecb55ead2"

# 准备 JSON 对象
$body = @{
    event   = "chat_session_end"
    status  = "info"
    title   = "飞书汇报系统优化完成"
    summary = "✅ 修复项目名称读取逻辑`n✅ 改进飞书卡片内容显示`n🔧 处理数组格式 summary`n🔧 优化换行显示效果`n📝 已验证所有功能正常"
} | ConvertTo-Json -Encoding UTF8

Write-Host "发送内容：" -ForegroundColor Cyan
$body | Write-Host

$headers = @{
    "Content-Type"    = "application/json; charset=utf-8"
    "X-Trigger-Token" = $trigger_token
}

try {
    $response = Invoke-WebRequest `
        -Uri $uri `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -ContentType "application/json; charset=utf-8" `
        -UseBasicParsing `
        -TimeoutSec 5

    Write-Host ""
    Write-Host "[✓] 请求成功 HTTP $($response.StatusCode)" -ForegroundColor Green
    Write-Host "汇报已发送！请到飞书查看消息效果。" -ForegroundColor Green
    
} catch {
    Write-Host ""
    Write-Host "[✗] 请求失败: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = $_.Exception.Response.GetResponseStream()
        $content = [System.IO.StreamReader]::new($reader).ReadToEnd()
        Write-Host "错误响应: $content" -ForegroundColor Red
    }
}
