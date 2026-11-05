@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao foi encontrado. Instale o Node.js e tente novamente.
  pause
  exit /b 1
)
echo.
echo ====== HINARIA V7 PREVIA ======
echo Abra http://localhost:8080 no navegador.
echo Aperte Ctrl+C para encerrar o servidor.
echo.
node server.js
pause
