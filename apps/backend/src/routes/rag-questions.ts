import express, { Request, Response, NextFunction } from 'express';
import ragService from '../services/ragService';

const router = express.Router();

/**
 * Generate RAG segment questions
 * POST /api/rag-questions/segment/generate
 */
router.post('/segment/generate', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      transcriptText,
      transcriptId,
      segmentId,
      sessionId,
      roomId,
      hostId,
      questionCount
    } = req.body;

    console.log('📥 [RAG-API] Received segment question generation request');
    console.log(`   Room: ${roomId}, Session: ${sessionId}, Segment: ${segmentId}`);

    if (!transcriptText || !transcriptId || !segmentId || !sessionId || !roomId || !hostId) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
      return;
    }

    // Generate questions in background (async)
    ragService.generateSegmentQuestions({
      transcriptText,
      transcriptId,
      segmentId,
      sessionId,
      roomId,
      hostId,
      questionCount: questionCount || 5
    }).then(questions => {
      console.log(`✅ [RAG-API] Generated ${questions.length} segment questions in background`);
    }).catch(error => {
      console.error('❌ [RAG-API] Background generation error:', error);
    });

    // Return immediately
    res.status(202).json({
      success: true,
      message: 'RAG segment question generation started',
      status: 'processing',
      expectedTime: '5-10 seconds'
    });

  } catch (error: any) {
    console.error('❌ [RAG-API] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate RAG segment questions'
    });
  }
});

/**
 * Generate RAG timer questions
 * POST /api/rag-questions/timer/generate
 */
router.post('/timer/generate', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      transcriptText,
      transcriptId,
      sessionId,
      roomId,
      hostId,
      questionCount
    } = req.body;

    console.log('📥 [RAG-API] Received timer question generation request');
    console.log(`   Room: ${roomId}, Session: ${sessionId}`);

    if (!transcriptText || !transcriptId || !sessionId || !roomId || !hostId) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
      return;
    }

    // Generate questions in background (async)
    ragService.generateTimerQuestions({
      transcriptText,
      transcriptId,
      sessionId,
      roomId,
      hostId,
      questionCount: questionCount || 5
    }).then(questions => {
      console.log(`✅ [RAG-API] Generated ${questions.length} timer questions in background`);
    }).catch(error => {
      console.error('❌ [RAG-API] Background generation error:', error);
    });

    // Return immediately
    res.status(202).json({
      success: true,
      message: 'RAG timer question generation started',
      status: 'processing',
      expectedTime: '5-10 seconds'
    });

  } catch (error: any) {
    console.error('❌ [RAG-API] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate RAG timer questions'
    });
  }
});

/**
 * Get RAG segment questions by room
 * GET /api/rag-questions/segment/room/:roomId
 */
router.get('/segment/room/:roomId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roomId } = req.params;

    const questions = await ragService.getSegmentQuestionsByRoom(roomId);

    res.status(200).json({
      success: true,
      data: {
        questions: questions.map(q => q.getFormattedData()),
        count: questions.length
      }
    });

  } catch (error: any) {
    console.error('❌ [RAG-API] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch RAG segment questions'
    });
  }
});

/**
 * Get RAG timer questions by room
 * GET /api/rag-questions/timer/room/:roomId
 */
router.get('/timer/room/:roomId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roomId } = req.params;

    const questions = await ragService.getTimerQuestionsByRoom(roomId);

    res.status(200).json({
      success: true,
      data: {
        questions: questions.map(q => q.getFormattedData()),
        count: questions.length
      }
    });

  } catch (error: any) {
    console.error('❌ [RAG-API] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch RAG timer questions'
    });
  }
});

/**
 * Get RAG segment questions by session
 * GET /api/rag-questions/segment/session/:sessionId
 */
router.get('/segment/session/:sessionId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sessionId } = req.params;

    const questions = await ragService.getSegmentQuestionsBySession(sessionId);

    res.status(200).json({
      success: true,
      data: {
        questions: questions.map(q => q.getFormattedData()),
        count: questions.length
      }
    });

  } catch (error: any) {
    console.error('❌ [RAG-API] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch RAG segment questions by session'
    });
  }
});

/**
 * Get RAG timer questions by session
 * GET /api/rag-questions/timer/session/:sessionId
 */
router.get('/timer/session/:sessionId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sessionId } = req.params;

    const questions = await ragService.getTimerQuestionsBySession(sessionId);

    res.status(200).json({
      success: true,
      data: {
        questions: questions.map(q => q.getFormattedData()),
        count: questions.length
      }
    });

  } catch (error: any) {
    console.error('❌ [RAG-API] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch RAG timer questions by session'
    });
  }
});

/**
 * Delete all RAG questions for a room
 * DELETE /api/rag-questions/room/:roomId
 */
router.delete('/room/:roomId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roomId } = req.params;

    const result = await ragService.deleteQuestionsByRoom(roomId);

    res.status(200).json({
      success: true,
      message: 'RAG questions deleted successfully',
      data: result
    });

  } catch (error: any) {
    console.error('❌ [RAG-API] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete RAG questions'
    });
  }
});

/**
 * Test RAG system connection
 * GET /api/rag-questions/test
 */
router.get('/test', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const groqService = require('../services/groqService').default;
    const cohereService = require('../services/cohereService').default;

    const groqTest = await groqService.testConnection();
    const cohereTest = await cohereService.testConnection();

    res.status(200).json({
      success: true,
      message: 'RAG system test completed',
      data: {
        groq: {
          connected: groqTest,
          model: process.env.GROQ_MODEL || 'llama-3.1-70b-versatile'
        },
        cohere: {
          connected: cohereTest,
          embedModel: process.env.COHERE_EMBED_MODEL || 'embed-english-v3.0',
          rerankModel: process.env.COHERE_RERANK_MODEL || 'rerank-english-v3.0'
        }
      }
    });

  } catch (error: any) {
    console.error('❌ [RAG-API] Test error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'RAG system test failed'
    });
  }
});

export default router;
