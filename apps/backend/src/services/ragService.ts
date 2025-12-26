import groqService from './groqService';
import cohereService from './cohereService';
import { RAGSegmentQuestion, IRAGSegmentQuestion } from '../web/models/ragSegmentQuestions.model';
import { RAGTimerQuestion, IRAGTimerQuestion } from '../web/models/ragTimerQuestions.model';
import { GeneratedQuestions } from '../web/models/questions.model';
import { TimerQuestion } from '../web/models/timerQuestions.model';
import { IQuestionConfig } from '../web/models/questions.model';

class RAGService {
  /**
   * Generate segment questions using RAG (Groq + Cohere)
   */
  async generateSegmentQuestions(params: {
    transcriptText: string;
    transcriptId: string;
    segmentId: string;
    sessionId: string;
    roomId: string;
    hostId: string;
    questionCount?: number;
  }): Promise<IRAGSegmentQuestion[]> {
    try {
      const startTime = Date.now();
      console.log('🚀 [RAG-SEGMENT] Starting RAG-based question generation...');

      const {
        transcriptText,
        transcriptId,
        segmentId,
        sessionId,
        roomId,
        hostId,
        questionCount = 5
      } = params;

      // Step 1: Retrieve historical context using Cohere embeddings
      const historicalContext: string[] = await this.retrieveHistoricalContext(
        transcriptText,
        roomId,
        'segment'
      );

      // Step 2: Generate questions using Groq with RAG context
      const config: Partial<IQuestionConfig> = {
        numQuestions: questionCount,
        types: ['MCQ', 'TRUE_FALSE'],
        difficulty: ['MEDIUM'],
        contextLimit: 5,
        includeExplanations: true
      };

      const { response, metadata } = await groqService.generateQuestions(
        transcriptText,
        config,
        historicalContext,
        sessionId
      );

      // Step 3: Save questions to database
      const savedQuestions: IRAGSegmentQuestion[] = [];

      for (const question of response.questions) {
        const newQuestion = new RAGSegmentQuestion({
          roomId,
          sessionId,
          segmentId,
          transcriptId,
          hostId,
          
          type: question.type,
          difficulty: question.difficulty,
          question: question.question,
          options: question.options,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          
          ragModel: 'groq-rag',
          groqModel: metadata.model,
          contextUsed: historicalContext,
          
          generationTime: metadata.duration,
          tokensUsed: metadata.tokensUsed
        });

        const saved = await newQuestion.save();
        savedQuestions.push(saved);
      }

      const totalTime = Date.now() - startTime;
      console.log(`✅ [RAG-SEGMENT] Generated ${savedQuestions.length} questions in ${totalTime}ms`);
      console.log(`📊 [RAG-SEGMENT] Used ${historicalContext.length} historical context items`);

      return savedQuestions;
    } catch (error: any) {
      console.error('❌ [RAG-SEGMENT] Error:', error);
      throw new Error(`RAG segment generation failed: ${error.message}`);
    }
  }

  /**
   * Generate timer questions using RAG (Groq + Cohere)
   */
  async generateTimerQuestions(params: {
    transcriptText: string;
    transcriptId: string;
    sessionId: string;
    roomId: string;
    hostId: string;
    questionCount?: number;
  }): Promise<IRAGTimerQuestion[]> {
    try {
      const startTime = Date.now();
      console.log('🚀 [RAG-TIMER] Starting RAG-based question generation...');

      const {
        transcriptText,
        transcriptId,
        sessionId,
        roomId,
        hostId,
        questionCount = 5
      } = params;

      // Step 1: Retrieve historical context
      const historicalContext: string[] = await this.retrieveHistoricalContext(
        transcriptText,
        roomId,
        'timer'
      );

      // Step 2: Generate questions using Groq with RAG context
      const config: Partial<IQuestionConfig> = {
        numQuestions: questionCount,
        types: ['MCQ', 'TRUE_FALSE'],
        difficulty: ['MEDIUM'],
        contextLimit: 5,
        includeExplanations: true
      };

      const { response, metadata } = await groqService.generateQuestions(
        transcriptText,
        config,
        historicalContext,
        sessionId
      );

      // Step 3: Save questions to database
      const savedQuestions: IRAGTimerQuestion[] = [];

      for (const question of response.questions) {
        const newQuestion = new RAGTimerQuestion({
          roomId,
          sessionId,
          transcriptId,
          hostId,
          
          type: question.type,
          difficulty: question.difficulty,
          question: question.question,
          options: question.options,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          
          ragModel: 'groq-rag',
          groqModel: metadata.model,
          contextUsed: historicalContext,
          
          generationTime: metadata.duration,
          tokensUsed: metadata.tokensUsed
        });

        const saved = await newQuestion.save();
        savedQuestions.push(saved);
      }

      const totalTime = Date.now() - startTime;
      console.log(`✅ [RAG-TIMER] Generated ${savedQuestions.length} questions in ${totalTime}ms`);
      console.log(`📊 [RAG-TIMER] Used ${historicalContext.length} historical context items`);

      return savedQuestions;
    } catch (error: any) {
      console.error('❌ [RAG-TIMER] Error:', error);
      throw new Error(`RAG timer generation failed: ${error.message}`);
    }
  }

  /**
   * Retrieve historical context using semantic search
   */
  private async retrieveHistoricalContext(
    currentTranscript: string,
    roomId: string,
    type: 'segment' | 'timer'
  ): Promise<string[]> {
    try {
      console.log(`🔍 [RAG] Retrieving historical context for ${type}...`);

      const topK = parseInt(process.env.RAG_TOP_K_RESULTS || '5');

      // Get historical questions from database
      let historicalQuestions: any[] = [];

      if (type === 'segment') {
        // Get both Gemini and RAG segment questions
        const geminiQuestions = await GeneratedQuestions.find({ roomId })
          .sort({ createdAt: -1 })
          .limit(50)
          .select('question correctAnswer');
        
        const ragQuestions = await RAGSegmentQuestion.find({ roomId })
          .sort({ createdAt: -1 })
          .limit(50)
          .select('question correctAnswer');

        historicalQuestions = [...geminiQuestions, ...ragQuestions];
      } else {
        // Get both Gemini and RAG timer questions
        const geminiQuestions = await TimerQuestion.find({ roomId })
          .sort({ createdAt: -1 })
          .limit(50)
          .select('question correctAnswer');
        
        const ragQuestions = await RAGTimerQuestion.find({ roomId })
          .sort({ createdAt: -1 })
          .limit(50)
          .select('question correctAnswer');

        historicalQuestions = [...geminiQuestions, ...ragQuestions];
      }

      if (historicalQuestions.length === 0) {
        console.log('ℹ️  [RAG] No historical questions found, generating without context');
        return [];
      }

      // Format questions for similarity search
      const questionTexts = historicalQuestions.map(q => 
        `Q: ${q.question} | A: ${q.correctAnswer}`
      );

      console.log(`📚 [RAG] Found ${questionTexts.length} historical questions`);

      // Use Cohere to find most similar questions
      const similarQuestions = await cohereService.findSimilar(
        currentTranscript,
        questionTexts,
        Math.min(topK, questionTexts.length)
      );

      const contextItems = similarQuestions.map(result => result.text);

      console.log(`✅ [RAG] Retrieved ${contextItems.length} relevant context items`);
      contextItems.forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item.substring(0, 80)}...`);
      });

      return contextItems;
    } catch (error: any) {
      console.error('❌ [RAG] Error retrieving context:', error);
      // Return empty context on error (graceful degradation)
      return [];
    }
  }

  /**
   * Get RAG segment questions by room
   */
  async getSegmentQuestionsByRoom(roomId: string): Promise<IRAGSegmentQuestion[]> {
    try {
      const questions = await RAGSegmentQuestion.find({ roomId })
        .sort({ createdAt: -1 });
      
      return questions;
    } catch (error: any) {
      console.error('❌ [RAG] Error fetching segment questions:', error);
      throw error;
    }
  }

  /**
   * Get RAG timer questions by room
   */
  async getTimerQuestionsByRoom(roomId: string): Promise<IRAGTimerQuestion[]> {
    try {
      const questions = await RAGTimerQuestion.find({ roomId })
        .sort({ createdAt: -1 });
      
      return questions;
    } catch (error: any) {
      console.error('❌ [RAG] Error fetching timer questions:', error);
      throw error;
    }
  }

  /**
   * Get RAG segment questions by session
   */
  async getSegmentQuestionsBySession(sessionId: string): Promise<IRAGSegmentQuestion[]> {
    try {
      const questions = await RAGSegmentQuestion.find({ sessionId })
        .sort({ createdAt: -1 });
      
      return questions;
    } catch (error: any) {
      console.error('❌ [RAG] Error fetching segment questions by session:', error);
      throw error;
    }
  }

  /**
   * Get RAG timer questions by session
   */
  async getTimerQuestionsBySession(sessionId: string): Promise<IRAGTimerQuestion[]> {
    try {
      const questions = await RAGTimerQuestion.find({ sessionId })
        .sort({ createdAt: -1 });
      
      return questions;
    } catch (error: any) {
      console.error('❌ [RAG] Error fetching timer questions by session:', error);
      throw error;
    }
  }

  /**
   * Delete RAG questions by room
   */
  async deleteQuestionsByRoom(roomId: string): Promise<{ segmentCount: number; timerCount: number }> {
    try {
      const segmentResult = await RAGSegmentQuestion.deleteMany({ roomId });
      const timerResult = await RAGTimerQuestion.deleteMany({ roomId });

      console.log(`🗑️  [RAG] Deleted ${segmentResult.deletedCount} segment and ${timerResult.deletedCount} timer questions for room ${roomId}`);

      return {
        segmentCount: segmentResult.deletedCount || 0,
        timerCount: timerResult.deletedCount || 0
      };
    } catch (error: any) {
      console.error('❌ [RAG] Error deleting questions:', error);
      throw error;
    }
  }
}

export const ragService = new RAGService();
export default ragService;
