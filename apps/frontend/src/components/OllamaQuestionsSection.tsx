import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  Play, 
  Trash2, 
  RefreshCw,
  Zap,
  Brain,
  Sparkles
} from 'lucide-react';
import GlassCard from './GlassCard';
import { apiService } from '../utils/api';
import { toast } from 'react-hot-toast';

interface OllamaQuestion {
  id: string;
  type: 'MCQ' | 'TRUE_FALSE';
  difficulty: 'easy' | 'medium' | 'hard';
  questionText: string;
  options?: string[];
  correctAnswer: string;
  correctIndex?: number;
  explanation: string;
  points: number;
  source: string;
  isOllamaBased: boolean;
  ollamaModel: string;
  createdAt: string;
}

interface OllamaQuestionsSectionProps {
  roomId: string;
  onLaunchQuestion?: (question: OllamaQuestion) => void;
}

const OllamaQuestionsSection: React.FC<OllamaQuestionsSectionProps> = ({
  roomId,
  onLaunchQuestion
}) => {
  const [ollamaQuestions, setOllamaQuestions] = useState<OllamaQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Ollama questions from backend
  const fetchOllamaQuestions = useCallback(async () => {
    if (!roomId) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log(`🦙 [OLLAMA-QUESTIONS-UI] Fetching Ollama questions for room: ${roomId}`);
      
      const response = await apiService.getOllamaQuestionsByRoom(roomId);
      
      if (response.data.success && response.data.data) {
        const questions = response.data.data.questions;
        console.log(`🦙 [OLLAMA-QUESTIONS-UI] Found ${questions.length} Ollama questions`);
        
        setOllamaQuestions(questions);
        
        if (questions.length > 0) {
          toast.success(`🦙 Found ${questions.length} Ollama-based questions!`, {
            duration: 3000,
            icon: '🦙'
          });
        }
      } else {
        console.log('🦙 [OLLAMA-QUESTIONS-UI] No Ollama questions found');
        setOllamaQuestions([]);
      }
    } catch (err) {
      console.error('❌ [OLLAMA-QUESTIONS-UI] Error fetching Ollama questions:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setOllamaQuestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  // Initial fetch
  useEffect(() => {
    fetchOllamaQuestions();
  }, [fetchOllamaQuestions]);

  // Auto-refresh every 15 seconds to catch background-generated questions
  useEffect(() => {
    const autoRefreshInterval = setInterval(() => {
      console.log('🔄 [OLLAMA-QUESTIONS-UI] Auto-refreshing to check for new questions...');
      fetchOllamaQuestions();
    }, 15000); // Every 15 seconds
    
    return () => clearInterval(autoRefreshInterval);
  }, [fetchOllamaQuestions]);

  // Listen for Ollama question generation events
  useEffect(() => {
    const handleOllamaQuestionsGenerated = () => {
      console.log('🔄 [OLLAMA-QUESTIONS-UI] Ollama questions generated event received');
      
      // Refresh questions after new generation
      setTimeout(() => {
        fetchOllamaQuestions();
      }, 1000);
    };

    window.addEventListener('ollamaQuestionsGenerated', handleOllamaQuestionsGenerated as EventListener);
    
    return () => {
      window.removeEventListener('ollamaQuestionsGenerated', handleOllamaQuestionsGenerated as EventListener);
    };
  }, [fetchOllamaQuestions]);

  // Delete all Ollama questions for this room
  const deleteOllamaQuestions = useCallback(async () => {
    if (!roomId) return;

    const confirmed = window.confirm('Are you sure you want to delete all Ollama-based questions?');
    if (!confirmed) return;

    try {
      console.log(`🗑️ [OLLAMA-QUESTIONS-UI] Deleting Ollama questions for room: ${roomId}`);
      
      const response = await apiService.deleteOllamaQuestionsByRoom(roomId);
      
      if (response.data.success) {
        toast.success(`🗑️ Deleted ${response.data.data.deletedCount} Ollama questions`, {
          duration: 3000
        });
        
        setOllamaQuestions([]);
      }
    } catch (err) {
      console.error('❌ [OLLAMA-QUESTIONS-UI] Error deleting Ollama questions:', err);
      toast.error('Failed to delete Ollama questions');
    }
  }, [roomId]);

  // Handle question launch - Convert Ollama question to format expected by launchQuestion
  const handleLaunchQuestion = (question: OllamaQuestion) => {
    if (onLaunchQuestion) {
      // Convert Ollama question format to the format expected by launchQuestion function
      let correctIndex = question.correctIndex;
      
      // Calculate correctIndex if not available
      if (correctIndex === undefined && question.options && question.correctAnswer) {
        if (question.type === 'MCQ') {
          // Find the index of the correct answer in the options array
          correctIndex = question.options.findIndex(option => 
            option.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim()
          );
          
          // If not found by exact match, try to parse as letter (A, B, C, D)
          if (correctIndex === -1) {
            const letterToIndex = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
            const answerLetter = question.correctAnswer.toUpperCase().trim();
            correctIndex = letterToIndex[answerLetter as keyof typeof letterToIndex];
          }
          
          // If still not found, try to parse as number
          if (correctIndex === undefined || correctIndex === -1) {
            const answerNum = parseInt(question.correctAnswer) - 1; // Convert 1-based to 0-based
            if (answerNum >= 0 && answerNum < question.options.length) {
              correctIndex = answerNum;
            }
          }
        } else if (question.type === 'TRUE_FALSE') {
          // For true/false questions, convert string answer to index
          const answer = question.correctAnswer.toLowerCase().trim();
          correctIndex = (answer === 'true' || answer === '1') ? 0 : 1;
        }
      }
      
      const convertedQuestion = {
        id: question.id,
        type: question.type === 'MCQ' ? 'multiple_choice' : 'true_false',
        difficulty: question.difficulty,
        questionText: question.questionText,
        options: question.options,
        correctAnswer: question.correctAnswer,
        correctIndex: correctIndex,
        explanation: question.explanation,
        points: question.points
      };
      
      console.log('🚀 [OLLAMA-LAUNCH] Converting Ollama question for launch:', {
        original: question,
        converted: convertedQuestion
      });
      
      onLaunchQuestion(convertedQuestion as any);
    } else {
      console.error('❌ [OLLAMA-LAUNCH] Question launch handler not available');
      toast.error('Question launch handler not available');
    }
  };

  // Difficulty badge colors
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'hard':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (!roomId) {
    return null;
  }

  return (
    <GlassCard>
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                🦙 Ollama-Based Questions
                {ollamaQuestions.length > 0 && (
                  <span className="text-sm sm:text-base px-2 sm:px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full border border-purple-500/30">
                    {ollamaQuestions.length}
                  </span>
                )}
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Questions generated from combined transcripts using Ollama AI
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={fetchOllamaQuestions}
              disabled={isLoading}
              className="px-3 sm:px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {ollamaQuestions.length > 0 && (
              <button
                onClick={deleteOllamaQuestions}
                className="px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center space-x-2 text-sm"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Clear All</span>
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
              <p className="text-gray-400 text-sm">Loading Ollama questions...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">❌ {error}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && ollamaQuestions.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500/10 rounded-full mb-4">
              <Sparkles className="w-8 h-8 text-purple-400" />
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">No Ollama Questions Yet</h4>
            <p className="text-gray-400 text-sm max-w-md mx-auto">
              Ollama questions will be generated from your combined transcripts. 
              Start recording audio and they'll appear here automatically!
            </p>
          </div>
        )}

        {/* Questions List */}
        {!isLoading && !error && ollamaQuestions.length > 0 && (
          <div className="space-y-4">
            {ollamaQuestions.map((question, index) => (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 sm:p-5 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl border border-gray-700/50 hover:border-purple-500/30 transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Question Header */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded border border-purple-500/30 font-medium">
                        #{index + 1}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded border font-medium ${getDifficultyColor(question.difficulty)}`}>
                        {question.difficulty.toUpperCase()}
                      </span>
                      <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30 font-medium">
                        {question.type}
                      </span>
                      <span className="text-xs px-2 py-1 bg-gray-700/50 text-gray-300 rounded border border-gray-600/30 font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {question.ollamaModel}
                      </span>
                    </div>

                    {/* Question Text */}
                    <p className="text-base sm:text-lg font-medium text-white leading-relaxed">
                      {question.questionText}
                    </p>

                    {/* Options (for MCQ) */}
                    {question.type === 'MCQ' && question.options && (
                      <div className="grid grid-cols-1 gap-2 mt-3">
                        {question.options.map((option, optIndex) => (
                          <div
                            key={optIndex}
                            className="p-2 sm:p-3 bg-gray-700/30 rounded-lg border border-gray-600/30 hover:border-purple-500/30 transition-colors"
                          >
                            <p className="text-sm text-gray-300">
                              <span className="font-semibold text-purple-400 mr-2">
                                {String.fromCharCode(65 + optIndex)}.
                              </span>
                              {option}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* True/False Options */}
                    {question.type === 'TRUE_FALSE' && (
                      <div className="flex gap-2 mt-3">
                        <div className="flex-1 p-2 sm:p-3 bg-gray-700/30 rounded-lg border border-gray-600/30">
                          <p className="text-sm text-gray-300">
                            <span className="font-semibold text-purple-400 mr-2">A.</span>
                            True
                          </p>
                        </div>
                        <div className="flex-1 p-2 sm:p-3 bg-gray-700/30 rounded-lg border border-gray-600/30">
                          <p className="text-sm text-gray-300">
                            <span className="font-semibold text-purple-400 mr-2">B.</span>
                            False
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Explanation */}
                    {question.explanation && (
                      <div className="p-2 sm:p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded border-l-4 border-purple-500">
                        <p className="text-xs sm:text-sm text-gray-300">
                          <strong className="text-purple-400">💡 Explanation:</strong> {question.explanation}
                        </p>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Points: {question.points}
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(question.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Launch Button */}
                  <button
                    onClick={() => handleLaunchQuestion(question)}
                    className="w-full lg:w-auto px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg flex items-center justify-center space-x-2 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <Play className="w-4 h-4" />
                    <span>Launch</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </GlassCard>
  );
};

export default OllamaQuestionsSection;
