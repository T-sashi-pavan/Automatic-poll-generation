import express, { Request, Response, NextFunction } from 'express';
import ollamaQuestionsService from '../services/ollamaQuestionsService';

const router = express.Router();

/**
 * POST /api/ollama-questions/generate
 * Generate Ollama-based questions from a transcript
 */
router.post('/generate', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { transcriptId, sessionId, roomId, hostId, questionCount } = req.body;
    
    if (!transcriptId) {
      res.status(400).json({
        success: false,
        message: 'transcriptId is required'
      });
      return;
    }
    
    if (!sessionId) {
      res.status(400).json({
        success: false,
        message: 'sessionId is required'
      });
      return;
    }
    
    if (!roomId) {
      res.status(400).json({
        success: false,
        message: 'roomId is required'
      });
      return;
    }
    
    if (!hostId) {
      res.status(400).json({
        success: false,
        message: 'hostId is required'
      });
      return;
    }
    
    console.log('🦙 Generating Ollama questions with params:', {
      transcriptId,
      sessionId,
      roomId,
      hostId,
      questionCount
    });
    
    // Generate Ollama questions in background (fire-and-forget)
    // Return immediately to avoid timeout
    const startTime = Date.now();
    
    // Start generation in background
    ollamaQuestionsService.generateOllamaQuestions({
      transcriptId,
      sessionId,
      roomId,
      hostId,
      questionCount: questionCount || 5
    }).then(questions => {
      const duration = Date.now() - startTime;
      console.log(`✅ [OLLAMA] Generated ${questions.length} questions in ${duration}ms`);
    }).catch(error => {
      console.error('❌ [OLLAMA] Background generation failed:', error);
    });
    
    // Return immediately with pending status
    res.status(202).json({
      success: true,
      message: 'Ollama question generation started in background',
      data: {
        status: 'processing',
        transcriptId,
        sessionId,
        roomId,
        estimatedTime: '30-120 seconds',
        source: 'ollama',
        model: process.env.OLLAMA_MODEL || 'llama3.2:latest'
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error generating Ollama questions:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate Ollama questions',
      error: error.toString()
    });
  }
});

/**
 * GET /api/ollama-questions/room/:roomId
 * Get all Ollama questions for a specific room
 */
router.get('/room/:roomId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roomId } = req.params;
    
    if (!roomId) {
      res.status(400).json({
        success: false,
        message: 'roomId is required'
      });
      return;
    }
    
    const questions = await ollamaQuestionsService.getFormattedOllamaQuestions(roomId);
    
    res.status(200).json({
      success: true,
      message: `Found ${questions.length} Ollama-based questions`,
      data: {
        questions,
        count: questions.length,
        roomId
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching Ollama questions:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch Ollama questions',
      error: error.toString()
    });
  }
});

/**
 * GET /api/ollama-questions/session/:sessionId
 * Get all Ollama questions for a specific session
 */
router.get('/session/:sessionId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      res.status(400).json({
        success: false,
        message: 'sessionId is required'
      });
      return;
    }
    
    const questions = await ollamaQuestionsService.getOllamaQuestionsBySession(sessionId);
    const formatted = questions.map((q: any) => ({
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
    
    res.status(200).json({
      success: true,
      message: `Found ${formatted.length} Ollama-based questions`,
      data: {
        questions: formatted,
        count: formatted.length,
        sessionId
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching Ollama questions by session:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch Ollama questions',
      error: error.toString()
    });
  }
});

/**
 * GET /api/ollama-questions/transcript/:transcriptId
 * Get all Ollama questions for a specific transcript
 */
router.get('/transcript/:transcriptId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { transcriptId } = req.params;
    
    if (!transcriptId) {
      res.status(400).json({
        success: false,
        message: 'transcriptId is required'
      });
      return;
    }
    
    const questions = await ollamaQuestionsService.getOllamaQuestionsByTranscript(transcriptId);
    const formatted = questions.map((q: any) => ({
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
    
    res.status(200).json({
      success: true,
      message: `Found ${formatted.length} Ollama-based questions`,
      data: {
        questions: formatted,
        count: formatted.length,
        transcriptId
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching Ollama questions by transcript:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch Ollama questions',
      error: error.toString()
    });
  }
});

/**
 * DELETE /api/ollama-questions/room/:roomId
 * Delete all Ollama questions for a room
 */
router.delete('/room/:roomId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roomId } = req.params;
    
    if (!roomId) {
      res.status(400).json({
        success: false,
        message: 'roomId is required'
      });
      return;
    }
    
    const deletedCount = await ollamaQuestionsService.deleteOllamaQuestionsByRoom(roomId);
    
    res.status(200).json({
      success: true,
      message: `Deleted ${deletedCount} Ollama-based questions`,
      data: {
        deletedCount,
        roomId
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error deleting Ollama questions:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete Ollama questions',
      error: error.toString()
    });
  }
});

export default router;