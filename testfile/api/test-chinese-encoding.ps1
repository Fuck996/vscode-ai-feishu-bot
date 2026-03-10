# 测试中文编码 - 检查 MCP 服务器和后端是否正确处理中文
# 此脚本测试完整的中文流程：MCP -> Backend -> Feishu

# 配置
$BackendURL = "http://localhost:3000"
$IntegrationId = "b81d4b78-f87c-4afd-b39d-abd6b9763847"
$TriggerToken = "4cd8847ce224f31decc20ebeb972392ce9ff478ecb55ead2"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "测试中文编码通过整个系统" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 准备中文测试数据
$testData = @{
    event   = "chat_session_end"
    status  = "info"
    title   = "修复编码问题"
    summary = "成功修复了MCP服务器、后端Express和飞书API之间的UTF-8编码问题。现在所有中文文本都能正确传输。"
} | ConvertTo-Json -Depth 10 -Encoding UTF8

Write-Host "[1] 准备发送中文测试数据：" -ForegroundColor Yellow
$testData | Write-Host

Write-Host ""
Write-Host "[2] 发送请求到后端 webhook 端点..." -ForegroundColor Yellow
Write-Host "POST $BackendURL/api/webhook/$IntegrationId" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "$BackendURL/api/webhook/$IntegrationId" `
        -Method POST `
        -Headers @{
            "Content-Type"    = "application/json; charset=utf-8"
            "X-Trigger-Token" = $TriggerToken
        } `
        -Body $testData `
        -UseBasicParsing

    Write-Host "[OK] 请求成功，HTTP $($response.StatusCode)" -ForegroundColor Green
    Write-Host ""
    Write-Host "响应内容：" -ForegroundColor Yellow
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10 | Write-Host

} catch {
    Write-Host "[ERROR] 请求失败：$($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host ""
        Write-Host "错误响应：" -ForegroundColor Red
        try {
            $streamReader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
            $streamReader.ReadToEnd() | Write-Host
            $streamReader.Dispose()
        } catch { }
    }
}

Write-Host ""
Write-Host "[3] 检查后端日志是否正确显示中文..." -ForegroundColor Yellow
Write-Host "检查后端终端输出中是否看到正确的中文。日志显示为乱码是Windows编码问题，但数据本身应该是正确的。" -ForegroundColor Gray

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "测试完成！" -ForegroundColor Cyan
Write-Host "========================================"  -ForegroundColor Cyan
