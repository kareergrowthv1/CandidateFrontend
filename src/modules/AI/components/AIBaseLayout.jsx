import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, CheckCircle, Lock, Mic, Send, StopCircle, ArrowLeft, Loader2,
  Volume2, VolumeX, MessageSquare, Briefcase, Brain, User as UserIcon, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { aiMockService } from '../../../services/aiMockService';
import { paymentService } from '../../../services/paymentService';
import { sttService } from '../../../services/sttService';
import { speakAsync, cancelSpeech, subscribeToSpeech } from '../../../utils/speechUtils';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import AptitudeTestPortal from '../../Dashboard/components/AptitudeTestPortal';
import { CONFIG_OPTIONS, QUESTION_COUNT, TOPIC_SUGGESTIONS } from '../constants';

const ROUND_CREDITS = {
  1: { 4: 10, 8: 15, 12: 25 }, // Communication
  2: { 4: 12, 8: 20, 12: 30 }, // Technical
  3: { 4: 10, 8: 15, 12: 25 }, // Aptitude (Standardized for now)
  4: { 4: 15, 8: 25, 12: 35 }  // HR Management
};

const CameraPreview = () => {
  const videoRef = useRef(null);

  useEffect(() => {
    let stream;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        console.error("Camera access error:", err);
      }
    };
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, []);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
    </div>
  );
};

const VoiceWaves = ({ isSpeaking }) => {
  return (
    <div className="flex items-center justify-center gap-1.5 h-32">
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ height: 2 }}
          animate={isSpeaking ? {
            height: [10, 40, 15, 60, 10],
          } : {
            height: 2,
          }}
          transition={isSpeaking ? {
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.05,
            ease: "easeInOut"
          } : {
            duration: 0.3
          }}
          className="w-1.5 bg-slate-900 dark:bg-white rounded-full opacity-80"
        />
      ))}
    </div>
  );
};

export default function AIBaseLayout({ round }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Interview state
  const [configStep, setConfigStep] = useState('none');
  const [conceptAttempts, setConceptAttempts] = useState(0);
  const [selectedConcepts, setSelectedConcepts] = useState([]);
  const [interviewMode, setInterviewMode] = useState(null);   // 'conversational' | 'non_conversational'
  const [interviewDifficulty, setInterviewDifficulty] = useState('Medium');
  const [interviewDuration, setInterviewDuration] = useState(null); // in minutes
  const [timeRemaining, setTimeRemaining] = useState(0); // in seconds

  // Chat
  const [messages, setMessages] = useState([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isAISending, setIsAISending] = useState(false);

  // Interview engine
  const [sessionQuestions, setSessionQuestions] = useState([]);  // non-conv: all Qs
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [sessionAnswers, setSessionAnswers] = useState([]);       // [{question, answer, isCross}]
  const [startedAt, setStartedAt] = useState(null);
  const [isInterviewLive, setIsInterviewLive] = useState(false);
  const [showAptitudePortal, setShowAptitudePortal] = useState(false);

  // Audio
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [ttsEnabled, setTtsEnabled] = useState(true);

  // Refs
  const messagesEndRef = useRef(null);
  const currentQuestionRef = useRef('');
  const isMountedRef = useRef(true);
  const silenceTimeoutRef = useRef(null);
  const questionTimeoutRef = useRef(null);
  const userInputRef = useRef('');
  const handleSendMessageRef = useRef(null);

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;

    // Warning before closing tab/refreshing
    const handleBeforeUnload = (e) => {
      if (isInterviewLive) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    // Auto-terminate on close/refresh
    const handleUnload = () => {
      if (isInterviewLive && user?.id) {
        // Use sendBeacon for reliable delivery on page close
        const tenantId = localStorage.getItem('tenantId');
        const token = localStorage.getItem('accessToken');
        const url = `${API_BASE_URL}/api/ai-mock/submit`;
        const data = JSON.stringify({
          candidateId: user.id,
          round: round.id,
          status: 'ABORTED',
          feedback: 'Session terminated due to page refresh/close'
        });
        
        const blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);

    const unsubscribe = subscribeToSpeech((speaking) => {
      if (isMountedRef.current) setIsSpeaking(speaking);
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
      cancelSpeech();
      sttService.stopListening();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
      
      // Handle navigation away (unmount but not refresh)
      if (isInterviewLive) {
        aiMockService.submitProgress({
          candidateId: user.id,
          round: round.id,
          status: 'ABORTED',
          feedback: 'Candidate navigated away from the interview page'
        }).catch(err => console.warn('Termination failed:', err));
      }
    };
  }, [isInterviewLive, user, round]);

  useEffect(() => {
    if (messages.length === 0 && !isAISending && configStep === 'none') {
      startConfigSession();
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent, liveTranscript]);

  // Global Interview Timer
  useEffect(() => {
    let timer;
    if (isInterviewLive && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isInterviewLive, timeRemaining]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const wait = ms => new Promise(r => setTimeout(r, ms));

  const formatText = (text) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="font-bold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')} Left`;
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const pushMsg = (role, content, extras = {}) =>
    setMessages(prev => [...prev, { role, content, ...extras }]);

  const speak = useCallback(async (text) => {
    if (!ttsEnabled) return;
    try {
      await speakAsync(text);
    } catch (e) {
      console.warn('TTS error:', e);
    }
  }, [ttsEnabled]);

  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  });

  const startListening = useCallback(async () => {
    setLiveTranscript('');
    setUserInput('');
    userInputRef.current = '';

    const supported = await sttService.initialize({
      clientId: user.clientId || 'default',
      positionId: 'AI_MOCK_POSITION',
      candidateId: user.id,
      questionSetId: round.title,
      isConversational: interviewMode === 'conversational'
    });
    if (!supported) { console.warn('Speech recognition not supported.'); return; }

    setIsRecording(true);

    const resetTimer = () => {
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = setTimeout(() => {
        if (handleSendMessageRef.current) {
          handleSendMessageRef.current(userInputRef.current.trim() || 'No response');
        }
      }, 10000);
    };

    sttService.startListening({
      onStart: () => {
        setIsRecording(true);
        resetTimer();
      },
      onResult: (r) => {
        setLiveTranscript(r.full);
        setUserInput(r.full);
        userInputRef.current = r.full;
        resetTimer();
      },
      onEnd: () => {
        setIsRecording(false);
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      },
      onError: () => {
        setIsRecording(false);
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      }
    });
  }, [user, round, interviewMode]);

  const stopListening = useCallback(() => {
    sttService.stopListening();
    setIsRecording(false);
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    if (questionTimeoutRef.current) clearTimeout(questionTimeoutRef.current);
  }, []);

  // ── CONFIG FLOW ────────────────────────────────────────────────────────────
  const startConfigSession = async () => {
    setIsAISending(true);
    await wait(800);
    const greeting = `${getGreeting()} ${user?.name || 'Candidate'}!`;
    pushMsg('assistant', greeting);
    await wait(600);
    pushMsg('assistant', `Before we start your ${round.title} round, let's tailor the session for you.`);
    await wait(600);
    pushMsg('assistant', `What specific topic or area would you like to focus on today?`, { isTopicQuestion: true });
    setIsAISending(false);
    setConfigStep('topic');
  };

  const handleSendMessage = async (text) => {
    const messageText = (text || userInput).trim();
    if (!messageText || isAISending) return;

    if (isInterviewLive) {
      stopListening();
    }

    const userMsg = { role: 'user', content: messageText };
    if (!isInterviewLive) { userMsg.isSetupMessage = true; }
    setMessages(prev => [...prev, userMsg]);
    setUserInput('');
    setLiveTranscript('');
    setIsAISending(true);

    if (configStep === 'topic') {
      const isVague = messageText.split(' ').length > 7 ||
        ['train', 'interview', 'tomorrow', 'want', 'need', 'prepare'].some(w => messageText.toLowerCase().includes(w));

      if (!isVague) {
        setSelectedConcepts([messageText]);
        pushMsg('assistant', `Got it — focusing on "${messageText}". Let's set up your session.`);
        await wait(600);
        
        if (round.id === 3) {
          setInterviewMode('non_conversational');
          pushMsg('assistant', 'Which difficulty level would you like for this assessment?', { isDifficultyQuestion: true });
          setIsAISending(false);
          setConfigStep('difficulty');
        } else {
          pushMsg('assistant', 'Which mode would you prefer?', { isTypeQuestion: true });
          setIsAISending(false);
          setConfigStep('type');
        }
        return;
      }

      setStreamingContent('Analyzing your focus area...');
      try {
        const result = await aiMockService.generateTopics({
          roundTitle: round.title,
          messageText,
          candidateName: user?.name || 'Candidate',
        });
        const concepts = result?.concepts || [];
        setSelectedConcepts(concepts);
        pushMsg('assistant', `I've identified the following key concepts for your "${round.title}" session:`, {
          concepts,
          isConfirmStep: true
        });
        setConfigStep('confirm_concepts');
      } catch (err) {
        console.error('Topic analysis error:', err);
        pushMsg('assistant', "I'm having trouble with the analysis engine. Please tell me your focus topics directly.");
        setConfigStep('topic');
      } finally {
        setStreamingContent('');
        setIsAISending(false);
      }
      return;
    }

    if (configStep === 'confirm_concepts') {
      const choice = messageText.toLowerCase();
      if (choice === 'yes') {
        if (round.id === 3) {
          setInterviewMode('non_conversational');
          pushMsg('assistant', 'Perfect! Which difficulty level would you like for this assessment?', { isDifficultyQuestion: true });
          setIsAISending(false);
          setConfigStep('difficulty');
        } else {
          pushMsg('assistant', 'Perfect! Which interview mode would you prefer?', { isTypeQuestion: true });
          setIsAISending(false);
          setConfigStep('type');
        }
        return;
      } else if (choice === 'no') {
        const nextAttempt = conceptAttempts + 1;
        setConceptAttempts(nextAttempt);
        if (nextAttempt >= 3) {
          pushMsg('assistant', "Got it. Please tell me exactly what you'd like to focus on.");
          setIsAISending(false);
          setConfigStep('topic');
          return;
        }
        setStreamingContent(`Regenerating focus areas (attempt ${nextAttempt}/3)...`);
        try {
          const originalTopic = messages.find(m => m.role === 'user' && !['yes', 'no'].includes(m.content.toLowerCase()))?.content || '';
          const result = await aiMockService.generateTopics({
            roundTitle: round.title,
            messageText: `REGENERATE attempt ${nextAttempt}: ${originalTopic}`,
            candidateName: user?.name || 'Candidate',
          });
          const concepts = result?.concepts || [];
          setSelectedConcepts(concepts);
          pushMsg('assistant', `Here's a different set of focus areas (attempt ${nextAttempt}/3):`, {
            concepts,
            isConfirmStep: true
          });
          setConfigStep('confirm_concepts');
        } catch (err) {
          pushMsg('assistant', "Please tell me exactly what you'd like to focus on.");
          setConfigStep('topic');
        } finally {
          setStreamingContent('');
          setIsAISending(false);
        }
        return;
      }
    }

    if (configStep === 'difficulty') {
      const diff = messageText.charAt(0).toUpperCase() + messageText.slice(1).toLowerCase();
      if (!CONFIG_OPTIONS.difficulty.includes(diff)) {
        pushMsg('assistant', "Please select a difficulty: Easy, Medium, or Hard.");
        setIsAISending(false);
        return;
      }
      setInterviewDifficulty(diff);
      pushMsg('assistant', `"${diff}" difficulty — check. How many questions would you like to attempt? (Max 15)`, { isDurationQuestion: true });
      setIsAISending(false);
      setConfigStep('duration');
      return;
    }

    if (configStep === 'type') {
      const mode = messageText.toLowerCase().includes('non') ? 'non_conversational' : 'conversational';
      setInterviewMode(mode);
      pushMsg('assistant', `${mode === 'conversational' ? 'Conversational' : 'Non-Conversational'} mode — great. How long would you like the session to be?`, { isDurationQuestion: true });
      setIsAISending(false);
      setConfigStep('duration');
      return;
    }

    if (configStep === 'duration') {
      const mins = parseInt(messageText) || 10;
      let count = QUESTION_COUNT[mins] || 6;
  
      if (round.id === 3) {
        count = mins > 15 ? 15 : mins;
        setInterviewDuration(mins); 
        pushMsg('assistant', `${count} questions — let's do it! Click 'Start Assessment' when you're ready.`, { isReadyStep: true });
      } else {
        setInterviewDuration(mins);
        setTimeRemaining(mins * 60);
        pushMsg('assistant', `${mins}-minute session. Configuration complete! Ready when you are.`, { isReadyStep: true });
      }
  
      setIsAISending(false);
      setConfigStep('ready_to_start');
      return;
    }

    if (configStep === 'ready_to_start') {
      setIsAISending(true);
      
      // 1. Credit Validation & Deduction
      try {
        const requiredCredits = ROUND_CREDITS[round.id]?.[interviewDuration] || 15;
        
        const res = await paymentService.deductCredits({
          serviceType: 'AI_MOCK',
          serviceName: `${round.title} Round - ${interviewDuration} ${round.id === 3 ? 'Qs' : 'Mins'}`,
          creditsToDeduct: requiredCredits,
          metadata: {
            roundId: round.id,
            duration: interviewDuration,
            mode: interviewMode,
            difficulty: interviewDifficulty
          }
        });

        if (res.success) {
          showToast(`Success: ${requiredCredits} credits deducted. Starting session...`, 'success');
          setConfigStep('interviewing');
          await wait(800);
          await launchInterview(interviewDuration);
        } else {
          showToast(res.message || 'Insufficient credits to start this session.', 'error');
          setIsAISending(false);
        }
      } catch (err) {
        console.error('Credit deduction error:', err);
        const errorMsg = err.response?.data?.message || 'Unable to verify credits. Please try again.';
        showToast(errorMsg, 'error');
        setIsAISending(false);
      }
      return;
    }

    if (configStep === 'interviewing' && isInterviewLive) {
      await handleInterviewAnswer(messageText);
      return;
    }

    setIsAISending(false);
  };

  const launchInterview = async (durationMins) => {
    setStartedAt(new Date().toISOString());
    setSessionAnswers([]);
    setCurrentQIndex(0);
    setMessages([]);
    setShowAptitudePortal(false);
    setIsAISending(true);

    try {
      if (interviewMode === 'non_conversational') {
        const res = await aiMockService.generateQuestions({
          roundTitle: round.id === 3 ? 'Aptitude' : round.title,
          concepts: selectedConcepts,
          candidateName: user?.name || 'Candidate',
          mode: 'non_conversational',
          durationMinutes: round.id === 3 ? durationMins : (QUESTION_COUNT[durationMins] || 6), 
          difficulty: interviewDifficulty.toUpperCase()
        });
        const questions = res?.questions || [];
        setSessionQuestions(questions);
        
        if (round.id === 3) {
          setShowAptitudePortal(true);
          setIsAISending(false);
          setIsInterviewLive(true);
          return;
        }

        await sttService.initialize({
          clientId: user.clientId || 'default',
          positionId: 'AI_MOCK_POSITION',
          candidateId: user.id,
          questionSetId: round.title,
          isConversational: false
        });

        setIsInterviewLive(true);
        setIsAISending(false);
        await askQuestion(questions[0], 0, []);
      } else {
        const res = await aiMockService.generateQuestions({
          roundTitle: round.title,
          concepts: selectedConcepts,
          candidateName: user?.name || 'Candidate',
          mode: 'conversational',
          durationMinutes: durationMins,
        });
        const q = res?.question || 'Tell me about yourself and what brings you here today.';
        await sttService.initialize({
          clientId: user.clientId || 'default',
          positionId: 'AI_MOCK_POSITION',
          candidateId: user.id,
          questionSetId: round.title,
          isConversational: true
        });

        setIsInterviewLive(true);
        setIsAISending(false);
        await askQuestion(q, 0, []);
      }
    } catch (err) {
      console.error('Launch interview error:', err);
      pushMsg('assistant', 'I had trouble generating your questions. Please try starting the round again.');
      setIsAISending(false);
    }
  };

  const askQuestion = async (question, index, answersSoFar) => {
    currentQuestionRef.current = question;
    if (questionTimeoutRef.current) clearTimeout(questionTimeoutRef.current);
    questionTimeoutRef.current = setTimeout(() => {
      if (handleSendMessageRef.current) {
        handleSendMessageRef.current(userInputRef.current.trim() || 'No response');
      }
    }, 45000); 

    const label = round.id === 3 ? `${index + 1}) ` : '';
    let msgText = typeof question === 'object' ? question.question : question;
    pushMsg('assistant', `${label}${msgText}`, { isQuestion: true, qIndex: index });

    if (ttsEnabled) {
      await Promise.race([
        speak(`${label}${msgText}`),
        new Promise(resolve => setTimeout(resolve, 15000))
      ]).catch(e => console.warn('TTS safety timeout or error:', e));
    }

    await wait(3000);
    if (isMountedRef.current) {
      console.log("Automatically starting listening mode.");
      await startListening();
    }
  };

  const handleInterviewAnswer = async (answerText) => {
    stopListening();
    cancelSpeech();

    const qIndex = currentQIndex;
    const questionObj = currentQuestionRef.current;
    const questionText = typeof questionObj === 'object' ? questionObj.question : questionObj;
    
    const newAnswers = [...sessionAnswers, { 
      question: questionText, 
      answer: answerText, 
      isCross: qIndex > 0 && interviewMode === 'conversational' 
    }];
    setSessionAnswers(newAnswers);
    const nextIndex = qIndex + 1;
    setCurrentQIndex(nextIndex);
    setIsAISending(true);

    const isAptitude = round.id === 3;
    const isTimeUp = !isAptitude && timeRemaining <= 0;
    const isAptitudeDone = isAptitude && nextIndex >= interviewDuration;

    if (isTimeUp || isAptitudeDone) {
      await finishInterview(newAnswers);
      return;
    }

    if (interviewMode === 'non_conversational') {
      await wait(800);
      setIsAISending(false);
      await askQuestion(sessionQuestions[nextIndex], nextIndex, newAnswers);
      return;
    }

    try {
      const res = await aiMockService.crossQuestion({
        roundTitle: round.title,
        concepts: selectedConcepts,
        previousQuestion: questionText,
        candidateAnswer: answerText,
        candidateName: user?.name || 'Candidate',
        questionsSoFar: nextIndex,
      });
      const crossQ = res?.question || 'Can you elaborate further?';
      setIsAISending(false);
      await askQuestion(crossQ, nextIndex, newAnswers);
    } catch (err) {
      console.error('Cross-question error:', err);
      setIsAISending(false);
      await finishInterview(newAnswers);
    }
  };

  const finishInterview = async (finalAnswers) => {
    cancelSpeech();
    stopListening();
    setIsInterviewLive(false);
    setIsAISending(true);

    pushMsg('assistant', `Excellent work, ${user?.name || 'Candidate'}! You've completed your ${round.title} mock interview.`);

    try {
      const sessionPayload = {
        candidateId: user.id,
        round: round.id,
        roundTitle: round.title,
        mode: interviewMode,
        durationMinutes: interviewDuration,
        concepts: selectedConcepts,
        questions: finalAnswers,
        status: 'completed',
        startedAt,
        completedAt: new Date().toISOString(),
      };
      
      const baseSession = await aiMockService.saveSession(sessionPayload);
      const sessionId = baseSession.sessionId;

      const creditsRes = await paymentService.getCredits().catch(() => null);
      let reportLevel = 'standard';
      
      if (creditsRes?.data?.hasActivePlan && creditsRes?.data?.remaining > 0) {
        const permissions = creditsRes.data.permissions || {};
        const roundKey = `round${round.id}ReportLevel`;
        reportLevel = permissions[roundKey] || 'standard';

        pushMsg('assistant', 'Please wait, we are generating your report...');
        
        try {
          const reportRes = await aiMockService.generateReport({
            ...sessionPayload,
            reportLevel
          });
          const score = reportRes?.score || 0;
          const analysis = reportRes?.analysis || "Report could not be generated.";
          
          await aiMockService.saveSession({
            ...sessionPayload,
            sessionId,
            score,
            analysis
          });

          await aiMockService.submitProgress({
            candidateId: user.id,
            round: round.id,
            status: 'COMPLETED',
            score: score,
            feedback: analysis
          });
          
          pushMsg('assistant', `📝 **Interview Assessment Report**\n\n**Score**: ${score}/100\n\n${analysis}`, {
            isReport: true,
            reportLevel,
            analysisDepth: reportLevel === 'complete' ? 100 : (reportLevel === 'standard' ? 60 : 30)
          });
        } catch (reportErr) {
          console.error("Report error:", reportErr);
          pushMsg('assistant', 'Sorry, we encountered an error while generating your report.');
          await aiMockService.submitProgress({
            candidateId: user.id,
            round: round.id,
            status: 'COMPLETED',
            score: 0,
            feedback: `Completed ${finalAnswers.length}-question ${interviewMode} mock.`
          });
        }
      } else {
        await aiMockService.submitProgress({
          candidateId: user.id,
          round: round.id,
          status: 'COMPLETED',
          score: 0,
          feedback: 'Interview completed (Report locked due to plan limits)'
        });
        pushMsg('assistant', 'Session completed! Please upgrade your plan to view detailed analysis.');
      }
    } catch (err) {
      console.error('Save session error:', err);
    } finally {
      setIsAISending(false);
      setConfigStep('done');
    }
  };

  if (showAptitudePortal && isInterviewLive) {
    return (
      <AptitudeTestPortal 
        questions={sessionQuestions}
        userName={user?.name}
        durationMinutes={interviewDuration}
        onFinish={(finalAnswers) => {
          setShowAptitudePortal(false);
          finishInterview(finalAnswers);
        }}
      />
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-transparent overflow-hidden">
      <AnimatePresence mode="wait">
        {!isInterviewLive ? (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col h-full bg-transparent overflow-hidden"
          >
            <div className="flex items-center justify-between pb-3 shrink-0">
              <button onClick={() => navigate('/ai')} className="text-slate-400 hover:text-slate-600 transition-all flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" /> Back to Rounds
              </button>
              <span className="text-[12px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                {round.title} Setup
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pt-2 pb-4 scroll-smooth no-scrollbar">
              <div className="w-full space-y-4 px-0">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%]`}>
                       <div className={`px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm whitespace-pre-line
                          ${msg.role === 'user'
                            ? 'bg-slate-900 text-white rounded-tr-none'
                            : 'bg-white dark:bg-zinc-900/50 text-slate-800 dark:text-zinc-200 rounded-tl-none border border-slate-100 dark:border-white/5'}`}>
                          {formatText(msg.content)}
                       </div>
                    </div>
                  </div>
                ))}
                {isAISending && (
                   <div className="flex justify-start">
                     <div className="flex gap-1 p-3 bg-white dark:bg-zinc-900 rounded-2xl rounded-tl-none border border-slate-100 dark:border-white/5 shadow-sm">
                       <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                     </div>
                   </div>
                )}
                <div ref={messagesEndRef} className="h-2" />
              </div>
            </div>

            <div className="shrink-0 pb-4 pt-1">
               <AnimatePresence>
                {(configStep !== 'done' && (messages.length > 0)) && (
                   <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-2 mb-3">
                      {configStep === 'confirm_concepts' && ['Yes', 'No'].map(c => (
                        <button key={c} onClick={() => handleSendMessage(c)} className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-[12px] font-bold hover:scale-105 transition-all outline-none">
                          {c}
                        </button>
                      ))}
                      {configStep === 'type' && ['Conversational', 'Non-Conversational'].map(t => (
                        <button key={t} onClick={() => handleSendMessage(t)} className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-[12px] font-bold hover:scale-105 transition-all outline-none">
                          {t}
                        </button>
                      ))}
                      {configStep === 'difficulty' && ['Easy', 'Medium', 'Hard'].map(d => (
                        <button key={d} onClick={() => handleSendMessage(d)} className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-[12px] font-bold hover:scale-105 transition-all outline-none">
                          {d}
                        </button>
                      ))}
                      {configStep === 'duration' && ['4', '8', '12'].map(d => (
                        <button key={d} onClick={() => handleSendMessage(d)} className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-[12px] font-bold hover:scale-105 transition-all outline-none">
                          {round.id === 3 ? `${d} Qs` : `${d} Mins`}
                        </button>
                      ))}
                      {configStep === 'ready_to_start' && (
                        <button onClick={() => handleSendMessage('Start Assessment')} className="px-6 py-2.5 bg-blue-600 text-white rounded-full text-[12px] font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 outline-none">
                          Start Assessment <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                      )}
                      {configStep === 'topic' && TOPIC_SUGGESTIONS[round.id]?.map(topic => (
                        <button key={topic} onClick={() => setUserInput(topic)} className="px-4 py-2 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-full text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-900 hover:text-white transition-all">
                          {topic}
                        </button>
                      ))}
                   </motion.div>
                )}
               </AnimatePresence>

              <div className="flex items-stretch gap-3 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-1 shadow-sm focus-within:ring-2 focus-within:ring-slate-200 transition-all">
                <textarea
                  rows={1}
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  placeholder="Type or message AI..."
                  className="flex-1 bg-transparent py-4 text-[14px] font-normal text-slate-700 dark:text-slate-300 focus:outline-none resize-none"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!userInput.trim() || isAISending}
                  className="self-center w-10 h-10 flex items-center justify-center bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-30"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="interview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#060606] rounded-3xl overflow-hidden relative"
          >
            <div className="absolute top-6 left-6 right-6 z-20 flex items-center justify-between pointer-events-none">
              <div />
              <div className="flex items-center gap-4 pointer-events-auto">
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-lg">
                  {formatTime(timeRemaining)}
                </div>
                <button
                  onClick={() => finishInterview(sessionAnswers)}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md active:scale-95 border border-white/10"
                >
                  END
                </button>
              </div>
            </div>

            <div className="flex-none grid grid-cols-1 md:grid-cols-2 gap-4 p-4 md:p-6 pt-24 md:pt-24 min-h-[500px] md:h-[350px]">
              <div className="relative order-1 md:order-2 rounded-3xl overflow-hidden shadow-2xl bg-black h-[280px] md:h-full">
                 <CameraPreview />
                 <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 text-[10px] font-bold text-white uppercase tracking-wider">
                       <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-400'}`} />
                       Candidate
                    </div>
                    {isRecording && (
                       <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/80 backdrop-blur-md rounded-lg text-[10px] font-black text-white uppercase tracking-wider animate-in fade-in slide-in-from-bottom-2">
                          Listening...
                       </div>
                    )}
                 </div>
              </div>

              <div className="relative order-2 md:order-1 flex flex-col items-center justify-center bg-white dark:bg-zinc-900/40 rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-inner h-[220px] md:h-full">
                 <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-900/5 pointer-events-none" />
                 <div className="z-10 flex flex-col items-center gap-4">
                    <div className="flex flex-col items-center text-center">
                       <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[8px] font-black uppercase tracking-widest rounded-full border border-blue-200 dark:border-blue-800/50 mb-4">
                          KareerBot
                       </span>
                    </div>
                    <VoiceWaves isSpeaking={isSpeaking && !isRecording && !isAISending} />
                 </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-8 pt-4 gap-4">
                <div className="h-6 flex items-center justify-center">
                   <AnimatePresence mode="wait">
                      {isAISending && (
                         <motion.div key="thinking" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-2 text-blue-500 font-bold text-[10px] uppercase tracking-widest">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            {messages.length > 0 && messages[messages.length-1].role === 'user' ? "Submitting Answer..." : "Generating Next Question..."}
                         </motion.div>
                      )}
                   </AnimatePresence>
                </div>
                <div className="max-w-2xl w-full text-center">
                   <h2 className="text-base md:text-lg font-medium text-slate-800 dark:text-slate-200 leading-relaxed min-h-[3em]">
                      {messages.length > 0 && messages[messages.length - 1].role === 'assistant' 
                        ? formatText(messages[messages.length - 1].content)
                        : (isAISending ? "" : "Waiting for your response...")}
                   </h2>
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
