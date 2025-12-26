#!/bin/bash
# Production Deployment Verification Script
# Run this after deploying to Render

BACKEND_URL="https://automatic-poll-generation-backend.onrender.com"

echo "🚀 Testing Production Deployment"
echo "================================="
echo ""

# Test 1: Health Check
echo "1️⃣  Testing Health Endpoint..."
HEALTH=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/")
HTTP_CODE=$(echo "$HEALTH" | tail -n 1)
RESPONSE=$(echo "$HEALTH" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Health check passed"
    echo "   Response: $RESPONSE"
else
    echo "❌ Health check failed (HTTP $HTTP_CODE)"
    echo "   Response: $RESPONSE"
fi
echo ""

# Test 2: AI Providers Status
echo "2️⃣  Testing AI Providers Endpoint..."
PROVIDERS=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/ai-providers/providers")
HTTP_CODE=$(echo "$PROVIDERS" | tail -n 1)
RESPONSE=$(echo "$PROVIDERS" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ AI Providers endpoint working"
    echo "   Response: $RESPONSE" | head -c 200
else
    echo "❌ AI Providers endpoint failed (HTTP $HTTP_CODE)"
    echo "   Response: $RESPONSE"
fi
echo ""

# Test 3: Test Gemini Provider
echo "3️⃣  Testing Gemini Provider..."
GEMINI_TEST=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/api/ai-providers/test/gemini" \
  -H "Content-Type: application/json" \
  -d '{"testText": "Machine learning is a subset of artificial intelligence"}')
HTTP_CODE=$(echo "$GEMINI_TEST" | tail -n 1)
RESPONSE=$(echo "$GEMINI_TEST" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Gemini test passed"
    echo "   Response: $RESPONSE" | head -c 200
else
    echo "❌ Gemini test failed (HTTP $HTTP_CODE)"
    echo "   Response: $RESPONSE"
fi
echo ""

# Test 4: Test RAG Segment Generation (NEW FEATURE)
echo "4️⃣  Testing RAG Segment Question Generation (NEW)..."
RAG_TEST=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/api/rag-questions/segment/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "transcriptText": "Machine learning algorithms learn from data without being explicitly programmed",
    "transcriptId": "test-transcript-123",
    "segmentId": "test-segment-1",
    "sessionId": "test-session-1",
    "roomId": "test-room-1",
    "hostId": "test-host-1",
    "questionCount": 2
  }')
HTTP_CODE=$(echo "$RAG_TEST" | tail -n 1)
RESPONSE=$(echo "$RAG_TEST" | head -n -1)

if [ "$HTTP_CODE" = "202" ] || [ "$HTTP_CODE" = "200" ]; then
    echo "✅ RAG generation endpoint working (Accepted for processing)"
    echo "   Response: $RESPONSE" | head -c 200
else
    echo "⚠️  RAG generation may have issues (HTTP $HTTP_CODE)"
    echo "   Response: $RESPONSE"
fi
echo ""

# Test 5: Test Ollama (Expected to fail on Render)
echo "5️⃣  Testing Ollama Questions (Expected to fail on cloud)..."
OLLAMA_TEST=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/api/ollama-questions/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "transcriptId": "test-transcript-123",
    "sessionId": "test-session-1",
    "roomId": "test-room-1",
    "hostId": "test-host-1",
    "questionCount": 2
  }')
HTTP_CODE=$(echo "$OLLAMA_TEST" | tail -n 1)
RESPONSE=$(echo "$OLLAMA_TEST" | head -n -1)

if [ "$HTTP_CODE" = "202" ]; then
    echo "⚠️  Ollama accepted (might fail later - this is OK)"
    echo "   Response: $RESPONSE" | head -c 200
else
    echo "⚠️  Ollama failed as expected (HTTP $HTTP_CODE) - App will use Gemini fallback"
    echo "   This is NORMAL on cloud deployment"
fi
echo ""

# Summary
echo "================================="
echo "📊 DEPLOYMENT TEST SUMMARY"
echo "================================="
echo ""
echo "✅ = Working correctly"
echo "⚠️  = Warning (may be expected)"
echo "❌ = Critical failure"
echo ""
echo "If you see ✅ for tests 1-4, your deployment is READY!"
echo "Ollama failures are EXPECTED on Render - app uses Gemini as fallback"
echo ""
