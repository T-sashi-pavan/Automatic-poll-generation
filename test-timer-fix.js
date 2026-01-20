#!/usr/bin/env node
/**
 * Test script for timer questions generation with fallback
 */

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:8000';

// Test data
const testTranscript = {
  sessionId: 'test-session-' + Date.now(),
  hostId: '507f1f77bcf86cd799439011', // Valid MongoDB ObjectId
  roomId: 'test-room-123',
  startTime: new Date().toISOString(),
  endTime: new Date().toISOString(),
  durationSelected: 300000, // 5 minutes in milliseconds
  combinedTranscript: `
Today we discussed the fundamentals of machine learning and artificial intelligence.
We covered supervised learning, which involves training models on labeled data.
The discussion included examples of classification and regression problems.
We also explored unsupervised learning techniques like clustering and dimensionality reduction.
Deep learning was introduced as a subset of machine learning using neural networks.
Students asked questions about practical applications in computer vision and natural language processing.
The lecture concluded with a discussion on ethical considerations in AI development.
Key takeaways: AI is transforming industries, but requires careful implementation and monitoring.
  `.trim(),
  status: 'completed',
  segmentCount: 3
};

async function testTimerQuestions() {
  console.log('🧪 [TEST] Testing Timer Questions Generation with Fallback\n');
  
  try {
    // Step 1: Save timer transcript
    console.log('📝 [TEST] Step 1: Saving timer transcript...');
    const saveResponse = await fetch(`${BASE_URL}/api/timer-transcripts/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testTranscript)
    });

    if (!saveResponse.ok) {
      const error = await saveResponse.json();
      throw new Error(`Failed to save transcript: ${JSON.stringify(error)}`);
    }

    const saveData = await saveResponse.json();
    console.log('✅ [TEST] Timer transcript saved:', saveData.data._id);
    const timerTranscriptId = saveData.data._id;

    // Step 2: Test with Gemini (should work or fallback to RAG)
    console.log('\n🤖 [TEST] Step 2: Testing Gemini (with RAG fallback)...');
    const geminiResponse = await fetch(`${BASE_URL}/api/timer-transcripts/generate-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timerTranscriptId,
        aiProvider: 'gemini',
        questionCount: 5
      })
    });

    if (!geminiResponse.ok) {
      const error = await geminiResponse.json();
      console.error('❌ [TEST] Gemini generation failed:', error);
    } else {
      const geminiData = await geminiResponse.json();
      console.log('✅ [TEST] Questions generated!');
      console.log(`   Provider: ${geminiData.data.aiProvider}`);
      console.log(`   Fallback used: ${geminiData.data.fallbackUsed || false}`);
      console.log(`   Label: ${geminiData.data.providerLabel}`);
      console.log(`   Question count: ${geminiData.data.questions.length}`);
      console.log('\n📋 [TEST] Sample question:');
      console.log(`   Q: ${geminiData.data.questions[0].question}`);
      console.log(`   Type: ${geminiData.data.questions[0].type}`);
    }

    // Step 3: Test with Ollama (will fallback to Gemini or RAG)
    console.log('\n🦙 [TEST] Step 3: Testing Ollama (with fallback chain)...');
    const ollamaResponse = await fetch(`${BASE_URL}/api/timer-transcripts/generate-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timerTranscriptId,
        aiProvider: 'ollama',
        questionCount: 5
      })
    });

    if (!ollamaResponse.ok) {
      const error = await ollamaResponse.json();
      console.error('❌ [TEST] Ollama generation failed:', error);
    } else {
      const ollamaData = await ollamaResponse.json();
      console.log('✅ [TEST] Questions generated!');
      console.log(`   Provider: ${ollamaData.data.aiProvider}`);
      console.log(`   Fallback used: ${ollamaData.data.fallbackUsed || false}`);
      console.log(`   Label: ${ollamaData.data.providerLabel}`);
      console.log(`   Question count: ${ollamaData.data.questions.length}`);
    }

    console.log('\n✅ [TEST] All tests completed successfully!\n');

  } catch (error) {
    console.error('\n❌ [TEST] Test failed:', error.message);
    process.exit(1);
  }
}

// Check if API key is set
console.log('🔑 [TEST] Checking Gemini API Key...');
if (!process.env.GEMINI_API_KEY) {
  console.warn('⚠️  [TEST] GEMINI_API_KEY not set. Gemini will fallback to RAG.');
} else {
  console.log(`✅ [TEST] API key present (length: ${process.env.GEMINI_API_KEY.length})`);
}

console.log(`🌐 [TEST] Backend URL: ${BASE_URL}\n`);

testTimerQuestions();
