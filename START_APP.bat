@echo off
setlocal

echo ==============================================
echo   CELPIP Grammar Study - Start App
echo ==============================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed.
  echo Please install Node.js LTS from: https://nodejs.org/
  echo.
  pause
  exit /b 1
)

if not exist ".env" (
  echo [ERROR] .env file not found.
  echo Please run FIRST_SETUP.bat first.
  echo.
  pause
  exit /b 1
)

echo Opening browser at http://localhost:3000 ...
start "" "http://localhost:3000"

echo Starting app...
echo Keep this window open while using the app.
echo To stop the app: press Ctrl + C in this window.
call npm run dev

endlocal
