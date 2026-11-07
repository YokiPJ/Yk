@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instale Node.js 22 ou superior e execute novamente.
  pause
  exit /b 1
)
node hinaria\tools\runtime-dependencies.mjs --quiet
if errorlevel 1 (
  call npm run setup
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
node hinaria\tools\runtime-dependencies.mjs
if errorlevel 1 (
  pause
  exit /b 1
)
node hinaria\server.js --open
if errorlevel 1 pause
