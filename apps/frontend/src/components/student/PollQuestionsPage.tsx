// File: apps/frontend/src/components/student/PollQuestionsPage.tsx
"use client"
import React, { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { motion, AnimatePresence, delay } from "framer-motion"
import { Users, Trophy, CheckCircle, X, Timer, Brain, Lightbulb, TrendingUp, Zap, Target, Star, Award, ArrowRight } from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import GlassCard from "../GlassCard"
import toast from 'react-hot-toast'

interface Poll {
  _id: string;
  title: string;
  options: string[];
  timerDuration: number;
}

const PollQuestionsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { socket } = useAuth();
  const roomInfo = location.state?.roomInfo;

  // --- Real-time State ---
  const [currentPoll, setCurrentPoll] = useState<Poll | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [totalParticipants, setTotalParticipants] = useState(0);

  // --- Gamification State ---
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showResult, setShowResult] = useState(false);

  // Initial setup and redirection
  useEffect(() => {
    if (!roomInfo) {
      toast.error("No active session found.");
      navigate('/student/join-poll');
    }
  }, [roomInfo, navigate]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !roomInfo) return;

    console.log('🔌 PollQuestionsPage - Socket connected:', socket.connected);
    console.log('🏠 Room info:', roomInfo);

    // If socket is connected, try to join the room
    if (socket.connected && roomInfo.code) {
      console.log('📤 Attempting to join room from PollQuestionsPage:', roomInfo.code);
      socket.emit('student-join-room', roomInfo.code, (response: { success?: boolean; error?: string; room?: any }) => {
        console.log('📥 Room join response:', response);
        if (response?.error) {
          toast.error(`Failed to join room: ${response.error}`);
        } else if (response?.success) {
          console.log('✅ Successfully joined room from PollQuestionsPage');
          toast.success(`Joined "${roomInfo.name}" successfully!`);
        }
      });
    }

    const handlePollStarted = (pollData: Poll) => {
      console.log('🎯 Poll started event received:', pollData);
      console.log('📊 Poll data details:', {
        id: pollData._id,
        title: pollData.title,
        options: pollData.options,
        timerDuration: pollData.timerDuration
      });
      
      setCurrentPoll(pollData);
      setTimeLeft(pollData.timerDuration);
      setIsAnswered(false);
      setSelectedAnswer(null);
      setShowResult(false);
      toast.success("A new poll has started!");
    };
    const handlePollEnded = () => {
      toast("The host has ended the poll.", { duration: 3000 });
      setShowResult(false);
      setCurrentPoll(null);
    };
    const handleMeetingEnded = () => {
      toast.error("The host has ended the session.");
      navigate('/student');
    };
    const handleParticipantUpdate = (participants: any[]) => {
      setTotalParticipants(participants.length);
    };

     // --- NEW: The handler for when the entire session is ended by the host ---
//     const handleSessionEnded = (data: { message: string }) => {
//         toast.error(data.message || "The host has ended the session.", {
//             duration: 5000,
//         });
//         // Navigate the user back to the join page
//  if (roomInfo) {
//       navigate('/student/leaderboard', { state: { sessionId: roomInfo._id } });
//     } else {
//       navigate('/student/join-poll');
//     }    };
// ... inside useEffect for socket events ...
const handleSessionEnded = (data: { message: string }) => {
    toast.error(data.message || "The host has ended the session.", {
        duration: 5000,
    });
    // Navigate the user to the leaderboard, passing the sessionId
    if (roomInfo) {
      navigate('/student/leaderboard', { state: { sessionId: roomInfo._id } });
    } else {
      // Fallback if roomInfo is somehow lost
      navigate('/student/join-poll');
    }
};

    socket.on('poll-started', handlePollStarted);
    socket.on('poll-ended', handlePollEnded);
    socket.on('meeting-ended', handleMeetingEnded);
        socket.on('session-ended', handleSessionEnded);

    socket.on('participant-list-updated', handleParticipantUpdate);

    return () => {
      socket.off('poll-started', handlePollStarted);
      socket.off('poll-ended', handlePollEnded);
      socket.off('meeting-ended', handleMeetingEnded);
socket.off('session-ended', handleSessionEnded);
      socket.off('participant-list-updated', handleParticipantUpdate);
    };
  }, [socket, roomInfo, navigate]);

  // Timer logic
  useEffect(() => {
    if (timeLeft > 0 && !isAnswered) {
      const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && currentPoll && !isAnswered) {
      setIsAnswered(true);
      setShowResult(true);
      toast.error("Time's up!");
    }
  }, [timeLeft, currentPoll, isAnswered]);

  const handleAnswerSelect = (option: string, index: number) => {
    if (isAnswered || !socket || !currentPoll) return;
    
    setIsAnswered(true);
    setSelectedAnswer(index);
    
    const timeTaken = currentPoll.timerDuration - timeLeft;
    socket.emit('student-submit-vote', { roomId: roomInfo._id, pollId: currentPoll._id, answer: option, timeTaken });

    socket.once('vote-result', ({ isCorrect, pointsAwarded, totalScore, streak }) => {
        setScore(totalScore);
        setStreak(streak);
        setShowResult(true);
        if (isCorrect) {
            toast.success(`Correct! +${pointsAwarded} points`);
        } else {
            toast.error("Incorrect. Better luck next time!");
        }
    });
  };

  if (!roomInfo) return <div className="p-8 text-center text-white">Loading...</div>;

  const progress = currentPoll ? ((currentPoll.timerDuration - timeLeft) / currentPoll.timerDuration) * 100 : 0;
  
  return (
    <div className="space-y-6">
      {!currentPoll ? (
        <GlassCard className="p-8 text-center">
            <h2 className="text-2xl font-bold text-white">You're in the session!</h2>
            <p className="text-gray-300 mt-2">Room: <span className="font-semibold text-primary-400">{roomInfo.name}</span></p>
            <p className="text-gray-400 mt-4">Waiting for the host to launch a poll...</p>
        </GlassCard>
      ) : (
      <>
        {/* Stats Bar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <GlassCard className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center"><div className="flex ..."><Trophy className="w-4 h-4"/><span>{score}</span></div><p>Total Score</p></div>
                    <div className="text-center"><div className="flex ..."><Zap className="w-4 h-4"/><span>{streak}</span></div><p>Streak</p></div>
                    <div className="text-center"><div className="flex ..."><Users className="w-4 h-4" /><span>{totalParticipants}</span></div><p>Participants</p></div>
                    <div className="text-center"><div className="flex ..."><Target className="w-4 h-4"/><span>{Math.round(progress)}%</span></div><p>Progress</p></div>
                </div>
            </GlassCard>
        </motion.div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
            <motion.div key={currentPoll._id}           initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{ duration: 0.4 }}
        >
              <GlassCard className="p-8 relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                        <div className={`flex items-center space-x-2 ${timeLeft <= 5 ? 'text-red-400' : 'text-yellow-400'}`}><Timer className="w-4 h-4"/><span>{timeLeft}</span></div>
                        <div className="flex items-center space-x-1 text-yellow-400"><Star className="w-4 h-4"/><span>100+ points</span></div>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-8">{currentPoll.title}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {currentPoll.options.map((option, index) => {
                        const isSelected = selectedAnswer === index;
                        // We won't know the correct answer on the client side, so we adjust styling
                        let buttonStyle = "bg-white/5 border-white/20 hover:bg-white/10";
                        if (isAnswered && isSelected) {
                            buttonStyle = "bg-primary-500/20 border-primary-500";
                        }
                        
                        return (
                          <motion.button
                            key={index}
                            onClick={() => handleAnswerSelect(option, index)}
                            disabled={isAnswered}
                            className={`group p-6 rounded-2xl border-2 transition-all duration-300 text-left ${buttonStyle} ${isAnswered ? 'cursor-not-allowed' : ''}`}
                          >
                             <span className="font-medium text-lg text-white">{option}</span>
                          </motion.button>
                        )
                      })}
                    </div>

                    {isAnswered && (
                       <motion.div initial={{ opacity: 0}} animate={{ opacity: 1 }} className="text-center">
                           <p className="text-primary-300 font-semibold">Answer Submitted! Waiting for next poll.</p>
                       </motion.div>
                    )}
                </div>
              </GlassCard>
            </motion.div>
        </AnimatePresence>
      </>
      )}
    </div>
  );
};
export default PollQuestionsPage;