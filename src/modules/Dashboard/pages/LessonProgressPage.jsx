import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8003';

export default function LessonProgressPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { slug, lessonId } = useParams();
    const { user } = useAuth();
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [courseData, setCourseData] = useState(null);
    const [progressData, setProgressData] = useState(null);
    const [completedLessonTitles, setCompletedLessonTitles] = useState([]);

    // Skills data passed from previous page
    const subskillTitle = location.state?.subskillTitle || "Write and compile basic Java programs.";

    useEffect(() => {
        const fetchData = async () => {
            if (!user?.id || !slug) return;
            try {
                setLoading(true);
                const [courseRes, progressRes] = await Promise.all([
                    axios.get(`${API_BASE}/api/programming/courses/${slug}`),
                    axios.get(`${API_BASE}/api/programming/candidate-progress/${slug}/${user.id}`)
                ]);
                
                const course = courseRes.data;
                const progress = progressRes.data;
                const completedIds = progress?.metadata?.completedLessons || [];
                
                setCourseData(course);
                setProgressData(progress);

                // Find the active module using lessonId
                let activeMod = null;
                if (course.modules) {
                    activeMod = course.modules.find(mod => 
                        (mod.lessons || []).some(l => String(l._id) === String(lessonId))
                    );
                }

                // Derived titles for completed lessons ONLY for the active module
                const titles = [];
                if (activeMod) {
                    (activeMod.lessons || []).forEach(l => {
                        if (completedIds.includes(String(l._id))) {
                            titles.push(l.title);
                        }
                    });
                }
                setCompletedLessonTitles(titles);

            } catch (err) {
                console.error('Failed to fetch progress data', err);
                setError('Failed to load your progress. Please try again later.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [slug, user?.id]);

    const handleContinue = () => {
        navigate(`/practice/programming/${slug}`);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-[#0b101c] text-slate-900 dark:text-white">
                <Loader2 className="h-8 w-8 animate-spin text-[#facc15] mb-4" />
                <p className="text-slate-500 dark:text-slate-400">Loading your progress...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-[#0b101c] text-slate-900 dark:text-white p-6">
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6 max-w-md text-center">
                    <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
                    <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-500 rounded text-white font-bold">Retry</button>
                </div>
            </div>
        );
    }

    // Find currently active module for dynamic labels
    const activeModule = courseData?.modules?.find(mod => 
        (mod.lessons || []).some(l => String(l._id) === String(lessonId))
    );

    const overallPercentage = progressData?.metadata?.percentComplete || 0;

    return (
        <div className="min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-[#0b101c] text-slate-900 dark:text-white p-6 md:p-10 lg:p-16 overflow-y-auto w-full font-sans flex justify-center">
            <div className="max-w-[1200px] w-full animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Left Column */}
                    <div className="lg:col-span-8 space-y-8">
                        <div className="text-left flex flex-col items-start px-2">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">Module Complete!</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-[15px]">You've reached a significant milestone in your learning journey.</p>
                        </div>

                        {/* Dynamic Subskill Card */}
                        <div className="bg-white dark:bg-[#131a2b] rounded-lg p-8 border border-slate-200 dark:border-slate-700/50 relative overflow-hidden shadow-sm dark:shadow-lg">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10 w-full">
                                <div className="space-y-4 flex-1">
                                    <div className="inline-block px-3 py-1 rounded-full border border-slate-200 dark:border-slate-600/80 mb-2">
                                        <span className="text-[11px] font-bold tracking-wider text-slate-600 dark:text-slate-400 uppercase">Overall Course Progress</span>
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
                                        {activeModule?.description || activeModule?.title || subskillTitle}
                                    </h2>
                                    <div className="flex flex-wrap gap-4 text-[13px] font-bold text-slate-600 dark:text-slate-400 mt-4">
                                        <span className="bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-md text-slate-700 dark:text-slate-300">
                                            {activeModule?.title || "Course Module"}
                                        </span>
                                        <span className="bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-md text-slate-700 dark:text-slate-300">Total Progress: {overallPercentage}%</span>
                                    </div>
                                </div>
                                <div className="relative h-28 w-28 shrink-0 md:mr-4 mt-6 md:mt-0">
                                    <svg className="h-full w-full -rotate-90">
                                        <circle cx="56" cy="56" r="48" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                                        <circle 
                                            cx="56" cy="56" r="48" 
                                            stroke="currentColor" strokeWidth="6" 
                                            fill="transparent" 
                                            className="text-[#facc15] transition-all duration-[1500ms] cubic-bezier(0.4, 0, 0.2, 1)" 
                                            strokeDasharray="301.59" 
                                            strokeDashoffset={301.59 * (1 - (overallPercentage / 100))} 
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-[22px] font-black text-slate-900 dark:text-white">{overallPercentage}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Completed Lessons List Section */}
                        <div className="space-y-5 pt-4">
                            <h3 className="text-[17px] font-bold text-slate-900 dark:text-white px-2">Lessons Completed in {activeModule?.title || "this Module"}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {completedLessonTitles.length > 0 ? (
                                    completedLessonTitles.map((title, index) => (
                                        <div key={index} className="flex items-center gap-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 rounded-lg shadow-sm dark:shadow-none hover:border-slate-300 dark:hover:border-white/20 transition-colors">
                                            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                                            <span className="text-[14px] font-bold text-slate-700 dark:text-slate-200">{title}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-slate-500 italic px-2">No lessons completed yet.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-4 space-y-8 lg:mt-0 mt-8 flex flex-col">
                        <div className="text-left pt-1 border-b border-transparent lg:border-none px-2">
                            <p className="text-[18px] font-bold text-slate-900 dark:text-white">Your skill levels have increased!</p>
                        </div>

                        {/* Points Earned Card */}
                        <div className="bg-white dark:bg-[#131a2b] rounded-lg p-7 border border-slate-200 dark:border-slate-700/50 shadow-sm dark:shadow-lg relative min-h-[240px] flex flex-col">
                            <div className="flex flex-col w-full relative flex-1">
                                <div className="flex w-full text-[13px] text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800 pb-4 mb-8 relative">
                                    <span className="pr-2 relative z-10 tracking-widest uppercase">Reward Summary</span>
                                </div>
                                
                                <div className="space-y-6 relative z-10 w-full mb-6">
                                    <div className="flex flex-col items-start w-full gap-5">
                                        <div className="flex items-center gap-3 w-full justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="text-slate-400 flex items-center justify-center">
                                                    <div className="h-8 w-8 rounded-full bg-[#facc15]/10 flex items-center justify-center">
                                                        <CheckCircle2 className="h-5 w-5 text-[#facc15]" />
                                                    </div>
                                                </div>
                                                <span className="text-[13px] font-black text-slate-900 dark:text-white uppercase tracking-wider">Total Points Earned</span>
                                            </div>
                                            <div className="flex items-center justify-end shrink-0 text-[14px] font-black">
                                                <span className="text-[#facc15] whitespace-nowrap uppercase tracking-widest">{progressData?.points || 0} p</span>
                                            </div>
                                        </div>
                                        
                                        <div className="w-full relative h-[10px] bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex items-center">
                                            <div 
                                                className="absolute inset-y-0 left-0 bg-[#facc15] rounded-full transition-all duration-[2000ms] delay-500 cubic-bezier(0.4, 0, 0.2, 1) h-full z-10" 
                                                style={{ width: `${Math.min((progressData?.points || 0) / 10, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="mt-auto flex justify-center pb-2 pt-6 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        onClick={handleContinue}
                                        className="w-full flex justify-center items-center gap-2 px-8 py-3.5 bg-[#facc15] rounded-md text-slate-900 font-black uppercase tracking-widest hover:bg-[#eab308] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-md"
                                    >
                                        Continue
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
