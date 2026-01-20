#!/bin/bash
# cURL Test Script for Gemini API Key Quality
# Tests both segment-based and timer-based question generation

echo "🔑 Testing Gemini API Key Quality"
echo "=================================="
echo ""

BASE_URL="${BACKEND_URL:-http://localhost:8000}"
echo "Backend URL: $BASE_URL"
echo ""

# Test transcript
TEST_TRANSCRIPT="Machine learning algorithms use gradient descent for optimization. The learning rate parameter controls the step size during parameter updates. A learning rate that is too large can cause the algorithm to diverge and fail to converge. Conversely, a learning rate that is too small will make training extremely slow. Adaptive learning rate methods like Adam and RMSprop automatically adjust the learning rate during training. These methods help achieve faster convergence while maintaining stability."

SEGMENT_TRANSCRIPT="Neural networks consist of interconnected layers of neurons. Each neuron performs a weighted sum of its inputs followed by an activation function. Common activation functions include ReLU, sigmoid, and tanh. The backpropagation algorithm is used to compute gradients and update weights."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 TEST 1: SEGMENT-BASED QUESTION GENERATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Save segment
echo "Saving segment..."
SEGMENT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/segments/save" \
  -H "Content-Type: application/json" \
  -d "{
    \"meetingId\": \"507f1f77bcf86cd799439011\",
    \"hostmail\": \"test@example.com\",
    \"transcriptText\": \"$SEGMENT_TRANSCRIPT\",
    \"roomId\": \"test-room-curl\"
  }")

SEGMENT_ID=$(echo $SEGMENT_RESPONSE | grep -o '"segmentId":"[^"]*' | cut -d'"' -f4)

if [ -z "$SEGMENT_ID" ]; then
  echo -e "${RED}❌ Failed to save segment${NC}"
  echo "Response: $SEGMENT_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Segment saved: $SEGMENT_ID${NC}"
echo ""

# Wait for auto-generation
echo "Waiting 8 seconds for question generation..."
sleep 8
echo ""

# Fetch generated questions
MEETING_ID="507f1f77bcf86cd799439011"
echo "Fetching generated questions..."
QUESTIONS_RESPONSE=$(curl -s "$BASE_URL/api/questions/list/$MEETING_ID")

echo "$QUESTIONS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$QUESTIONS_RESPONSE" | jq '.' 2>/dev/null || echo "$QUESTIONS_RESPONSE"

QUESTION_COUNT=$(echo "$QUESTIONS_RESPONSE" | grep -o '"questionText"' | wc -l)
echo ""
echo -e "${BLUE}📊 Segment Questions Generated: $QUESTION_COUNT${NC}"
echo ""

# Extract first question as sample
FIRST_QUESTION=$(echo "$QUESTIONS_RESPONSE" | grep -A 5 '"questionText"' | head -6)
echo -e "${YELLOW}📝 Sample Segment Question:${NC}"
echo "$FIRST_QUESTION"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏱️  TEST 2: TIMER-BASED QUESTION GENERATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Save timer transcript
SESSION_ID="test-session-$(date +%s)"
echo "Saving timer transcript..."
TIMER_SAVE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/timer-transcripts/save" \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"hostId\": \"507f1f77bcf86cd799439011\",
    \"roomId\": \"test-room-curl\",
    \"startTime\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"endTime\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"durationSelected\": 300000,
    \"combinedTranscript\": \"$TEST_TRANSCRIPT\",
    \"status\": \"completed\",
    \"segmentCount\": 2
  }")

TIMER_ID=$(echo $TIMER_SAVE_RESPONSE | grep -o '"_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$TIMER_ID" ]; then
  echo -e "${RED}❌ Failed to save timer transcript${NC}"
  echo "Response: $TIMER_SAVE_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Timer transcript saved: $TIMER_ID${NC}"
echo ""

# Generate timer questions
echo "Generating timer questions with Gemini..."
TIMER_GEN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/timer-transcripts/generate-questions" \
  -H "Content-Type: application/json" \
  -d "{
    \"timerTranscriptId\": \"$TIMER_ID\",
    \"aiProvider\": \"gemini\",
    \"questionCount\": 5
  }")

echo "$TIMER_GEN_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$TIMER_GEN_RESPONSE" | jq '.' 2>/dev/null || echo "$TIMER_GEN_RESPONSE"

TIMER_QUESTION_COUNT=$(echo "$TIMER_GEN_RESPONSE" | grep -o '"question"' | wc -l)
echo ""
echo -e "${BLUE}📊 Timer Questions Generated: $TIMER_QUESTION_COUNT${NC}"
echo ""

# Extract provider info
PROVIDER=$(echo "$TIMER_GEN_RESPONSE" | grep -o '"aiProvider":"[^"]*' | cut -d'"' -f4)
FALLBACK=$(echo "$TIMER_GEN_RESPONSE" | grep -o '"fallbackUsed":[^,}]*' | cut -d':' -f2)
echo -e "${YELLOW}🤖 Provider Used: $PROVIDER${NC}"
echo -e "${YELLOW}🔄 Fallback Used: $FALLBACK${NC}"
echo ""

# Extract first question as sample
TIMER_FIRST_Q=$(echo "$TIMER_GEN_RESPONSE" | grep -A 5 '"question"' | head -6)
echo -e "${YELLOW}📝 Sample Timer Question:${NC}"
echo "$TIMER_FIRST_Q"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 QUALITY ANALYSIS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Segment Questions: $QUESTION_COUNT"
echo "Timer Questions: $TIMER_QUESTION_COUNT"
echo ""

if [ $QUESTION_COUNT -gt 0 ] && [ $TIMER_QUESTION_COUNT -gt 0 ]; then
  echo -e "${GREEN}✅ Both segment and timer generation working!${NC}"
  echo ""
  echo "Quality Indicators to Check:"
  echo "  ✓ Questions test understanding, not recall"
  echo "  ✓ Options require discrimination"
  echo "  ✓ Explanations are detailed"
  echo "  ✓ Questions are analytical"
  echo ""
else
  echo -e "${RED}❌ Some generation failed${NC}"
  echo "Check backend logs for errors"
  echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ cURL Test Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Next Steps:"
echo "1. Review the sample questions above"
echo "2. Check if they test understanding (not recall)"
echo "3. Verify explanations are detailed"
echo "4. Compare segment vs timer quality"
echo ""

echo "For detailed quality analysis, run:"
echo "  node test-gemini-quality.js"
echo ""
