# Test creating a new robot via API
$token = (Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/login' `
    -Method Post `
    -ContentType 'application/json' `
    -Body '{"username":"admin","password":"admin"}').token

$headers = @{Authorization = "Bearer $token"; "Content-Type" = "application/json"}

$robotData = @{
    name = "test-robot"
    description = "Test robot"
    webhookUrl = "https://open.feishu.cn/open-apis/bot/v2/hook/test"
    status = "active"
} | ConvertTo-Json

Write-Host "Creating robot..."
try {
    $result = Invoke-RestMethod -Uri 'http://localhost:3000/api/robots' `
        -Method Post `
        -Headers $headers `
        -Body $robotData
    Write-Host "Robot created: $($result.id)"
} catch {
    Write-Host "Failed: $($_.Exception.Message)"
}

Write-Host "`nFetching all robots..."
try {
    $robots = Invoke-RestMethod -Uri 'http://localhost:3000/api/robots' `
        -Method Get `
        -Headers $headers
    Write-Host "Robots count: $($robots.Count)"
} catch {
    Write-Host "Failed: $($_.Exception.Message)"
}
