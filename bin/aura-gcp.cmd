@echo off
REM ==============================================================================
REM Aura GCP Local Cloud Runtime Launcher (Windows)
REM ==============================================================================
setlocal
set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."
set "AURAC=%SCRIPT_DIR%aurac.exe"

REM Locate aurac binary
if not exist "%AURAC%" (
  where aurac >nul 2>nul
  if %ERRORLEVEL% equ 0 (
    set "AURAC=aurac"
  ) else (
    echo ❌ Error: 'aurac.exe' compiler binary not found in '%SCRIPT_DIR%' or PATH.
    echo Please install Aura or place aurac.exe in the bin folder.
    exit /b 1
  )
)

REM Verify Node.js runtime availability
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo ❌ Error: Node.js (v18+) is required by the Aura execution runtime.
  echo Please install Node.js from https://nodejs.org/
  exit /b 1
)

cd /d "%ROOT_DIR%"
"%AURAC%" run server.aura %*
