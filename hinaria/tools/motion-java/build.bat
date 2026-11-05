@echo off
setlocal
cd /d "%~dp0"
set "HINARIA_JAVAC=javac"
set "HINARIA_JAR=jar"
set "HINARIA_JAVA=java"
if not "%HINARIA_JDK%"=="" (
  set "HINARIA_JAVAC=%HINARIA_JDK%\bin\javac.exe"
  set "HINARIA_JAR=%HINARIA_JDK%\bin\jar.exe"
  set "HINARIA_JAVA=%HINARIA_JDK%\bin\java.exe"
)
if not exist build\classes mkdir build\classes
"%HINARIA_JAVAC%" --release 17 -encoding UTF-8 -d build\classes src\HinariaAnimator.java
if errorlevel 1 exit /b 1
"%HINARIA_JAR%" --create --file HinariaMotion.jar --main-class HinariaAnimator -C build\classes . -C assets hinaria-rigs.json.gz
if errorlevel 1 exit /b 1
"%HINARIA_JAVA%" -jar HinariaMotion.jar --out output %*
if errorlevel 1 exit /b 1
endlocal
