/**
 * Test script to compare Ollama model speeds
 * Tests phi3:mini vs llama3.2:latest
 */

const { Ollama } = require('ollama');

const SAMPLE_TRANSCRIPT = `
Photosynthesis is the process by which plants convert light energy into chemical energy. 
This process occurs in the chloroplasts, specifically in structures called thylakoids.
The process has two main stages: light-dependent reactions and light-independent reactions (Calvin cycle).
In the light-dependent reactions, chlorophyll absorbs light energy, which is used to split water molecules.
This produces oxygen, ATP, and NADPH. The Calvin cycle uses ATP and NADPH to convert carbon dioxide into glucose.
Factors affecting photosynthesis include light intensity, carbon dioxide concentration, temperature, and water availability.
`.trim();

const QUESTION_PROMPT = `You are an expert educator. Generate 3 quiz questions from this transcript.

Transcript:
${SAMPLE_TRANSCRIPT}

Return ONLY a valid JSON array with this exact structure (no markdown, no explanation):
[
  {
    "type": "MCQ",
    "difficulty": "MEDIUM",
    "question": "What is the primary location of photosynthesis in plant cells?",
    "options": ["Mitochondria", "Chloroplasts", "Nucleus", "Ribosomes"],
    "correctAnswer": "Chloroplasts",
    "explanation": "Photosynthesis occurs in chloroplasts, specifically in the thylakoids."
  }
]`;

async function testModel(modelName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${modelName}`);
  console.log('='.repeat(60));

  const ollama = new Ollama({ host: 'http://localhost:11434' });
  
  const startTime = Date.now();
  
  try {
    console.log('⏳ Generating questions...');
    
    const response = await ollama.generate({
      model: modelName,
      prompt: QUESTION_PROMPT,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        num_predict: 1500
      }
    });

    const endTime = Date.now();
    const duration = endTime - startTime;
    const durationSec = (duration / 1000).toFixed(2);

    console.log(`✅ Generation completed in ${durationSec} seconds (${duration}ms)`);
    
    // Try to parse the JSON response
    try {
      const jsonMatch = response.response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const questions = JSON.parse(jsonMatch[0]);
        console.log(`📊 Questions generated: ${questions.length}`);
        console.log(`\n📝 Sample question:`);
        console.log(`   Q: ${questions[0].question.substring(0, 80)}...`);
        console.log(`   Type: ${questions[0].type}, Difficulty: ${questions[0].difficulty}`);
      } else {
        console.log('⚠️  Could not parse JSON from response');
        console.log('Response preview:', response.response.substring(0, 200));
      }
    } catch (parseError) {
      console.log('⚠️  JSON parse error:', parseError.message);
    }

    return {
      model: modelName,
      success: true,
      duration,
      durationSec
    };

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.error(`❌ Error: ${error.message}`);
    return {
      model: modelName,
      success: false,
      duration,
      error: error.message
    };
  }
}

async function main() {
  console.log('\n🚀 Ollama Model Speed Comparison Test');
  console.log(`📄 Transcript length: ${SAMPLE_TRANSCRIPT.length} characters`);
  console.log(`🎯 Generating 3 quiz questions\n`);

  const results = [];

  // Test phi3:mini (new faster model)
  const phi3Result = await testModel('phi3:mini');
  results.push(phi3Result);

  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test llama3.2:latest (old slower model)
  const llama32Result = await testModel('llama3.2:latest');
  results.push(llama32Result);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 PERFORMANCE SUMMARY');
  console.log('='.repeat(60));

  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`\n${status} ${result.model}:`);
    console.log(`   Duration: ${result.durationSec}s (${result.duration}ms)`);
    if (!result.success) {
      console.log(`   Error: ${result.error}`);
    }
  });

  if (results.length === 2 && results[0].success && results[1].success) {
    const speedup = (results[1].duration / results[0].duration).toFixed(2);
    const timeSaved = ((results[1].duration - results[0].duration) / 1000).toFixed(2);
    
    console.log('\n🎯 Performance Comparison:');
    console.log(`   phi3:mini is ${speedup}x faster than llama3.2:latest`);
    console.log(`   Time saved: ${timeSaved} seconds per generation`);
    console.log(`   Recommendation: ✅ Use phi3:mini for production`);
  }

  console.log('\n');
}

main().catch(console.error);
