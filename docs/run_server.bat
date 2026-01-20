@echo off
title CharX Generator Web Server
echo ========================================
echo   CharX Generator - Local Server
echo ========================================
echo.
echo 서버 시작 중...
echo.
echo 종료하려면 Ctrl+C 를 누르세요
echo ========================================
echo.

cd /d "%~dp0"

:: 브라우저 자동 실행 (1초 후)
start "" "http://localhost:8080"

:: 서버 시작
python -m http.server 8080
pause
