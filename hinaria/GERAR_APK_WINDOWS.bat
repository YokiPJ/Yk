@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo HINARIA V7 - GERADOR DE APK DEBUG
echo ========================================
where node >nul 2>nul || (echo ERRO: instale Node.js LTS. & pause & exit /b 1)
where java >nul 2>nul || (echo ERRO: instale JDK 21 via Android Studio. & pause & exit /b 1)
call npm install || goto :erro
call npm run build:web || goto :erro
if not exist android\gradlew.bat (
  call npx cap add android || goto :erro
)
call npx cap sync android || goto :erro
call node tools\assemble-debug.mjs || goto :erro
echo.
echo APK GERADO: APK_GERADO\HINARIA_V7_DEBUG.apk
echo Pronto para instalar no celular Android como app de testes.
pause
exit /b 0
:erro
echo Falhou. Confirme Android Studio, SDK Android e JDK 21 instalados.
pause
exit /b 1
