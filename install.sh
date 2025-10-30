#!/bin/bash

# LOL Voice Chat - Installation Script
# =====================================

echo "🎮 LOL VOICE CHAT - INSTALLATION"
echo "=================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "   Please install Node.js from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Install Electron app dependencies
echo "📦 Installing Electron app dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install Electron dependencies"
    exit 1
fi

echo "✅ Electron dependencies installed"
echo ""

# Install server dependencies
echo "📦 Installing backend server dependencies..."
cd server
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install server dependencies"
    exit 1
fi

cd ..
echo "✅ Server dependencies installed"
echo ""

# Check if .env file exists
if [ ! -f "server/.env" ]; then
    echo "⚠️  WARNING: server/.env file not found!"
    echo "   Your API keys should already be configured in .env"
    echo "   If not, copy server/.env.example to server/.env and add your keys"
    echo ""
else
    echo "✅ Configuration file found (server/.env)"
    echo ""
fi

echo "✅ INSTALLATION COMPLETE!"
echo ""
echo "🚀 To start the application:"
echo ""
echo "   Terminal 1 (Backend):"
echo "   $ cd server && npm start"
echo ""
echo "   Terminal 2 (App):"
echo "   $ npm start"
echo ""
echo "📚 Read YOUR_SETUP_GUIDE.md for detailed instructions"
echo ""
