// Quick test for the Gemini API with the new key
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: './apps/backend/.env' });

async function testGeminiAPI() {
  console.log('🧪 Testing Gemini API with new key...');
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in environment variables');
    console.error('Please set it in apps/backend/.env file');
    process.exit(1);
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  try {
    console.log('📤 Sending test prompt...');
    const prompt = 'Generate 1 simple multiple choice question about the sky. Return only JSON with this format: {"questions": [{"type": "MCQ", "difficulty": "EASY", "question": "What color is the sky?", "options": ["Blue", "Green", "Red", "Yellow"], "correctAnswer": "Blue", "explanation": "The sky appears blue due to Rayleigh scattering."}]}';
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Response received:', text.substring(0, 200) + '...');
    console.log('🎉 API test successful!');
    
    return true;
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    return false;
  }
}

testGeminiAPI();