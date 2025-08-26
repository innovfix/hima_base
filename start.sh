#!/bin/bash

echo "🚀 Starting Analytics Dashboard Demo..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm run install:all

echo ""
echo "🔧 Setup complete! Now you can:"
echo ""
echo "1. Create a MySQL database named 'analytics_demo'"
echo "2. Copy backend/env.example to backend/.env and update database credentials"
echo "3. Run: npm run dev"
echo ""
echo "🌐 Frontend will be available at: http://localhost:3000"
echo "🔌 Backend will be available at: http://localhost:3001"
echo ""
echo "🔑 Demo credentials are shown on the login page"
