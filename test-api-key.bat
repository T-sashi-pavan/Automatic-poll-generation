@echo off
REM Direct Gemini API Key Test using cURL (Windows)

REM Get API key from environment variable
if "%GEMINI_API_KEY%"=="" (
  echo ⚠️  GEMINI_API_KEY environment variable not set
  echo Please set it: set GEMINI_API_KEY=your_key_here
  exit /b 1
)

set API_KEY=%GEMINI_API_KEY%

echo Testing Gemini API Key
echo =========================
echo.
echo API Key: %API_KEY:~0,20%...%API_KEY:~-10%
echo.

REM Test 1: Simple text generation
echo Test 1: Basic Text Generation
echo --------------------------------

curl -s -w "HTTP_CODE:%%{http_code}" ^
  -H "Content-Type: application/json" ^
  -d "{\"contents\":[{\"parts\":[{\"text\":\"Say hello in one sentence.\"}]}]}" ^
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=%API_KEY%" > response.tmp

findstr "HTTP_CODE" response.tmp > httpcode.tmp
findstr /V "HTTP_CODE" response.tmp > body.tmp

for /f "tokens=2 delims=:" %%a in (httpcode.tmp) do set HTTP_CODE=%%a

echo HTTP Status: %HTTP_CODE%
echo.

if "%HTTP_CODE%"=="200" (
  echo [32mAPI Key is VALID and WORKING![0m
  echo.
  echo Response:
  type body.tmp
  echo.
  echo.
) else (
  echo [31mAPI Key FAILED![0m
  echo.
  echo Error Response:
  type body.tmp
  echo.
  findstr "API_KEY_INVALID" body.tmp >nul
  if not errorlevel 1 (
    echo Error: API Key is INVALID
    echo   - Check if the key is correct
    echo   - Verify the key is enabled in Google Cloud Console
  )
  del response.tmp httpcode.tmp body.tmp
  exit /b 1
)

REM Test 2: Question generation
echo.
echo Test 2: Question Generation
echo -----------------------------

curl -s -w "HTTP_CODE:%%{http_code}" ^
  -H "Content-Type: application/json" ^
  -d "{\"contents\":[{\"parts\":[{\"text\":\"Generate 2 multiple choice questions about machine learning. Return ONLY valid JSON.\"}]}]}" ^
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=%API_KEY%" > response2.tmp

findstr "HTTP_CODE" response2.tmp > httpcode2.tmp
for /f "tokens=2 delims=:" %%a in (httpcode2.tmp) do set HTTP_CODE2=%%a

echo HTTP Status: %HTTP_CODE2%
echo.

if "%HTTP_CODE2%"=="200" (
  echo [32mQuestion Generation WORKS![0m
  echo.
) else (
  echo [31mQuestion Generation FAILED![0m
)

REM Summary
echo.
echo ==========================================
echo TEST SUMMARY
echo ==========================================
echo.

if "%HTTP_CODE%"=="200" (
  echo [32mAPI Key Status: VALID ^& WORKING[0m
  echo [32mBasic Generation: SUCCESS[0m
  
  if "%HTTP_CODE2%"=="200" (
    echo [32mQuestion Generation: SUCCESS[0m
  )
  
  echo.
  echo Your Gemini API key is WORKING CORRECTLY!
  echo.
  echo Next steps:
  echo   1. Add this key to apps\backend\.env
  echo   2. Start your backend: cd apps\backend ^&^& npm run dev
  echo   3. Test question generation: node test-gemini-quality.js
  echo.
) else (
  echo [31mAPI Key Status: INVALID or NOT WORKING[0m
  echo.
  echo Please check:
  echo   1. API key is correct
  echo   2. Gemini API is enabled in Google Cloud Console
  echo   3. API key has proper permissions
  echo.
)

echo ==========================================

REM Cleanup
del response.tmp httpcode.tmp body.tmp response2.tmp httpcode2.tmp 2>nul

pause
