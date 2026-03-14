import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Briefcase,
  FileText,
  Users,
  Video,
  Award,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  X,
  MoreVertical,
  Plus,
  Eye,
  ArrowRight,
  Download,
  Calendar as CalendarIcon,
  Play,
  StickyNote,
  MapPin,
  Search,
  Filter,
  Check,
  Star,
  Code2
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { getCandidateProfile, getDashboardStats } from '../../../services/candidateService';
import { fetchTodaysQuiz, submitQuizAnswer } from '../../../store/slices/dailyQuizSlice';
import aiResumeImg from '../../../assets/ai_resume.png';

/**
 * Service Continuity Card Component
 */
const ServiceContinuityCard = ({ profile }) => {
  const serviceContinuity = useMemo(() => {
    if (!profile) return { daysRemaining: 0, status: 'no-data', displayText: 'N/A' };

    const createdAt = profile.createdAt;
    if (!createdAt) return { daysRemaining: 0, status: 'no-data', displayText: 'N/A' };

    try {
      const createdDate = new Date(createdAt);
      const expiryDate = new Date(createdDate);
      expiryDate.setMonth(expiryDate.getMonth() + 1);

      const now = new Date();
      const daysRemaining = Math.max(0, Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24)));
      const percentage = Math.min(Math.max(((30 - daysRemaining) / 30) * 100, 0), 100);

      let status = 'active';
      if (daysRemaining <= 0) status = 'expired';
      else if (daysRemaining <= 7) status = 'warning';

      return {
        daysRemaining,
        percentage: Math.round(percentage),
        status,
        displayText: `${daysRemaining}`
      };
    } catch (e) {
      return { daysRemaining: 0, status: 'no-data', displayText: 'N/A' };
    }
  }, [profile]);

  const getStatusColor = (status) => {
    if (status === 'expired') return 'text-red-500';
    if (status === 'warning') return 'text-amber-500';
    return 'text-blue-600';
  };

  return (
    <div className="bg-white dark:bg-black rounded-xl p-6 shadow-sm border border-slate-100 dark:border-zinc-800 flex flex-col items-center justify-center text-center transition-colors duration-300">
      <h2 className="text-[10px] font-bold text-black dark:text-white uppercase tracking-widest mb-6 opacity-40">Service Continuity</h2>
      <div className="space-y-1 mb-2">
        <p className={`text-3xl font-black tracking-tight ${getStatusColor(serviceContinuity.status)}`}>
          {serviceContinuity.displayText}
        </p>
        <p className="text-[9px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest">Days Remaining</p>
      </div>
      <div className="mt-6 w-full h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${serviceContinuity.status === 'expired' ? 'bg-red-500' : serviceContinuity.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`}
          style={{ width: `${serviceContinuity.percentage || 0}%` }}
        ></div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [dashStats, setDashStats] = useState(null);
  const [latestJobs, setLatestJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeQuizIndex, setActiveQuizIndex] = useState(0);

  // Daily quiz from Redux store
  const { questions: quizQuestions, loading: quizLoading, submitting: quizSubmitting } = useSelector((state) => state.dailyQuiz);

  useEffect(() => {
    async function fetchData() {
      if (!user?.id) return;
      try {
        const [profileData, dashData] = await Promise.all([
          getCandidateProfile(user.id),
          getDashboardStats(user.id)
        ]);
        setProfile(profileData);
        setDashStats(dashData?.stats || null);
        setLatestJobs(dashData?.latestJobs || []);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user?.id]);

  // Fetch today's quiz on load
  useEffect(() => {
    dispatch(fetchTodaysQuiz());
  }, [dispatch]);

  const handleQuizAnswer = async (questionId, optionIndex) => {
    const question = quizQuestions[activeQuizIndex];
    if (!question || question.answered || quizSubmitting) return;
    await dispatch(submitQuizAnswer({ questionId, selectedAnswerIndex: optionIndex }));
  };

  const solvedCount = dashStats?.solvedCount ?? 0;
  const totalStars = dashStats?.totalStars ?? 0;
  const totalJobs = dashStats?.totalJobs ?? 0;
  const appliedJobs = dashStats?.appliedJobs ?? 0;
  const practiceCount = dashStats?.practiceCount ?? 0;
  const displayName = profile?.name || user?.username?.split('@')[0] || 'Candidate';

  const summaryStats = [
    { label: "Jobs", value: totalJobs, icon: Briefcase, sub: "Open Positions" },
    { label: "Applied", value: appliedJobs, icon: FileText, sub: "Jobs Applied" },
    { label: "Total Tests", value: 0, icon: Video, sub: "Assessments" },
    { label: "Plan", value: profile?.status || "Active", icon: Award, sub: "Current Plan" },
  ];

  const aiAnalysisRounds = [
    { label: "Communication", percentage: 85, color: "bg-blue-500" },
    { label: "Position", percentage: 72, color: "bg-indigo-500" },
    { label: "Coding", percentage: 90, color: "bg-emerald-500" },
    { label: "Aptitude", percentage: 78, color: "bg-slate-500" }
  ];


  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] font-normal text-slate-400 uppercase tracking-widest">Initializing Dashboard...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="w-full max-w-full px-4 md:px-0 mx-auto space-y-6 pt-8 md:pt-0 pb-12"
    >
      {/* Greeting Header */}
      <div className="flex flex-col gap-1 mb-4">
        <h1 className="text-2xl font-black text-black dark:text-white tracking-tight">Hi, {displayName}! 👋</h1>
        <p className="text-black/40 dark:text-white/40 font-bold text-sm uppercase tracking-widest">Welcome to KareerGrowth Portal</p>
      </div>

      {/* Row 1: Summary Stats - 4 cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryStats.map((stat, i) => (
          <motion.div
            key={i}
            variants={itemVariants}
            whileHover={{ y: -4 }}
            className="bg-white dark:bg-black rounded-xl p-4 border border-slate-100 dark:border-white/10 flex items-center justify-between shadow-sm transition-all"
          >
            <div>
              <p className="text-[9px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-2xl font-black text-black dark:text-white tracking-tight">{stat.value}</p>
              <p className="text-[9px] font-normal text-slate-400 dark:text-slate-500 mt-1">{stat.sub}</p>
            </div>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-blue-50 dark:bg-blue-900/30`}>
              <stat.icon size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Row 2: Performance & Connectivity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Overall Performance */}
        <motion.div variants={itemVariants} className="lg:col-span-4 bg-white dark:bg-black rounded-xl p-6 border border-slate-100 dark:border-white/10 shadow-sm flex flex-col">
          <h2 className="text-sm font-black text-black dark:text-white uppercase tracking-widest mb-6">Overall Performance</h2>
          <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
            {(() => {
              const score = 82;
              const radius = 75;
              const circumference = 2 * Math.PI * radius;
              const strokeDashoffset = circumference - (score / 100) * circumference;
              const getScoreColor = (s) => {
                if (s >= 80) return '#10B981'; // Emerald-500
                if (s >= 60) return '#3B82F6'; // Blue-500
                return '#F59E0B'; // Amber-500
              };

              return (
                <>
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="96" cy="96" r={radius} fill="transparent" stroke="#F1F5F9" strokeWidth="18" />
                    <motion.circle
                      cx="96"
                      cy="96"
                      r={radius}
                      fill="transparent"
                      stroke={getScoreColor(score)}
                      strokeWidth="18"
                      strokeDasharray={circumference}
                      initial={{ strokeDashoffset: circumference }}
                      animate={{ strokeDashoffset }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-4xl font-black text-black dark:text-white">{score}%</span>
                    <span className="text-[9px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mt-1">Avg Score</span>
                  </div>
                </>
              );
            })()}
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {[
              { label: "Skill Match", val: "85%", col: "bg-blue-600" },
              { label: "Readiness", val: "92%", col: "bg-emerald-500" },
              { label: "Visibility", val: "64%", col: "bg-slate-400" },
              { label: "Technical", val: "78%", col: "bg-indigo-500" }
            ].map((m, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${m.col}`}></div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-black dark:text-white leading-none">{m.val}</span>
                  <span className="text-[9px] font-bold text-black/40 dark:text-white/40 uppercase tracking-tighter mt-1">{m.label}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* AI Analysis */}
        <motion.div variants={itemVariants} className="lg:col-span-5 bg-white dark:bg-black rounded-xl p-6 border border-slate-100 dark:border-white/10 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-sm font-black text-black dark:text-white uppercase tracking-widest">AI Analysis</h2>
            <div className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-bold rounded-lg uppercase">Verified</div>
          </div>
          <p className="text-[10px] font-bold text-black/30 dark:text-white/30 mb-6 uppercase tracking-widest">Performance assessment metrics</p>
          <div className="space-y-6">
            {aiAnalysisRounds.map((round, i) => (
              <div key={i} className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-black dark:text-white uppercase tracking-wider">{round.label}</span>
                  <span className="text-[11px] font-bold text-black/40 dark:text-white/40">{round.percentage}%</span>
                </div>
                <div className="h-2 w-full bg-slate-50 dark:bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${round.percentage}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className={`h-full ${round.color}`}
                  ></motion.div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Service & Scores */}
        <motion.div variants={itemVariants} className="lg:col-span-3 space-y-4">
          <ServiceContinuityCard profile={profile} />
          <div className="bg-white dark:bg-black rounded-xl p-6 shadow-sm border border-slate-100 dark:border-zinc-800 flex flex-col items-center justify-center text-center transition-colors duration-300">
            <h2 className="text-[10px] font-bold text-black dark:text-white uppercase tracking-widest mb-5 opacity-40">Resume Score</h2>
            <div className="relative w-24 h-24 mb-4">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="48" cy="48" r="40" fill="transparent" stroke="#F1F5F9" strokeWidth="8" />
                <circle cx="48" cy="48" r="40" fill="transparent" stroke="#10B981" strokeWidth="8" strokeDasharray="210 251" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-black text-black dark:text-white">84</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-600">
              <CheckCircle2 size={12} />
              <span className="text-[10px] font-black uppercase tracking-widest">High Quality</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Row 3: Quiz & Mock Test */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Daily Quiz */}
        <motion.div variants={itemVariants} className="lg:col-span-8 bg-white dark:bg-black rounded-xl p-6 border border-slate-100 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black text-black dark:text-white uppercase tracking-widest">Quiz for the Day</h2>
            {quizQuestions.length > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveQuizIndex(Math.max(0, activeQuizIndex - 1))}
                  disabled={activeQuizIndex === 0}
                  className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 transition"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-[10px] font-bold text-black/40">
                  {activeQuizIndex + 1} / {quizQuestions.length}
                </span>
                <button
                  onClick={() => setActiveQuizIndex(Math.min(quizQuestions.length - 1, activeQuizIndex + 1))}
                  disabled={activeQuizIndex === quizQuestions.length - 1}
                  className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 transition"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>

          {quizLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-3 bg-slate-100 rounded w-24"></div>
              <div className="h-6 bg-slate-100 rounded w-3/4"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {[0, 1, 2, 3].map(i => <div key={i} className="h-14 bg-slate-50 rounded-xl"></div>)}
              </div>
            </div>
          ) : quizQuestions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm font-bold text-black/40 uppercase tracking-widest">No quiz available today.</p>
              <p className="text-xs text-black/30 mt-1">Check back later or ask admin to generate today's quiz.</p>
            </div>
          ) : (() => {
            const q = quizQuestions[activeQuizIndex];
            if (!q) return null;
            return (
              <div className="space-y-5">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em]">{q.category}</p>
                <h3 className="text-xl font-black text-black dark:text-white leading-tight max-w-2xl">{q.question}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {q.options.map((opt, i) => {
                    const isSelected = q.answered && q.selectedAnswerIndex === i;
                    const isCorrect = q.answered && q.correctAnswerIndex === i;
                    const isWrong = q.answered && isSelected && !q.isCorrect;

                    let btnClass = 'p-4 rounded-xl border transition-all text-left text-[13px] font-bold flex items-center justify-between group ';
                    if (!q.answered) {
                      btnClass += 'border-slate-100 dark:border-zinc-700 hover:border-black dark:hover:border-white hover:bg-slate-50 dark:hover:bg-zinc-800 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white cursor-pointer';
                    } else if (isCorrect) {
                      btnClass += 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 cursor-default';
                    } else if (isWrong) {
                      btnClass += 'border-red-300 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 cursor-default';
                    } else {
                      btnClass += 'border-slate-100 dark:border-zinc-800 text-black/30 dark:text-white/30 cursor-default';
                    }

                    return (
                      <button
                        key={i}
                        className={btnClass}
                        disabled={q.answered || quizSubmitting}
                        onClick={() => handleQuizAnswer(q.questionId, i)}
                      >
                        <span>{opt}</span>
                        <div className="shrink-0 ml-2">
                          {q.answered && isCorrect ? (
                            <CheckCircle2 size={16} className="text-emerald-500" />
                          ) : q.answered && isWrong ? (
                            <XCircle size={16} className="text-red-400" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-slate-200 group-hover:border-black transition-colors" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </motion.div>

        {/* Mock Test */}
        <motion.div variants={itemVariants} className="lg:col-span-4 bg-white dark:bg-black rounded-xl p-6 border border-slate-100 dark:border-white/10 shadow-sm flex flex-col group relative overflow-hidden">
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100">
                <Video size={20} className="text-blue-600" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Mock Assessment</h4>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">AI PROCTORED</p>
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4 leading-tight">Full Stack Developer Interview</h3>
            <div className="flex items-center gap-2 mb-8 text-slate-500">
              <Clock size={14} className="opacity-50" />
              <span className="text-[11px] font-bold">Today, 02:30 PM</span>
            </div>
            <button className="mt-auto w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg shadow-blue-100 hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all">
              Join Assessment
            </button>
          </div>
        </motion.div>
      </div>

      {/* Row 4: Jobs & Promo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <motion.div variants={itemVariants} className="lg:col-span-9 bg-white dark:bg-black rounded-xl p-6 border border-slate-100 dark:border-white/10 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-black text-black dark:text-white uppercase tracking-widest">Latest Jobs Updates</h2>
            <button
              onClick={() => navigate('/jobs')}
              className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
            >
              View All
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {latestJobs.length > 0 ? latestJobs.map((job) => (
              <div key={job.id} className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 flex items-center gap-3 group hover:bg-white dark:hover:bg-white/10 hover:shadow-sm transition-all border border-transparent hover:border-slate-100 dark:hover:border-white/10 min-w-[160px] flex-1 sm:flex-none">
                <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center p-1.5 shrink-0">
                  <div className="w-full h-full rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <span className="text-white text-[8px] font-black uppercase">{job.company?.slice(0, 2) || 'CO'}</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black text-black dark:text-white truncate max-w-[120px]">{job.title}</p>
                  <p className="text-[9px] text-black/40 dark:text-white/40 font-bold uppercase tracking-tighter truncate">{job.location}</p>
                </div>
              </div>
            )) : (
              <p className="text-[11px] text-black/40 dark:text-white/40 font-bold">No jobs available</p>
            )}
          </div>
        </motion.div>

        {/* AI Resume Promo */}
        <motion.div variants={itemVariants} className="lg:col-span-3 bg-white dark:bg-black rounded-xl p-4 border border-slate-100 dark:border-white/10 shadow-sm flex flex-col">
          <div className="flex items-center justify-between px-2 mb-3">
            <h2 className="text-[11px] font-black text-black uppercase tracking-widest">AI Resume</h2>
            <div className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-bold rounded-lg uppercase">Live</div>
          </div>
          <div className="flex-1 rounded-2xl overflow-hidden relative group">
            <img src={aiResumeImg} alt="ATS Resume" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-5">
              <h3 className="text-white font-bold text-xs mb-1">Check ATS Score</h3>
              <p className="text-white/60 text-[9px] mb-4 font-medium leading-tight">Optimize for 100% shortlist rate.</p>
              <button className="w-full py-3 bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold text-[9px] rounded-xl flex items-center justify-center gap-2 hover:bg-white hover:text-black transition-all">
                Build Now <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
