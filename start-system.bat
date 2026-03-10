@echo off
REM 飞书AI通知系统启动脚本
REM 此脚本同时启动后端和前端服务

echo.
echo ============================================================
echo   飞书AI通知系统 启动脚本
echo ============================================================
echo.

REM 检查依赖是否已安装
if not exist "backend\node_modules" (
    echo [1/4] 安装后端依赖...
    cd backend
    call npm install
    cd ..
)

if not exist "frontend\node_modules" (
    echo [2/4] 安装前端依赖...
    cd frontend
    call npm install
    cd ..
)

REM 杀死占用端口的进程
echo.
echo [2/4] 清理占用的端口...
for /F "tokens=5" %%a in ('netstat -ano ^| find ":3000"') do (
    taskkill /PID %%a /F 2>nul
)
for /F "tokens=5" %%a in ('netstat -ano ^| find ":5173"') do (
    taskkill /PID %%a /F 2>nul
)

REM 启动后端
echo.
echo [3/4] 启动后端服务 (http://localhost:3000)...
start "Feishu Backend" cmd /k "cd backend && npm run dev"
timeout /t 3 /nobreak

REM 启动前端
echo.
echo [4/4] 启动前端服务 (http://localhost:5173)...
start "Feishu Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ============================================================
echo   系统已启动!
echo ============================================================
echo.
echo 后端: http://localhost:3000
echo 前端: http://localhost:5173
echo 初始凭证: admin / admin (首次登录后需修改密码)
echo.
echo 按任意键在浏览器中打开前端...
pause
start http://localhost:5173/login

echo.
echo 系统启动完成!
echo 如需关闭系统，请关闭两个命令窗口
echo.
