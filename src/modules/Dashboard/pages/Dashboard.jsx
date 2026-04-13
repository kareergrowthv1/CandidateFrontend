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
  CheckCircle2 as CheckCircle,
  XCircle,
  X,
  MoreVertical,
  Plus,
  Eye,
  ArrowRight,
  Download,
  Calendar,
  Play,
  StickyNote,
  MapPin,
  Search,
  Filter,
  Check,
  Star,
  Code2,
  Zap,
  LayoutDashboard,
  BrainCircuit,
  Target,
  CreditCard,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';
import {
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useAuth } from '../../../context/AuthContext';
import { getCandidateProfile, getDashboardStats, getDashboardActivity, getPerformanceStats, getCodingAnalytics } from '../../../services/candidateService';
import { fetchTodaysQuiz, submitQuizAnswer } from '../../../store/slices/dailyQuizSlice';
// Dynamic skeleton components inlined for zero-flash transitions
const Shimmer = () => (
    <div 
        className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/50 dark:via-white/5 to-transparent animate-shimmer" 
        style={{ transform: 'translateX(-100%)' }}
    />
);

const SkeletonCard = ({ className = "", height = "h-[92px]" }) => (
    <div className={`bg-white dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-white/5 p-4 shadow-sm overflow-hidden relative ${height} ${className}`}>
        <Shimmer />
        <div className="space-y-3">
            <div className="h-2 w-16 bg-slate-100 dark:bg-zinc-800 rounded-full"></div>
            <div className="h-8 w-24 bg-slate-200 dark:bg-zinc-700 rounded-lg"></div>
            <div className="h-2 w-32 bg-slate-100 dark:bg-zinc-800 rounded-full"></div>
        </div>
    </div>
);
import aiResumeImg from '../../../assets/ai_resume.png';

/**
 * Service Continuity Card Component
 */
// Custom Stat Card matching AdminFrontend style
const MiniStatCard = ({ label, value, sub, icon: Icon, colorClass = "blue" }) => {
  const colorMap = {
    blue: { bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-600" },
    emerald: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-600" },
    amber: { bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-600" },
    purple: { bg: "bg-purple-50 dark:bg-purple-900/20", text: "text-purple-600" },
    indigo: { bg: "bg-indigo-50 dark:bg-indigo-900/20", text: "text-indigo-600" },
  };
  const c = colorMap[colorClass] || colorMap.blue;

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
      className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-100 dark:border-white/5 shadow-sm flex items-center justify-between transition-all hover:border-blue-200 dark:hover:border-blue-900/30 group h-[92px]"
    >
      <div className="flex flex-col min-w-0">
        <p className="text-[12px] font-normal text-slate-500 dark:text-zinc-400 mb-1 truncate">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{value}</p>
        </div>
        {sub && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{sub}</p>}
      </div>
      <div className={`h-10 w-10 rounded-xl ${c.bg} ${c.text} flex items-center justify-center shadow-sm shrink-0 group-hover:scale-110 transition-transform`}>
        <Icon size={18} strokeWidth={2.5} />
      </div>
    </motion.div>
  );
};

const ServiceContinuityBigCard = ({ profile }) => {
  const serviceContinuity = useMemo(() => {
    if (!profile) return { day: '00', month: 'N/A', year: 'N/A', suffix: '', status: 'no-data' };
    const createdAt = profile.createdAt;
    if (!createdAt) return { day: '00', month: 'N/A', year: 'N/A', suffix: '', status: 'no-data' };

    try {
      const createdDate = new Date(createdAt);
      const expiryDate = new Date(createdDate);
      expiryDate.setMonth(expiryDate.getMonth() + 1);

      const day = expiryDate.getDate();
      const month = expiryDate.toLocaleString('en-US', { month: 'short' });
      const year = expiryDate.getFullYear();

      const getSuffix = (d) => { if (d > 3 && d < 21) return 'th'; switch (d % 10) { case 1: return "st"; case 2: return "nd"; case 3: return "rd"; default: return "th"; } };

      return {
        day: day.toString().padStart(2, '0'),
        month,
        year,
        suffix: getSuffix(day),
        status: (expiryDate - new Date()) > 7 * 24 * 60 * 60 * 1000 ? 'active' : 'warning'
      };
    } catch (e) {
      return { day: '00', month: 'N/A', year: 'N/A', suffix: '', status: 'no-data' };
    }
  }, [profile]);

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }}
      className="lg:row-span-2 rounded-xl border border-slate-100 dark:border-white/5 bg-white dark:bg-zinc-900 p-5 shadow-sm flex flex-col items-center justify-center text-center transition-all hover:border-blue-200 dark:hover:border-blue-900/30 h-full min-h-[196px]"
    >
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">Valid Till</p>
      <div className="flex flex-col items-center gap-1">
        <div className={`h-11 w-11 rounded-lg ${serviceContinuity.status === 'warning' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20'} flex items-center justify-center shadow-sm mb-2`}>
          <Clock size={22} strokeWidth={2.5} />
        </div>
        <p className="text-3xl font-black text-slate-900 dark:text-white leading-none">
          {serviceContinuity.day}<sup className="text-sm font-semibold text-slate-500 ml-0.5">{serviceContinuity.suffix}</sup>
        </p>
        <p className="text-lg font-bold text-slate-600 dark:text-zinc-400 mt-1">{serviceContinuity.month} {serviceContinuity.year}</p>
      </div>
    </motion.div>
  );
};

const DashboardSkeletonView = () => (
    <div className="max-w-full mx-auto p-0 pt-4 space-y-3 pb-10 animate-in fade-in duration-500">
        <div className="px-1 mb-4">
            <div className="h-7 w-64 bg-slate-200 dark:bg-zinc-800 rounded-lg relative overflow-hidden">
                <Shimmer />
            </div>
            <div className="h-3 w-40 bg-slate-100 dark:bg-zinc-800 rounded-full mt-2 relative overflow-hidden">
                <Shimmer />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <div className="lg:row-span-2 rounded-xl border border-slate-100 dark:border-white/5 bg-white dark:bg-zinc-900 p-5 shadow-sm flex flex-col items-center justify-center relative overflow-hidden h-full min-h-[196px]">
                <Shimmer />
                <div className="h-2 w-12 bg-slate-100 dark:bg-zinc-800 rounded-full mb-4"></div>
                <div className="h-12 w-12 bg-slate-200 dark:bg-zinc-700 rounded-lg mb-4"></div>
                <div className="h-8 w-24 bg-slate-200 dark:bg-zinc-700 rounded-lg mb-2"></div>
                <div className="h-4 w-32 bg-slate-100 dark:bg-zinc-800 rounded-full"></div>
            </div>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-8 space-y-3">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-slate-100 dark:border-white/5 shadow-sm relative overflow-hidden">
                    <Shimmer />
                    <div className="h-5 w-48 bg-slate-200 dark:bg-zinc-800 rounded-lg mb-8"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div className="w-48 h-48 mx-auto rounded-full border-[16px] border-slate-50 dark:border-zinc-800"></div>
                        <div className="space-y-6">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between">
                                        <div className="h-2 w-24 bg-slate-100 dark:bg-zinc-800 rounded-full"></div>
                                        <div className="h-2 w-8 bg-slate-100 dark:bg-zinc-800 rounded-full"></div>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-50 dark:bg-zinc-800 rounded-full"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-5 rounded-lg border border-slate-100 dark:border-white/5 h-32 relative overflow-hidden">
                    <Shimmer />
                    <div className="flex gap-5 h-full">
                        <div className="w-14 h-14 bg-slate-50 dark:bg-zinc-800 rounded-2xl shrink-0"></div>
                        <div className="flex-1 space-y-3 pt-2">
                            <div className="h-4 w-1/2 bg-slate-200 dark:bg-zinc-700 rounded-lg"></div>
                            <div className="h-3 w-3/4 bg-slate-100 dark:bg-zinc-800 rounded-lg"></div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-3">
                        <div className="bg-white dark:bg-zinc-900 px-6 py-6 rounded-lg border border-slate-100 dark:border-white/5 min-h-[135px] relative overflow-hidden">
                            <Shimmer />
                            <div className="h-4 w-32 bg-slate-200 dark:bg-zinc-800 rounded-lg mb-4"></div>
                            <div className="flex items-center justify-between gap-4">
                                <div className="space-y-4 flex-1">
                                    <div className="h-2 w-24 bg-slate-100 dark:bg-zinc-800 rounded-full"></div>
                                    <div className="flex gap-2">
                                        <div className="h-8 w-20 bg-slate-100 dark:bg-zinc-800 rounded-md"></div>
                                        <div className="h-8 w-24 bg-blue-100 dark:bg-blue-900/30 rounded-md"></div>
                                    </div>
                                </div>
                                <div className="w-24 h-16 rounded-t-full border-[10px] border-slate-50 dark:border-zinc-800"></div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-slate-100 dark:border-white/5 h-[320px] relative overflow-hidden">
                            <Shimmer />
                            <div className="flex justify-between mb-8">
                                <div className="h-5 w-32 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                                <div className="h-4 w-20 bg-slate-100 dark:bg-zinc-800 rounded-full"></div>
                            </div>
                            <div className="space-y-4">
                                <div className="h-12 w-full bg-slate-50 dark:bg-zinc-800 rounded-lg"></div>
                                <div className="space-y-2">
                                    {[1, 2, 3, 4].map(i => <div key={i} className="h-10 w-full bg-slate-50 dark:bg-zinc-800 rounded-lg"></div>)}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-slate-100 dark:border-white/5 h-full relative overflow-hidden">
                        <Shimmer />
                        <div className="h-5 w-40 bg-slate-200 dark:bg-zinc-800 rounded-lg mb-8"></div>
                        <div className="space-y-6">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="flex gap-4">
                                    <div className="w-9 h-9 bg-slate-100 dark:bg-zinc-800 rounded-lg shrink-0"></div>
                                    <div className="flex-1 space-y-2 pt-1">
                                        <div className="h-3 w-3/4 bg-slate-200 dark:bg-zinc-700 rounded-lg"></div>
                                        <div className="h-2 w-1/2 bg-slate-100 dark:bg-zinc-800 rounded-full"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-4 space-y-3">
                {[1, 2].map(i => (
                    <div key={i} className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-slate-100 dark:border-white/5 h-[480px] relative overflow-hidden">
                        <Shimmer />
                        <div className="flex justify-between mb-8">
                            <div className="h-5 w-32 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                            <div className="h-3 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-full"></div>
                        </div>
                        <div className="space-y-6">
                            {[1, 2, 3, 4, 5].map(j => (
                                <div key={j} className="flex gap-4">
                                    <div className="w-10 h-10 bg-slate-100 dark:bg-zinc-800 rounded-lg shrink-0"></div>
                                    <div className="flex-1 space-y-2 pt-1">
                                        <div className="h-3 w-full bg-slate-200 dark:bg-zinc-700 rounded-lg"></div>
                                        <div className="h-2 w-24 bg-slate-100 dark:bg-zinc-800 rounded-full"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-slate-100 dark:border-white/5 h-[450px] relative overflow-hidden mt-3">
            <Shimmer />
            <div className="flex justify-between mb-8">
                <div className="h-5 w-48 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                <div className="h-8 w-40 bg-slate-100 dark:bg-zinc-800 rounded-lg"></div>
            </div>
            <div className="w-full h-[300px] border-l-2 border-b-2 border-dashed border-slate-100 dark:border-zinc-800 flex items-end px-12 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
                    <div key={i} className="flex-1 bg-slate-50 dark:bg-zinc-800 rounded-t-sm" style={{ height: `${20 + Math.random() * 60}%` }}></div>
                ))}
            </div>
        </div>
    </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [dashStats, setDashStats] = useState(null);
  const [latestJobs, setLatestJobs] = useState([]);
  const [upcomingTests, setUpcomingTests] = useState([]);
  const [completedTests, setCompletedTests] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [recentTemplates, setRecentTemplates] = useState([]);
  const [performanceStats, setPerformanceStats] = useState({
    communication: { score: 0, change: 0 },
    aptitude: { score: 0, change: 0 },
    hr: { score: 0, change: 0 },
    technical: { score: 0, change: 0 },
    overall: { score: 0, change: 0 },
    testCount: 0
  });
  const [performanceHistory, setPerformanceHistory] = useState([]);
  const [historyRange, setHistoryRange] = useState('monthly');
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedMonthYear, setSelectedMonthYear] = useState(''); // "MM-YYYY"
  const [selectedWeek, setSelectedWeek] = useState('current'); // "current" | "last"
  const [statsLoading, setStatsLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [performanceLoading, setPerformanceLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeQuizIndex, setActiveQuizIndex] = useState(0);
  const [quizTimer, setQuizTimer] = useState(5);

  // Daily quiz from Redux store
  const { questions: quizQuestions, loading: quizLoading, submitting: quizSubmitting } = useSelector((state) => state.dailyQuiz);

  useEffect(() => {
    if (!user?.id) return;

    // 1. Profile Fetch
    const fetchProfile = async () => {
      try {
        const data = await getCandidateProfile(user.id);
        setProfile(data);
      } catch (err) {
        console.error('Profile fetch failed:', err);
      } finally {
        setProfileLoading(false);
      }
    };

    // 2. Main Stats Fetch (Includes Jobs and Tests)
    const fetchStats = async () => {
      try {
        const data = await getDashboardStats(user.id);
        setDashStats(data?.stats || null);
        setLatestJobs(data?.latestJobs || []);
        setUpcomingTests(data?.upcomingTests || []);
        setCompletedTests(data?.completedTests || []);
      } catch (err) {
        console.error('Stats fetch failed:', err);
      } finally {
        setStatsLoading(false);
      }
    };

    // 3. Activity Feed Fetch
    const fetchActivity = async () => {
      try {
        const data = await getDashboardActivity(user.id);
        setRecentActivities(data || []);
      } catch (err) {
        console.error('Activity fetch failed:', err);
      } finally {
        setActivityLoading(false);
      }
    };

    // 4. Performance Metrics Fetch
    const fetchPerformance = async () => {
      try {
        const data = await getPerformanceStats(user.id);
        setPerformanceStats(data || {
          communication: { score: 0, change: 0 },
          aptitude: { score: 0, change: 0 },
          hr: { score: 0, change: 0 },
          technical: { score: 0, change: 0 },
          overall: { score: 0, change: 0 },
          testCount: 0
        });
      } catch (err) {
        console.error('Performance fetch failed:', err);
      } finally {
        setPerformanceLoading(false);
      }
    };

    // 5. Resume Templates Fetch
    const fetchTemplates = async () => {
      try {
        const res = await fetch('/api/resume/templates').then(r => r.json());
        setRecentTemplates((res.data || []).slice(0, 6));
      } catch (err) {
        console.warn('Templates fetch failed:', err.message);
      } finally {
        setTemplatesLoading(false);
      }
    };

    // Trigger all independently
    fetchProfile();
    fetchStats();
    fetchActivity();
    fetchPerformance();
    fetchTemplates();
  }, [user?.id]);

  useEffect(() => {
    async function fetchHistory() {
      if (!user?.id) return;
      // If we are in monthly mode, wait until selectedMonthYear is initialized from profile registration
      if (historyRange === 'monthly' && !selectedMonthYear) return;

      setHistoryLoading(true);
      try {
        const params = { range: historyRange };
        let offsetDays = 0;
        if (historyRange === 'weekly' && selectedWeek === 'last') {
          offsetDays = 7;
        }

        if (historyRange === 'monthly' && selectedMonthYear) {
          const [m, y] = selectedMonthYear.split('-');
          params.startDate = new Date(y, parseInt(m) - 1, 1).toISOString();
          params.endDate = new Date(y, parseInt(m), 0, 23, 59, 59).toISOString();
        } else if (historyRange === 'weekly') {
          const end = new Date();
          end.setDate(end.getDate() - offsetDays);
          const start = new Date();
          start.setDate(start.getDate() - (offsetDays + 6));
          params.startDate = start.toISOString();
          params.endDate = end.toISOString();
        }

        const historyData = await getCodingAnalytics(user.id, params);

        // Fill gaps for a continuous timeline
        let filledData = [];
        if (historyRange === 'monthly' && selectedMonthYear) {
          const [m, y] = selectedMonthYear.split('-');
          const lastDay = new Date(y, m, 0).getDate();
          for (let d = 1; d <= lastDay; d++) {
            const dateStr = `${m}-${d.toString().padStart(2, '0')}`;
            const existing = historyData.find(h => h.date === dateStr);
            filledData.push(existing || { date: dateStr, passed: 0, failed: 0, questions: 0 });
          }
        } else if (historyRange === 'weekly') {
          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - (offsetDays + i));
            const dateStr = `${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
            const existing = historyData.find(h => h.date === dateStr);
            filledData.push(existing || { date: dateStr, passed: 0, failed: 0, questions: 0 });
          }
        } else {
          filledData = historyData;
        }

        setPerformanceHistory(filledData);
      } catch (err) {
        console.error('Failed to fetch performance history:', err);
        setPerformanceHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    }
    fetchHistory();
  }, [user?.id, historyRange, selectedMonthYear, selectedWeek]);

  // Generate available months from registration
  useEffect(() => {
    if (profile?.createdAt) {
      const start = new Date(profile.createdAt);
      const now = new Date();
      const months = [];
      let curr = new Date(start.getFullYear(), start.getMonth(), 1);
      while (curr <= now) {
        const m = curr.getMonth() + 1;
        const y = curr.getFullYear();
        months.push({
          label: curr.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
          value: `${m.toString().padStart(2, '0')}-${y}`
        });
        curr.setMonth(curr.getMonth() + 1);
      }
      const revMonths = months.reverse();
      setAvailableMonths(revMonths);
      if (revMonths.length > 0 && !selectedMonthYear) {
        setSelectedMonthYear(revMonths[0].value);
      }
    }
  }, [profile]);

  useEffect(() => {
    dispatch(fetchTodaysQuiz());
  }, [dispatch]);

  // Quiz auto-progression logic with countdown
  useEffect(() => {
    if (quizQuestions.length > 0 && !quizLoading) {
      const interval = setInterval(() => {
        setQuizTimer((prev) => {
          if (prev <= 1) {
            setActiveQuizIndex((curr) => (curr + 1) % quizQuestions.length);
            return 5;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [quizQuestions, quizLoading]);

  const handleQuizAnswer = async (questionId, optionIndex) => {
    const question = quizQuestions[activeQuizIndex];
    if (!question || question.answered || quizSubmitting) return;
    await dispatch(submitQuizAnswer({ questionId, selectedAnswerIndex: optionIndex }));
  };

  const attendance = dashStats?.attendancePercentage ?? 0;
  const credits = dashStats?.credits || { total: 0, utilized: 0, remaining: 0, planName: 'Free' };

  const summaryStats = [
    { label: 'Total Jobs', value: dashStats?.totalJobs || 0, icon: Briefcase, colorClass: 'blue', sub: 'Opportunities' },
    { label: 'Total Tasks', value: dashStats?.totalTasks || 0, icon: Calendar, colorClass: 'indigo', sub: 'Assigned' },
    { label: 'Remaining Credits', value: credits.remaining || 0, icon: Zap, colorClass: 'amber', sub: 'Available' },
    { label: 'Attendance', value: `${attendance}%`, icon: Users, colorClass: 'blue', sub: 'Monthly track' },
    { label: 'Problems Solved', value: dashStats?.solvedCount || 0, icon: Target, colorClass: 'emerald', sub: 'All topics' },
    { label: 'Active Plan', value: credits.planName || 'Free', icon: CreditCard, colorClass: 'purple', sub: 'Subscription' }
  ];

  const getActivityConfig = (type) => {
    switch (type) {
      case 'mock': return { icon: Video, color: "text-blue-500", bg: "bg-blue-50" };
      case 'assessment': return { icon: Award, color: "text-emerald-500", bg: "bg-emerald-50" };
      case 'task': return { icon: StickyNote, color: "text-amber-500", bg: "bg-amber-50" };
      default: return { icon: Zap, color: "text-slate-400", bg: "bg-slate-50" };
    }
  };

  const formatActivityTime = (timestamp) => {
    if (!timestamp) return 'Recently';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const aiAnalysisRounds = [
    { label: "Communication", percentage: performanceStats.communication?.score || 0, change: performanceStats.communication?.change || 0, color: "bg-blue-500" },
    { label: "Technical", percentage: performanceStats.technical?.score || 0, change: performanceStats.technical?.change || 0, color: "bg-indigo-500" },
    { label: "Aptitude", percentage: performanceStats.aptitude?.score || 0, change: performanceStats.aptitude?.change || 0, color: "bg-emerald-500" },
    { label: "HR Interview", percentage: performanceStats.hr?.score || 0, change: performanceStats.hr?.change || 0, color: "bg-slate-500" }
  ];

  const formatTemplateDate = (tpl) => {
    const timestamp = tpl.updatedAt || tpl.createdAt || tpl.updated_at || tpl.created_at;
    if (!timestamp) return 'Base Template';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Recently Updated';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      let formattedDate = label;
      if (label && label.includes('-')) {
        const [m, d] = label.split('-');
        const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        const year = historyRange === 'monthly' && selectedMonthYear ? selectedMonthYear.split('-')[1] : new Date().getFullYear();
        formattedDate = `${d}-${monthNames[parseInt(m) - 1] || '---'}-${year}`;
      }

      const uniquePayload = [];
      const seen = new Set();
      payload.forEach(item => {
        if (!seen.has(item.dataKey)) {
          seen.add(item.dataKey);
          uniquePayload.push(item);
        }
      });

      return (
        <div className="bg-white/95 dark:bg-zinc-900/95 p-3 rounded-xl shadow-xl border border-slate-100 dark:border-white/5 backdrop-blur-md">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 dark:border-white/5 pb-1">{formattedDate}</p>
          <div className="space-y-1.5">
            {uniquePayload.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between gap-8">
                <span className="text-[11px] font-bold capitalize" style={{ color: item.color || item.fill }}>
                  {item.name || item.dataKey}:
                </span>
                <span className="text-[11px] font-black text-slate-900 dark:text-white">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="max-w-full mx-auto p-0 pt-4 space-y-3 pb-10">
      {/* Welcome Section */}
      <div className="px-1 mb-4">
        {profileLoading ? (
          <div className="space-y-2">
            <div className="h-7 w-64 bg-slate-200 dark:bg-zinc-800 rounded-lg relative overflow-hidden"><Shimmer /></div>
            <div className="h-3 w-40 bg-slate-100 dark:bg-zinc-800 rounded-full relative overflow-hidden"><Shimmer /></div>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-[28px] font-black text-slate-900 dark:text-white leading-tight">
              Welcome back, {profile?.name || 'Candidate'}
            </h1>
            <p className="text-slate-500 dark:text-zinc-400 font-medium text-[14px] mt-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Organization: {profile?.organizationName || 'Systemmindz'}
            </p>
          </motion.div>
        )}
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        {statsLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <div className="lg:row-span-2 rounded-xl border border-slate-100 dark:border-white/5 bg-white dark:bg-zinc-900 p-5 shadow-sm flex flex-col items-center justify-center relative overflow-hidden h-full min-h-[196px]">
              <Shimmer />
              <div className="h-2 w-12 bg-slate-100 dark:bg-zinc-800 rounded-full mb-4"></div>
              <div className="h-12 w-12 bg-slate-200 dark:bg-zinc-700 rounded-lg mb-4"></div>
              <div className="h-8 w-24 bg-slate-200 dark:bg-zinc-700 rounded-lg mb-2"></div>
              <div className="h-4 w-32 bg-slate-100 dark:bg-zinc-800 rounded-full"></div>
            </div>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            {summaryStats.slice(0, 3).map((stat, i) => (
              <MiniStatCard key={i} {...stat} />
            ))}
            <ServiceContinuityBigCard profile={profile} />
            {summaryStats.slice(3, 6).map((stat, i) => (
              <MiniStatCard key={i + 3} {...stat} />
            ))}
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          {/* AI Performance Gauge */}
          <motion.section variants={itemVariants} className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-slate-100 dark:border-white/5 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-2.5 mb-6">
              <BrainCircuit size={20} className="text-slate-400" />
              <h2 className="text-[17px] font-bold text-slate-900 dark:text-white leading-tight">Performance Insight</h2>
            </div>
            {performanceLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <Shimmer />
                <div className="w-48 h-48 mx-auto rounded-full border-[16px] border-slate-50 dark:border-zinc-800"></div>
                <div className="space-y-6">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between">
                        <div className="h-2 w-24 bg-slate-100 dark:bg-zinc-800 rounded-full"></div>
                        <div className="h-2 w-8 bg-slate-100 dark:bg-zinc-800 rounded-full"></div>
                      </div>
                      <div className="h-1.5 w-full bg-slate-50 dark:bg-zinc-800 rounded-full"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="96" cy="96" r="80" fill="transparent" stroke="#F1F5F9" strokeWidth="16" className="dark:stroke-zinc-800" />
                    <motion.circle
                      cx="96" cy="96" r="80" fill="transparent" stroke="#2563eb" strokeWidth="16"
                      strokeDasharray={2 * Math.PI * 80}
                      initial={{ strokeDashoffset: 2 * Math.PI * 80 }}
                      animate={{ strokeDashoffset: (2 * Math.PI * 80) * (1 - ((performanceStats.overall?.score || 0) / 100)) }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-4xl font-black text-slate-900 dark:text-white tabular-nums">{performanceStats.overall?.score || 0}%</span>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Overall</span>
                      {performanceStats.overall?.change !== 0 && (
                        <span className={`text-[10px] font-bold ${performanceStats.overall?.change > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {performanceStats.overall?.change > 0 ? '↑' : '↓'}{Math.abs(performanceStats.overall?.change)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  {aiAnalysisRounds.map((round, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between items-center text-[12px] font-medium">
                        <span className="text-slate-900 dark:text-zinc-400">{round.label}</span>
                        <div className="flex items-center gap-2">
                          {round.change !== 0 && (
                            <span className={`text-[10px] font-bold ${round.change > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {round.change > 0 ? 'Improvement' : 'Decline'} {Math.abs(round.change)}%
                            </span>
                          )}
                          <span className="text-slate-900 dark:text-white">{round.percentage}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${round.percentage}%` }}
                          className={`h-full ${round.color} rounded-full`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.section>

          {/* Fake Offer Letter Detection Banner */}
          <motion.section
            variants={itemVariants}
            onClick={() => navigate('/fake-offer-detection')}
            className="bg-rose-50/50 dark:bg-rose-500/5 p-5 rounded-xl border border-rose-100 dark:border-rose-500/10 shadow-sm group cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
              <ShieldAlert size={120} className="text-rose-600" />
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-5 relative z-10">
              <div className="h-14 w-14 rounded-2xl bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center shrink-0">
                <ShieldAlert size={28} className="text-rose-600" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-[17px] font-black text-slate-900 dark:text-white leading-tight">Fake Offer Letter Detection</h3>
                  <span className="px-1.5 py-0.5 bg-rose-600 text-white text-[9px] font-black rounded uppercase tracking-tighter">New</span>
                </div>
                <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                  Protect yourself from job scams. Upload and verify the authenticity of your offer letter with AI-powered analysis.
                </p>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-4">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle size={14} className="text-rose-600" />
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tight">Document Analysis</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle size={14} className="text-rose-600" />
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tight">Company Verification</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle size={14} className="text-rose-600" />
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tight">Instant Results</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-white dark:bg-zinc-800 border border-slate-100 dark:border-white/5 text-rose-600 group-hover:bg-rose-600 group-hover:text-white group-hover:border-rose-600 transition-all duration-300">
                <ArrowUpRight size={20} />
              </div>
            </div>
          </motion.section>

          {/* Subgrid: (Quiz + Resume) | Activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-3">
              {/* Resume Score Card */}
              <motion.section variants={itemVariants} className="bg-white dark:bg-zinc-900 px-6 pt-6 pb-4 rounded-lg border border-slate-100 dark:border-white/5 shadow-sm min-h-[135px] flex flex-col relative overflow-hidden">
                <div className="flex items-center gap-2.5 mb-2">
                  <ShieldCheck size={20} className="text-slate-400" />
                  <h2 className="text-[17px] font-bold text-slate-900 dark:text-white leading-tight">Resume Score</h2>
                </div>

                {statsLoading ? (
                  <div className="flex items-center justify-between gap-4 flex-1">
                    <Shimmer />
                    <div className="space-y-4 flex-1">
                      <div className="h-2 w-24 bg-slate-100 dark:bg-zinc-800 rounded-full"></div>
                      <div className="flex gap-2">
                        <div className="h-8 w-20 bg-slate-100 dark:bg-zinc-800 rounded-md"></div>
                        <div className="h-8 w-24 bg-blue-100 dark:bg-blue-900/30 rounded-md"></div>
                      </div>
                    </div>
                    <div className="w-24 h-16 rounded-t-full border-[10px] border-slate-50 dark:border-zinc-800"></div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4 flex-1">
                    <div className="space-y-4">
                      <p className="text-[13px] text-slate-600 dark:text-slate-400 font-normal">Ready for Shortlist</p>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => navigate('/resume-template-studio?action=upload')} className="px-2.5 py-1.5 border border-blue-100 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md text-[10px] font-bold hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors uppercase tracking-tight">
                          Check ATS
                        </button>
                        <button onClick={() => navigate('/resume-template-studio')} className="px-2.5 py-1.5 bg-blue-600 text-white rounded-md text-[10px] font-bold hover:bg-blue-700 transition-colors uppercase tracking-tight">
                          Create Resume
                        </button>
                      </div>
                    </div>

                    <div className="relative w-24 h-20 shrink-0 group/gauge">
                      <svg className="w-full h-full" viewBox="0 0 80 60">
                        {/* Contiguous Arc Segments - Radius 30 */}
                        <path d="M 10 48 A 30 30 0 0 1 15.7 30.4" fill="none" stroke="#ef4444" strokeWidth="12" />
                        <path d="M 15.7 30.4 A 30 30 0 0 1 30.7 19.5" fill="none" stroke="#f97316" strokeWidth="12" />
                        <path d="M 30.7 19.5 A 30 30 0 0 1 49.3 19.5" fill="none" stroke="#eab308" strokeWidth="12" />
                        <path d="M 49.3 19.5 A 30 30 0 0 1 64.3 30.4" fill="none" stroke="#84cc16" strokeWidth="12" />
                        <path d="M 64.3 30.4 A 30 30 0 0 1 70 48" fill="none" stroke="#22c55e" strokeWidth="12" />

                        {/* Pointer/Needle Pointing Out - Enhanced */}
                        <motion.g
                          initial={{ rotate: -90 }}
                          animate={{ rotate: -90 + (84 / 100) * 180 }}
                          style={{ originX: "40px", originY: "48px" }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                        >
                          <line x1="40" y1="48" x2="40" y2="6" stroke="#f97316" strokeWidth="4" strokeLinecap="round" />
                          <circle cx="40" cy="6" r="6.5" fill="#f97316" stroke="white" strokeWidth="2" />
                        </motion.g>
                      </svg>
                      <div className="absolute top-[38px] inset-x-0 text-center">
                        <span className="text-[19px] font-black text-slate-900 dark:text-white leading-none">84%</span>
                      </div>
                    </div>
                  </div>
                )}
              </motion.section>

              {/* Daily Quiz */}
              <motion.section variants={itemVariants} className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-slate-100 dark:border-white/5 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2.5">
                    <Star size={20} className="text-amber-500 fill-amber-500" />
                    <h2 className="text-[17px] font-bold text-slate-900 dark:text-white leading-tight">Daily Quiz</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {(quizQuestions || []).map((_, i) => (
                        <div key={i} className={`h-1 w-4 rounded-full transition-all ${i === activeQuizIndex ? 'bg-blue-600' : 'bg-slate-100 dark:bg-white/10'}`} />
                      ))}
                    </div>
                    <div className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-md">
                      {quizTimer}
                    </div>
                  </div>
                </div>
                {quizLoading ? <div className="h-24 bg-slate-50 dark:bg-zinc-800 rounded-lg animate-pulse"></div> : (
                  <div className="space-y-4">
                    <div className="min-h-[60px]">
                      <p className="text-[14px] text-slate-900 dark:text-white leading-relaxed font-normal">
                        {quizQuestions[activeQuizIndex]?.question || "Test your knowledge with today's quiz!"}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {quizQuestions[activeQuizIndex]?.options?.map((option, idx) => {
                        const q = quizQuestions[activeQuizIndex];
                        const isAnswered = q.answered;
                        const isCorrect = idx === q.correctAnswerIndex;
                        const isSelected = idx === q.selectedAnswerIndex;
                        const isWrongSelection = isSelected && !isCorrect;

                        let statusClasses = 'bg-white border-slate-100 hover:border-blue-600 hover:bg-blue-50 text-slate-900 dark:text-white dark:bg-zinc-800';
                        if (isAnswered) {
                          if (isCorrect) {
                            statusClasses = 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm';
                          } else if (isWrongSelection) {
                            statusClasses = 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm';
                          } else {
                            statusClasses = 'bg-slate-50 border-slate-200 text-slate-400 opacity-60';
                          }
                        }

                        return (
                          <button
                            key={idx}
                            onClick={() => handleQuizAnswer(q.questionId, idx)}
                            disabled={isAnswered}
                            className={`text-left px-4 py-2.5 rounded-lg text-[13px] border transition-all flex items-center gap-2 ${statusClasses} font-normal group`}
                          >
                            <span className={`font-bold ${isCorrect && isAnswered ? 'text-emerald-600' : isWrongSelection ? 'text-rose-600' : ''}`}>
                              {['A', 'B', 'C', 'D'][idx]}.
                            </span>
                            {option}
                            {isAnswered && isCorrect && <CheckCircle size={14} className="ml-auto text-emerald-600" />}
                            {isAnswered && isWrongSelection && <XCircle size={14} className="ml-auto text-rose-600" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.section>
            </div>

            {/* Recent Activity */}
            <motion.section variants={itemVariants} className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-slate-100 dark:border-white/5 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <Clock size={20} className="text-slate-400" />
                  <h2 className="text-[17px] font-bold text-slate-900 dark:text-white leading-tight">Recent Activity</h2>
                </div>
                <button onClick={() => navigate('/activities')} className="text-[12px] font-medium text-blue-600 hover:text-blue-800 transition-colors">View All</button>
              </div>
              <div className="flex-1 space-y-0 relative no-scrollbar overflow-y-auto min-h-[380px]">
                <div className="absolute left-[18px] top-6 bottom-6 w-px bg-slate-100 dark:bg-white/5" />
                {activityLoading ? (
                  <div className="space-y-6">
                    <Shimmer />
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="flex gap-4">
                        <div className="w-9 h-9 bg-slate-100 dark:bg-zinc-800 rounded-lg shrink-0"></div>
                        <div className="flex-1 space-y-2 pt-1">
                          <div className="h-3 w-3/4 bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                          <div className="h-2 w-1/2 bg-slate-100 dark:bg-zinc-800 rounded-full"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentActivities.length > 0 ? (
                  recentActivities.map((act, i) => {
                    const config = getActivityConfig(act.type);
                    const ActIcon = config.icon;
                    return (
                      <div key={act.id || i} className="pb-5 last:pb-0 relative flex gap-4 group">
                        <div className={`h-9 w-9 rounded-lg ${config.bg} dark:bg-white/5 ${config.color} flex items-center justify-center shrink-0 z-10 group-hover:scale-110 transition-transform`}>
                          <ActIcon size={16} />
                        </div>
                        <div className="min-w-0 pt-0.5">
                          <p className="text-[14px] font-bold text-slate-800 dark:text-white leading-snug group-hover:text-blue-600 transition-all truncate">
                            {act.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[12px] font-normal text-slate-400">{formatActivityTime(act.timestamp)}</p>
                            <span className="w-1 h-1 rounded-full bg-slate-200" />
                            <p className="text-[12px] font-medium text-slate-500 italic truncate">{act.subtitle}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-10 text-center">
                    <p className="text-sm text-slate-400">No recent activities yet</p>
                  </div>
                )}
              </div>
            </motion.section>
          </div>
        </div>

        {/* Right Column (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          {/* Assessment Center */}
          {(upcomingTests.length > 0 || completedTests.length > 0) && (
            <motion.section variants={itemVariants} className="bg-slate-900 dark:bg-zinc-950 p-6 rounded-lg text-white shadow-lg relative overflow-hidden group">
              <div className="relative z-10 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md">
                    <Zap size={18} className="text-amber-400 fill-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-normal uppercase tracking-wider">Assessments</h3>
                    <p className="text-[10px] text-blue-400 font-medium uppercase tracking-widest">
                      {upcomingTests.length > 0 ? 'Action Required' : 'Recently Completed'}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {(upcomingTests.length > 0 ? upcomingTests : completedTests).map((test, i) => (
                    <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all cursor-pointer">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-[14px] font-bold truncate">{test.type}</h4>
                        {test.isAssessmentCompleted ? <CheckCircle size={14} className="text-emerald-400" /> : <ArrowRight size={14} className="text-blue-400" />}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                        <Clock size={12} /> {new Date(test.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => navigate('/practice')} className="w-full py-3 bg-white text-slate-900 font-bold rounded-lg text-[11px] uppercase tracking-wider hover:bg-blue-600 hover:text-white transition-all">
                  {upcomingTests.length > 0 ? 'Start Now' : 'View Performance'}
                </button>
              </div>
            </motion.section>
          )}

          {/* Recent Jobs */}
          <motion.section variants={itemVariants} className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-slate-100 dark:border-white/5 shadow-sm flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <Briefcase size={20} className="text-slate-400" />
                <h2 className="text-[17px] font-bold text-slate-900 dark:text-white leading-tight">Recent Jobs</h2>
              </div>
              <button onClick={() => navigate('/jobs')} className="text-[12px] font-medium text-blue-600 hover:text-blue-800 transition-colors">View All</button>
            </div>
            <div className="flex-1 space-y-0 relative no-scrollbar overflow-y-auto">
              <div className="absolute left-[18px] top-6 bottom-6 w-px bg-slate-100 dark:bg-white/5" />
              {statsLoading ? (
                <div className="space-y-6 relative overflow-hidden">
                  <Shimmer />
                  {[1, 2, 3, 4, 5].map(j => (
                    <div key={j} className="flex gap-4">
                      <div className="w-10 h-10 bg-slate-100 dark:bg-zinc-800 rounded-lg shrink-0"></div>
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-3 w-full bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                        <div className="h-2 w-24 bg-slate-100 dark:bg-zinc-800 rounded-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : latestJobs.length > 0 ? (
                latestJobs.slice(0, 5).map((job, i) => (
                  <div key={job.id || i} className="pb-5 last:pb-0 relative flex gap-4 group cursor-pointer" onClick={() => navigate(`/jobs/${job.id}`)}>
                    <div className="h-9 w-9 rounded-lg bg-slate-50 dark:bg-white/5 text-slate-400 flex items-center justify-center shrink-0 z-10 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                      <Briefcase size={16} />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-[12px] font-normal text-slate-400 uppercase tracking-tight mb-0.5">{job.company}</p>
                      <h4 className="text-[14px] font-normal text-slate-800 dark:text-white leading-snug group-hover:text-blue-600 transition-all">{job.title}</h4>
                      <p className="mt-1 text-[11px] font-normal text-slate-400 flex items-center gap-1.5 font-medium">
                        <Clock size={12} /> {new Date(job.createdAt || Date.now()).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })} • {job.location}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-slate-400 text-sm">No new jobs matching your profile.</div>
              )}
            </div>
          </motion.section>

          {/* Recent Resume Templates - Timeline Style */}
          <motion.section variants={itemVariants} className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-slate-100 dark:border-white/5 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <FileText size={20} className="text-slate-400" />
                <h2 className="text-[17px] font-bold text-slate-900 dark:text-white leading-tight">Recent Templates</h2>
              </div>
              <button onClick={() => navigate('/resume-template-studio')} className="text-[12px] font-medium text-blue-600 hover:text-blue-800 transition-colors">View All</button>
            </div>

            <div className="space-y-0 relative">
              <div className="absolute left-[18px] top-6 bottom-6 w-px bg-slate-100 dark:bg-white/5" />

              {templatesLoading ? (
                <div className="space-y-6 relative overflow-hidden">
                  <Shimmer />
                  {[1, 2, 3, 4, 5].map(j => (
                    <div key={j} className="flex gap-4">
                      <div className="w-10 h-10 bg-slate-100 dark:bg-zinc-800 rounded-lg shrink-0"></div>
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-3 w-full bg-slate-200 dark:bg-zinc-800 rounded-lg"></div>
                        <div className="h-2 w-24 bg-slate-100 dark:bg-zinc-800 rounded-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentTemplates.length > 0 ? (
                recentTemplates.slice(0, 6).map((template, i) => (
                  <div key={template.id || template._id || i} className="pb-5 last:pb-0 relative flex gap-4 group cursor-pointer" onClick={() => navigate('/resume-template-studio')}>
                    <div className="h-9 w-9 rounded-lg bg-slate-50 dark:bg-white/5 text-slate-400 flex items-center justify-center shrink-0 z-10 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                      <FileText size={16} />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-[14px] font-bold text-slate-800 dark:text-white leading-snug group-hover:text-blue-600 transition-all">{template.name}</p>
                      <p className="mt-1 text-[12px] font-normal text-slate-400 flex items-center gap-1.5 font-medium">
                        <Clock size={12} /> {formatTemplateDate(template)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-slate-400 text-sm">No activity or templates found.</div>
              )}
            </div>
          </motion.section>
        </div>
      </div>

      {/* Performance Growth Section - Full Width Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mt-3">
        <motion.div
          variants={itemVariants}
          className={`${upcomingTests.length > 0 ? "lg:col-span-8" : "lg:col-span-12"} bg-white dark:bg-zinc-900 p-6 rounded-lg border border-slate-100 dark:border-white/5 shadow-sm relative`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <TrendingUp size={20} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-[17px] font-bold text-slate-900 dark:text-white leading-tight">Coding Growth</h2>
                <p className="text-[11px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">Real-time Trading Style Analysis</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Range Selector */}
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-white/5 p-1 rounded-lg">
                {['weekly', 'monthly'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setHistoryRange(r)}
                    className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-tight rounded-md transition-all ${historyRange === r
                      ? "bg-white dark:bg-zinc-800 text-blue-600 shadow-sm"
                      : "text-slate-400 hover:text-slate-600"
                      }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* Monthly Dropdown */}
              {historyRange === 'monthly' && (
                <select
                  value={selectedMonthYear}
                  onChange={(e) => setSelectedMonthYear(e.target.value)}
                  className="bg-slate-50 dark:bg-zinc-800 border-none text-[12px] font-bold text-slate-700 dark:text-white rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500"
                >
                  {availableMonths.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              )}

              {/* Weekly Dropdown */}
              {historyRange === 'weekly' && (
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="bg-slate-50 dark:bg-zinc-800 border-none text-[12px] font-bold text-slate-700 dark:text-white rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="current">Current Week</option>
                  <option value="last">Last Week</option>
                </select>
              )}
            </div>
          </div>

          <div className="h-[320px] w-full min-h-[320px] relative overflow-hidden">
            {historyLoading ? (
              <>
                <Shimmer />
                <div className="absolute inset-0 border-l-2 border-b-2 border-dashed border-slate-100 dark:border-zinc-800 flex items-end px-12 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
                    <div key={i} className="flex-1 bg-slate-50 dark:bg-zinc-800 rounded-t-sm" style={{ height: `${20 + Math.random() * 60}%` }}></div>
                  ))}
                </div>
              </>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <ComposedChart data={performanceHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLine" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-white/5" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                    dy={10}
                    interval={historyRange === 'monthly' ? 2 : 0}
                    tickFormatter={(tick) => historyRange === 'monthly' ? tick.split('-')[1] : tick}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                    ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  />
                  <Bar
                    dataKey="passed"
                    stackId="a"
                    fill="#10B981"
                    radius={[0, 0, 4, 4]}
                    barSize={16}
                    animationDuration={1500}
                  />
                  <Bar
                    dataKey="failed"
                    stackId="a"
                    fill="#EF4444"
                    radius={[4, 4, 0, 0]}
                    barSize={16}
                    animationDuration={1500}
                  />
                  <Area
                    type="monotone"
                    dataKey="questions"
                    fill="url(#colorLine)"
                    stroke="none"
                  />
                  <Line
                    type="monotone"
                    dataKey="questions"
                    stroke="#2563eb"
                    strokeWidth={4}
                    dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2, fill: '#2563eb' }}
                    animationDuration={2000}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
          {!historyLoading && !performanceHistory.some(h => (h.passed || 0) + (h.failed || 0) + (h.questions || 0) > 0) && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-zinc-900/50 backdrop-blur-[1px] rounded-lg pointer-events-none">
              <p className="text-[13px] font-bold text-slate-400 uppercase tracking-widest bg-white dark:bg-zinc-900 px-4 py-2 rounded-xl shadow-sm border border-slate-100 dark:border-white/5">No activity data for this range</p>
            </div>
          )}
        </motion.div>

        {upcomingTests.length > 0 && (
          <motion.div
            variants={itemVariants}
            className="lg:col-span-4 bg-blue-600 rounded-lg p-6 text-white shadow-lg relative overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Zap size={120} />
            </div>
            <div className="relative z-10">
              <div className="bg-white/20 w-fit p-2 rounded-lg backdrop-blur-md mb-4">
                <Target size={24} className="text-white" />
              </div>
              <h3 className="text-[18px] font-black leading-tight mb-2">Assigned Test Required</h3>
              <p className="text-[12px] opacity-80 leading-relaxed font-medium">
                You have a {upcomingTests[0]?.type || "Technical"} assessment pending. Complete it now to update your growth analytics.
              </p>
            </div>
            <button
              onClick={() => navigate('/practice')}
              className="mt-6 w-full py-3 bg-white text-blue-600 font-black rounded-lg text-[12px] uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
            >
              Start Assessment <ArrowRight size={16} />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
