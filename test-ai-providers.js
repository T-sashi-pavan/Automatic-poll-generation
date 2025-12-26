/**
 * Quick test to verify Gemini and Ollama are working
 */

const BASE_URL = 'http://localhost:8000/api';

const log = {
  info: (msg) => console.log(`\x1b[36mℹ️  ${msg}\x1b[0m`),
  success: (msg) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`),
  error: (msg) => console.log(`\x1b[31m❌ ${msg}\x1b[0m`),
  warn: (msg) => console.log(`\x1b[33m⚠️  ${msg}\x1b[0m`),
};

async function testAIProviders() {
  console.log('\n🧪 Testing AI Providers...\n');
  
  try {
    // Test 1: Check provider status
    log.info('Checking AI provider status...');
    const statusResponse = await fetch(`${BASE_URL}/ai-providers/providers`);
    const statusData = await statusResponse.json();
    
    if (statusData.success) {
      log.success(`Current provider: ${statusData.data.current}`);
      log.success(`Gemini available: ${statusData.data.providers.gemini.available}`);
      log.success(`Ollama available: ${statusData.data.providers.ollama.available}`);
    }
    
    // Test 2: Test Gemini
    log.info('\nTesting Gemini API...');
    const geminiResponse = await fetch(`${BASE_URL}/ai-providers/test/gemini`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testText: 'Artificial intelligence is transforming education.'
      })
    });
    
    const geminiData = await geminiResponse.json();
    
    if (geminiData.success && geminiData.data.questions && geminiData.data.questions.length > 0) {
      log.success(`Gemini generated ${geminiData.data.questions.length} questions in ${geminiData.data.processingTime}ms`);
    } else {
      log.error('Gemini test failed');
      console.log(geminiData);
    }
    
    // Test 3: Test Ollama (with warning about timeout)
    log.info('\nTesting Ollama (this may take 1-2 minutes)...');
    log.warn('Ollama is slower than Gemini - please wait...');
    
    try {
      const ollamaResponse = await fetch(`${BASE_URL}/ai-providers/test/ollama`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testText: 'Machine learning algorithms learn from data.'
        })
      });
      
      const ollamaData = await ollamaResponse.json();
      
      if (ollamaData.success && ollamaData.data.questions && ollamaData.data.questions.length > 0) {
        log.success(`Ollama generated ${ollamaData.data.questions.length} questions in ${ollamaData.data.processingTime}ms`);
      } else {
        log.error('Ollama test failed');
        console.log(ollamaData);
      }
    } catch (ollamaError) {
      log.error('Ollama test failed with timeout or error');
      console.error(ollamaError.message);
    }
    
    log.success('\n✅ AI Provider tests completed!\n');
    
  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    console.error(error);
  }
}

testAIProviders();
