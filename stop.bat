@echo off
REM ============================================================================
REM DnD Multiplayer Server - Stop Script (Windows)
REM ============================================================================

echo ========================================
REM   DnD Offline Multiplayer - Stop Server
echo ========================================
echo.

echo [INFO] Looking for server process on port 3000...

REM Find PID using port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    set PID=%%a
)

if not defined PID (
    echo [INFO] No server process found on port 3000.
    pause
    exit /b 0
)

echo [INFO] Found server process: %PID%
echo.
set /p confirm="Are you sure you want to stop the server? (y/n): "

if /i not "%confirm%"=="y" (
    echo [INFO] Cancelled.
    pause
    exit /b 0
)

echo [INFO] Stopping server...
taskkill /F /PID %PID% >nul 2>nul

if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Server stopped successfully.
) else (
    echo [WARNING] Failed to stop process %PID%. It may have already exited.
)

echo.
pause
