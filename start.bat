@echo off
REM 飞书AI通知系统 - 快速启动

echo.
echo ============================================================
echo   飞书AI通知系统 正在启动...
echo ============================================================
echo.

REM 杀死旧进程
taskkill /F /IM node.exe >nul 2>&1

REM 启动后端
echo [1/2] 启动后端 (http://localhost:3000)
start "Backend" cmd /k "cd backend && npm run dev"

REM 等待一下
timeout /t 3 /nobreak

REM 启动前端
echo [2/2] 启动前端 (http://localhost:5173)
start "Frontend" cmd /k "cd frontend && npm run dev"

REM 等待服务启动
timeout /t 5 /nobreak

REM 打开浏览器
echo.
echo 正在打开浏览器...
start http://localhost:5173/login

echo.
echo ============================================================
echo   系统已启动！
echo ============================================================
echo.
echo 登录信息：
echo   用户名：admin
echo   密码：admin
echo.
echo 如果看到CORS错误，请按 Ctrl+Shift+R 刷新页面缓存
echo.
pause
