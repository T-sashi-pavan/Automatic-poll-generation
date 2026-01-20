#!/usr/bin/env node
/**
 * Test Gemini API Key Quality for Both Segment and Timer Questions
 */

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:8000';

// Test transcript - realistic classroom discussion
const testTranscript = `
The professor discussed the fundamentals of machine learning algorithms today.
We learned about supervised learning where models are trained on labeled datasets.
The key difference between classification and regression was explained in detail.
Classification predicts discrete categories like "cat" or "dog" in image recognition.
Regression predicts continuous values like house prices or temperature forecasts.

The professor emphasized that deep learning is a subset of machine learning.
Neural networks with multiple hidden layers can learn complex patterns.
We saw examples of convolutional neural networks for image processing.
Recurrent neural networks are better suited for sequential data like text or time series.

The class discussed real-world applications in healthcare, finance, and autonomous vehicles.
Ethical considerations were raised about bias in training data and model fairness.
The importance of model validation and testing on unseen data was stressed.
Overfitting occurs when a model memorizes training data instead of learning patterns.
`.trim();

// Test data for segment questions (shorter segment)
const segmentTranscript = `
Today we covered gradient descent optimization algorithm.
Gradient descent helps minimize the loss function by adjusting model parameters.
The learning rate determines the step size in parameter updates.
Too large a learning rate can cause divergence, too small makes training slow.
We discussed stochastic gradient descent and mini-batch gradient descent variants.
`.trim();

async function testSegmentQuestions() {
  console.log('📝 [TEST] Testing SEGMENT-BASED Question Generation (Gemini)\n');
  console.log('Transcript length:', segmentTranscript.length, 'characters\n');
  
  try {
    // First, save a segment
    const meetingId = '507f1f77bcf86cd799439011'; // Valid MongoDB ObjectId
    const saveResponse = await fetch(`${BASE_URL}/api/segments/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        meetingId,
        hostmail: 'test@example.com',
        transcriptText: segmentTranscript,
        roomId: 'test-room-123'
      })
    });

    if (!saveResponse.ok) {
      const error = await saveResponse.json();
      throw new Error(`Failed to save segment: ${JSON.stringify(error)}`);
    }

    const saveData = await saveResponse.json();
    console.log('✅ Segment saved:', saveData.segmentId);
    
    // Wait for auto-generation to complete
    console.log('⏳ Waiting 8 seconds for question generation...\n');
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    // Fetch generated Gemini questions
    const questionsResponse = await fetch(`${BASE_URL}/api/questions/list/${meetingId}`);
    
    if (!questionsResponse.ok) {
      throw new Error('Failed to fetch questions');
    }

    const questionsData = await questionsResponse.json();
    const geminiQuestions = questionsData.questions || [];
    
    console.log(`📊 SEGMENT-BASED QUESTIONS (Gemini): ${geminiQuestions.length} generated\n`);
    
    if (geminiQuestions.length > 0) {
      geminiQuestions.slice(0, 3).forEach((q, i) => {
        console.log(`\n${i + 1}. [${q.difficulty}] ${q.questionText || q.question}`);
        if (q.options && q.options.length > 0) {
          q.options.forEach((opt, idx) => {
            const marker = idx === q.correctIndex ? '✓' : ' ';
            console.log(`   ${marker} ${String.fromCharCode(65 + idx)}) ${opt}`);
          });
        }
        if (q.explanation) {
          console.log(`   💡 ${q.explanation}`);
        }
      });
    }
    
    return geminiQuestions;
    
  } catch (error) {
    console.error('❌ [SEGMENT TEST] Error:', error.message);
    return [];
  }
}

async function testTimerQuestions() {
  console.log('\n\n⏱️  [TEST] Testing TIMER-BASED Question Generation (Gemini)\n');
  console.log('Transcript length:', testTranscript.length, 'characters\n');
  
  try {
    // Save timer transcript
    const sessionId = 'test-session-' + Date.now();
    const saveResponse = await fetch(`${BASE_URL}/api/timer-transcripts/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        hostId: '507f1f77bcf86cd799439011',
        roomId: 'test-room-123',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        durationSelected: 300000, // 5 minutes in milliseconds
        combinedTranscript: testTranscript,
        status: 'completed',
        segmentCount: 3
      })
    });

    if (!saveResponse.ok) {
      const error = await saveResponse.json();
      throw new Error(`Failed to save transcript: ${JSON.stringify(error)}`);
    }

    const saveData = await saveResponse.json();
    const timerTranscriptId = saveData.data._id;
    console.log('✅ Timer transcript saved:', timerTranscriptId);

    // Generate questions with Gemini
    console.log('⏳ Generating timer questions with Gemini...\n');
    const genResponse = await fetch(`${BASE_URL}/api/timer-transcripts/generate-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timerTranscriptId,
        aiProvider: 'gemini',
        questionCount: 5
      })
    });

    if (!genResponse.ok) {
      const error = await genResponse.json();
      throw new Error(`Failed to generate questions: ${JSON.stringify(error)}`);
    }

    const genData = await genResponse.json();
    const timerQuestions = genData.data.questions || [];
    
    console.log(`📊 TIMER-BASED QUESTIONS (Gemini): ${timerQuestions.length} generated`);
    console.log(`🤖 Provider: ${genData.data.providerLabel}\n`);
    
    if (timerQuestions.length > 0) {
      timerQuestions.slice(0, 3).forEach((q, i) => {
        console.log(`\n${i + 1}. [${q.difficulty}] ${q.question}`);
        if (q.options && q.options.length > 0) {
          q.options.forEach((opt, idx) => {
            const isCorrect = opt === q.correctAnswer;
            const marker = isCorrect ? '✓' : ' ';
            console.log(`   ${marker} ${String.fromCharCode(65 + idx)}) ${opt}`);
          });
        }
        if (q.explanation) {
          console.log(`   💡 ${q.explanation}`);
        }
      });
    }
    
    return timerQuestions;
    
  } catch (error) {
    console.error('❌ [TIMER TEST] Error:', error.message);
    return [];
  }
}

async function analyzeQuality(segmentQuestions, timerQuestions) {
  console.log('\n\n' + '='.repeat(70));
  console.log('📊 QUALITY ANALYSIS REPORT');
  console.log('='.repeat(70));
  
  console.log('\n📝 SEGMENT-BASED QUESTIONS:');
  console.log(`   Count: ${segmentQuestions.length}`);
  if (segmentQuestions.length > 0) {
    const avgLength = segmentQuestions.reduce((sum, q) => 
      sum + (q.questionText || q.question || '').length, 0) / segmentQuestions.length;
    console.log(`   Avg Question Length: ${avgLength.toFixed(0)} characters`);
    
    const hasExplanations = segmentQuestions.filter(q => q.explanation).length;
    console.log(`   Questions with Explanations: ${hasExplanations}/${segmentQuestions.length}`);
  }
  
  console.log('\n⏱️  TIMER-BASED QUESTIONS:');
  console.log(`   Count: ${timerQuestions.length}`);
  if (timerQuestions.length > 0) {
    const avgLength = timerQuestions.reduce((sum, q) => 
      sum + (q.question || '').length, 0) / timerQuestions.length;
    console.log(`   Avg Question Length: ${avgLength.toFixed(0)} characters`);
    
    const hasExplanations = timerQuestions.filter(q => q.explanation).length;
    console.log(`   Questions with Explanations: ${hasExplanations}/${timerQuestions.length}`);
  }
  
  console.log('\n💡 QUALITY INDICATORS:');
  console.log('   ✓ High quality = Analytical questions requiring understanding');
  console.log('   ✓ High quality = Options that require discrimination');
  console.log('   ✓ High quality = Detailed explanations');
  console.log('   ✗ Low quality = Simple recall or keyword matching');
  console.log('   ✗ Low quality = Obvious correct answers');
  
  console.log('\n' + '='.repeat(70));
}

async function runTests() {
  console.log('🧪 GEMINI API KEY QUALITY TEST\n');
  console.log('Testing both segment-based and timer-based question generation');
  console.log('Backend URL:', BASE_URL);
  console.log('\n' + '='.repeat(70) + '\n');
  
  // Check API key
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️  GEMINI_API_KEY not set in environment\n');
  }
  
  const segmentQuestions = await testSegmentQuestions();
  const timerQuestions = await testTimerQuestions();
  
  await analyzeQuality(segmentQuestions, timerQuestions);
  
  console.log('\n✅ Test completed!\n');
  
  if (segmentQuestions.length === 0 && timerQuestions.length === 0) {
    console.log('⚠️  No questions generated. Check:');
    console.log('   1. Backend is running on http://localhost:8000');
    console.log('   2. GEMINI_API_KEY is set in backend/.env');
    console.log('   3. MongoDB is connected');
    console.log('   4. Check backend logs for errors\n');
  }
}

runTests().catch(console.error);
