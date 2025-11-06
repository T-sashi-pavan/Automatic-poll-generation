// Timer Debug Test - Run this in browser console during timer completion
// This will help us understand what's happening with the timer state

console.log('🔍 Timer Debug Test - Current Global Audio State:');

// Access the GlobalAudioContext state if available
if (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
  console.log('React internals available for debugging');
}

// You can also manually check localStorage for persisted state
const savedState = localStorage.getItem('global-audio-state');
const savedTranscripts = localStorage.getItem('global-audio-transcripts');

if (savedState) {
  console.log('💾 Saved audio state:', JSON.parse(savedState));
}

if (savedTranscripts) {
  const transcripts = JSON.parse(savedTranscripts);
  console.log('📝 Saved transcripts count:', transcripts.length);
  console.log('📝 Final transcripts:', transcripts.filter(t => t.isFinal).slice(-5));
}

// Check for any timer-related items in localStorage
const timerKeys = Object.keys(localStorage).filter(key => 
  key.includes('timer') || key.includes('Timer')
);
console.log('⏰ Timer-related localStorage keys:', timerKeys);

// Instructions for manual testing
console.log(`
📋 Manual Testing Steps:
1. Start a timer from the Meeting Room page
2. Speak some content during the timer
3. Let the timer complete naturally
4. Watch the console for debug messages starting with [GlobalAudio]
5. Check if questions appear in AI Questions page under "Timer Based Questions"

🔍 Key debug messages to watch for:
- "Timer completion useEffect triggered"
- "Timer completed - waiting for final segment"
- "Timer has transcript - calling saveTimerTranscript"
- "Timer questions generated"

⚠️ If questions aren't generating, check:
- Is there transcript content in the timer state?
- Are there any API errors in the Network tab?
- Is the backend running and accessible?
`);