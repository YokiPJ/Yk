@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instale Node.js 22 ou superior e execute novamente.
  pause
  exit /b 1
)
if not exist hinaria\node_modules (
  call npm run setup
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
start "" "http://localhost:8080/studio/"
call npm start
if errorlevel 1 pause
