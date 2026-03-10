# Test API endpoints

# Test login and get token
Write-Host "Testing /api/auth/login..."
try {
    $response = Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/login' `
        -Method Post `
        -ContentType 'application/json' `
        -Body '{"username":"admin","password":"admin"}'
    
    $token = $response.token
    Write-Host "✓ Token received: $($token.Substring(0, 20))..."
} catch {
    Write-Host "✗ Login failed: $($_.Exception.Message)"
    exit 1
}

# Test /api/users/me
Write-Host "`nTesting /api/users/me..."
try {
    $headers = @{Authorization = "Bearer $token"}
    $userMe = Invoke-RestMethod -Uri 'http://localhost:3000/api/users/me' `
        -Method Get `
        -Headers $headers
    Write-Host "✓ User ID: $($userMe.id)"
    Write-Host "✓ Username: $($userMe.username)"
} catch {
    Write-Host "✗ /api/users/me failed: $($_.Exception.Message)"
}

# Test /api/robots
Write-Host "`nTesting /api/robots..."
try {
    $robots = Invoke-RestMethod -Uri 'http://localhost:3000/api/robots' `
        -Method Get `
        -Headers $headers
    Write-Host "✓ Number of robots: $($robots.Count)"
} catch {
    Write-Host "✗ /api/robots failed: $($_.Exception.Message)"
}
