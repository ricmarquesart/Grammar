@echo off
setlocal EnableDelayedExpansion

set "LOGDIR=%CD%\logs"
if not exist "%LOGDIR%" mkdir "%LOGDIR%"
set "APP_LOG=%LOGDIR%\app.log"
set "APP_ERR=%LOGDIR%\app-error.log"

call :log "CLOSE_APP start"

echo Closing CELPIP Grammar Study...

set CLOSED=0
if exist ".app.pid" (
  for /f %%i in (.app.pid) do set PID=%%i
  taskkill /PID !PID! /T /F >> "%APP_LOG%" 2>> "%APP_ERR%"
  if not errorlevel 1 (
    set CLOSED=1
    del /Q .app.pid >nul 2>&1
    echo [OK] App process stopped.
    call :log "[OK] stopped via PID !PID!"
  )
)

if "!CLOSED!"=="0" (
  for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /PID %%p /T /F >> "%APP_LOG%" 2>> "%APP_ERR%"
    if not errorlevel 1 (
      set CLOSED=1
      call :log "[OK] stopped fallback PID %%p"
    )
  )
)

if "!CLOSED!"=="1" (
  echo Done.
) else (
  echo App was not running (or could not be found).
  call :log "[INFO] app not running"
)

exit /b 0

:log
echo [%date% %time%] %~1>> "%APP_LOG%"
exit /b 0
