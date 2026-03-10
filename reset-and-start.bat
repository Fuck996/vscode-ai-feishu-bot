@echo off
REM 飞书AI通知系统 - 完全重置和启动脚本
REM 这个脚本会：
REM 1. 杀死所有占用的进程
REM 2. 清理构建缓存
REM 3. 重新安装依赖
REM 4. 启动干净的后端和前端

echo.
echo ============================================================
echo   飞书AI通知系统 - 完全重置
echo ============================================================
echo.

echo [1/5] Killing any existing node processes...
taskkill /F /IM node.exe >nul 2>&1
echo Done.

echo.
echo [2/5] Cleaning backend cache...
cd backend
rmdir /s /q node_modules >nul 2>&1
del package-lock.json >nul 2>&1
echo Done.

echo.
echo [3/5] Cleaning frontend cache...
cd ..\frontend
rmdir /s /q node_modules >nul 2>&1
rmdir /s /q dist >nul 2>&1
del package-lock.json >nul 2>&1
echo Done.

echo.
echo [4/5] Installing fresh dependencies...
call npm install >nul 2>&1
if errorlevel 1 (
    echo ERROR: Failed to install frontend dependencies
    exit /b 1
)
echo Done.

echo.
echo [5/5] Starting services...
cd ..
echo.
echo Starting BACKEND (http://localhost:3000)...
start "Backend" cmd /k "cd backend && npm run dev"
timeout /t 3

echo Starting FRONTEND (http://localhost:5173)...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ============================================================
echo   System started! Opening browser...
echo ============================================================
timeout /t 3
start http://localhost:5173/login

echo.
echo Initial credentials:
echo   Username: admin
echo   Password: admin
echo.
