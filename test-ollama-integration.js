// Test script to verify Ollama question generation
const testOllamaGeneration = async () => {
  console.log('🧪 Testing Ollama Question Generation...\n');

  // Test 1: Check AI providers status
  console.log('1️⃣ Checking AI providers status...');
  const providersResponse = await fetch('http://localhost:8000/api/ai-providers/providers');
  const providersData = await providersResponse.json();
  console.log('Providers:', JSON.stringify(providersData, null, 2));
  console.log('Current provider:', providersData.data.current);
  console.log('Ollama available:', providersData.data.providers.ollama.available);
  console.log('\n');

  // Test 2: Test Ollama directly
  console.log('2️⃣ Testing Ollama provider...');
  const testResponse = await fetch('http://localhost:8000/api/ai-providers/test/ollama', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      testText: 'Photosynthesis is the process by which plants convert sunlight into energy.'
    })
  });
  const testData = await testResponse.json();
  console.log('Test result:', testData.success ? '✅ SUCCESS' : '❌ FAILED');
  console.log('Questions generated:', testData.data?.questionsGenerated);
  console.log('Response time:', testData.data?.responseTime, 'ms');
  console.log('\n');

  // Test 3: Simulate timer transcript question generation
  console.log('3️⃣ Simulating timer transcript question generation...');
  
  // First, we need to save a test transcript
  const transcriptResponse = await fetch('http://localhost:8000/api/timer-transcripts/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      combinedTranscript: 'This is a test transcript about photosynthesis. Plants use sunlight to create energy through a process called photosynthesis. This happens in the chloroplasts of plant cells. The main products are glucose and oxygen. Water and carbon dioxide are the main inputs.',
      sessionId: 'test-session-' + Date.now(),
      roomId: 'test-room',
      hostId: 'test-host',
      segmentCount: 1,
      durationSelected: 60000, // 60 seconds in milliseconds
      status: 'completed'
    })
  });
  
  if (!transcriptResponse.ok) {
    console.error('❌ Failed to save transcript:', await transcriptResponse.text());
    return;
  }
  
  const transcriptData = await transcriptResponse.json();
  const transcriptId = transcriptData.data?.id;
  console.log('Transcript saved with ID:', transcriptId);
  console.log('\n');

  // Now generate questions using Ollama
  console.log('4️⃣ Generating questions using Ollama...');
  const questionsResponse = await fetch('http://localhost:8000/api/timer-transcripts/generate-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      timerTranscriptId: transcriptId,
      aiProvider: 'ollama',
      questionCount: 5
    })
  });

  if (!questionsResponse.ok) {
    console.error('❌ Failed to generate questions:', await questionsResponse.text());
    return;
  }

  const questionsData = await questionsResponse.json();
  console.log('✅ Questions generated successfully!');
  console.log('Provider used:', questionsData.data?.aiProvider);
  console.log('Provider label:', questionsData.data?.providerLabel);
  console.log('Number of questions:', questionsData.data?.questions?.length);
  console.log('\nSample question:');
  if (questionsData.data?.questions?.[0]) {
    console.log(JSON.stringify(questionsData.data.questions[0], null, 2));
  }
};

// Run the test
testOllamaGeneration().catch(console.error);
