import { Ollama } from 'ollama';
import { IQuestionConfig } from '../web/models/questions.model';

export interface OllamaQuestion {
  id: string;
  type: 'MCQ' | 'TRUE_FALSE';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  source: 'ollama';
  model: string;
  generatedAt: string;
}

class OllamaService {
  private client: Ollama;
  private model: string;
  private embedModel: string;
  private host: string;

  constructor() {
    this.host = process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3.2:latest';
    this.embedModel = process.env.OLLAMA_EMBED_MODEL || 'mxbai-embed-large:latest';
    
    this.client = new Ollama({
      host: this.host,
      // Increase timeout to 5 minutes for long-running generation
      fetch: (url: any, options: any) => {
        return fetch(url, {
          ...options,
          signal: AbortSignal.timeout(300000) // 5 minutes timeout
        });
      }
    });

    console.log('🦙 [OLLAMA] Service initialized');
    console.log(`🏠 [OLLAMA] Host: ${this.host}`);
    console.log(`🤖 [OLLAMA] Model: ${this.model}`);
    console.log(`📊 [OLLAMA] Embed Model: ${this.embedModel}`);
  }

  async generateQuestions(
    transcript: string, 
    config: IQuestionConfig | Partial<IQuestionConfig> = {},
    sessionId?: string
  ): Promise<{ response: { questions: OllamaQuestion[] }, metadata: any }> {
    try {
      console.log('🦙 [OLLAMA] Starting question generation...');
      console.log(`📝 [OLLAMA] Transcript length: ${transcript.length} characters`);

      if (!transcript || transcript.trim().length < 50) {
        throw new Error('Transcript is too short for meaningful question generation');
      }

      // Default configuration
      const {
        numQuestions = 5,
        types = ['MCQ', 'TRUE_FALSE'],
        difficulty = ['EASY', 'MEDIUM', 'HARD'],
        contextLimit = 8000,
        includeExplanations = true
      } = config;

      // Limit transcript length to avoid API limits
      let processedTranscript = transcript;
      if (transcript.length > contextLimit) {
        console.log(`⚠️ [OLLAMA] Transcript too long, truncating to ${contextLimit} characters`);
        processedTranscript = transcript.substring(0, contextLimit) + '... [transcript truncated]';
      }

      const prompt = this.buildQuestionPrompt(processedTranscript, numQuestions, types, difficulty, includeExplanations);
      
      console.log('🦙 [OLLAMA] Sending prompt to Ollama...');
      console.log(`🔧 [OLLAMA] Using model: ${this.model}`);

      // Generate content using Ollama
      const response = await this.client.generate({
        model: this.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          num_predict: 2000,
          stop: ['</questions>']
        }
      });

      console.log('📤 [OLLAMA] Raw response received:', response.response.substring(0, 200) + '...');

      // Parse the response
      const questions = this.parseOllamaResponse(response.response, numQuestions);
      
      if (!questions || questions.length === 0) {
        throw new Error('No questions generated from transcript');
      }

      // Add Ollama-specific metadata
      const ollamaQuestions: OllamaQuestion[] = questions.map((q, index) => ({
        id: `ollama-${sessionId || Date.now()}-${index}`,
        type: q.type,
        difficulty: q.difficulty,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        source: 'ollama',
        model: this.model,
        generatedAt: new Date().toISOString()
      }));

      console.log(`✅ [OLLAMA] Generated ${ollamaQuestions.length} questions successfully`);

      return {
        response: { questions: ollamaQuestions },
        metadata: {
          model: this.model,
          host: this.host,
          transcriptLength: processedTranscript.length,
          generatedAt: new Date().toISOString(),
          questionCount: ollamaQuestions.length
        }
      };

    } catch (error) {
      console.error('❌ [OLLAMA] Error generating questions:', error);
      throw new Error(`Ollama question generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildQuestionPrompt(
    transcript: string,
    numQuestions: number,
    types: string[],
    difficulty: string[],
    includeExplanations: boolean
  ): string {
    const typeInstructions = types.includes('MCQ') 
      ? 'Multiple Choice Questions (MCQ) with 4 options each'
      : '';
    const tfInstructions = types.includes('TRUE_FALSE')
      ? 'True/False questions'
      : '';

    return `
You are an expert educator creating quiz questions from educational content. 
Your task is to generate exactly ${numQuestions} high-quality questions based on the provided transcript.

REQUIREMENTS:
- Generate exactly ${numQuestions} questions
- Mix of question types: ${typeInstructions} ${tfInstructions}
- Difficulty levels: ${difficulty.join(', ')}
- Focus on key concepts and important details
- Questions should test understanding, not just memorization
- Each question must have a clear, unambiguous correct answer
${includeExplanations ? '- Provide brief explanations for correct answers' : ''}

TRANSCRIPT:
"""
${transcript}
"""

FORMAT YOUR RESPONSE AS JSON:
[
  {
    "type": "MCQ" | "TRUE_FALSE",
    "difficulty": "EASY" | "MEDIUM" | "HARD",
    "question": "Your question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"], // Only for MCQ
    "correctAnswer": "The correct answer text",
    "explanation": "Brief explanation of why this is correct"
  }
]

IMPORTANT: 
- Respond with ONLY the JSON array, no additional text
- Ensure all JSON is properly formatted
- For TRUE_FALSE questions, use only ["True", "False"] as options
- For MCQ questions, provide exactly 4 distinct options
- Make questions engaging and educational

Generate the questions now:`;
  }

  private parseOllamaResponse(text: string, expectedCount: number): any[] {
    try {
      // Clean the response text
      let cleanText = text.trim();
      
      // Remove any markdown code blocks
      cleanText = cleanText.replace(/```json\s*/, '').replace(/```\s*$/, '');
      cleanText = cleanText.replace(/```\s*/, '');
      
      // Try to find JSON array in the response
      const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        cleanText = jsonMatch[0];
      }

      const questions = JSON.parse(cleanText);
      
      if (!Array.isArray(questions)) {
        throw new Error('Response is not an array');
      }

      // Validate and filter questions
      const validQuestions = questions.filter(q => this.validateQuestion(q));
      
      if (validQuestions.length === 0) {
        throw new Error('No valid questions found in response');
      }

      console.log(`✅ [OLLAMA] Parsed ${validQuestions.length}/${questions.length} valid questions`);
      return validQuestions.slice(0, expectedCount); // Limit to expected count

    } catch (error) {
      console.error('❌ [OLLAMA] Error parsing response:', error);
      console.error('📝 [OLLAMA] Raw response:', text);
      
      // Return fallback questions if parsing fails
      return this.generateFallbackQuestions(expectedCount);
    }
  }

  private validateQuestion(question: any): boolean {
    const required = ['type', 'difficulty', 'question', 'correctAnswer'];
    const hasRequired = required.every(field => question[field]);
    
    if (!hasRequired) {
      console.warn('❌ [OLLAMA] Question missing required fields:', question);
      return false;
    }
    
    // Validate question types
    if (!['MCQ', 'TRUE_FALSE'].includes(question.type)) {
      console.warn('❌ [OLLAMA] Invalid question type:', question.type);
      return false;
    }
    
    // Validate MCQ options
    if (question.type === 'MCQ' && (!question.options || question.options.length < 2)) {
      console.warn('❌ [OLLAMA] MCQ question missing options:', question);
      return false;
    }
    
    // Validate TRUE_FALSE options
    if (question.type === 'TRUE_FALSE') {
      if (!question.options) {
        question.options = ['True', 'False']; // Auto-add if missing
      }
    }
    
    // Check question length
    if (question.question.length < 10 || question.question.length > 500) {
      console.warn('❌ [OLLAMA] Question length invalid:', question.question.length);
      return false;
    }
    
    return true;
  }

  private generateFallbackQuestions(count: number): any[] {
    const fallbackQuestions = [];
    
    for (let i = 0; i < count; i++) {
      fallbackQuestions.push({
        type: i % 2 === 0 ? 'MCQ' : 'TRUE_FALSE',
        difficulty: ['EASY', 'MEDIUM', 'HARD'][i % 3],
        question: `Based on the discussion, what was the ${i === 0 ? 'main' : i === 1 ? 'secondary' : 'important'} topic covered?`,
        options: i % 2 === 0 
          ? ['Technical concepts', 'General discussion', 'Problem solving', 'Future planning']
          : ['True', 'False'],
        correctAnswer: i % 2 === 0 ? 'General discussion' : 'True',
        explanation: `This is a fallback question generated when the AI response could not be parsed. Question ${i + 1} of ${count}.`
      });
    }
    
    return fallbackQuestions;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      console.log('🦙 [OLLAMA] Generating embedding...');
      
      const response = await this.client.embeddings({
        model: this.embedModel,
        prompt: text
      });
      
      console.log(`✅ [OLLAMA] Generated embedding with ${response.embedding.length} dimensions`);
      return response.embedding;
    } catch (error) {
      console.error('❌ [OLLAMA] Embedding generation failed:', error);
      throw new Error(`Ollama embedding error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      console.log('🔍 [OLLAMA] Checking health...');
      
      const response = await this.client.list();
      const isHealthy = response.models && response.models.length > 0;
      
      if (isHealthy) {
        console.log(`✅ [OLLAMA] Healthy - Found ${response.models.length} models`);
        response.models.forEach(model => {
          console.log(`📋 [OLLAMA] Available model: ${model.name} (${model.size})`);
        });
      } else {
        console.log('❌ [OLLAMA] No models found');
      }
      
      return isHealthy;
    } catch (error) {
      console.error('❌ [OLLAMA] Health check failed:', error);
      return false;
    }
  }

  async listModels(): Promise<any[]> {
    try {
      const response = await this.client.list();
      return response.models || [];
    } catch (error) {
      console.error('❌ [OLLAMA] Failed to list models:', error);
      return [];
    }
  }

  getModelInfo(): { model: string; embedModel: string; host: string } {
    return {
      model: this.model,
      embedModel: this.embedModel,
      host: this.host
    };
  }
}

export default OllamaService;