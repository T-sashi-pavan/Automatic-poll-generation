// Timer Questions Test Script
// Run this in the browser console to test the timer questions functionality

console.log('🧪 Testing Timer Questions Implementation...');

// Test 1: Check if API endpoints are accessible
async function testTimerQuestionsAPI() {
  try {
    const roomId = '6908fb5181f4c57272ed11ec'; // Replace with actual room ID
    
    console.log('🔍 Testing timer questions API endpoints...');
    
    // Test the questions endpoint
    const response = await fetch(`/api/timer-transcripts/with-questions/${roomId}`);
    const data = await response.json();
    
    console.log('✅ Timer questions API response:', data);
    
    if (data.success && data.data.length > 0) {
      console.log(`🎯 Found ${data.data.length} timer question sets`);
      data.data.forEach((set, index) => {
        console.log(`📋 Timer Set ${index + 1}:`, {
          sessionId: set.sessionId,
          questionCount: set.questions.length,
          summary: set.summary,
          duration: set.timerSession?.duration,
          segmentCount: set.timerSession?.segmentCount
        });
      });
    } else {
      console.log('📭 No timer questions found - try completing a timer session first');
    }
    
  } catch (error) {
    console.error('❌ Error testing timer questions API:', error);
  }
}

// Test 2: Check if timer questions hook is working
function testTimerQuestionsHook() {
  console.log('🔗 Testing useTimerQuestions hook...');
  
  // Check if the component is mounted and hook is working
  const timerSections = document.querySelectorAll('[class*="timer"]');
  console.log(`🔍 Found ${timerSections.length} timer-related elements in DOM`);
  
  // Look for timer questions in the page
  const timerText = document.body.textContent || '';
  if (timerText.includes('Timer-based Questions')) {
    console.log('✅ Timer-based Questions section found in page');
  } else {
    console.log('❌ Timer-based Questions section not found - may need to complete a timer session');
  }
}

// Test 3: Simulate timer completion event
function testTimerQuestionGeneration() {
  console.log('📡 Testing timer question generation event...');
  
  const mockEvent = new CustomEvent('timerQuestionsGenerated', {
    detail: {
      questions: [
        {
          id: 'test-timer-q1',
          type: 'multiple_choice',
          difficulty: 'medium',
          questionText: 'What was the main topic discussed in this timer session?',
          options: ['Topic A', 'Topic B', 'Topic C', 'Topic D'],
          correctIndex: 0,
          explanation: 'This was the primary focus of the discussion.',
          points: 1,
          source: 'timer-transcript'
        }
      ],
      timerTranscriptId: 'test-transcript-123',
      sessionId: 'test-session-456'
    }
  });
  
  window.dispatchEvent(mockEvent);
  console.log('📤 Dispatched mock timer questions generated event');
}

// Test 4: Check localStorage for timer state
function testTimerState() {
  console.log('💾 Checking timer state in localStorage...');
  
  const savedState = localStorage.getItem('global-audio-state');
  if (savedState) {
    const state = JSON.parse(savedState);
    console.log('🔍 Current audio state:', state);
  } else {
    console.log('📭 No saved audio state found');
  }
  
  // Check for timer-related data
  const timerKeys = Object.keys(localStorage).filter(key => 
    key.toLowerCase().includes('timer')
  );
  
  if (timerKeys.length > 0) {
    console.log('⏱️ Timer-related localStorage keys:', timerKeys);
    timerKeys.forEach(key => {
      console.log(`  ${key}:`, localStorage.getItem(key));
    });
  } else {
    console.log('📭 No timer-related data in localStorage');
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting comprehensive timer questions test...\n');
  
  await testTimerQuestionsAPI();
  console.log('\n' + '─'.repeat(50) + '\n');
  
  testTimerQuestionsHook();
  console.log('\n' + '─'.repeat(50) + '\n');
  
  testTimerQuestionGeneration();
  console.log('\n' + '─'.repeat(50) + '\n');
  
  testTimerState();
  console.log('\n' + '─'.repeat(50) + '\n');
  
  console.log('✅ Timer questions test completed!');
  console.log('\n📋 To see timer questions in action:');
  console.log('1. Go to Meeting Room page');
  console.log('2. Start a timer session (e.g., 1 minute)');
  console.log('3. Speak some content during the timer');
  console.log('4. Let the timer complete naturally');
  console.log('5. Go to AI Questions page');
  console.log('6. Look for "Timer-based Questions" section');
}

// Export functions for manual testing
window.timerQuestionsTest = {
  runAllTests,
  testTimerQuestionsAPI,
  testTimerQuestionsHook,
  testTimerQuestionGeneration,
  testTimerState
};

console.log('🧪 Timer Questions Test Suite Loaded!');
console.log('📝 Run: timerQuestionsTest.runAllTests()');
console.log('🔍 Or run individual tests like: timerQuestionsTest.testTimerQuestionsAPI()');