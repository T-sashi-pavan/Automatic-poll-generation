import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  Play, 
  Trash2, 
  RefreshCw,
  Clock,
  Brain,
  Target,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import GlassCard from './GlassCard';
import { apiService } from '../utils/api';
import { toast } from 'react-hot-toast';

interface TimerQuestion {
  id: string;
  type: 'MCQ' | 'TRUE_FALSE' | 'SHORT';
  difficulty: 'easy' | 'medium' | 'hard';
  questionText: string;
  options?: string[];
  correctAnswer: string;
  correctIndex?: number;
  explanation: string;
  points: number;
  source: string;
  isTimerBased: boolean;
  createdAt: string;
}

interface TimerQuestionSet {
  _id: string;
  sessionId: string;
  questions: TimerQuestion[];
  summary: string;
  generatedAt: string;
  status: string;
  segmentNumber: number;
  timerSession: {
    sessionId: string;
    duration: number;
    transcriptCount: number;
    segmentCount: number;
    combinedTranscript: string;
  };
}

interface TimerBasedQuestionsSectionProps {
  roomId: string;
  onLaunchQuestion?: (question: TimerQuestion) => void;
}

const TimerBasedQuestionsSection: React.FC<TimerBasedQuestionsSectionProps> = ({
  roomId,
  onLaunchQuestion
}) => {
  const [timerQuestions, setTimerQuestions] = useState<TimerQuestionSet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Slider state for timer questions
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Fetch creative timer questions from backend
  const fetchTimerQuestions = useCallback(async () => {
    if (!roomId) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log(`🎯 [TIMER-QUESTIONS-UI] Fetching creative timer questions for room: ${roomId}`);
      
      const response = await apiService.getCreativeTimerQuestions(roomId);
      
      if (response.data.success && response.data.data) {
        const questionSets = response.data.data;
        console.log(`🎯 [TIMER-QUESTIONS-UI] Found ${questionSets.length} timer question sets`);
        console.log(`🎯 [TIMER-QUESTIONS-UI] Total questions: ${response.data.totalQuestions}`);
        
        setTimerQuestions(questionSets);
        
        if (questionSets.length > 0) {
          toast.success(`🎯 Found ${response.data.totalQuestions} creative timer questions!`, {
            duration: 3000,
            icon: '🕒'
          });
        }
      } else {
        console.log('🎯 [TIMER-QUESTIONS-UI] No timer questions found');
        setTimerQuestions([]);
      }
    } catch (err) {
      console.error('❌ [TIMER-QUESTIONS-UI] Error fetching timer questions:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setTimerQuestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  // Initial fetch
  useEffect(() => {
    fetchTimerQuestions();
  }, [fetchTimerQuestions]);

  // Listen for timer completion events
  useEffect(() => {
    const handleTimerQuestionsGenerated = () => {
      console.log('🔄 [TIMER-QUESTIONS-UI] Timer questions generated event received');
      
      // Refresh questions after new generation
      setTimeout(() => {
        fetchTimerQuestions();
      }, 1000);
    };

    window.addEventListener('timerQuestionsGenerated', handleTimerQuestionsGenerated as EventListener);
    
    return () => {
      window.removeEventListener('timerQuestionsGenerated', handleTimerQuestionsGenerated as EventListener);
    };
  }, [fetchTimerQuestions]);

  // Get total question count
  const getTotalQuestionCount = useCallback(() => {
    return timerQuestions.reduce((total, set) => total + set.questions.length, 0);
  }, [timerQuestions]);

  // Calculate correct index for a question if not already set
  const getCorrectIndex = useCallback((question: TimerQuestion): number | undefined => {
    // If correctIndex is already set, return it
    if (question.correctIndex !== undefined && question.correctIndex !== null && question.correctIndex !== -1) {
      return question.correctIndex;
    }

    // Try to calculate from correctAnswer and options
    if (!question.options || !question.correctAnswer) {
      return undefined;
    }

    if (question.type === 'MCQ') {
      // Try exact match first
      let index = question.options.findIndex(option => 
        option.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim()
      );
      
      if (index !== -1) return index;

      // Try to parse as letter (A, B, C, D)
      const letterToIndex: { [key: string]: number } = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
      const answerLetter = question.correctAnswer.toUpperCase().trim();
      if (letterToIndex[answerLetter] !== undefined) {
        return letterToIndex[answerLetter];
      }

      // Try to parse as number (1-based)
      const answerNum = parseInt(question.correctAnswer);
      if (!isNaN(answerNum) && answerNum >= 1 && answerNum <= question.options.length) {
        return answerNum - 1; // Convert to 0-based
      }

      // Try to find the option that contains the correct answer
      index = question.options.findIndex(option => 
        option.toLowerCase().includes(question.correctAnswer.toLowerCase()) ||
        question.correctAnswer.toLowerCase().includes(option.toLowerCase())
      );
      
      return index !== -1 ? index : undefined;
    }

    if (question.type === 'TRUE_FALSE') {
      const answer = question.correctAnswer.toLowerCase().trim();
      return (answer === 'true' || answer === '1' || answer === 'yes') ? 0 : 1;
    }

    return undefined;
  }, []);

  // Clear questions from UI
  const clearTimerQuestions = useCallback(() => {
    setTimerQuestions([]);
    toast.success('🧹 Cleared timer questions from UI', { duration: 3000 });
  }, []);

  // Handle question launch - Convert timer question to format expected by launchQuestion
  const handleLaunchQuestion = (question: TimerQuestion) => {
    if (onLaunchQuestion) {
      // Use the same function to calculate correctIndex
      const correctIndex = getCorrectIndex(question);
      
      const convertedQuestion = {
        id: question.id,
        type: question.type === 'MCQ' ? 'multiple_choice' : 
              question.type === 'TRUE_FALSE' ? 'true_false' : 'short_answer',
        difficulty: question.difficulty,
        questionText: question.questionText || question.question, // Handle both field names
        options: question.options,
        correctAnswer: question.correctAnswer,
        correctIndex: correctIndex,
        explanation: question.explanation,
        points: question.points
      };
      
      console.log('🚀 [TIMER-LAUNCH] Converting timer question for launch:', {
        original: question,
        converted: convertedQuestion,
        calculatedCorrectIndex: correctIndex
      });
      
      onLaunchQuestion(convertedQuestion);
    } else {
      console.error('❌ [TIMER-LAUNCH] Question launch handler not available');
      toast.error('Question launch handler not available');
    }
  };

  // Get difficulty color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'hard': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  // Get type badge color
  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'MCQ': return 'bg-blue-500/20 text-blue-300';
      case 'TRUE_FALSE': return 'bg-purple-500/20 text-purple-300';
      case 'SHORT': return 'bg-orange-500/20 text-orange-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  if (timerQuestions.length === 0 && !isLoading && !error) {
    return null; // Don't show section if no questions
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-yellow-600 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              🕒 Timer-Based Questions
              <span className="text-sm bg-orange-500/20 text-orange-300 px-2 py-1 rounded-full">
                CREATIVE
              </span>
            </h2>
            <p className="text-gray-400">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Loading creative questions...
                </span>
              ) : (
                <>
                  🎯 {getTotalQuestionCount()} creative questions from {timerQuestions.length} timer sessions
                  <br />
                  <span className="text-sm italic">
                    "These questions are generated after analyzing the complete session content."
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchTimerQuestions}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2 transition-colors text-sm"
            title="Refresh timer questions"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={clearTimerQuestions}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center space-x-2 transition-colors"
            title="Clear all timer questions from UI"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm">Error: {error}</p>
        </div>
      )}

      {/* Timer Session Slider */}
      {timerQuestions.length > 0 && (
        <div className="relative">
          {/* Session Navigation Arrows */}
          {timerQuestions.length > 1 && (
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between items-center pointer-events-none z-10">
              <button
                onClick={() => {
                  setCurrentSessionIndex(Math.max(0, currentSessionIndex - 1));
                  setCurrentQuestionIndex(0);
                }}
                disabled={currentSessionIndex === 0}
                className="pointer-events-auto p-2 sm:p-3 bg-orange-600/80 hover:bg-orange-600 disabled:bg-gray-700/50 disabled:cursor-not-allowed rounded-full shadow-lg transition-all transform hover:scale-110 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </button>
              <button
                onClick={() => {
                  setCurrentSessionIndex(Math.min(timerQuestions.length - 1, currentSessionIndex + 1));
                  setCurrentQuestionIndex(0);
                }}
                disabled={currentSessionIndex === timerQuestions.length - 1}
                className="pointer-events-auto p-2 sm:p-3 bg-orange-600/80 hover:bg-orange-600 disabled:bg-gray-700/50 disabled:cursor-not-allowed rounded-full shadow-lg transition-all transform hover:scale-110 disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </button>
            </div>
          )}

          {/* Current Timer Session Display */}
          {timerQuestions[currentSessionIndex] && (
            <motion.div
              key={timerQuestions[currentSessionIndex]._id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 rounded-lg p-4 sm:p-5 border border-orange-500/20"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-orange-600 to-yellow-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                      Creative Timer Session {currentSessionIndex + 1}
                      <Target className="w-3 h-3 sm:w-4 sm:h-4 text-orange-400" />
                    </h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-gray-400">
                      <span>⏱️ {Math.ceil(timerQuestions[currentSessionIndex].timerSession.duration / 60000)}-min timer</span>
                      <span>📝 {timerQuestions[currentSessionIndex].questions.length} questions</span>
                      <span>🎯 {timerQuestions[currentSessionIndex].timerSession.segmentCount} segments</span>
                      <span className="text-orange-300">Session {currentSessionIndex + 1} of {timerQuestions.length}</span>
                      <span>📅 {new Date(timerQuestions[currentSessionIndex].generatedAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {timerQuestions[currentSessionIndex].summary && (
                <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <p className="text-orange-300 text-xs sm:text-sm italic">"{timerQuestions[currentSessionIndex].summary}"</p>
                </div>
              )}

              {/* Question Slider within Session */}
              <div className="relative">
                {timerQuestions[currentSessionIndex].questions.length > 1 && (
                  <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between items-center pointer-events-none z-10">
                    <button
                      onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                      disabled={currentQuestionIndex === 0}
                      className="pointer-events-auto p-2 bg-yellow-600/80 hover:bg-yellow-600 disabled:bg-gray-700/50 disabled:cursor-not-allowed rounded-full shadow-lg transition-all transform hover:scale-110 disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </button>
                    <button
                      onClick={() => setCurrentQuestionIndex(Math.min(timerQuestions[currentSessionIndex].questions.length - 1, currentQuestionIndex + 1))}
                      disabled={currentQuestionIndex === timerQuestions[currentSessionIndex].questions.length - 1}
                      className="pointer-events-auto p-2 bg-yellow-600/80 hover:bg-yellow-600 disabled:bg-gray-700/50 disabled:cursor-not-allowed rounded-full shadow-lg transition-all transform hover:scale-110 disabled:opacity-50"
                    >
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </button>
                  </div>
                )}

                {/* Current Question Display */}
                {timerQuestions[currentSessionIndex].questions[currentQuestionIndex] && (
                  <motion.div
                    key={timerQuestions[currentSessionIndex].questions[currentQuestionIndex].id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="bg-black/20 rounded-lg p-3 sm:p-4 border border-gray-600/30 hover:border-orange-500/30 transition-all min-h-[300px] sm:min-h-[350px]"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-2 sm:mb-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${getTypeBadgeColor(timerQuestions[currentSessionIndex].questions[currentQuestionIndex].type)}`}>
                            {timerQuestions[currentSessionIndex].questions[currentQuestionIndex].type.replace('_', ' ')}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full bg-gray-600/30 ${getDifficultyColor(timerQuestions[currentSessionIndex].questions[currentQuestionIndex].difficulty)}`}>
                            {timerQuestions[currentSessionIndex].questions[currentQuestionIndex].difficulty.toUpperCase()}
                          </span>
                          <span className="text-xs bg-gradient-to-r from-orange-600/20 to-yellow-600/20 text-orange-300 px-2 py-1 rounded-full border border-orange-500/30">
                            🎯 CREATIVE
                          </span>
                          <span className="text-xs text-gray-400">
                            Question {currentQuestionIndex + 1} of {timerQuestions[currentSessionIndex].questions.length}
                          </span>
                        </div>
                        
                        <p className="text-white font-medium mb-2 sm:mb-3 text-sm sm:text-lg leading-relaxed">
                          {timerQuestions[currentSessionIndex].questions[currentQuestionIndex].questionText}
                        </p>
                        
                        {timerQuestions[currentSessionIndex].questions[currentQuestionIndex].options && timerQuestions[currentSessionIndex].questions[currentQuestionIndex].options!.length > 0 && (
                          <div className="space-y-2 mb-2 sm:mb-3">
                            {timerQuestions[currentSessionIndex].questions[currentQuestionIndex].options!.map((option, optIndex) => {
                              const correctIdx = getCorrectIndex(timerQuestions[currentSessionIndex].questions[currentQuestionIndex]);
                              const isCorrect = correctIdx === optIndex;
                              
                              return (
                                <div 
                                  key={optIndex} 
                                  className={`p-2 sm:p-3 rounded-lg border transition-all ${
                                    isCorrect
                                      ? 'bg-green-500/20 border-green-500/50 text-green-300'
                                      : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-700/50'
                                  }`}
                                >
                                  <div className="flex items-center space-x-2 sm:space-x-3">
                                    <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                                      isCorrect
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-700 text-gray-300'
                                    }`}>
                                      {String.fromCharCode(65 + optIndex)}
                                    </span>
                                    <span className="flex-1 text-sm sm:text-base">{option}</span>
                                    {isCorrect && (
                                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {timerQuestions[currentSessionIndex].questions[currentQuestionIndex].type === 'TRUE_FALSE' && (
                          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mb-2 sm:mb-3">
                            {['True', 'False'].map((option, optIndex) => {
                              const correctIdx = getCorrectIndex(timerQuestions[currentSessionIndex].questions[currentQuestionIndex]);
                              const isCorrect = correctIdx === optIndex;
                              
                              return (
                                <div 
                                  key={option}
                                  className={`p-2 sm:p-3 rounded-lg border flex-1 text-center transition-all ${
                                    isCorrect
                                      ? 'bg-green-500/20 border-green-500/50 text-green-300'
                                      : 'bg-gray-800/50 border-gray-700 text-gray-300'
                                  }`}
                                >
                                  <div className="flex items-center justify-center space-x-2">
                                    <span className="text-sm sm:text-base">{option}</span>
                                    {isCorrect && (
                                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {timerQuestions[currentSessionIndex].questions[currentQuestionIndex].explanation && (
                          <div className="p-2 sm:p-3 bg-gradient-to-r from-orange-500/10 to-yellow-500/10 rounded border-l-4 border-orange-500">
                            <p className="text-xs sm:text-sm text-gray-300">
                              <strong className="text-orange-400">💡 Explanation:</strong> {timerQuestions[currentSessionIndex].questions[currentQuestionIndex].explanation}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => handleLaunchQuestion(timerQuestions[currentSessionIndex].questions[currentQuestionIndex])}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 text-white rounded-lg flex items-center justify-center space-x-1 sm:space-x-2 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base"
                      >
                        <Play className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>Launch Question</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Pagination Dots for Sessions */}
      {timerQuestions.length > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          {timerQuestions.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentSessionIndex(index);
                setCurrentQuestionIndex(0);
              }}
              className={`h-2 rounded-full transition-all ${
                index === currentSessionIndex 
                  ? 'w-8 bg-orange-500' 
                  : 'w-2 bg-gray-500 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      )}

      {isLoading && timerQuestions.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="w-8 h-8 text-white animate-spin" />
          </div>
          <p className="text-gray-400">Loading creative timer questions...</p>
        </div>
      )}

      {!isLoading && timerQuestions.length === 0 && !error && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No Timer Questions Yet</h3>
          <p className="text-gray-400 max-w-md mx-auto">
            Complete a timer session to generate creative, attention-grabbing questions from your discussion content.
          </p>
          <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg max-w-md mx-auto">
            <p className="text-orange-300 text-sm">
              🎯 <strong>Tip:</strong> Timer questions are different from segment questions - they analyze your entire discussion holistically!
            </p>
          </div>
        </div>
      )}
    </GlassCard>
  );
};

export default TimerBasedQuestionsSection;