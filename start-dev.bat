@echo off
REM Quick Start Script for Windows

echo Starting PollGen Application for Testing
echo ==========================================
echo.

REM Check if in correct directory
if not exist "package.json" (
  echo Error: Please run this script from the project root directory
  exit /b 1
)

REM Kill existing processes on ports
echo Cleaning up existing processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
  echo   Killing process %%a on port 8000...
  taskkill /F /PID %%a 2>nul
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5174" ^| findstr "LISTENING"') do (
  echo   Killing process %%a on port 5174...
  taskkill /F /PID %%a 2>nul
)

timeout /t 2 /nobreak >nul

REM Start backend
echo.
echo Starting Backend (Port 8000)...
start "PollGen Backend" cmd /k "cd apps\backend && npm run dev"

timeout /t 5 /nobreak >nul

REM Start frontend
echo Starting Frontend (Port 5174)...
start "PollGen Frontend" cmd /k "cd apps\frontend && npm run dev"

echo.
echo Waiting for services to start...
timeout /t 10 /nobreak >nul

echo.
echo Application Started!
echo.
echo Access Points:
echo   Frontend: http://localhost:5174
echo   Backend:  http://localhost:8000
echo.
echo Run Tests:
echo   node test-gemini-quality.js
echo   node test-timer-fix.js
echo.
echo Check the new terminal windows for logs
echo.
