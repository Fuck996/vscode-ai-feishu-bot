$NAS_API = "https://fsbot.4npc.net:2020"
$TEST_USER = "admin"
$TEST_PASS = "admin"

[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Step 1: Login Test
Write-Host "
=== NAS System Test ===" -ForegroundColor Cyan
Write-Host "[1/3] Testing login..." -ForegroundColor Cyan

$loginBody = @{username=$TEST_USER; password=$TEST_PASS} | ConvertTo-Json

try {
    $loginResp = Invoke-WebRequest 
        -Uri "$NAS_API/api/auth/login" 
        -Method POST 
        -Body $loginBody 
        -ContentType "application/json; charset=utf-8" 
        -UseBasicParsing 
        -ErrorAction Stop
    
    $loginData = $loginResp.Content | ConvertFrom-Json
    
    if ($loginData.success) {
        $TOKEN = $loginData.token
        Write-Host "[OK] Login successful, got JWT token" -ForegroundColor Green
        Write-Host "Token: $($TOKEN.Substring(0,20))..." -ForegroundColor Gray
    } else {
        Write-Host "[FAIL] Login failed: $($loginData.error)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[ERROR] Login request failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Get User Info
Write-Host "
[2/3] Getting user info..." -ForegroundColor Cyan
try {
    $userResp = Invoke-WebRequest 
        -Uri "$NAS_API/api/users/me" 
        -Method GET 
        -Headers @{"Authorization"="Bearer $TOKEN"} 
        -ContentType "application/json; charset=utf-8" 
        -UseBasicParsing 
        -ErrorAction Stop
    
    $userData = $userResp.Content | ConvertFrom-Json
    Write-Host "[OK] Got user: $($userData.data.username)" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Could not get user info: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Step 3: Create Robot
Write-Host "
[3/3] Creating GitHub robot..." -ForegroundColor Cyan

$robotBody = @{
    name = "GitHub-Bot-NAS"
    description = "GitHub integration test robot"
    webhookUrl = "https://open.feishu.cn/open-apis/bot/webhook/test"
} | ConvertTo-Json

try {
    $robotResp = Invoke-WebRequest 
        -Uri "$NAS_API/api/robots" 
        -Method POST 
        -Body $robotBody 
        -Headers @{"Authorization"="Bearer $TOKEN"} 
        -ContentType "application/json; charset=utf-8" 
        -UseBasicParsing 
        -ErrorAction Stop
    
    $robotData = $robotResp.Content | ConvertFrom-Json
    if ($robotData.success) {
        $ROBOT_ID = $robotData.data.id
        Write-Host "[OK] Robot created: $ROBOT_ID" -ForegroundColor Green
        
        # Create GitHub Integration
        $integBody = @{
            projectName = "my-github-project"
            projectType = "github"
            triggeredEvents = @("push", "pull_request")
            notifyOn = "always"
            config = @{
                owner = "myuser"
                repo = "myrepo"
            }
        } | ConvertTo-Json
        
        $integResp = Invoke-WebRequest 
            -Uri "$NAS_API/api/robots/$ROBOT_ID/integrations" 
            -Method POST 
            -Body $integBody 
            -Headers @{"Authorization"="Bearer $TOKEN"} 
            -ContentType "application/json; charset=utf-8" 
            -UseBasicParsing 
            -ErrorAction Stop
        
        $integData = $integResp.Content | ConvertFrom-Json
        if ($integData.success) {
            Write-Host "[OK] GitHub integration created successfully!" -ForegroundColor Green
            Write-Host "Integration ID: $($integData.data.id)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "[ERROR] Robot/Integration creation failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "
=== All tests completed ===" -ForegroundColor Green
