import React, { useState, useEffect } from 'react';
import {
  Play, Lock, MessageSquare, Briefcase, Brain, User as UserIcon, Loader2,
  ChevronRight, BarChart3, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { aiMockService } from '../../../services/aiMockService';
import { paymentService } from '../../../services/paymentService';
import { useAuth } from '../../../context/AuthContext';
import { ROUNDS } from '../../AI/constants';

export default function AIPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Selection & Status
  const [roundsStatus, setRoundsStatus] = useState([]);
  const [planInfo, setPlanInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // History & Reports
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('All');
  const [sessionCounts, setSessionCounts] = useState({
    All: 0, Communication: 0, Technical: 0, Aptitude: 0, 'HR/Management': 0
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      if (user?.id) await fetchRoundsStatus();
      setLoading(false);
    };
    init();
  }, [user]);

  const fetchRoundsStatus = async () => {
    try {
      const [roundsRes, creditsRes, sessionsRes] = await Promise.all([
        aiMockService.getRounds(user.id),
        paymentService.getCredits().catch(() => ({ data: { hasActivePlan: false } })),
        aiMockService.getSessions({ candidateId: user.id, roundTitle: 'All' }).catch(() => ({ data: { data: [], counts: {} } }))
      ]);
      setRoundsStatus(roundsRes.data.data || []);
      setPlanInfo(creditsRes.data || null);
      
      const sessionData = sessionsRes.data;
      setSessions(sessionData.data || []);
      setSessionCounts(sessionData.counts || {
        All: 0, Communication: 0, Technical: 0, Aptitude: 0, 'HR/Management': 0
      });
    } catch (err) {
      console.error('Fetch rounds/credits error:', err);
    }
  };

  const fetchSessions = async (filter) => {
    setSessionsLoading(true);
    try {
      const res = await aiMockService.getSessions({ 
        candidateId: user.id, 
        roundTitle: filter === 'All' ? null : filter,
        limit: 10
      });
      if (res.data.success) {
        setSessions(res.data.data || []);
        if (res.data.counts) {
          setSessionCounts(res.data.counts);
        }
      }
    } catch (err) {
      console.error('Fetch sessions error:', err);
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleViewSession = (sessionId) => {
    navigate(`/ai/report/${sessionId}`);
  };

  const handleStartRound = (round) => {
    navigate(`/ai/${round.path}`);
  };

  if (loading) return (
    <div className="w-full h-full flex items-center justify-center bg-transparent">
      <Loader2 className="animate-spin text-slate-300" />
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col bg-transparent overflow-hidden font-montserrat">
      {/* Background Decorative Element */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -left-[10%] w-[30%] h-[30%] bg-purple-500/5 blur-[100px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex-1 min-h-0 overflow-y-auto px-0 no-scrollbar"
      >
        {/* Journey Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-12 mt-2">
          {ROUNDS.map((round, idx) => {
            const isPlanLocked = (round.id === 3 || round.id === 4) && planInfo?.planName?.toLowerCase() === 'basic';
            const isLocked = isPlanLocked;

            const colorMap = {
                blue: 'from-blue-500/10 to-blue-600/5 hover:to-blue-600/10 text-blue-600 border-blue-200/40',
                purple: 'from-purple-500/10 to-purple-600/5 hover:to-purple-600/10 text-purple-600 border-purple-200/40',
                emerald: 'from-emerald-500/10 to-emerald-600/5 hover:to-emerald-600/10 text-emerald-600 border-emerald-200/40',
                orange: 'from-orange-500/10 to-orange-600/5 hover:to-orange-600/10 text-orange-600 border-orange-200/40'
            };

            return (
              <motion.div
                key={round.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={!isLocked ? { scale: 1.02, y: -4 } : {}}
                className={`group relative overflow-hidden p-6 rounded-lg border transition-all duration-300 ${
                    isLocked 
                    ? 'bg-slate-50/50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 opacity-80' 
                    : `bg-gradient-to-br ${colorMap[round.color] || colorMap.blue} dark:border-white/10 backdrop-blur-md shadow-sm hover:shadow-xl`
                }`}
              >
                {/* Decorative Background Icon */}
                <round.icon className={`absolute -right-4 -bottom-4 w-32 h-32 opacity-[0.03] rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-0`} />

                <div className="relative z-10">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 shrink-0 flex items-center justify-center rounded-2xl shadow-inner ${
                        isLocked ? 'bg-slate-100 dark:bg-zinc-800 text-slate-400' : `bg-white dark:bg-white/10 text-${round.color}-600 dark:text-white`
                    }`}>
                        <round.icon className="w-6 h-6" strokeWidth={2} />
                    </div>

                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                        {round.title}
                        </h3>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed line-clamp-2">
                        {round.description}
                        </p>
                    </div>
                  </div>

                  <div className="mt-8">
                    {isLocked ? (
                      <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest bg-slate-100 dark:bg-zinc-800/50 w-full py-3 px-4 rounded-xl justify-center">
                        <Lock className="w-3 h-3" /> Locked
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartRound(round)}
                        className={`group/btn flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl font-bold text-[11px] tracking-widest transition-all shadow-lg active:scale-95 text-white uppercase ${
                            round.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25' :
                            round.color === 'purple' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/25' :
                            round.color === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25' :
                            'bg-orange-600 hover:bg-orange-700 shadow-orange-500/25'
                        }`}
                      >
                        START JOURNEY
                        <div className="bg-white/20 p-1 rounded-full group-hover/btn:translate-x-1 transition-transform">
                            <Play className="w-2.5 h-2.5 fill-current" />
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── RECENT SESSIONS HISTORY ────────────────────────────────────────── */}
        <div className="mt-8 pb-24">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Recent Sessions</h2>
            
            <div className="flex items-center p-1.5 bg-slate-100/80 dark:bg-white/5 backdrop-blur-sm rounded-2xl w-fit overflow-x-auto no-scrollbar border border-slate-200/50 dark:border-white/5">
                {['All', 'Communication', 'Technical', 'Aptitude', 'HR/Management'].map(tab => (
                    <button
                    key={tab}
                    onClick={() => { setHistoryFilter(tab); fetchSessions(tab); }}
                    className={`px-5 py-2 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap ${
                        historyFilter === tab 
                        ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-blue-400 shadow-sm' 
                        : 'text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    >
                        {tab === 'HR/Management' ? 'HR' : tab}
                        <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[9px] ${historyFilter === tab ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-slate-200/50 dark:bg-zinc-800'}`}>
                            {sessionCounts[tab === 'HR' ? 'HR/Management' : tab] || 0}
                        </span>
                    </button>
                ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {sessionsLoading ? (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-24 gap-4"
                >
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                    <p className="text-slate-400 text-sm font-medium animate-pulse">Loading history...</p>
                </motion.div>
            ) : sessions.length === 0 ? (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-20 bg-slate-50/50 dark:bg-white/[0.02] rounded-[2.5rem] border-2 border-dashed border-slate-200/60 dark:border-white/5"
                >
                    <div className="w-20 h-20 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <BarChart3 className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Sessions Yet</h3>
                    <p className="text-slate-500 dark:text-zinc-500 text-sm max-w-xs mx-auto">
                        Practice makes perfect! Start your first session to see your progress here.
                    </p>
                </motion.div>
            ) : (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                >
                    {sessions.map((sess, idx) => (
                        <motion.div 
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => handleViewSession(sess._id)}
                            className="group bg-white/70 dark:bg-black/30 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 rounded-lg p-3.5 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-500/30 transition-all cursor-pointer relative overflow-hidden"
                        >
                            <div className="flex items-start justify-between relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 shadow-sm border border-slate-100 dark:border-white/5 flex items-center justify-center text-slate-700 dark:text-zinc-300">
                                        {sess.roundTitle === 'Communication' && <MessageSquare className="w-4 h-4" />}
                                        {sess.roundTitle === 'Technical' && <Briefcase className="w-4 h-4" />}
                                        {sess.roundTitle === 'Aptitude' && <Brain className="w-4 h-4" />}
                                        {(sess.roundTitle === 'HR/Management' || sess.roundTitle === 'HR') && <UserIcon className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <h3 className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight">{sess.roundTitle}</h3>
                                        <p className="text-[9px] text-slate-500 dark:text-zinc-500 font-bold mt-0.5 uppercase tracking-widest flex items-center gap-1.5 whitespace-nowrap">
                                            <Clock className="w-2.5 h-2.5" /> {(sess.createdAt || sess.date || sess.startTime) ? new Date(sess.createdAt || sess.date || sess.startTime).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '09 Apr, 2026'}
                                        </p>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className={`text-lg font-black italic tracking-tighter ${
                                        typeof sess.score === 'number' 
                                            ? (sess.score >= 80 ? 'text-emerald-500' : sess.score >= 60 ? 'text-amber-500' : 'text-rose-500') 
                                            : 'text-slate-300'
                                    }`}>
                                        {sess.score ?? '??'}<span className="text-[9px] non-italic font-bold ml-0.5">%</span>
                                    </div>
                                    <div className="text-[8px] text-slate-400 font-bold leading-none">SCORE</div>
                                </div>
                            </div>

                            <div className="mt-3.5 flex flex-wrap gap-1.5 relative z-10">
                                {(() => {
                                    const raw = Array.isArray(sess.concepts) ? sess.concepts.join(',') : (sess.concepts || '');
                                    const all = raw.split(',').map(c => c.trim()).filter(Boolean);
                                    const display = all.slice(0, 1);
                                    const remaining = all.length - 1;
                                    return (
                                        <>
                                            {display.map((c, i) => (
                                                <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-100/50 dark:bg-white/10 text-[9px] font-bold text-slate-600 dark:text-zinc-300 border border-slate-200/30 dark:border-white/5 whitespace-nowrap">
                                                    {c}
                                                </span>
                                            ))}
                                            {remaining > 0 && (
                                                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-[9px] font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-white/5">
                                                    +{remaining}
                                                </span>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
