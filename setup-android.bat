@echo off
setlocal
cd /d "%~dp0"

echo === Clocktower Solver Android setup ===
echo.

where npm >nul 2>&1
if errorlevel 1 (
  echo ERROR: npm was not found. Install Node.js first.
  pause
  exit /b 1
)

echo Installing Capacitor packages...
call npm install @capacitor/core @capacitor/cli @capacitor/android
if errorlevel 1 goto :fail

echo.
echo Building the web app...
call npm run build
if errorlevel 1 goto :fail

if not exist capacitor.config.ts (
  echo ERROR: capacitor.config.ts is missing from the project root.
  pause
  exit /b 1
)

if not exist android\gradlew.bat (
  echo.
  echo Creating the Android project...
  call npx cap add android
  if errorlevel 1 goto :fail
) else (
  echo Android project already exists; skipping cap add.
)

echo.
echo Syncing the current web build into Android...
call npx cap sync android
if errorlevel 1 goto :fail

echo.
echo Setup complete.
echo Next: install/open Android Studio, then run:
echo   npx cap open android
pause
exit /b 0

:fail
echo.
echo Setup failed. Copy the error text and send it to ChatGPT.
pause
exit /b 1
