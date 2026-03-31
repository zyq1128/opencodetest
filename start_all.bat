@echo off
title 春保森拉天时 工业AI平台 - 启动中...
color 0B
echo.
echo  =====================================================
echo   春保森拉天时  工业AI智能监控平台  POC v1.0
echo  =====================================================
echo.

:: ── 第①步：启动后端 ──────────────────────────────────
echo [1/3] 启动后端服务 (FastAPI)...
start "后端 FastAPI :8000" cmd /k "cd /d %~dp0backend && python main.py"

:: 等待后端启动
echo     等待后端就绪 (5秒)...
timeout /t 5 /nobreak >nul

:: ── 第②步：启动模拟器 ────────────────────────────────
echo [2/3] 启动设备模拟器 (Y4磨压机)...
start "模拟器 Y4设备" cmd /k "cd /d %~dp0simulator && python device_simulator.py"

:: 等待模拟器发送首帧数据
echo     等待数据写入 (3秒)...
timeout /t 3 /nobreak >nul

:: ── 第③步：启动前端 ──────────────────────────────────
echo [3/3] 启动前端看板 (React/Vite)...
start "前端看板 :5173" cmd /k "cd /d %~dp0frontend && npm run dev"

:: 等待 Vite 编译
echo     等待前端编译 (5秒)...
timeout /t 5 /nobreak >nul

:: ── 自动打开浏览器 ────────────────────────────────────
echo.
echo  ✅ 全部启动完成！正在打开浏览器...
echo.
echo  看板地址：http://localhost:5173
echo  API文档：  http://localhost:8000/api/docs
echo.
start "" "http://localhost:5173"

echo  按任意键关闭此窗口（各服务窗口仍在运行）
pause >nul
