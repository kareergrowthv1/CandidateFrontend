import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, MessageSquare, Briefcase, Brain, User as UserIcon,
    ChevronRight, Download, Share2, Award, Clock, FileText,
    AlertCircle, CheckCircle, Target, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { aiMockService } from '../../../services/aiMockService';
import { useAuth } from '../../../context/AuthContext';
import Loader from '../../../components/ui/Loader';

import kgLogo from '../../../assets/logo.png';

const SessionReportPage = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const res = await aiMockService.getSessionDetails(sessionId);
                setSession(res.data.data);
            } catch (err) {
                console.error('Fetch session details error:', err);
            } finally {
                setLoading(false);
            }
        };
        if (sessionId) fetchDetails();
    }, [sessionId]);

    const formatText = (text) => {
        if (!text) return "";
        let firstHeadingFound = false;
        return text.split('\n').map((line, i) => {
            if (line.startsWith('### ')) {
                const mt = firstHeadingFound ? "mt-6" : "mt-0";
                firstHeadingFound = true;
                return <h3 key={i} className={`text-lg font-black text-slate-900 dark:text-white ${mt} mb-2 uppercase tracking-tight`}>{line.replace('### ', '')}</h3>;
            }
            if (line.startsWith('## ')) {
                const mt = firstHeadingFound ? "mt-8" : "mt-0";
                firstHeadingFound = true;
                return <h2 key={i} className={`text-xl font-black text-slate-900 dark:text-white ${mt} mb-4 uppercase tracking-tighter border-b-2 border-slate-100 dark:border-white/5 pb-2`}>{line.replace('## ', '')}</h2>;
            }
            if (line.startsWith('**')) {
                const parts = line.split('**');
                return <p key={i} className="mb-2"><span className="font-bold text-slate-900 dark:text-white">{parts[1]}</span>{parts[2]}</p>;
            }
            if (line.startsWith('- ')) return <li key={i} className="ml-4 mb-1 list-disc text-slate-600 dark:text-zinc-400">{line.replace('- ', '')}</li>;
            return <p key={i} className="mb-3 text-slate-600 dark:text-zinc-400 leading-relaxed">{line}</p>;
        });
    };

    if (loading) return <div className="flex-1 flex items-center justify-center p-20"><Loader /></div>;
    if (!session) return (
        <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
            <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Report Not Found</h3>
            <p className="text-slate-500 mb-6">We couldn't find the requested interview session.</p>
            <button onClick={() => navigate('/ai')} className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold uppercase text-xs tracking-widest">Back to Hub</button>
        </div>
    );

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
        if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-100';
        if (score >= 40) return 'text-amber-600 bg-amber-50 border-amber-100';
        return 'text-rose-600 bg-rose-50 border-rose-100';
    };

    return (
        <div className="w-full h-full flex flex-col bg-transparent overflow-hidden font-montserrat relative">
            {/* Background Decorative Element */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
                <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
                <div className="absolute top-[20%] -left-[10%] w-[30%] h-[30%] bg-purple-500/5 blur-[100px] rounded-full" />
                <div className="absolute bottom-0 right-0 w-[50%] h-[50%] bg-blue-500/[0.02] blur-[150px] rounded-full" />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-0">
                <div className="w-full space-y-8 pb-12">

                    {/* Header Section - Premium Aesthetic */}
                    <div className="relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
                        <div className="relative z-10">
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-tight">
                                {session.roundTitle} <span className="text-blue-600 dark:text-blue-400 italic">ASSESSMENT</span>
                            </h1>
                            <div className="flex flex-wrap items-center gap-5 text-[11px] font-bold text-slate-500 dark:text-zinc-500 mt-4">
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-white/50 dark:bg-white/5 rounded-full border border-slate-100 dark:border-white/5 shadow-sm">
                                    <Clock className="w-3.5 h-3.5 opacity-50" />
                                    <span>{session.completedAt ? new Date(session.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Date'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-white/50 dark:bg-white/5 rounded-full border border-slate-100 dark:border-white/5 shadow-sm">
                                    <Target className="w-3.5 h-3.5 opacity-50" />
                                    <span>{session.questions?.length || 0} Questions</span>
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-500/10 rounded-full border border-blue-100 dark:border-blue-500/10 text-blue-600 dark:text-blue-400">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span className="capitalize">{session.mode} Round</span>
                                </div>
                            </div>
                        </div>

                        <div className="relative z-10 flex flex-col items-end">
                            <div className="flex items-baseline gap-1">
                                <span className="text-7xl font-black text-slate-900 dark:text-white tracking-tighter italic leading-none">{session.score || 0}</span>
                                <span className="text-xl font-bold text-slate-400 tracking-tighter">/100</span>
                            </div>
                            <div className="text-[12px] font-medium text-black dark:text-white mt-2 mr-1">Overall Performance</div>
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                        
                        {/* Analysis Report - Left Side (8 cols) */}
                        <div className="xl:col-span-12">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white/70 dark:bg-black/20 backdrop-blur-xl border border-slate-200/60 dark:border-white/5 rounded-lg p-6 md:p-8 relative overflow-hidden"
                            >

                                <div className="prose prose-slate dark:prose-invert max-w-none text-[15px] font-medium leading-[1.8] text-slate-800 dark:text-zinc-300">
                                    {formatText(session.analysis || "Full analysis report not found for this session.")}
                                </div>

                            </motion.div>
                        </div>

                        {/* Transcript Section - Full Width below analysis */}
                        <div className="xl:col-span-12 space-y-6 pt-4">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-6 bg-slate-400 rounded-full" />
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Interview Transcript</h2>
                                </div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-1.5 bg-white/50 dark:bg-white/5 rounded-full border border-slate-100 dark:border-white/5">
                                    {session.questions?.length || 0} Questions Analyzed
                                </div>
                            </div>

                            <div className="space-y-6">
                                {session.questions?.map((qa, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="space-y-3"
                                    >
                                        {/* AI Question (Premium Box) */}
                                        <div className="flex gap-4 max-w-full group">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 shrink-0 mt-0.5 shadow-sm overflow-hidden">
                                                <img src={kgLogo} alt="AI" className="w-[70%] h-[70%] object-contain" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-[14px] font-medium text-slate-800 dark:text-zinc-200 leading-relaxed bg-white/70 dark:bg-black/20 backdrop-blur-xl p-4 rounded-lg rounded-tl-none border border-slate-200/60 dark:border-white/5 shadow-sm w-fit max-w-full md:max-w-[75%]">
                                                    {qa.question}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Candidate Answer (Dark Accent Box) */}
                                        <div className="flex gap-4 flex-row-reverse max-w-full group">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-[14px] shrink-0 mt-0.5 shadow-lg shadow-slate-900/10">
                                                {user?.name?.charAt(0) || 'C'}
                                            </div>
                                            <div className="flex-1 flex justify-end">
                                                <div className="text-[14px] font-medium text-white dark:text-slate-900 bg-slate-900 dark:bg-white p-4 rounded-lg rounded-tr-none shadow-xl shadow-slate-900/10 w-fit max-w-full md:max-w-[75%]">
                                                    {qa.answer || "[No response recorded]"}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>


                </div>
            </div>
        </div>
    );
};

export default SessionReportPage;
