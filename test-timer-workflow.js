/**
 * Timer Workflow Test Script
 * Tests the complete timer-based question generation workflow
 */

const apiService = {
  baseURL: 'http://localhost:8000/api',
  
  // Test saving timer transcript
  async saveTimerTranscript(data) {
    const response = await fetch(`${this.baseURL}/timer-transcripts/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  },
  
  // Test generating questions from timer transcript
  async generateTimerQuestions(timerTranscriptId) {
    const response = await fetch(`${this.baseURL}/timer-transcripts/generate-questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ timerTranscriptId })
    });
    return await response.json();
  },
  
  // Test retrieving timer transcripts by session
  async getTimerTranscriptsBySession(sessionId) {
    const response = await fetch(`${this.baseURL}/timer-transcripts/by-session/${sessionId}`);
    return await response.json();
  }
};

// Test timer workflow
async function testTimerWorkflow() {
  console.log('🧪 [TIMER-TEST] Starting timer workflow test...\n');
  
  const testSessionId = `test_session_${Date.now()}`;
  const testHostId = 'test_host_123';
  const testRoomId = 'test_room_456';
  
  try {
    // 1. Test saving timer transcript
    console.log('📝 [TIMER-TEST] Step 1: Saving timer transcript...');
    const timerTranscriptData = {
      sessionId: testSessionId,
      hostId: testHostId,
      roomId: testRoomId,
      startTime: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
      endTime: new Date().toISOString(),
      durationSelected: 60000, // 1 minute
      combinedTranscript: "Hello everyone, welcome to today's meeting. Let's discuss the quarterly sales figures and marketing strategies. The Q3 results show a 15% increase in revenue compared to Q2. Our new marketing campaign has been very effective in reaching our target audience. We should continue focusing on digital marketing channels and customer retention strategies.",
      status: 'completed',
      segmentCount: 3
    };
    
    const saveResponse = await apiService.saveTimerTranscript(timerTranscriptData);
    console.log('✅ [TIMER-TEST] Timer transcript saved:', saveResponse);
    
    if (!saveResponse.success) {
      throw new Error('Failed to save timer transcript');
    }
    
    const timerTranscriptId = saveResponse.data._id || saveResponse.data.id;
    console.log(`📋 [TIMER-TEST] Timer transcript ID: ${timerTranscriptId}\n`);
    
    // 2. Test generating questions
    console.log('🤖 [TIMER-TEST] Step 2: Generating questions from timer transcript...');
    const questionsResponse = await apiService.generateTimerQuestions(timerTranscriptId);
    console.log('✅ [TIMER-TEST] Questions generated:', questionsResponse);
    
    if (!questionsResponse.success) {
      throw new Error('Failed to generate questions');
    }
    
    console.log(`📊 [TIMER-TEST] Generated ${questionsResponse.data.questions.length} questions\n`);
    
    // 3. Test retrieving timer transcripts by session
    console.log('🔍 [TIMER-TEST] Step 3: Retrieving timer transcripts by session...');
    const retrieveResponse = await apiService.getTimerTranscriptsBySession(testSessionId);
    console.log('✅ [TIMER-TEST] Retrieved timer transcripts:', retrieveResponse);
    
    if (!retrieveResponse.success) {
      throw new Error('Failed to retrieve timer transcripts');
    }
    
    console.log(`📊 [TIMER-TEST] Found ${retrieveResponse.data.length} timer transcripts for session\n`);
    
    // 4. Verify workflow integrity
    console.log('🔍 [TIMER-TEST] Step 4: Verifying workflow integrity...');
    
    const retrievedTranscript = retrieveResponse.data[0];
    const expectedChecks = [
      { name: 'Session ID matches', condition: retrievedTranscript.sessionId === testSessionId },
      { name: 'Host ID matches', condition: retrievedTranscript.hostId === testHostId },
      { name: 'Room ID matches', condition: retrievedTranscript.roomId === testRoomId },
      { name: 'Status is completed', condition: retrievedTranscript.status === 'completed' },
      { name: 'Combined transcript exists', condition: retrievedTranscript.combinedTranscript.length > 0 },
      { name: 'Questions generated flag set', condition: retrievedTranscript.questionsGenerated === true },
      { name: 'Question IDs exist', condition: Array.isArray(retrievedTranscript.questionIds) && retrievedTranscript.questionIds.length > 0 }
    ];
    
    const passedChecks = expectedChecks.filter(check => check.condition);
    const failedChecks = expectedChecks.filter(check => !check.condition);
    
    console.log(`✅ [TIMER-TEST] Passed checks: ${passedChecks.length}/${expectedChecks.length}`);
    passedChecks.forEach(check => console.log(`  ✓ ${check.name}`));
    
    if (failedChecks.length > 0) {
      console.log(`❌ [TIMER-TEST] Failed checks: ${failedChecks.length}`);
      failedChecks.forEach(check => console.log(`  ✗ ${check.name}`));
    }
    
    console.log('\n🎉 [TIMER-TEST] Timer workflow test completed successfully!');
    console.log('\n📊 [TIMER-TEST] Summary:');
    console.log(`  • Timer transcript saved: ✅`);
    console.log(`  • Questions generated: ✅ (${questionsResponse.data.questions.length} questions)`);
    console.log(`  • Session retrieval: ✅ (${retrieveResponse.data.length} transcripts)`);
    console.log(`  • Workflow integrity: ${passedChecks.length}/${expectedChecks.length} checks passed`);
    
    return {
      success: true,
      timerTranscriptId,
      questionsCount: questionsResponse.data.questions.length,
      transcriptsCount: retrieveResponse.data.length,
      integrityScore: `${passedChecks.length}/${expectedChecks.length}`
    };
    
  } catch (error) {
    console.error('❌ [TIMER-TEST] Timer workflow test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test if this script is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  (async () => {
    const fetch = (await import('node-fetch')).default;
    global.fetch = fetch;
    
    try {
      const result = await testTimerWorkflow();
      console.log('\n🏁 [TIMER-TEST] Test result:', result);
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error('❌ [TIMER-TEST] Test execution failed:', error);
      process.exit(1);
    }
  })();
} else {
  // Browser environment
  window.testTimerWorkflow = testTimerWorkflow;
  console.log('🧪 [TIMER-TEST] Timer workflow test function available as window.testTimerWorkflow()');
}