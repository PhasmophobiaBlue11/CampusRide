@echo off
title CampusRide Server
cd /d "%~dp0"
echo =========================================================
echo   CAMPUSRIDE — SECURE CAMPUS TRANSPORT MANAGEMENT SYSTEM
echo =========================================================
echo.
echo Local URL:    http://localhost:8000
echo Master Admin: adphasmo@gmail.com / Parth@123
echo.
echo Starting CampusRide backend...
echo.

:: Try agy-node first, then node, then python
where agy-node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [OK] Using Antigravity Node.js runtime...
    start http://localhost:8000
    agy-node server.js
    goto :end
)

where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [OK] Using Node.js runtime...
    start http://localhost:8000
    node server.js
    goto :end
)

if exist "C:\Users\DELL\AppData\Roaming\Antigravity\bin\agy-node.cmd" (
    echo [OK] Using Antigravity Node.js at AppData...
    start http://localhost:8000
    "C:\Users\DELL\AppData\Roaming\Antigravity\bin\agy-node.cmd" server.js
    goto :end
)

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [OK] Using Python runtime...
    start http://localhost:8000
    python server.py
    goto :end
)

if exist "C:\Users\DELL\AppData\Local\Programs\Python\Python314-32\python.exe" (
    echo [OK] Using Python 3.14...
    start http://localhost:8000
    "C:\Users\DELL\AppData\Local\Programs\Python\Python314-32\python.exe" server.py
    goto :end
)

echo [ERROR] Neither Node.js nor Python runtime could be found.
pause

:end
