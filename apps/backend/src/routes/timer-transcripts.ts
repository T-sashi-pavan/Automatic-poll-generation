import { Router, Request, Response } from 'express';
import { WholeTimerTranscript } from '../web/models/wholeTimerTranscripts.model';
import { TimerQuestion } from '../web/models/timerQuestions.model';
import ServiceManager from '../services/serviceManager';
import { asyncHandler } from '../web/utils/asyncHandler';
import mongoose from 'mongoose';

console.log('⏱️ [TIMER-TRANSCRIPTS] Route file loading...');

const router = Router();

// POST /api/timer-transcripts/save
router.post('/save', asyncHandler(async (req: Request, res: Response) => {
  console.log('⏱️ [TIMER-TRANSCRIPTS] POST /save endpoint called');
  console.log('📝 [TIMER-TRANSCRIPTS] Request body:', req.body);
  
  try {
    const { 
      sessionId, 
      hostId, 
      roomId, 
      startTime, 
      endTime, 
      durationSelected, 
      combinedTranscript, 
      status,
      segmentCount
    } = req.body;

    // Validation
    if (!sessionId || !hostId || !durationSelected || !combinedTranscript || !status) {
      return res.status(400).json({
        error: 'Missing required fields: sessionId, hostId, durationSelected, combinedTranscript, and status are required'
      });
    }

    if (!combinedTranscript.trim()) {
      return res.status(400).json({
        error: 'combinedTranscript cannot be empty'
      });
    }

    // Check if this timer session already exists
    const existingTimer = await WholeTimerTranscript.findOne({
      sessionId,
      hostId,
      status: { $in: ['running', 'completed'] }
    });

    let timerTranscript;

    if (existingTimer) {
      // Update existing timer transcript
      console.log('⏱️ [TIMER-TRANSCRIPTS] Updating existing timer:', existingTimer._id);
      
      timerTranscript = await WholeTimerTranscript.findByIdAndUpdate(
        existingTimer._id,
        {
          endTime: endTime ? new Date(endTime) : new Date(),
          combinedTranscript: combinedTranscript.trim(),
          status,
          segmentCount: segmentCount || existingTimer.segmentCount,
          updatedAt: new Date()
        },
        { new: true }
      );
    } else {
      // Create new timer transcript
      console.log('⏱️ [TIMER-TRANSCRIPTS] Creating new timer transcript');
      
      timerTranscript = new WholeTimerTranscript({
        sessionId,
        hostId,
        roomId,
        startTime: startTime ? new Date(startTime) : new Date(),
        endTime: endTime ? new Date(endTime) : undefined,
        durationSelected: Number(durationSelected),
        combinedTranscript: combinedTranscript.trim(),
        status,
        segmentCount: segmentCount || 0
      });

      await timerTranscript.save();
    }

    if (!timerTranscript) {
      throw new Error('Failed to save timer transcript');
    }

    console.log('✅ [TIMER-TRANSCRIPTS] Timer transcript saved successfully:', timerTranscript._id);

    res.status(200).json({
      success: true,
      data: timerTranscript,
      message: 'Timer transcript saved successfully'
    });

  } catch (error) {
    console.error('❌ [TIMER-TRANSCRIPTS] Error saving timer transcript:', error);
    res.status(500).json({
      error: 'Internal server error while saving timer transcript',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// POST /api/timer-transcripts/generate-questions
router.post('/generate-questions', asyncHandler(async (req: Request, res: Response) => {
  console.log('⏱️ [TIMER-TRANSCRIPTS] POST /generate-questions endpoint called');
  console.log('📦 [TIMER-TRANSCRIPTS] Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { timerTranscriptId, aiProvider = 'ollama', questionCount = 5 } = req.body;
    
    console.log(`🤖 [TIMER-TRANSCRIPTS] AI Provider requested: ${aiProvider}`);
    console.log(`📊 [TIMER-TRANSCRIPTS] Question count: ${questionCount}`);

    if (!timerTranscriptId) {
      return res.status(400).json({
        error: 'timerTranscriptId is required'
      });
    }

    // Validate AI provider
    if (!['gemini', 'ollama'].includes(aiProvider)) {
      return res.status(400).json({
        error: 'Invalid aiProvider. Must be "gemini" or "ollama"'
      });
    }

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(timerTranscriptId)) {
      return res.status(400).json({
        error: 'Invalid timerTranscriptId format'
      });
    }

    // Find the timer transcript
    const timerTranscript = await WholeTimerTranscript.findById(timerTranscriptId);
    
    if (!timerTranscript) {
      return res.status(404).json({
        error: 'Timer transcript not found'
      });
    }

    if (!timerTranscript.combinedTranscript || timerTranscript.combinedTranscript.trim().length < 50) {
      return res.status(400).json({
        error: 'Timer transcript is too short to generate meaningful questions'
      });
    }

    console.log(`🤖 [TIMER-TRANSCRIPTS] Generating creative questions with ${aiProvider.toUpperCase()} for transcript:`, timerTranscriptId);

    // Generate creative questions using selected AI provider with multi-level fallback
    const serviceManager = ServiceManager.getInstance();
    let generatedQuestions;
    let actualProvider = aiProvider;
    let fallbackAttempted = false;
    
    try {
      generatedQuestions = await serviceManager.generateCreativeTimerQuestions(
        timerTranscript.combinedTranscript,
        aiProvider as 'gemini' | 'ollama'
      );
    } catch (error) {
      console.error(`❌ [TIMER-TRANSCRIPTS] ${aiProvider.toUpperCase()} failed:`, error);
      fallbackAttempted = true;
      
      // Fallback chain: Ollama -> Gemini -> RAG
      if (aiProvider === 'ollama') {
        console.log('🔄 [TIMER-TRANSCRIPTS] Falling back to Gemini...');
        try {
          generatedQuestions = await serviceManager.generateCreativeTimerQuestions(
            timerTranscript.combinedTranscript,
            'gemini'
          );
          actualProvider = 'gemini';
          console.log('✅ [TIMER-TRANSCRIPTS] Gemini fallback successful');
        } catch (geminiError) {
          console.error('❌ [TIMER-TRANSCRIPTS] Gemini fallback also failed:', geminiError);
          console.log('🔄 [TIMER-TRANSCRIPTS] Falling back to RAG (Groq)...');
          
          // Final fallback to RAG
          try {
            const ragService = serviceManager.getRagService();
            const ragQuestions = await ragService.generateTimerQuestions({
              transcriptText: timerTranscript.combinedTranscript,
              transcriptId: timerTranscriptId,
              sessionId: timerTranscript.sessionId,
              roomId: timerTranscript.roomId || 'unknown',
              hostId: timerTranscript.hostId,
              questionCount: 5
            });
            
            // Convert RAG questions to standard format
            generatedQuestions = ragQuestions.map((q: any) => ({
              id: q._id.toString(),
              type: q.type,
              difficulty: q.difficulty,
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation
            }));
            
            actualProvider = 'rag';
            console.log('✅ [TIMER-TRANSCRIPTS] RAG fallback successful');
          } catch (ragError) {
            console.error('❌ [TIMER-TRANSCRIPTS] All providers failed (Ollama, Gemini, RAG):', ragError);
            throw error; // Throw original error
          }
        }
      } else if (aiProvider === 'gemini') {
        // If Gemini fails, try RAG directly
        console.log('🔄 [TIMER-TRANSCRIPTS] Falling back to RAG (Groq)...');
        try {
          const ragService = serviceManager.getRagService();
          const ragQuestions = await ragService.generateTimerQuestions({
            transcriptText: timerTranscript.combinedTranscript,
            transcriptId: timerTranscriptId,
            sessionId: timerTranscript.sessionId,
            roomId: timerTranscript.roomId || 'unknown',
            hostId: timerTranscript.hostId,
            questionCount: 5
          });
          
          // Convert RAG questions to standard format
          generatedQuestions = ragQuestions.map((q: any) => ({
            id: q._id.toString(),
            type: q.type,
            difficulty: q.difficulty,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation
          }));
          
          actualProvider = 'rag';
          console.log('✅ [TIMER-TRANSCRIPTS] RAG fallback successful');
        } catch (ragError) {
          console.error('❌ [TIMER-TRANSCRIPTS] All providers failed (Gemini, RAG):', ragError);
          throw error; // Throw original error
        }
      } else {
        throw error;
      }
    }

    if (!generatedQuestions || generatedQuestions.length === 0) {
      return res.status(500).json({
        error: 'Failed to generate creative questions from timer transcript'
      });
    }

    // Save questions to TimerQuestion collection
    const savedQuestions = [];
    const questionIds = [];

    for (const questionData of generatedQuestions) {
      const timerQuestion = new TimerQuestion({
        id: questionData.id,
        type: questionData.type,
        difficulty: questionData.difficulty,
        question: questionData.question,
        options: questionData.options,
        correctAnswer: questionData.correctAnswer,
        explanation: questionData.explanation,
        isTimerBased: true,
        sourceTranscriptId: new mongoose.Types.ObjectId(timerTranscriptId),
        sessionId: timerTranscript.sessionId,
        roomId: timerTranscript.roomId,
        hostId: timerTranscript.hostId
      });

      const saved = await timerQuestion.save();
      savedQuestions.push(saved.getFormattedData());
      questionIds.push(saved._id);
    }

    // Update timer transcript with question generation flag and IDs
    await WholeTimerTranscript.findByIdAndUpdate(timerTranscriptId, {
      questionsGenerated: true,
      questionIds: questionIds,
      updatedAt: new Date()
    });

    console.log(`✅ [TIMER-TRANSCRIPTS] Creative questions generated and saved successfully using ${actualProvider.toUpperCase()}:`, savedQuestions.length);

    // Determine provider label with fallback indication
    let providerLabel: string;
    if (actualProvider === 'rag') {
      providerLabel = '🔧 Generated by RAG (Groq + Cohere) - Fallback Mode';
    } else if (actualProvider === 'ollama') {
      providerLabel = fallbackAttempted ? '🦙 Generated by Ollama (Fallback)' : '🦙 Generated by Ollama (Local AI)';
    } else {
      providerLabel = fallbackAttempted ? '🤖 Generated by Gemini AI (Fallback)' : '🤖 Generated by Gemini AI';
    }

    res.status(200).json({
      success: true,
      data: {
        timerTranscriptId,
        questions: savedQuestions,
        transcriptLength: timerTranscript.combinedTranscript.length,
        segmentCount: timerTranscript.segmentCount,
        aiProvider: actualProvider,
        fallbackUsed: fallbackAttempted,
        providerLabel
      },
      message: `Generated ${savedQuestions.length} creative questions from timer transcript using ${actualProvider.toUpperCase()}${fallbackAttempted ? ' (fallback)' : ''}`
    });

  } catch (error) {
    console.error('❌ [TIMER-TRANSCRIPTS] Error generating questions:', error);
    res.status(500).json({
      error: 'Internal server error while generating questions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// GET /api/timer-transcripts/creative-questions/:roomId - Get creative timer questions for a room
router.get('/creative-questions/:roomId', asyncHandler(async (req: Request, res: Response) => {
  console.log('🎯 [TIMER-TRANSCRIPTS] GET /creative-questions/:roomId endpoint called');
  
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({
        error: 'roomId is required'
      });
    }

    // Find timer questions for this room
    const timerQuestions = await TimerQuestion.findByRoom(roomId, 50);
    
    console.log(`🎯 [TIMER-TRANSCRIPTS] Found ${timerQuestions.length} creative timer questions for room: ${roomId}`);

    if (timerQuestions.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        count: 0,
        totalQuestions: 0,
        message: 'No timer questions found for this room'
      });
    }

    // Group questions by their source transcript
    const questionsByTranscript = timerQuestions.reduce((acc: any, question: any) => {
      // Handle both populated and non-populated sourceTranscriptId
      const transcriptId = question.sourceTranscriptId._id 
        ? question.sourceTranscriptId._id.toString() 
        : question.sourceTranscriptId.toString();
      
      // Only process questions with valid ObjectId transcript references
      if (mongoose.Types.ObjectId.isValid(transcriptId)) {
        if (!acc[transcriptId]) {
          acc[transcriptId] = {
            transcriptId,
            sessionId: question.sessionId,
            questions: []
          };
        }
        acc[transcriptId].questions.push(question.getFormattedData());
      }
      return acc;
    }, {} as Record<string, any>);

    // Get transcript metadata for each group
    const transcriptIds = Object.keys(questionsByTranscript);
    
    if (transcriptIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        count: 0,
        totalQuestions: timerQuestions.length,
        message: 'No questions with valid transcript references found'
      });
    }
    
    const objectIds = transcriptIds.map(id => new mongoose.Types.ObjectId(id));
    const transcripts = await WholeTimerTranscript.find({
      _id: { $in: objectIds }
    });

    // Combine questions with transcript metadata
    const timerQuestionSets = transcripts.map((transcript: any) => {
      const questionGroup = questionsByTranscript[transcript._id.toString()];
      return {
        _id: transcript._id,
        sessionId: transcript.sessionId,
        questions: questionGroup.questions,
        summary: `Creative Timer Questions: ${Math.ceil(transcript.durationSelected / 60000)} minutes, ${questionGroup.questions.length} questions`,
        generatedAt: transcript.updatedAt,
        status: transcript.status,
        segmentNumber: 1,
        timerSession: {
          sessionId: transcript.sessionId,
          duration: transcript.durationSelected,
          transcriptCount: 1,
          segmentCount: transcript.segmentCount,
          combinedTranscript: transcript.combinedTranscript
        }
      };
    }).sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());

    res.status(200).json({
      success: true,
      data: timerQuestionSets,
      count: timerQuestionSets.length,
      totalQuestions: timerQuestions.length
    });

  } catch (error) {
    console.error('❌ [TIMER-TRANSCRIPTS] Error fetching creative timer questions:', error);
    res.status(500).json({
      error: 'Internal server error while fetching creative timer questions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// GET /api/timer-transcripts/by-session/:sessionId
router.get('/by-session/:sessionId', asyncHandler(async (req: Request, res: Response) => {
  console.log('⏱️ [TIMER-TRANSCRIPTS] GET /by-session endpoint called');
  
  try {
    const { sessionId } = req.params;
    const { hostId } = req.query;

    if (!sessionId) {
      return res.status(400).json({
        error: 'sessionId is required'
      });
    }

    // Build query
    const query: any = { sessionId };
    if (hostId) {
      query.hostId = hostId;
    }

    // Find timer transcripts for this session
    const timerTranscripts = await WholeTimerTranscript.find(query)
      .sort({ createdAt: -1 })
      .limit(10); // Limit to latest 10 timer transcripts

    console.log(`⏱️ [TIMER-TRANSCRIPTS] Found ${timerTranscripts.length} timer transcripts for session: ${sessionId}`);

    res.status(200).json({
      success: true,
      data: timerTranscripts,
      count: timerTranscripts.length
    });

  } catch (error) {
    console.error('❌ [TIMER-TRANSCRIPTS] Error fetching timer transcripts:', error);
    res.status(500).json({
      error: 'Internal server error while fetching timer transcripts',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// GET /api/timer-transcripts/:id
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  console.log('⏱️ [TIMER-TRANSCRIPTS] GET /:id endpoint called');
  
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid timer transcript ID format'
      });
    }

    const timerTranscript = await WholeTimerTranscript.findById(id);
    
    if (!timerTranscript) {
      return res.status(404).json({
        error: 'Timer transcript not found'
      });
    }

    console.log('⏱️ [TIMER-TRANSCRIPTS] Timer transcript found:', id);

    res.status(200).json({
      success: true,
      data: timerTranscript
    });

  } catch (error) {
    console.error('❌ [TIMER-TRANSCRIPTS] Error fetching timer transcript:', error);
    res.status(500).json({
      error: 'Internal server error while fetching timer transcript',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// GET /api/timer-transcripts/questions/:roomId - Get all timer questions for a room
router.get('/questions/:roomId', asyncHandler(async (req: Request, res: Response) => {
  console.log('⏱️ [TIMER-TRANSCRIPTS] GET /questions/:roomId endpoint called');
  
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({
        error: 'roomId is required'
      });
    }

    // Find timer transcripts with generated questions for this room
    const timerTranscripts = await WholeTimerTranscript.find({
      roomId,
      questionsGenerated: true,
      questionIds: { $exists: true, $ne: [] }
    })
    .sort({ createdAt: -1 })
    .limit(20); // Limit to latest 20 timer sessions

    console.log(`⏱️ [TIMER-TRANSCRIPTS] Found ${timerTranscripts.length} timer transcripts with questions for room: ${roomId}`);

    // For now, we'll generate mock questions since they're stored as IDs
    // In a complete implementation, you'd fetch actual stored questions
    const timerQuestionSets = timerTranscripts.map(transcript => {
      // Generate mock questions based on the stored question IDs
      const questions = transcript.questionIds?.map((questionId, index) => ({
        id: questionId,
        type: ['multiple_choice', 'true_false'][index % 2] as 'multiple_choice' | 'true_false',
        difficulty: ['easy', 'medium', 'hard'][index % 3] as 'easy' | 'medium' | 'hard',
        questionText: `Question ${index + 1} from timer session (${transcript.sessionId})`,
        options: ['multiple_choice'].includes(['multiple_choice', 'true_false'][index % 2]) 
          ? [`Option A for session ${transcript.sessionId}`, `Option B for session ${transcript.sessionId}`, `Option C for session ${transcript.sessionId}`, `Option D for session ${transcript.sessionId}`]
          : undefined,
        correctIndex: Math.floor(Math.random() * 4),
        explanation: `This question was generated from a ${Math.ceil(transcript.durationSelected / 60000)}-minute timer session.`,
        points: 1,
        source: 'timer-transcript',
        generatedAt: transcript.updatedAt,
        transcriptLength: transcript.combinedTranscript?.length || 0
      })) || [];

      return {
        _id: transcript._id,
        sessionId: transcript.sessionId,
        questions,
        summary: `Timer session: ${Math.ceil(transcript.durationSelected / 60000)} minutes, ${transcript.segmentCount} segments`,
        generatedAt: transcript.updatedAt,
        status: transcript.status,
        segmentNumber: 1, // Could be derived from other data
        timerSession: {
          sessionId: transcript.sessionId,
          duration: transcript.durationSelected,
          transcriptCount: transcript.segmentCount,
          segmentCount: transcript.segmentCount,
          combinedTranscript: transcript.combinedTranscript
        }
      };
    });

    res.status(200).json({
      success: true,
      data: timerQuestionSets,
      count: timerQuestionSets.length
    });

  } catch (error) {
    console.error('❌ [TIMER-TRANSCRIPTS] Error fetching timer questions:', error);
    res.status(500).json({
      error: 'Internal server error while fetching timer questions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// GET /api/timer-transcripts/with-questions/:roomId - Get timer transcripts with full question data
router.get('/with-questions/:roomId', asyncHandler(async (req: Request, res: Response) => {
  console.log('⏱️ [TIMER-TRANSCRIPTS] GET /with-questions/:roomId endpoint called');
  
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({
        error: 'roomId is required'
      });
    }

    // Find all timer transcripts for this room with questions
    const timerTranscripts = await WholeTimerTranscript.find({
      roomId,
      questionsGenerated: true
    })
    .sort({ createdAt: -1 })
    .limit(10);

    console.log(`⏱️ [TIMER-TRANSCRIPTS] Found ${timerTranscripts.length} timer transcripts with questions for room: ${roomId}`);

    // Process each transcript and regenerate questions using the stored transcript content
    const timerQuestionSets = [];
    
    for (const transcript of timerTranscripts) {
      if (transcript.combinedTranscript && transcript.combinedTranscript.length > 50) {
        try {
          // Re-generate questions from the stored transcript
          const serviceManager = ServiceManager.getInstance();
          const questions = await serviceManager.generateTimerQuestions(transcript.combinedTranscript);

          timerQuestionSets.push({
            _id: transcript._id,
            sessionId: transcript.sessionId,
            questions: questions.map(q => ({
              ...q,
              source: 'timer-transcript'
            })),
            summary: `Timer session: ${Math.ceil(transcript.durationSelected / 60000)} minutes - ${questions.length} questions generated`,
            generatedAt: transcript.updatedAt,
            status: transcript.status,
            segmentNumber: timerQuestionSets.length + 1,
            timerSession: {
              sessionId: transcript.sessionId,
              duration: transcript.durationSelected,
              transcriptCount: 1,
              segmentCount: transcript.segmentCount,
              combinedTranscript: transcript.combinedTranscript
            }
          });
        } catch (error) {
          console.warn(`⚠️ [TIMER-TRANSCRIPTS] Failed to generate questions for transcript ${transcript._id}:`, error);
          // Continue with other transcripts
        }
      }
    }

    res.status(200).json({
      success: true,
      data: timerQuestionSets,
      count: timerQuestionSets.length
    });

  } catch (error) {
    console.error('❌ [TIMER-TRANSCRIPTS] Error fetching timer transcripts with questions:', error);
    res.status(500).json({
      error: 'Internal server error while fetching timer transcripts with questions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

export default router;