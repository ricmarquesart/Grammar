@echo off
setlocal EnableDelayedExpansion

set "LOGDIR=%CD%\logs"
if not exist "%LOGDIR%" mkdir "%LOGDIR%"
set "APP_LOG=%LOGDIR%\app.log"
set "APP_ERR=%LOGDIR%\app-error.log"

call :log "=============================================="
call :log "OPEN_APP start"
call :log "=============================================="

echo [INFO] App logs:
echo        %APP_LOG%
echo        %APP_ERR%

echo Starting CELPIP Grammar Study...

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed.
  echo Install Node.js from https://nodejs.org/ and run FIRST_SETUP.bat.
  call :log "[ERROR] Node.js not found"
  pause
  exit /b 1
)

if not exist ".env" (
  echo [ERROR] .env not found.
  echo Please run FIRST_SETUP.bat first.
  call :log "[ERROR] .env missing"
  pause
  exit /b 1
)

if exist ".app.pid" (
  for /f %%i in (.app.pid) do set OLDPID=%%i
  tasklist /FI "PID eq !OLDPID!" | find "!OLDPID!" >nul 2>&1
  if not errorlevel 1 (
    echo App already appears to be running.
    call :log "[INFO] app already running PID=!OLDPID!"
    start "" "http://localhost:3000"
    exit /b 0
  )
)

for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
  echo [WARN] Port 3000 already in use (PID %%p).
  echo [WARN] Run CLOSE_APP.bat first or close that process.
  call :log "[WARN] port 3000 already in use by PID %%p"
)

call :log "[INFO] Launching npm run dev"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
"$wd=(Resolve-Path '.').Path; $out=Join-Path $wd 'logs\app.log'; $err=Join-Path $wd 'logs\app-error.log'; $p=Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','npm run dev' -WorkingDirectory $wd -WindowStyle Minimized -PassThru -RedirectStandardOutput $out -RedirectStandardError $err; Set-Content -Path (Join-Path $wd '.app.pid') -Value $p.Id"

if errorlevel 1 (
  echo [ERROR] Could not start app process.
  echo [ERROR] Check: %APP_ERR%
  call :log "[ERROR] Start-Process failed"
  pause
  exit /b 1
)

call :log "[OK] app process launched"
timeout /t 3 /nobreak >nul
start "" "http://localhost:3000"

echo [OK] App started.
echo If browser is blank, run DOCTOR.bat and check logs.
exit /b 0

:log
echo [%date% %time%] %~1>> "%APP_LOG%"
exit /b 0
