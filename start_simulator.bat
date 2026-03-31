@echo off
chcp 65001 >nul
echo ============================================
echo  春保森拉天时 工业AI平台 - 启动数据模拟器
echo ============================================
echo 请确保后端已先启动！
echo 后端地址：http://localhost:8000
echo.
cd /d "%~dp0simulator"
echo 正在安装 requests 库...
pip install requests >nul 2>&1
echo 启动磨压机Y4数据模拟器（每秒1帧）...
echo 按 Ctrl+C 停止
echo.
python device_simulator.py
pause
