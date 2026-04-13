import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Timer, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Brain,
  AlertCircle
} from 'lucide-react';

const AptitudeTestPortal = ({ questions, onFinish, userName, durationMinutes }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { index: optionKey }
  const [visited, setVisited] = useState(new Set([0]));
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Timer logic
  useEffect(() => {
    if (timeLeft <= 0) {
      handleAutoSubmit();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAutoSubmit = () => {
    const finalAnswers = questions.map((q, idx) => ({
      question: q.question,
      answer: answers[idx] || 'Skipped',
      correctAnswer: q.correctAnswer
    }));
    onFinish(finalAnswers);
  };

  const handleOptionSelect = (optionKey) => {
    setAnswers(prev => ({ ...prev, [currentIndex]: optionKey }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setVisited(prev => new Set([...prev, nextIdx]));
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const jumpToQuestion = (index) => {
    setCurrentIndex(index);
    setVisited(prev => new Set([...prev, index]));
  };

  const getStatus = (index) => {
    if (answers[index]) return 'answered';
    if (visited.has(index)) return 'visited';
    return 'not_visited';
  };

  const currentQuestion = questions[currentIndex];
  // Robust question text extraction
  const questionText = typeof currentQuestion === 'string' 
    ? currentQuestion 
    : (currentQuestion?.question || currentQuestion?.questionText || currentQuestion?.text || currentQuestion?.content || '');
  
  // Handle options that might be strings or objects { optionKey, text }
  const rawOptions = Array.isArray(currentQuestion?.options) ? currentQuestion.options : [];
  const options = rawOptions.map((opt, idx) => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        key: opt.optionKey || opt.option || String.fromCharCode(65 + idx),
        text: opt.text || opt.value || ''
      };
    }
    // String format like "A) text"
    const match = String(opt).match(/^([A-D])[\)\:\s]+(.*)/);
    if (match) {
      return { key: match[1], text: match[2].trim() };
    }
    return { key: String.fromCharCode(65 + idx), text: String(opt) };
  });

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="w-full flex flex-col font-sans min-h-[600px] bg-transparent">
      {/* Sub-Header inside the content area */}
      <div className="flex items-center justify-between py-6 border-b border-slate-100 dark:border-slate-800 bg-transparent">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30 rotate-3">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Aptitude Assessment</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Live Session — {userName || 'Candidate'}</span>
            </div>
          </div>
        </div>        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end mr-2">
            <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Time Left</span>
            <div className={`flex items-center gap-1 font-mono text-sm font-black ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-slate-900 dark:text-white'}`}>
              <Timer className="w-3.5 h-3.5 text-blue-600" />
              {formatTime(timeLeft)}
            </div>
          </div>
          <button 
            onClick={() => setShowSubmitModal(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all shadow-md shadow-blue-500/10 active:scale-95"
          >
            Submit
          </button>
          <button 
            onClick={() => onFinish([])}
            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all active:scale-95"
          >
            End
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Question Content */}
        <div className="flex-1 overflow-y-auto pt-6 pb-10 bg-transparent">
          <div className="max-w-none">
            <h2 className="text-[15px] font-normal text-slate-900 dark:text-white mb-6 leading-relaxed">
              {questionText}
            </h2>

            <div className="grid gap-2.5 md:w-1/2">
              {options.map((option, idx) => {
                const isSelected = answers[currentIndex] === option.key;

                return (
                  <button
                    key={idx}
                    onClick={() => handleOptionSelect(option.key)}
                    className={`text-left px-4 py-3 rounded-xl text-[14px] border transition-all flex items-center gap-3 group relative ${
                      isSelected 
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm dark:bg-blue-900/20 dark:text-blue-300' 
                        : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-blue-600 hover:bg-blue-50 text-slate-900 dark:text-white'
                    }`}
                  >
                    <span className={`font-bold shrink-0 transition-colors ${isSelected ? 'text-blue-600' : 'text-slate-500 group-hover:text-blue-600'}`}>
                      {option.key}.
                    </span>
                    <span className="font-normal leading-relaxed">
                      {option.text}
                    </span>
                    {isSelected && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="ml-auto text-blue-600 shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </motion.div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Navigation & Palette Bar */}
        <div className="py-4 border-t border-slate-100 dark:border-slate-800 bg-transparent">
          <div className="w-full flex items-center justify-between gap-4">
            {/* Question Palette Buttons */}
            <div className="flex-1 flex justify-center overflow-x-auto py-2 no-scrollbar">
              <div className="flex items-center gap-2">
                {questions.map((_, idx) => {
                  const status = getStatus(idx);
                  const isCurrent = idx === currentIndex;
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => jumpToQuestion(idx)}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-[14px] font-normal border transition-all hover:scale-105 ${
                        isCurrent 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20 scale-110' 
                          : status === 'answered'
                            ? 'bg-emerald-500 text-white border-transparent'
                            : 'bg-white dark:bg-zinc-900 text-black dark:text-white border-slate-200 dark:border-zinc-700'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden lg:block">
                {currentIndex + 1} / {questions.length}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 font-bold text-[12px] rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-95"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </button>

                <button
                  onClick={handleNext}
                  disabled={currentIndex === questions.length - 1}
                  className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 text-white rounded-xl font-bold text-[12px] transition-all shadow-lg shadow-blue-500/10 disabled:opacity-30 disabled:pointer-events-none active:scale-95"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
        </div>
        </div>
      </main>

      {/* Submit Modal */}
      <AnimatePresence>
        {showSubmitModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Submit Assessment?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                You have answered <span className="font-bold text-slate-900 dark:text-white">{answeredCount} out of {questions.length}</span> questions. You cannot change your answers after submission.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setShowSubmitModal(false)}
                  className="py-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAutoSubmit}
                  className="py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                >
                  Yes, Submit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AptitudeTestPortal;
