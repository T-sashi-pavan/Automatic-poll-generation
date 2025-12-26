import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  Play, 
  Trash2, 
  RefreshCw,
  Zap,
  Brain,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import GlassCard from './GlassCard';
import { apiService } from '../utils/api';
import { toast } from 'react-hot-toast';

interface RAGQuestion {
  id: string;
  type: 'MCQ' | 'TRUE_FALSE';
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  options?: string[];
  correctAnswer: string;
  correctIndex?: number;
  explanation: string;
  points?: number;
  ragModel: string;
  groqModel: string;
  contextUsed: string[];
  generationTime: number;
  tokensUsed: number;
  createdAt: string;
  segmentId?: string;
  transcriptId?: string;
}

interface RAGSegmentQuestion extends RAGQuestion {
  segmentId: string;
}

interface RAGTimerQuestion extends RAGQuestion {
  transcriptId: string;
}

interface RAGQuestionsSectionProps {
  roomId: string;
  onLaunchQuestion?: (question: RAGQuestion) => void;
}

const RAGQuestionsSection: React.FC<RAGQuestionsSectionProps> = ({
  roomId,
  onLaunchQuestion
}) => {
  const [segmentQuestions, setSegmentQuestions] = useState<RAGSegmentQuestion[]>([]);
  const [timerQuestions, setTimerQuestions] = useState<RAGTimerQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'segment' | 'timer'>('segment');
  
  // Slider state for RAG questions
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Fetch RAG segment questions
  const fetchSegmentQuestions = useCallback(async () => {
    if (!roomId) return;

    try {
      console.log(`🚀 [RAG-UI] Fetching segment questions for room: ${roomId}`);
      const response = await apiService.getRAGSegmentQuestionsByRoom(roomId);
      
      if (response.data.success && response.data.data) {
        const questions = response.data.data.questions;
        console.log(`🚀 [RAG-UI] Found ${questions.length} RAG segment questions`);
        setSegmentQuestions(questions);
      } else {
        setSegmentQuestions([]);
      }
    } catch (err) {
      console.error('❌ [RAG-UI] Error fetching segment questions:', err);
      setSegmentQuestions([]);
    }
  }, [roomId]);

  // Fetch RAG timer questions
  const fetchTimerQuestions = useCallback(async () => {
    if (!roomId) return;

    try {
      console.log(`🚀 [RAG-UI] Fetching timer questions for room: ${roomId}`);
      const response = await apiService.getRAGTimerQuestionsByRoom(roomId);
      
      if (response.data.success && response.data.data) {
        const questions = response.data.data.questions;
        console.log(`🚀 [RAG-UI] Found ${questions.length} RAG timer questions`);
        setTimerQuestions(questions);
      } else {
        setTimerQuestions([]);
      }
    } catch (err) {
      console.error('❌ [RAG-UI] Error fetching timer questions:', err);
      setTimerQuestions([]);
    }
  }, [roomId]);

  // Fetch all questions
  const fetchAllQuestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([fetchSegmentQuestions(), fetchTimerQuestions()]);
      const total = segmentQuestions.length + timerQuestions.length;
      if (total > 0) {
        toast.success(`🚀 Found ${total} RAG-based questions!`, {
          duration: 3000,
          icon: '🚀'
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [fetchSegmentQuestions, fetchTimerQuestions, segmentQuestions.length, timerQuestions.length]);

  // Initial fetch
  useEffect(() => {
    fetchAllQuestions();
  }, [roomId]); // Only depend on roomId

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const autoRefreshInterval = setInterval(() => {
      console.log('🔄 [RAG-UI] Auto-refreshing questions...');
      fetchSegmentQuestions();
      fetchTimerQuestions();
    }, 10000);
    
    return () => clearInterval(autoRefreshInterval);
  }, [fetchSegmentQuestions, fetchTimerQuestions]);

  // Reset question index when switching tabs
  useEffect(() => {
    setCurrentQuestionIndex(0);
  }, [activeTab]);

  // Listen for RAG question generation events
  useEffect(() => {
    const handleRAGQuestionsGenerated = () => {
      console.log('🔔 [RAG-UI] Received RAG questions generated event');
      fetchAllQuestions();
    };

    window.addEventListener('ragQuestionsGenerated', handleRAGQuestionsGenerated);
    
    return () => {
      window.removeEventListener('ragQuestionsGenerated', handleRAGQuestionsGenerated);
    };
  }, [fetchAllQuestions]);

  const handleLaunchQuestion = (question: RAGQuestion) => {
    if (onLaunchQuestion) {
      // Map RAG question format to expected format
      const mappedQuestion = {
        ...question,
        questionText: question.question, // Map 'question' field to 'questionText'
        type: question.type === 'MCQ' ? 'multiple_choice' : 'true_false' // Map type format
      };
      onLaunchQuestion(mappedQuestion as any);
    }
    toast.success(`🚀 Launching RAG question!`);
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Delete all RAG questions for this room?')) return;

    try {
      await apiService.deleteRAGQuestionsByRoom(roomId);
      toast.success('🗑️ All RAG questions deleted');
      setSegmentQuestions([]);
      setTimerQuestions([]);
    } catch (err) {
      toast.error('Failed to delete RAG questions');
      console.error(err);
    }
  };

  const currentQuestions = activeTab === 'segment' ? segmentQuestions : timerQuestions;
  const totalQuestions = segmentQuestions.length + timerQuestions.length;

  return (
    <GlassCard className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg">
            <Zap className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              🚀 RAG-Based Questions
              <span className="text-sm font-normal text-gray-400">
                (Groq + Cohere)
              </span>
            </h2>
            <p className="text-sm text-gray-400">
              Ultra-fast AI with semantic context
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAllQuestions}
            disabled={isLoading}
            className="p-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh questions"
          >
            <RefreshCw className={`w-5 h-5 text-purple-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          
          {totalQuestions > 0 && (
            <button
              onClick={handleDeleteAll}
              className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
              title="Delete all RAG questions"
            >
              <Trash2 className="w-5 h-5 text-red-400" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('segment')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            activeTab === 'segment'
              ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          📝 Segment Questions ({segmentQuestions.length})
        </button>
        <button
          onClick={() => setActiveTab('timer')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            activeTab === 'timer'
              ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          ⏱️ Timer Questions ({timerQuestions.length})
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
          <div className="text-2xl font-bold text-purple-400">{totalQuestions}</div>
          <div className="text-xs text-gray-400">Total Questions</div>
        </div>
        <div className="bg-pink-500/10 border border-pink-500/20 rounded-lg p-3">
          <div className="text-2xl font-bold text-pink-400">
            {currentQuestions.length > 0 
              ? `${(currentQuestions.reduce((sum, q) => sum + q.generationTime, 0) / currentQuestions.length / 1000).toFixed(1)}s`
              : '0s'}
          </div>
          <div className="text-xs text-gray-400">Avg Generation</div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-400">
            {currentQuestions.length > 0 
              ? Math.round(currentQuestions.reduce((sum, q) => sum + q.tokensUsed, 0) / currentQuestions.length)
              : 0}
          </div>
          <div className="text-xs text-gray-400">Avg Tokens</div>
        </div>
      </div>

      {/* Questions List with Slider */}
      {isLoading && currentQuestions.length === 0 ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Loading RAG questions...</p>
        </div>
      ) : currentQuestions.length === 0 ? (
        <div className="text-center py-12">
          <Brain className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No {activeTab} questions generated yet</p>
          <p className="text-sm text-gray-500 mt-2">
            Questions will appear here automatically as transcripts are saved
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Question Navigation Arrows */}
          {currentQuestions.length > 1 && (
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between items-center pointer-events-none z-10">
              <button
                onClick={() => {
                  setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1));
                }}
                disabled={currentQuestionIndex === 0}
                className="pointer-events-auto p-2 sm:p-3 bg-purple-600/80 hover:bg-purple-600 disabled:bg-gray-700/50 disabled:cursor-not-allowed rounded-full shadow-lg transition-all transform hover:scale-110 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </button>
              <button
                onClick={() => {
                  setCurrentQuestionIndex(Math.min(currentQuestions.length - 1, currentQuestionIndex + 1));
                }}
                disabled={currentQuestionIndex === currentQuestions.length - 1}
                className="pointer-events-auto p-2 sm:p-3 bg-purple-600/80 hover:bg-purple-600 disabled:bg-gray-700/50 disabled:cursor-not-allowed rounded-full shadow-lg transition-all transform hover:scale-110 disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </button>
            </div>
          )}

          {/* Current Question Display */}
          {currentQuestions[currentQuestionIndex] && (
            <motion.div
              key={currentQuestions[currentQuestionIndex].id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-gradient-to-br from-purple-500/5 to-pink-500/5 border border-purple-500/20 rounded-lg p-4 sm:p-5 hover:border-purple-500/40 transition-all min-h-[300px] sm:min-h-[350px]"
            >
              {/* Question Header */}
              <div className="flex flex-col gap-3 mb-3">
                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    currentQuestions[currentQuestionIndex].type === 'MCQ' 
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'bg-pink-500/20 text-pink-300'
                  }`}>
                    {currentQuestions[currentQuestionIndex].type}
                  </span>
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs font-medium">
                    {currentQuestions[currentQuestionIndex].difficulty}
                  </span>
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-300 rounded text-xs font-medium">
                    ⚡ {(currentQuestions[currentQuestionIndex].generationTime / 1000).toFixed(1)}s
                  </span>
                  <span className="text-xs text-gray-400">
                    Question {currentQuestionIndex + 1} of {currentQuestions.length}
                  </span>
                </div>
                <p className="text-white font-medium text-sm sm:text-lg">{currentQuestions[currentQuestionIndex].question}</p>
              </div>

              {/* Options */}
              {currentQuestions[currentQuestionIndex].options && currentQuestions[currentQuestionIndex].options!.length > 0 && (
                <div className="space-y-2 mb-3">
                  {currentQuestions[currentQuestionIndex].options!.map((option, idx) => (
                    <div
                      key={idx}
                      className={`p-2 sm:p-3 rounded-lg border transition-all ${
                        option === currentQuestions[currentQuestionIndex].correctAnswer
                          ? 'bg-green-500/20 border-green-500/50 text-green-300'
                          : 'bg-gray-800/50 border-gray-700 text-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                          option === currentQuestions[currentQuestionIndex].correctAnswer
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-700 text-gray-300'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="flex-1 text-sm sm:text-base">{option}</span>
                        {option === currentQuestions[currentQuestionIndex].correctAnswer && (
                          <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Explanation */}
              {currentQuestions[currentQuestionIndex].explanation && (
                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-2 sm:p-3 mb-3">
                  <p className="text-xs text-purple-400 mb-1">💡 Explanation:</p>
                  <p className="text-xs sm:text-sm text-gray-300">{currentQuestions[currentQuestionIndex].explanation}</p>
                </div>
              )}

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-500 mb-3">
                <span>🤖 {currentQuestions[currentQuestionIndex].groqModel}</span>
                <span>•</span>
                <span>🔢 {currentQuestions[currentQuestionIndex].tokensUsed} tokens</span>
                {currentQuestions[currentQuestionIndex].contextUsed.length > 0 && (
                  <>
                    <span>•</span>
                    <span>📚 {currentQuestions[currentQuestionIndex].contextUsed.length} context items</span>
                  </>
                )}
              </div>

              {/* Launch Button */}
              <button
                onClick={() => handleLaunchQuestion(currentQuestions[currentQuestionIndex])}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg flex items-center justify-center space-x-1 sm:space-x-2 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base"
              >
                <Play className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Launch Question</span>
              </button>
            </motion.div>
          )}

          {/* Pagination Dots */}
          {currentQuestions.length > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              {currentQuestions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentQuestionIndex 
                      ? 'w-8 bg-purple-500' 
                      : 'w-2 bg-gray-500 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-300">Error: {error}</p>
        </div>
      )}
    </GlassCard>
  );
};

export default RAGQuestionsSection;
