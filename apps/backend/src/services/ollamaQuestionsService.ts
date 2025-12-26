import OllamaQuestion, { IOllamaQuestion } from '../web/models/ollamaQuestions.model';
import { WholeTimerTranscript } from '../web/models/wholeTimerTranscripts.model';
import OllamaService from './ollamaService';
import { Types } from 'mongoose';

// Create Ollama service instance
const ollamaService = new OllamaService();

interface GenerateOllamaQuestionsParams {
  transcriptId: string;
  sessionId: string;
  roomId: string;
  hostId: string;
  questionCount?: number;
}

interface OllamaQuestionData {
  type: 'MCQ' | 'TRUE_FALSE';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

class OllamaQuestionsService {
  
  /**
   * Generate Ollama-based questions from a combined transcript
   */
  async generateOllamaQuestions(params: GenerateOllamaQuestionsParams): Promise<IOllamaQuestion[]> {
    const { transcriptId, sessionId, roomId, hostId, questionCount = 5 } = params;
    
    try {
      console.log('🦙 Generating Ollama-based questions for transcript:', transcriptId);
      
      // Fetch the transcript
      const transcript = await WholeTimerTranscript.findById(transcriptId);
      
      if (!transcript) {
        throw new Error(`Transcript not found with ID: ${transcriptId}`);
      }
      
      if (!transcript.combinedTranscript || transcript.combinedTranscript.trim().length < 50) {
        throw new Error('Combined transcript text is too short to generate questions');
      }
      
      console.log(`📝 Transcript length: ${transcript.combinedTranscript.length} characters`);
      
      // Generate questions using Ollama service
      const generatedResult = await ollamaService.generateQuestions(
        transcript.combinedTranscript,
        {
          sessionId,
          questionCount,
          difficulty: ['MEDIUM'],
          includeExplanations: true,
          variety: true
        } as any
      );
      
      const generatedQuestions = generatedResult.response.questions;
      console.log(`✅ Generated ${generatedQuestions.length} questions from Ollama`);
      
      // Save questions to database
      const savedQuestions: IOllamaQuestion[] = [];
      
      for (const genQuestion of generatedQuestions) {
        const questionData: OllamaQuestionData = {
          type: genQuestion.type as 'MCQ' | 'TRUE_FALSE',
          difficulty: (genQuestion.difficulty?.toUpperCase() || 'MEDIUM') as 'EASY' | 'MEDIUM' | 'HARD',
          question: genQuestion.question,
          options: genQuestion.options || [],
          correctAnswer: genQuestion.correctAnswer,
          explanation: genQuestion.explanation || 'No explanation provided.'
        };
        
        const ollamaQuestion = new OllamaQuestion({
          id: `ollama-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: questionData.type,
          difficulty: questionData.difficulty,
          question: questionData.question,
          options: questionData.options,
          correctAnswer: questionData.correctAnswer,
          explanation: questionData.explanation,
          
          isOllamaBased: true,
          ollamaModel: process.env.OLLAMA_MODEL || 'llama3.2:latest',
          sourceTranscriptId: new Types.ObjectId(transcriptId),
          
          sessionId,
          roomId,
          hostId: new Types.ObjectId(hostId)
        });
        
        const saved = await ollamaQuestion.save();
        savedQuestions.push(saved);
      }
      
      console.log(`💾 Saved ${savedQuestions.length} Ollama questions to database`);
      
      return savedQuestions;
      
    } catch (error) {
      console.error('❌ Error generating Ollama questions:', error);
      throw error;
    }
  }
  
  /**
   * Get all Ollama questions for a room
   */
  async getOllamaQuestionsByRoom(roomId: string): Promise<IOllamaQuestion[]> {
    try {
      const questions = await OllamaQuestion.find({ roomId })
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      
      return questions as IOllamaQuestion[];
    } catch (error) {
      console.error('Error fetching Ollama questions by room:', error);
      throw error;
    }
  }
  
  /**
   * Get all Ollama questions for a session
   */
  async getOllamaQuestionsBySession(sessionId: string): Promise<IOllamaQuestion[]> {
    try {
      const questions = await OllamaQuestion.find({ sessionId })
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      
      return questions as IOllamaQuestion[];
    } catch (error) {
      console.error('Error fetching Ollama questions by session:', error);
      throw error;
    }
  }
  
  /**
   * Get all Ollama questions by transcript ID
   */
  async getOllamaQuestionsByTranscript(transcriptId: string): Promise<IOllamaQuestion[]> {
    try {
      const questions = await OllamaQuestion.find({ 
        sourceTranscriptId: new Types.ObjectId(transcriptId) 
      })
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      
      return questions as IOllamaQuestion[];
    } catch (error) {
      console.error('Error fetching Ollama questions by transcript:', error);
      throw error;
    }
  }
  
  /**
   * Get formatted Ollama questions for API response
   */
  async getFormattedOllamaQuestions(roomId: string): Promise<any[]> {
    try {
      const questions = await this.getOllamaQuestionsByRoom(roomId);
      
      return questions.map((q: any) => ({
        id: q.id,
        type: q.type.toLowerCase(),
        difficulty: q.difficulty.toLowerCase(),
        questionText: q.question,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        correctIndex: q.options ? q.options.indexOf(q.correctAnswer) : -1,
        explanation: q.explanation,
        points: 1,
        source: 'ollama-transcript',
        isOllamaBased: true,
        ollamaModel: q.ollamaModel,
        createdAt: q.createdAt
      }));
    } catch (error) {
      console.error('Error getting formatted Ollama questions:', error);
      throw error;
    }
  }
  
  /**
   * Delete all Ollama questions for a room
   */
  async deleteOllamaQuestionsByRoom(roomId: string): Promise<number> {
    try {
      const result = await OllamaQuestion.deleteMany({ roomId });
      return result.deletedCount || 0;
    } catch (error) {
      console.error('Error deleting Ollama questions:', error);
      throw error;
    }
  }
}

export const ollamaQuestionsService = new OllamaQuestionsService();
export default ollamaQuestionsService;