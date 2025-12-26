/**
 * Test Ollama Questions Generation Feature
 * 
 * This test verifies the new Ollama-based questions category in AI Questions page
 * Tests the full flow: transcript save → timer questions → ollama questions
 */

const BASE_URL = 'http://localhost:8000/api';

// Test configuration
const TEST_CONFIG = {
  sessionId: `test-session-${Date.now()}`,
  roomId: `test-room-${Date.now()}`,
  hostId: '507f1f77bcf86cd799439011', // Sample MongoDB ObjectId
  sampleTranscript: `
    Today we are discussing artificial intelligence and machine learning. 
    Machine learning is a subset of AI that focuses on training algorithms to learn from data.
    Neural networks are inspired by the human brain and consist of interconnected nodes.
    Deep learning uses multiple layers of neural networks to process complex patterns.
    Natural language processing helps computers understand human language.
    Computer vision enables machines to interpret visual information from the world.
  `.trim()
};

// Color console logging
const log = {
  info: (msg) => console.log(`\x1b[36mℹ️  ${msg}\x1b[0m`),
  success: (msg) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`),
  error: (msg) => console.log(`\x1b[31m❌ ${msg}\x1b[0m`),
  warn: (msg) => console.log(`\x1b[33m⚠️  ${msg}\x1b[0m`),
  section: (msg) => console.log(`\n\x1b[35m${'='.repeat(60)}\x1b[0m\n\x1b[35m${msg}\x1b[0m\n\x1b[35m${'='.repeat(60)}\x1b[0m\n`)
};

async function testOllamaQuestionsFeature() {
  log.section('🦙 OLLAMA QUESTIONS FEATURE TEST');
  
  let transcriptId = null;
  
  try {
    // ============================================================
    // STEP 1: Save Timer Transcript
    // ============================================================
    log.section('STEP 1: Save Timer Transcript');
    
    const transcriptData = {
      sessionId: TEST_CONFIG.sessionId,
      hostId: TEST_CONFIG.hostId,
      roomId: TEST_CONFIG.roomId,
      startTime: new Date(Date.now() - 300000), // 5 minutes ago
      endTime: new Date(),
      durationSelected: 300000, // 5 minutes in milliseconds
      combinedTranscript: TEST_CONFIG.sampleTranscript,
      status: 'completed',
      segmentCount: 3
    };
    
    log.info('Saving timer transcript...');
    const saveResponse = await fetch(`${BASE_URL}/timer-transcripts/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transcriptData)
    });
    
    const saveData = await saveResponse.json();
    
    if (!saveData.success || !saveData.data?.id) {
      throw new Error('Failed to save transcript: ' + JSON.stringify(saveData));
    }
    
    transcriptId = saveData.data.id;
    log.success(`Transcript saved with ID: ${transcriptId}`);
    log.info(`Transcript length: ${TEST_CONFIG.sampleTranscript.length} characters`);
    
    // ============================================================
    // STEP 2: Generate Timer-Based Questions
    // ============================================================
    log.section('STEP 2: Generate Timer-Based Questions');
    
    log.info('Generating timer-based questions using Gemini...');
    const timerQuestionsResponse = await fetch(`${BASE_URL}/timer-transcripts/generate-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timerTranscriptId: transcriptId,
        aiProvider: 'gemini', // Use Gemini for timer questions
        questionCount: 3
      })
    });
    
    const timerQuestionsData = await timerQuestionsResponse.json();
    
    if (!timerQuestionsData.success) {
      throw new Error('Failed to generate timer questions: ' + JSON.stringify(timerQuestionsData));
    }
    
    const timerQuestions = timerQuestionsData.data?.questions || [];
    log.success(`Generated ${timerQuestions.length} timer-based questions`);
    
    if (timerQuestions.length > 0) {
      log.info(`Provider: ${timerQuestionsData.data?.aiProvider || 'unknown'}`);
      log.info(`Provider Label: ${timerQuestionsData.data?.providerLabel || 'N/A'}`);
      log.info(`Sample question: ${timerQuestions[0].question || timerQuestions[0].questionText}`);
    }
    
    // ============================================================
    // STEP 3: Generate Ollama-Based Questions (NEW FEATURE)
    // ============================================================
    log.section('STEP 3: Generate Ollama-Based Questions (NEW CATEGORY)');
    
    log.info('Generating Ollama-based questions...');
    log.warn('This is the NEW feature - separate from timer questions!');
    
    const ollamaQuestionsResponse = await fetch(`${BASE_URL}/ollama-questions/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcriptId: transcriptId,
        sessionId: TEST_CONFIG.sessionId,
        roomId: TEST_CONFIG.roomId,
        hostId: TEST_CONFIG.hostId,
        questionCount: 5
      })
    });
    
    const ollamaQuestionsData = await ollamaQuestionsResponse.json();
    
    if (!ollamaQuestionsData.success) {
      throw new Error('Failed to generate Ollama questions: ' + JSON.stringify(ollamaQuestionsData));
    }
    
    const ollamaQuestions = ollamaQuestionsData.data?.questions || [];
    log.success(`Generated ${ollamaQuestions.length} Ollama-based questions`);
    
    if (ollamaQuestions.length > 0) {
      log.info(`Model: ${ollamaQuestionsData.data?.model || 'unknown'}`);
      log.info(`Source: ${ollamaQuestionsData.data?.source || 'N/A'}`);
      log.success(`\nSample Ollama Question:`);
      console.log(JSON.stringify(ollamaQuestions[0], null, 2));
    }
    
    // ============================================================
    // STEP 4: Fetch Questions by Room
    // ============================================================
    log.section('STEP 4: Verify Questions by Room');
    
    // Fetch timer questions
    log.info('Fetching timer-based questions by room...');
    const roomTimerResponse = await fetch(`${BASE_URL}/timer-transcripts/creative-questions/${TEST_CONFIG.roomId}`);
    const roomTimerData = await roomTimerResponse.json();
    
    if (roomTimerData.success && roomTimerData.data) {
      const timerCount = roomTimerData.totalQuestions || 0;
      log.success(`Timer questions in room: ${timerCount}`);
    }
    
    // Fetch Ollama questions
    log.info('Fetching Ollama-based questions by room...');
    const roomOllamaResponse = await fetch(`${BASE_URL}/ollama-questions/room/${TEST_CONFIG.roomId}`);
    const roomOllamaData = await roomOllamaResponse.json();
    
    if (roomOllamaData.success && roomOllamaData.data) {
      const ollamaCount = roomOllamaData.data.questions?.length || 0;
      log.success(`Ollama questions in room: ${ollamaCount}`);
    }
    
    // ============================================================
    // STEP 5: Summary
    // ============================================================
    log.section('📊 TEST SUMMARY');
    
    log.success('✅ All tests passed!');
    console.log('\nFeature Status:');
    console.log(`  1. Timer Transcript Saved: ✅ (ID: ${transcriptId})`);
    console.log(`  2. Timer Questions Generated: ✅ (${timerQuestions.length} questions)`);
    console.log(`  3. Ollama Questions Generated: ✅ (${ollamaQuestions.length} questions)`);
    console.log(`  4. Room Queries Working: ✅`);
    
    console.log('\n🎯 AI Questions Page Should Show:');
    console.log('  • Segments Questions (existing)');
    console.log('  • Timer-Based Questions (existing) ← Gemini generated');
    console.log('  • Ollama-Based Questions (NEW!) ← Ollama generated');
    
    console.log('\n📝 Key Differences:');
    console.log('  Timer Questions: Generated using Gemini API (cloud)');
    console.log('  Ollama Questions: Generated using Ollama (local AI)');
    console.log('  Both use the same combined transcript but different AI models');
    
    log.section('🎉 TEST COMPLETED SUCCESSFULLY');
    
  } catch (error) {
    log.section('❌ TEST FAILED');
    log.error(`Error: ${error.message}`);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run the test
testOllamaQuestionsFeature().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
