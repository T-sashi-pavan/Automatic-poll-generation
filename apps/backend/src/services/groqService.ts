import Groq from 'groq-sdk';
import { IQuestionConfig } from '../web/models/questions.model';

export interface GroqQuestion {
  id: string;
  type: 'MCQ' | 'TRUE_FALSE';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  source: 'groq-rag';
  model: string;
  generatedAt: string;
  contextUsed?: string[];
}

class GroqService {
  private client: Groq;
  private model: string;
  private timeout: number;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY not found in environment variables');
    }

    this.model = process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';
    this.timeout = parseInt(process.env.GROQ_TIMEOUT || '30000');

    this.client = new Groq({
      apiKey: apiKey,
    });

    console.log('🚀 [GROQ] Service initialized');
    console.log(`🤖 [GROQ] Model: ${this.model}`);
    console.log(`⏱️  [GROQ] Timeout: ${this.timeout}ms`);
  }

  async generateQuestions(
    transcript: string,
    config: IQuestionConfig | Partial<IQuestionConfig> = {},
    context?: string[],
    sessionId?: string
  ): Promise<{ response: { questions: GroqQuestion[] }, metadata: any }> {
    try {
      const startTime = Date.now();

      console.log('🚀 [GROQ] Starting question generation...');
      console.log(`📝 [GROQ] Transcript length: ${transcript.length} characters`);
      console.log(`🎯 [GROQ] Config:`, config);
      if (context && context.length > 0) {
        console.log(`📚 [GROQ] Using ${context.length} context items from RAG`);
      }

      const prompt = this.buildQuestionPrompt(transcript, config, context);

      const completion = await this.client.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are an expert educator creating high-quality quiz questions. Always respond with valid JSON only, no markdown formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: this.model,
        temperature: 0.7,
        max_tokens: 4000,
        top_p: 0.9,
        response_format: { type: 'json_object' }
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      const responseText = completion.choices[0]?.message?.content || '{}';
      console.log('📥 [GROQ] Raw response received');

      let parsedResponse: any;
      try {
        parsedResponse = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ [GROQ] JSON parse error:', parseError);
        throw new Error('Failed to parse Groq response as JSON');
      }

      const questions: GroqQuestion[] = (parsedResponse.questions || []).map((q: any, index: number) => ({
        id: `groq-${sessionId || 'unknown'}-${Date.now()}-${index}`,
        type: q.type || 'MCQ',
        difficulty: q.difficulty || 'MEDIUM',
        question: q.question || '',
        options: q.options || [],
        correctAnswer: q.correctAnswer || q.correct_answer || '',
        explanation: q.explanation || '',
        source: 'groq-rag',
        model: this.model,
        generatedAt: new Date().toISOString(),
        contextUsed: context || []
      }));

      console.log(`✅ [GROQ] Generated ${questions.length} questions in ${duration}ms`);
      console.log(`⚡ [GROQ] Average: ${(duration / questions.length).toFixed(0)}ms per question`);

      return {
        response: { questions },
        metadata: {
          model: this.model,
          duration,
          questionCount: questions.length,
          tokensUsed: completion.usage?.total_tokens || 0,
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          contextItemsUsed: context?.length || 0
        }
      };
    } catch (error: any) {
      console.error('❌ [GROQ] Error generating questions:', error);
      throw new Error(`Groq generation failed: ${error.message}`);
    }
  }

  private buildQuestionPrompt(
    transcript: string,
    config: Partial<IQuestionConfig>,
    context?: string[]
  ): string {
    const questionCount = config.numQuestions || 5;
    const difficulty = Array.isArray(config.difficulty) ? config.difficulty[0] : 'MEDIUM';
    const types = config.types || ['MCQ', 'TRUE_FALSE'];

    let prompt = `Generate exactly ${questionCount} high-quality quiz questions from the following transcript.\n\n`;

    // Add RAG context if available
    if (context && context.length > 0) {
      prompt += `HISTORICAL CONTEXT (use this to avoid duplicates and improve quality):\n`;
      context.forEach((ctx, idx) => {
        prompt += `${idx + 1}. ${ctx}\n`;
      });
      prompt += `\n`;
    }

    prompt += `TRANSCRIPT:\n${transcript}\n\n`;

    prompt += `REQUIREMENTS:\n`;
    prompt += `- Create ${questionCount} questions\n`;
    prompt += `- Difficulty level: ${difficulty}\n`;
    prompt += `- Question types: ${types.join(', ')}\n`;
    prompt += `- Mix of difficulty levels if not specified\n`;
    prompt += `- Each question must test understanding, not just recall\n`;
    prompt += `- Avoid questions similar to historical context\n`;
    prompt += `- Provide clear, detailed explanations\n\n`;

    prompt += `Return ONLY a JSON object with this exact structure:\n`;
    prompt += `{
  "questions": [
    {
      "type": "MCQ",
      "difficulty": "EASY|MEDIUM|HARD",
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Exact text of correct option",
      "explanation": "Detailed explanation of why this is correct"
    }
  ]
}\n\n`;

    prompt += `For TRUE_FALSE questions, use:\n`;
    prompt += `{
  "type": "TRUE_FALSE",
  "difficulty": "EASY|MEDIUM|HARD",
  "question": "Statement to evaluate",
  "options": ["True", "False"],
  "correctAnswer": "True" or "False",
  "explanation": "Explanation of the answer"
}\n`;

    return prompt;
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 [GROQ] Testing API connection...');
      
      const completion = await this.client.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: 'Say "Hello" in JSON format with key "message"'
          }
        ],
        model: this.model,
        max_tokens: 50,
        response_format: { type: 'json_object' }
      });

      const response = completion.choices[0]?.message?.content;
      console.log('✅ [GROQ] Connection successful!');
      console.log('📥 [GROQ] Test response:', response);
      
      return true;
    } catch (error: any) {
      console.error('❌ [GROQ] Connection test failed:', error.message);
      return false;
    }
  }
}

export const groqService = new GroqService();
export default groqService;
