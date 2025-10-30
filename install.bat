@echo off
REM LOL Voice Chat - Installation Script (Windows)
REM ================================================

echo.
echo 🎮 LOL VOICE CHAT - INSTALLATION
echo ==================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed!
    echo    Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

node --version
npm --version
echo.

REM Install Electron app dependencies
echo 📦 Installing Electron app dependencies...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install Electron dependencies
    pause
    exit /b 1
)

echo ✅ Electron dependencies installed
echo.

REM Install server dependencies
echo 📦 Installing backend server dependencies...
cd server
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install server dependencies
    pause
    exit /b 1
)

cd ..
echo ✅ Server dependencies installed
echo.

REM Check if .env file exists
if not exist "server\.env" (
    echo ⚠️  WARNING: server\.env file not found!
    echo    Your API keys should already be configured in .env
    echo    If not, copy server\.env.example to server\.env and add your keys
    echo.
) else (
    echo ✅ Configuration file found (server\.env)
    echo.
)

echo ✅ INSTALLATION COMPLETE!
echo.
echo 🚀 To start the application:
echo.
echo    Terminal 1 (Backend):
echo    cd server
echo    npm start
echo.
echo    Terminal 2 (App):
echo    npm start
echo.
echo 📚 Read YOUR_SETUP_GUIDE.md for detailed instructions
echo.

pause
