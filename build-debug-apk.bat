@echo off
setlocal
cd /d "%~dp0"

echo === Building Clocktower Solver debug APK ===
echo.

if not exist android\gradlew.bat (
  echo ERROR: Android project not found.
  echo Run setup-android.bat first.
  pause
  exit /b 1
)

call npm run build
if errorlevel 1 goto :fail

call npx cap sync android
if errorlevel 1 goto :fail

cd android
call gradlew.bat assembleDebug
if errorlevel 1 goto :fail
cd ..

if not exist android\app\build\outputs\apk\debug\app-debug.apk (
  echo ERROR: Gradle finished but the APK could not be found.
  pause
  exit /b 1
)

copy /y android\app\build\outputs\apk\debug\app-debug.apk ClocktowerSolver-debug.apk >nul

echo.
echo SUCCESS
 echo APK created at:
 echo   %CD%\ClocktowerSolver-debug.apk
 echo.
echo Copy that APK to your Android phone and open it to install.
pause
exit /b 0

:fail
cd /d "%~dp0"
echo.
echo APK build failed. Copy the error text and send it to ChatGPT.
pause
exit /b 1
