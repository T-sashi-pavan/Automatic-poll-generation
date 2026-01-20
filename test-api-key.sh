#!/bin/bash
# Direct Gemini API Key Test using cURL

# Get API key from environment variable or prompt user
if [ -z "$GEMINI_API_KEY" ]; then
  echo "⚠️  GEMINI_API_KEY environment variable not set"
  echo "Please set it: export GEMINI_API_KEY=your_key_here"
  exit 1
fi

API_KEY="$GEMINI_API_KEY"

echo "🔑 Testing Gemini API Key"
echo "========================="
echo ""
echo "API Key: ${API_KEY:0:20}...${API_KEY: -10}"
echo ""

# Test 1: Simple text generation
echo "📝 Test 1: Basic Text Generation"
echo "--------------------------------"

RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{
        "text": "Say hello in one sentence."
      }]
    }]
  }' \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=$API_KEY")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ API Key is VALID and WORKING!"
  echo ""
  echo "Response:"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo ""
else
  echo "❌ API Key FAILED!"
  echo ""
  echo "Error Response:"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo ""
  
  # Check for common errors
  if echo "$BODY" | grep -q "API_KEY_INVALID"; then
    echo "⚠️  Error: API Key is INVALID"
    echo "   - Check if the key is correct"
    echo "   - Verify the key is enabled in Google Cloud Console"
  elif echo "$BODY" | grep -q "PERMISSION_DENIED"; then
    echo "⚠️  Error: PERMISSION DENIED"
    echo "   - Gemini API may not be enabled for this key"
    echo "   - Check Google Cloud Console API settings"
  elif echo "$BODY" | grep -q "QUOTA_EXCEEDED"; then
    echo "⚠️  Error: QUOTA EXCEEDED"
    echo "   - You've hit the API rate limit or quota"
    echo "   - Wait a bit or upgrade your plan"
  fi
  exit 1
fi

# Test 2: Question generation capability
echo ""
echo "📚 Test 2: Question Generation (Educational Use Case)"
echo "----------------------------------------------------"

QUESTION_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{
        "text": "Generate 2 multiple choice questions about machine learning. Return ONLY valid JSON in this format:\n{\n  \"questions\": [\n    {\n      \"question\": \"Question text?\",\n      \"options\": [\"A\", \"B\", \"C\", \"D\"],\n      \"correctAnswer\": \"B\",\n      \"explanation\": \"Why B is correct\"\n    }\n  ]\n}"
      }]
    }]
  }' \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=$API_KEY")

HTTP_CODE2=$(echo "$QUESTION_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY2=$(echo "$QUESTION_RESPONSE" | sed '/HTTP_CODE/d')

echo "HTTP Status: $HTTP_CODE2"
echo ""

if [ "$HTTP_CODE2" = "200" ]; then
  echo "✅ Question Generation WORKS!"
  echo ""
  echo "Sample Response (first 500 chars):"
  echo "$BODY2" | head -c 500
  echo ""
  echo "..."
  echo ""
else
  echo "❌ Question Generation FAILED!"
  echo ""
  echo "$BODY2" | python3 -m json.tool 2>/dev/null || echo "$BODY2" | jq '.' 2>/dev/null || echo "$BODY2"
  echo ""
fi

# Test 3: Check available models
echo ""
echo "🤖 Test 3: Available Models"
echo "---------------------------"

MODELS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  "https://generativelanguage.googleapis.com/v1beta/models?key=$API_KEY")

HTTP_CODE3=$(echo "$MODELS_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY3=$(echo "$MODELS_RESPONSE" | sed '/HTTP_CODE/d')

echo "HTTP Status: $HTTP_CODE3"
echo ""

if [ "$HTTP_CODE3" = "200" ]; then
  echo "✅ Can access model list"
  echo ""
  echo "Available models:"
  echo "$BODY3" | grep -o '"name":"models/[^"]*"' | cut -d'"' -f4 | head -10
  echo ""
else
  echo "❌ Cannot access model list"
fi

# Summary
echo ""
echo "=========================================="
echo "📊 TEST SUMMARY"
echo "=========================================="
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ API Key Status: VALID & WORKING"
  echo "✅ Basic Generation: SUCCESS"
  
  if [ "$HTTP_CODE2" = "200" ]; then
    echo "✅ Question Generation: SUCCESS"
  else
    echo "⚠️  Question Generation: FAILED (but key is valid)"
  fi
  
  if [ "$HTTP_CODE3" = "200" ]; then
    echo "✅ Model Access: SUCCESS"
  fi
  
  echo ""
  echo "🎉 Your Gemini API key is WORKING CORRECTLY!"
  echo ""
  echo "Next steps:"
  echo "  1. Add this key to apps/backend/.env"
  echo "  2. Start your backend: cd apps/backend && npm run dev"
  echo "  3. Test question generation: node test-gemini-quality.js"
  echo ""
else
  echo "❌ API Key Status: INVALID or NOT WORKING"
  echo ""
  echo "Please check:"
  echo "  1. API key is correct (no typos)"
  echo "  2. Gemini API is enabled in Google Cloud Console"
  echo "  3. API key has proper permissions"
  echo "  4. No quota/billing issues"
  echo ""
fi

echo "=========================================="
