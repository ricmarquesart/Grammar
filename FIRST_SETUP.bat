@echo off
setlocal EnableDelayedExpansion

set "LOGDIR=%CD%\logs"
if not exist "%LOGDIR%" mkdir "%LOGDIR%"
set "SETUP_LOG=%LOGDIR%\setup.log"
set "SETUP_ERR=%LOGDIR%\setup-error.log"

call :log "=============================================="
call :log "CELPIP Grammar Study - First Time Setup"
call :log "=============================================="

echo.
echo [INFO] Setup logs:
echo        %SETUP_LOG%
echo        %SETUP_ERR%
echo.

call :log "Step 1/8: Checking Node.js"
where node >> "%SETUP_LOG%" 2>> "%SETUP_ERR%"
if errorlevel 1 (
  call :log "[ERROR] Node.js not found"
  goto :fail
)
node -v >> "%SETUP_LOG%" 2>> "%SETUP_ERR%"

call :log "Step 2/8: Preparing .env file"
if not exist ".env" (
  if exist ".env.example" (
    copy /Y ".env.example" ".env" >nul 2>> "%SETUP_ERR%"
    call :log "[OK] .env created"
  ) else (
    call :log "[ERROR] .env.example not found"
    goto :fail
  )
) else (
  call :log "[OK] .env already exists"
)

call :run "Step 3/8: Installing packages" "npm install" "call npm install"
if errorlevel 1 goto :fail

call :run "Step 4/8: Generating Prisma client" "npx prisma generate" "call npx prisma generate"
if errorlevel 1 goto :fail

call :run "Step 5/8: Validating Prisma schema" "npx prisma validate" "call npx prisma validate"
if errorlevel 1 goto :fail

call :run "Step 6/8: Running database migration" "npx prisma migrate dev --name init" "call npx prisma migrate dev --name init"
if errorlevel 1 goto :fail

call :run "Step 7/8: Seeding database" "npx prisma db seed" "call npx prisma db seed"
if errorlevel 1 goto :fail

call :log "Step 8/8: Creating desktop shortcuts"
call :createShortcut "OPEN_APP.vbs" "CELPIP Grammar Study"
call :createShortcut "CLOSE_APP.bat" "Close CELPIP Grammar Study"
call :createShortcut "DOCTOR.bat" "CELPIP Grammar Doctor"

call :log "Opening app..."
call OPEN_APP.bat >> "%SETUP_LOG%" 2>> "%SETUP_ERR%"

call :log "[SUCCESS] Setup complete"
echo.
echo [SUCCESS] Setup complete.
echo If anything fails later, run DOCTOR.bat
echo and check logs in: %LOGDIR%
exit /b 0

:run
call :log "%~1"
call :log "Command: %~2"
%~3 >> "%SETUP_LOG%" 2>> "%SETUP_ERR%"
if errorlevel 1 (
  call :log "[ERROR] Failed: %~1"
  call :log "[ERROR] Command failed: %~2"
  echo [ERROR] %~1
  echo [ERROR] Command: %~2
  echo [ERROR] Details: %SETUP_ERR%
  exit /b 1
)
call :log "[OK] %~1"
exit /b 0

:createShortcut
set "TARGET=%~1"
set "NAME=%~2"
if not exist "%TARGET%" (
  call :log "[WARN] Could not create shortcut for %TARGET% (file not found)"
  exit /b 0
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
"$desktop=[Environment]::GetFolderPath('Desktop'); $shell=New-Object -ComObject WScript.Shell; $shortcut=$shell.CreateShortcut((Join-Path $desktop '%NAME%.lnk')); $shortcut.TargetPath=(Resolve-Path '%CD%\%TARGET%').Path; $shortcut.WorkingDirectory=(Resolve-Path '%CD%').Path; $shortcut.Save()" >> "%SETUP_LOG%" 2>> "%SETUP_ERR%"

if errorlevel 1 (
  call :log "[WARN] Desktop shortcut creation skipped for %TARGET%"
) else (
  call :log "[OK] Desktop shortcut created: %NAME%"
)
exit /b 0

:log
echo [%date% %time%] %~1>> "%SETUP_LOG%"
exit /b 0

:fail
call :log "[FAIL] Setup failed"
echo.
echo [FAIL] Setup failed.
echo Check detailed logs:
echo   %SETUP_LOG%
echo   %SETUP_ERR%
echo You can also run DOCTOR.bat for guided diagnostics.
pause
exit /b 1
