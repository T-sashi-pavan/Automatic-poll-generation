import { AutoQuestionService } from './autoQuestionService';
import { GeminiService } from './geminiService';
import OllamaService from './ollamaService';
import TimerQuestionsService from './timerQuestionsService';
import ragService from './ragService';
import { Server as SocketIOServer } from 'socket.io';
import { IQuestionConfig } from '../web/models/questions.model';

export type AIProvider = 'gemini' | 'ollama';

/**
 * Global service manager for auto question generation
 * This allows routes to access the service with Socket.IO instance
 */
class ServiceManager {
  private static instance: ServiceManager;
  private autoQuestionService?: AutoQuestionService;
  private geminiService?: GeminiService;
  private ollamaService?: OllamaService;
  private timerQuestionsService?: TimerQuestionsService;
  private currentProvider: AIProvider = 'gemini'; // Default to Gemini

  private constructor() {}

  static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  initializeServices(io: SocketIOServer) {
    this.autoQuestionService = new AutoQuestionService(io);
    this.geminiService = new GeminiService();
    this.ollamaService = new OllamaService();
    this.timerQuestionsService = new TimerQuestionsService();
    console.log('✅ [SERVICES] Auto question service initialized with Socket.IO');
    console.log('✅ [SERVICES] Gemini service initialized for timer transcripts');
    console.log('✅ [SERVICES] Ollama service initialized for local AI');
    console.log('✅ [SERVICES] Timer questions service initialized for creative questions');
    console.log('✅ [SERVICES] RAG service available for fallback question generation');
  }

  getAutoQuestionService(): AutoQuestionService {
    if (!this.autoQuestionService) {
      throw new Error('AutoQuestionService not initialized. Call initializeServices first.');
    }
    return this.autoQuestionService;
  }

  getTimerQuestionsService(): TimerQuestionsService {
    if (!this.timerQuestionsService) {
      throw new Error('TimerQuestionsService not initialized. Call initializeServices first.');
    }
    return this.timerQuestionsService;
  }

  getGeminiService(): GeminiService {
    if (!this.geminiService) {
      throw new Error('GeminiService not initialized. Call initializeServices first.');
    }
    return this.geminiService;
  }

  getOllamaService(): OllamaService {
    if (!this.ollamaService) {
      throw new Error('OllamaService not initialized. Call initializeServices first.');
    }
    return this.ollamaService;
  }

  getRagService() {
    return ragService;
  }

  setProvider(provider: AIProvider): void {
    this.currentProvider = provider;
    console.log(`🔄 [SERVICES] AI Provider switched to: ${provider}`);
  }

  getCurrentProvider(): AIProvider {
    return this.currentProvider;
  }

  /**
   * Generate questions using the specified AI provider
   */
  async generateQuestionsWithProvider(
    transcript: string,
    provider: AIProvider,
    config: Partial<IQuestionConfig> = {},
    sessionId?: string
  ): Promise<any> {
    console.log(`🤖 [SERVICES] Generating questions using ${provider.toUpperCase()}`);
    
    switch (provider) {
      case 'gemini': {
        if (!this.geminiService) {
          throw new Error('GeminiService not initialized');
        }
        // Create a complete config for Gemini service
        const geminiConfig = {
          numQuestions: config.numQuestions || 5,
          types: config.types || ['multiple_choice', 'true_false'],
          difficulty: config.difficulty || ['easy', 'medium', 'hard'],
          contextLimit: config.contextLimit || 8000,
          includeExplanations: config.includeExplanations !== false,
          pointsPerQuestion: 1
        };
        return await this.geminiService.generateQuestions(transcript, geminiConfig, sessionId || `session-${Date.now()}`);
      }
        
      case 'ollama': {
        if (!this.ollamaService) {
          throw new Error('OllamaService not initialized');
        }
        // Create a complete config for Ollama service
        const ollamaConfig = {
          numQuestions: config.numQuestions || 5,
          types: config.types || ['MCQ', 'TRUE_FALSE'],
          difficulty: config.difficulty || ['EASY', 'MEDIUM', 'HARD'],
          contextLimit: config.contextLimit || 8000,
          includeExplanations: config.includeExplanations !== false
        };
        return await this.ollamaService.generateQuestions(transcript, ollamaConfig, sessionId || `session-${Date.now()}`);
      }
        
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  /**
   * Check health of all AI providers
   */
  async checkProvidersHealth(): Promise<{ gemini: boolean; ollama: boolean }> {
    console.log('🔍 [SERVICES] Checking health of all AI providers...');
    
    const results = await Promise.allSettled([
      Promise.resolve(!!this.geminiService), // Gemini doesn't have checkHealth, check if service exists
      this.ollamaService?.checkHealth() || Promise.resolve(false)
    ]);

    const health = {
      gemini: results[0].status === 'fulfilled' ? results[0].value : false,
      ollama: results[1].status === 'fulfilled' ? results[1].value : false
    };

    console.log('📊 [SERVICES] Provider health status:', health);
    return health;
  }

  /**
   * Get information about available providers
   */
  async getProvidersInfo(): Promise<any> {
    const health = await this.checkProvidersHealth();
    
    const info = {
      current: this.currentProvider,
      providers: {
        gemini: {
          available: health.gemini,
          requiresApiKey: true,
          name: 'Google Gemini',
          description: 'Cloud-based AI with advanced capabilities'
        },
        ollama: {
          available: health.ollama,
          requiresApiKey: false,
          name: 'Ollama (Local)',
          description: 'Local AI running on your machine',
          models: health.ollama ? await this.ollamaService?.listModels() || [] : []
        }
      }
    };

    return info;
  }

  /**
   * Generate creative, attention-grabbing questions for timer-based transcripts
   * Uses new TimerQuestionsService for unique question generation
   */
  async generateCreativeTimerQuestions(
    combinedTranscript: string,
    provider: AIProvider = 'gemini'
  ): Promise<any[]> {
    if (!this.timerQuestionsService) {
      throw new Error('TimerQuestionsService not initialized. Call initializeServices first.');
    }

    try {
      console.log(`🎯 [TIMER-QUESTIONS] Generating creative timer-based questions using ${provider.toUpperCase()}...`);
      console.log(`📝 [TIMER-QUESTIONS] Transcript length: ${combinedTranscript.length} characters`);

      // Set the provider for this operation
      this.setProvider(provider);

      if (provider === 'ollama') {
        // Use Ollama service directly for timer questions
        const config: Partial<IQuestionConfig> = {
          numQuestions: Math.min(8, Math.max(3, Math.floor(combinedTranscript.length / 200))),
          types: ['MCQ', 'TRUE_FALSE'],
          difficulty: ['EASY', 'MEDIUM', 'HARD'],
          contextLimit: 8000,
          includeExplanations: true
        };
        
        const result = await this.ollamaService!.generateQuestions(
          combinedTranscript,
          config,
          'timer-session-' + Date.now()
        );
        
        console.log(`✅ [TIMER-QUESTIONS] Generated ${result.response.questions.length} creative questions using Ollama`);
        return result.response.questions;
      } else {
        // Use existing TimerQuestionsService for Gemini
        const timerQuestions = await this.timerQuestionsService.generateTimerBasedQuestions(
          combinedTranscript,
          {
            creativityLevel: 'maximum',
            focusOnSummary: true,
            includeDiscussionFlow: true
          }
        );

        console.log(`✅ [TIMER-QUESTIONS] Generated ${timerQuestions.length} creative questions using Gemini`);
        return timerQuestions;
      }

    } catch (error) {
      console.error('❌ [TIMER-QUESTIONS] Error generating creative timer questions:', error);
      throw new Error(`Failed to generate creative timer questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * LEGACY: Generate questions specifically for timer-based transcripts
   * Uses enhanced prompts for longer, combined transcript content
   * @deprecated Use generateCreativeTimerQuestions instead
   */
  async generateTimerQuestions(combinedTranscript: string): Promise<any[]> {
    console.warn('⚠️ [TIMER-QUESTIONS] Using legacy generateTimerQuestions method. Consider using generateCreativeTimerQuestions instead.');
    
    if (!this.geminiService) {
      throw new Error('GeminiService not initialized. Call initializeServices first.');
    }

    try {
      console.log('⏱️ [TIMER-QUESTIONS] Generating questions for timer transcript...');
      console.log(`📝 [TIMER-QUESTIONS] Transcript length: ${combinedTranscript.length} characters`);

      // Enhanced config for timer-based questions
      const timerConfig: IQuestionConfig = {
        numQuestions: Math.min(8, Math.max(3, Math.floor(combinedTranscript.length / 200))),
        types: ['multiple_choice', 'true_false', 'short_answer'],
        difficulty: ['easy', 'medium', 'hard'],
        contextLimit: 8000,
        includeExplanations: true,
        pointsPerQuestion: 1
      };

      const result = await this.geminiService.generateQuestions(
        combinedTranscript,
        timerConfig,
        'timer-session-' + Date.now()
      );

      console.log(`✅ [TIMER-QUESTIONS] Generated ${result.response.questions.length} questions`);
      
      // Add timer-specific metadata to questions
      const timerQuestions = result.response.questions.map((question, index) => ({
        ...question,
        id: `timer-${Date.now()}-${index}`,
        source: 'timer-transcript',
        generatedAt: new Date().toISOString(),
        transcriptLength: combinedTranscript.length
      }));

      return timerQuestions;

    } catch (error) {
      console.error('❌ [TIMER-QUESTIONS] Error generating timer questions:', error);
      throw new Error(`Failed to generate timer questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default ServiceManager;