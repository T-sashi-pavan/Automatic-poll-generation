#!/bin/bash
# Quick Start Script for Testing

echo "🚀 Starting PollGen Application for Testing"
echo "==========================================="
echo ""

# Check if in correct directory
if [ ! -f "package.json" ]; then
  echo "❌ Please run this script from the project root directory"
  exit 1
fi

# Function to check if port is in use
check_port() {
  netstat -ano | grep ":$1" | grep "LISTENING" > /dev/null 2>&1
  return $?
}

# Kill existing processes on ports
echo "🧹 Cleaning up existing processes..."
if check_port 8000; then
  echo "  Killing process on port 8000..."
  taskkill //F //PID $(netstat -ano | grep ":8000" | grep "LISTENING" | awk '{print $5}' | head -1) 2>/dev/null || true
fi

if check_port 5174; then
  echo "  Killing process on port 5174..."
  taskkill //F //PID $(netstat -ano | grep ":5174" | grep "LISTENING" | awk '{print $5}' | head -1) 2>/dev/null || true
fi

sleep 2

# Start backend
echo ""
echo "📦 Starting Backend (Port 8000)..."
cd apps/backend
start cmd //c "npm run dev"
cd ../..

sleep 5

# Start frontend
echo "🎨 Starting Frontend (Port 5174)..."
cd apps/frontend
start cmd //c "npm run dev"
cd ../..

echo ""
echo "⏳ Waiting for services to start..."
sleep 10

echo ""
echo "✅ Application Started!"
echo ""
echo "📝 Access Points:"
echo "  Frontend: http://localhost:5174"
echo "  Backend:  http://localhost:8000"
echo ""
echo "🧪 Run Tests:"
echo "  node test-gemini-quality.js"
echo "  node test-timer-fix.js"
echo "  bash test-gemini-curl.sh"
echo ""
echo "📊 Check Backend Logs in the new terminal window"
echo ""
