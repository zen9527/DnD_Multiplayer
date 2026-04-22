@echo off
REM ============================================================================
REM DnD Multiplayer Server - Start Script (Windows)
REM ============================================================================

echo ========================================
echo   DnD Offline Multiplayer Launcher
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [INFO] Checking for existing server process...
REM Kill any existing server on port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    set PID=%%a
)

if defined PID (
    echo [INFO] Found process %PID% on port 3000, stopping...
    taskkill /F /PID %PID% >nul 2>nul
    timeout /t 2 /nobreak >nul
)

echo.
echo [INFO] Building project...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed! Please check for errors above.
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Build completed successfully!
echo.
echo ========================================
echo   Starting DnD Server...
echo   URL: http://localhost:3000
echo   Press Ctrl+C to stop the server
echo ========================================
echo.

REM Start the server (will run in foreground)
npm start
