import { Router } from 'express';
import {
    getTranscriptsByMeeting,
    getFullTranscriptByMeeting,
    exportTranscriptAsText,
    deleteTranscriptsByMeeting,
    getTranscriptStats,
    saveTranscripts
} from '../controllers/transcript.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// POST /api/transcripts - Bulk save transcripts (no auth required for frontend audio capture)
router.post('/', saveTranscripts);

// All other routes require authentication
router.use(authenticate);

// GET /api/transcripts/:meetingId - Get all transcripts for a meeting
router.get('/:meetingId', getTranscriptsByMeeting);

// GET /api/transcripts/:meetingId/full - Get formatted full transcript
router.get('/:meetingId/full', getFullTranscriptByMeeting);

// GET /api/transcripts/:meetingId/export - Export transcript as text file
router.get('/:meetingId/export', exportTranscriptAsText);

// GET /api/transcripts/:meetingId/stats - Get transcript statistics
router.get('/:meetingId/stats', getTranscriptStats);

// DELETE /api/transcripts/:meetingId - Delete all transcripts for a meeting
router.delete('/:meetingId', deleteTranscriptsByMeeting);

export default router;