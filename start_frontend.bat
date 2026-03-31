@echo off
chcp 65001 >nul
echo ============================================
echo  春保森拉天时 工业AI平台 - 启动前端
echo ============================================
cd /d "%~dp0frontend"
echo 正在安装 npm 依赖...
npm install
echo.
echo 启动前端开发服务器（http://localhost:5173）...
echo.
npm run dev
pause
