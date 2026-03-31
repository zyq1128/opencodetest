@echo off
chcp 65001 >nul
echo ============================================
echo  春保森拉天时 工业AI平台 - 启动后端服务
echo ============================================
cd /d "%~dp0backend"
echo 正在安装依赖...
pip install -r requirements.txt
echo.
echo 启动 FastAPI 服务（http://localhost:8000）...
echo API 文档：http://localhost:8000/api/docs
echo.
python main.py
pause
