@echo off
setlocal EnableDelayedExpansion

set "LOGDIR=%CD%\logs"
if not exist "%LOGDIR%" mkdir "%LOGDIR%"
set "DOC_LOG=%LOGDIR%\doctor.log"
set "DOC_ERR=%LOGDIR%\doctor-error.log"

call :log "=============================================="
call :log "DOCTOR diagnostics start"
call :log "=============================================="

echo Running diagnostics...
echo Logs:
echo   %DOC_LOG%
echo   %DOC_ERR%

call :check "Node.js installed" "where node"
call :check "npm installed" "where npm"
call :run "Node.js version" "node -v"
call :run "npm version" "npm -v"

if exist "node_modules" (
  call :pass "node_modules exists"
) else (
  call :fail "node_modules missing (run FIRST_SETUP.bat)"
)

if exist ".env" (
  call :pass ".env exists"
) else (
  call :fail ".env missing (run FIRST_SETUP.bat)"
)

call :run "Prisma generate" "npx prisma generate"
call :run "Prisma validate" "npx prisma validate"

if exist "prisma\dev.db" (
  call :pass "Database file exists: prisma\\dev.db"
) else (
  call :fail "Database file not found (migration may have failed)"
)

call :run "List npm scripts" "node -e \"const p=require('./package.json');console.log(Object.keys(p.scripts||{}).join(', '))\""

for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
  call :fail "Port 3000 already in use by PID %%p"
  goto :afterport
)
call :pass "Port 3000 is free"
:afterport

call :log "Attempting short startup check (10s)"
start "doctor-app-check" /min cmd /c "npm run dev >> \"%DOC_LOG%\" 2>> \"%DOC_ERR%\""
timeout /t 10 /nobreak >nul
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
  call :pass "App started and is listening on port 3000 (PID %%p)"
  taskkill /PID %%p /T /F >nul 2>&1
  goto :done
)
call :fail "App did not start listening on port 3000 within 10 seconds"

:done
echo.
echo Diagnostics complete. Check:
echo   %DOC_LOG%
echo   %DOC_ERR%
exit /b 0

:check
%~2 >nul 2>&1
if errorlevel 1 (
  call :fail "%~1"
) else (
  call :pass "%~1"
)
exit /b 0

:run
call :log "RUN: %~1"
call :log "CMD: %~2"
%~2 >> "%DOC_LOG%" 2>> "%DOC_ERR%"
if errorlevel 1 (
  call :fail "%~1"
) else (
  call :pass "%~1"
)
exit /b 0

:pass
echo [PASS] %~1
call :log "[PASS] %~1"
exit /b 0

:fail
echo [FAIL] %~1
call :log "[FAIL] %~1"
exit /b 0

:log
echo [%date% %time%] %~1>> "%DOC_LOG%"
exit /b 0
