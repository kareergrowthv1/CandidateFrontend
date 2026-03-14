import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    BookOpen,
    Play,
    CheckCircle2,
    ChevronRight,
    Timer,
    BarChart3,
    Award,
    BookMarked,
    Trophy,
    RotateCcw,
    Video,
    FileText,
    Lock,
    HelpCircle,
    Info,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { getProgrammingCourses, getProgrammingCourseBySlug, getCandidateProgress, startCourse } from '../../../services/programmingService';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8003';

const ProgrammingPage = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showRestartModal, setShowRestartModal] = useState(false);
    const [courseToRestart, setCourseToRestart] = useState(null);
    const [expandedModule, setExpandedModule] = useState(null);
    const [moduleItems, setModuleItems] = useState({});   // items (topics) per module idx
    const [courseProgress, setCourseProgress] = useState(null);
    const [startingCourse, setStartingCourse] = useState(false);
    const [expandedSubItems, setExpandedSubItems] = useState({}); // moduleId-itemTitle: boolean
    const { slug } = useParams();
    const navigate = useNavigate();


    useEffect(() => {
        const fetchCourses = async () => {
            if (slug) return; // Do not fetch all courses if we are on a specific course page
            try {
                const data = await getProgrammingCourses();
                setCourses(data);
            } catch (error) {
                console.error('Error fetching courses:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, [slug]);

    useEffect(() => {
        const fetchCourseDetail = async () => {
            if (!slug) {
                setSelectedCourse(null);
                setCourseProgress(null);
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const course = await getProgrammingCourseBySlug(slug);
                setSelectedCourse(course);
                // Fetch this candidate's progress for this language course
                if (user?.id && slug) {
                    const progress = await getCandidateProgress(user.id, slug, { summary: true });
                    setCourseProgress(progress || null);
                }
            } catch (error) {
                console.error('Error fetching course details:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchCourseDetail();
    }, [slug, user]);

    const handleCourseClick = (slug) => {
        navigate(`/practice/programming/${slug}`);
        setExpandedModule(null);
        setModuleItems({});
        setCourseProgress(null);
    };

    const slugify = (text) => text?.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '') || '';

    const handleStartCourse = async () => {
        if (!user?.id || !slug) return;
        setStartingCourse(true);
        try {
            await axios.post(`${API_BASE}/api/programming/start-course`, {
                candidateId: user.id,
                courseSlug: slug,
                courseId: selectedCourse._id
            });
            // Fetch fresh progress (summary)
            const progress = await getCandidateProgress(user.id, slug, { summary: true });
            setCourseProgress(progress);

            // Get first lesson ID directly from already-loaded course data — no extra API call
            const firstModule = selectedCourse.modules?.[0];
            const firstLesson = firstModule?.lessons?.[0];
            if (firstLesson?._id) {
                navigate(`/practice/programming/${slug}/lesson/${firstLesson._id}`);
            }
        } catch (err) {
            console.error('Failed to start course:', err);
        } finally {
            setStartingCourse(false);
        }
    };

    const handleResumeCourse = async () => {
        setStartingCourse(true);
        console.log('--- handleResumeCourse started ---');
        try {
            let progress = courseProgress;
            if (!progress && user?.id) {
                console.log('Fetching progress for:', slug, user.id);
                progress = await getCandidateProgress(user.id, slug, { summary: true });
                setCourseProgress(progress);
            }

            console.log('Course Progress:', progress);

            const lastLessonId = progress?.metadata?.lastLessonId;
            console.log('lastLessonId from progress:', lastLessonId);

            if (lastLessonId) {
                console.log('Navigating to lastLessonId:', lastLessonId);
                navigate(`/practice/programming/${slug}/lesson/${lastLessonId}`);
                return;
            }

            // Fallback: use first lesson ID from already-loaded course data
            const firstLesson = selectedCourse?.modules?.[0]?.lessons?.[0];
            console.log('Fallback firstLesson:', firstLesson);

            if (firstLesson?._id) {
                console.log('Navigating to fallback firstLesson:', firstLesson._id);
                navigate(`/practice/programming/${slug}/lesson/${firstLesson._id}`);
            } else {
                console.error('No fallback lesson found! selectedCourse.modules:', selectedCourse?.modules);
            }
        } catch (err) {
            console.error('Error resuming course', err);
        } finally {
            setStartingCourse(false);
            console.log('--- handleResumeCourse ended ---');
        }
    };

    const handleModuleToggle = async (idx, module) => {
        const isExpanded = expandedModule === idx;
        setExpandedModule(isExpanded ? null : idx);
        if (!isExpanded && !moduleItems[idx]) {
            try {
                const res = await axios.get(`${API_BASE}/api/programming/modules/${module._id}/items`);
                setModuleItems(prev => ({ ...prev, [idx]: res.data }));
            } catch (e) {
                console.error('Failed to fetch module items', e);
            }
        }
    };

    // Build subtitle string like "2 Lessons, 1 Quiz, 2 Projects"
    const buildModuleSubtitle = (mod) => {
        const parts = [];
        if (mod.videosCount) parts.push(`${mod.videosCount} Video${mod.videosCount > 1 ? 's' : ''}`);
        if (mod.lessonsCount) parts.push(`${mod.lessonsCount} Lesson${mod.lessonsCount > 1 ? 's' : ''}`);
        if (mod.articlesCount) parts.push(`${mod.articlesCount} Article${mod.articlesCount > 1 ? 's' : ''}`);
        if (mod.quizzesCount) parts.push(`${mod.quizzesCount} Quiz${mod.quizzesCount > 1 ? 'zes' : ''}`);
        if (mod.projectsCount) parts.push(`${mod.projectsCount} Project${mod.projectsCount > 1 ? 's' : ''}`);
        return parts.join(', ') || 'Overview';
    };

    const handleRestartClick = (e, course) => {
        e.stopPropagation();
        setCourseToRestart(course);
        setShowRestartModal(true);
    };

    const confirmRestart = async () => {
        // Here you would typically call an API to reset progress
        console.log(`Resetting progress for: ${courseToRestart?.slug}`);
        // Reset local state if needed
        setShowRestartModal(false);
        setCourseToRestart(null);
    };

    const RestartConfirmationModal = () => {
        if (!showRestartModal) return null;
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-white/5 animate-in zoom-in-95 duration-200">
                    <div className="flex flex-col items-center text-center">
                        <div className="h-16 w-16 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center mb-6">
                            <RotateCcw className="h-8 w-8 text-red-600" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4">Restart Progress?</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                            Are you sure you want to restart your progress for <span className="font-bold text-gray-900 dark:text-white">{courseToRestart?.name}</span>? This will reset all your lesson and project completion data.
                        </p>
                        <div className="grid grid-cols-2 gap-4 w-full">
                            <button
                                onClick={() => setShowRestartModal(false)}
                                className="px-6 py-3 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmRestart}
                                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-red-500/20 transition-all"
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const CourseProgressBar = ({ progress = 0 }) => {
        return (
            <div className="w-full mt-1">
                <div className="flex items-center gap-3">
                    <div className="flex-1 relative h-4 bg-white dark:bg-zinc-900 border border-slate-900 dark:border-white/20 rounded-full overflow-hidden">
                        {/* Progress Fill / Pill */}
                        <div
                            className="absolute top-[-1px] left-[-1px] h-[calc(100%+2px)] bg-yellow-400 border border-slate-900 rounded-full flex items-center justify-center transition-all duration-500 z-10"
                            style={{
                                width: `${Math.max(progress, 2)}%`,
                                minWidth: '42px'
                            }}
                        >
                            <span className="text-[10px] font-black text-slate-900 leading-none">{progress}%</span>
                        </div>

                        {/* Diagonal striped overlay - z-20 to show above yellow fill */}
                        <div
                            className="absolute inset-0 opacity-30 pointer-events-none z-20"
                            style={{
                                backgroundImage: 'repeating-linear-gradient(45deg, #000, #000 1px, transparent 1px, transparent 12px)',
                            }}
                        ></div>
                    </div>
                    <div className="shrink-0 p-1 rounded-full border border-slate-200 dark:border-white/10">
                        <Trophy className="h-4 w-4 text-slate-400" />
                    </div>
                </div>
            </div>
        );
    };

    const getCourseIcon = (slug) => {
        const iconStyle = "h-10 w-auto object-contain";
        switch (slug) {
            case 'java':
                return <img src="https://www.vectorlogo.zone/logos/java/java-icon.svg" alt="Java" className={iconStyle} />;
            case 'sql':
                return <img src="https://www.svgrepo.com/show/331760/sql-database-generic.svg" alt="SQL" className={iconStyle} />;
            case 'html':
                return <img src="https://www.vectorlogo.zone/logos/w3_html5/w3_html5-icon.svg" alt="HTML5" className={iconStyle} />;
            case 'css':
                return <img src="https://www.vectorlogo.zone/logos/w3_css/w3_css-icon.svg" alt="CSS3" className={iconStyle} />;
            case 'javascript':
                return <img src="https://www.vectorlogo.zone/logos/javascript/javascript-icon.svg" alt="JavaScript" className={iconStyle} />;
            case 'python':
                return <img src="https://www.vectorlogo.zone/logos/python/python-icon.svg" alt="Python" className={iconStyle} />;
            case 'devops':
                return <img src="https://www.vectorlogo.zone/logos/google_cloud/google_cloud-icon.svg" alt="DevOps" className={iconStyle} />;
            default:
                return <BookOpen className="h-10 w-10 text-blue-600" />;
        }
    };

    if (loading) {
        return (
            <div className="w-full flex-1 flex flex-col bg-white dark:bg-black">
                <div className="mx-3 md:mx-4 my-3 md:my-4 flex-1 flex items-center justify-center bg-gray-100 dark:bg-zinc-900 rounded-[20px] p-4 md:p-8 transition-colors duration-300">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            </div>
        );
    }

    if (selectedCourse) {
        return (
            <div className="w-full flex flex-col bg-white dark:bg-black">
                <div className="mx-3 md:mx-4 my-3 md:my-4 flex flex-col bg-gray-100 dark:bg-zinc-900 rounded-[20px] transition-colors duration-300">
                    {/* Top section: two-column header */}
                    <div className="w-full px-8 pt-8 pb-6 flex flex-col lg:flex-row gap-8 lg:gap-16 border-b border-gray-200 dark:border-white/10">
                        {/* Left: title + actions + description + progress */}
                        <div className="flex-[2] flex flex-col">
                            <h1 className="text-[36px] font-black text-gray-900 dark:text-white mb-5">
                                {selectedCourse.name}
                            </h1>
                            <div className="flex flex-wrap gap-3 mb-6">
                                {courseProgress ? (
                                    <button
                                        onClick={handleResumeCourse}
                                        disabled={startingCourse}
                                        className="px-6 py-2.5 bg-[#3b19ff] hover:bg-blue-700 disabled:opacity-70 text-white text-sm font-bold rounded transition-colors shadow-sm"
                                    >
                                        {startingCourse ? 'Resuming...' : 'Resume Course'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleStartCourse}
                                        disabled={startingCourse}
                                        className="px-6 py-2.5 bg-[#3b19ff] hover:bg-blue-700 disabled:opacity-70 text-white text-sm font-bold rounded transition-colors shadow-sm"
                                    >
                                        {startingCourse ? 'Starting...' : 'Start Course'}
                                    </button>
                                )}
                            </div>
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm mb-3 max-w-2xl">
                                {selectedCourse.description}
                            </p>

                            {/* Candidates Enrolled / Liked */}
                            <div className="flex items-center gap-2 mb-8">
                                <div className="flex -space-x-2">
                                    <div className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white dark:border-zinc-900"></div>
                                    <div className="w-6 h-6 rounded-full bg-indigo-100 border-2 border-white dark:border-zinc-900"></div>
                                    <div className="w-6 h-6 rounded-full bg-purple-100 border-2 border-white dark:border-zinc-900"></div>
                                </div>
                                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                                    {courseProgress?.candidatesLiked ? courseProgress.candidatesLiked.toLocaleString() : '1,200+'} candidates enrolled
                                </span>
                            </div>

                            {/* Course Progress — only shown once the candidate has started */}
                            {courseProgress && (
                                <div>
                                    <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">Course Progress</h2>
                                    <div className="flex items-center gap-3">
                                        <CourseProgressBar progress={courseProgress.metadata?.percentComplete || 0} />
                                        <div className="shrink-0">
                                            <Trophy className="h-5 w-5 text-gray-400" />
                                        </div>
                                    </div>
                                    <div className="flex justify-end mt-1.5">
                                        <button
                                            onClick={(e) => handleRestartClick(e, selectedCourse)}
                                            className="text-xs font-semibold text-red-500 flex items-center gap-1.5 hover:underline"
                                        >
                                            <RotateCcw className="h-3 w-3" /> Reset progress
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>


                        {/* Right: Stats list */}
                        <div className="flex-[1] pt-2 lg:pt-10 shrink-0 lg:max-w-[260px]">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-3 py-3.5 border-b border-t border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200">
                                    <Award className="h-4 w-4 shrink-0 text-gray-500" />
                                    <span className="text-sm font-semibold">Earn a certificate of completion</span>
                                </div>
                                <div className="flex items-center gap-3 py-3.5 border-b border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200">
                                    <RotateCcw className="h-4 w-4 shrink-0 text-gray-500" />
                                    <div className="flex items-baseline gap-1">
                                        <span className="font-bold">{selectedCourse.projectsCount}</span>
                                        <span className="text-sm font-semibold">Projects</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 py-3.5 border-b border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200">
                                    <BookOpen className="h-4 w-4 shrink-0 text-gray-500" />
                                    <div className="flex items-baseline gap-1">
                                        <span className="font-bold">{selectedCourse.lessonsCount}</span>
                                        <span className="text-sm font-semibold">Lessons</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 py-3.5 border-b border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200">
                                    <BarChart3 className="h-4 w-4 shrink-0 text-gray-500" />
                                    <span className="text-sm font-semibold">{selectedCourse.level}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Syllabus — full width */}
                    <div className="px-8 py-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Syllabus</h2>
                        <div className="divide-y divide-gray-200 dark:divide-white/10 border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden">
                            {selectedCourse.modules?.map((module, idx) => {
                                const isExpanded = expandedModule === idx;
                                return (
                                    <div key={idx}>
                                        <button
                                            onClick={() => handleModuleToggle(idx, module)}
                                            className={`w-full flex items-start justify-between py-4 px-4 text-left transition-colors rounded ${isExpanded ? 'bg-white dark:bg-zinc-800' : 'hover:bg-white/60 dark:hover:bg-white/5'}`}
                                        >
                                            <div className="flex-1 pr-4">
                                                <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">{module.title}</h3>
                                                <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">{buildModuleSubtitle(module)}</p>
                                            </div>
                                            <ChevronRight className={`h-4 w-4 shrink-0 text-gray-400 mt-1 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                        </button>
                                        {isExpanded && (
                                            <div className="pb-5 bg-white/50 dark:bg-white/5 rounded-sm">
                                                {/* Module description */}
                                                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4 px-4 pt-2">{module.description}</p>

                                                {/* Content items — fetched dynamically when expanded */}
                                                {(() => {
                                                    const items = moduleItems[idx];
                                                    if (!items) {
                                                        // Still loading
                                                        return (
                                                            <div className="flex items-center gap-2 px-6 py-3 text-sm text-gray-400">
                                                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                                                                Loading topics...
                                                            </div>
                                                        );
                                                    }
                                                    if (items.length === 0) return null;
                                                    return (
                                                        <div className="mb-4">
                                                            {items.map((item, iIdx) => {
                                                                const label = item.type.charAt(0).toUpperCase() + item.type.slice(1);
                                                                // Use item._id if present (from smart backend expansion), fallback to title match for lessons
                                                                let lessonId = item._id || null;
                                                                if (!lessonId && item.type === 'lesson') {
                                                                    const modLessons = module.lessons || [];
                                                                    const matchedLesson = modLessons.find(l => l.title === item.title);
                                                                    if (matchedLesson?._id) lessonId = matchedLesson._id;
                                                                }

                                                                const hasSubItems = item.subItems?.length > 0;
                                                                const subKey = `${module._id}-${item.title}`;
                                                                const isSubExpanded = expandedSubItems[subKey];
                                                                
                                                                // Parent is completed if its own lessonId is complete OR any of its subItems are complete
                                                                let isCompleted = !!lessonId && courseProgress?.metadata?.computedCompletedLessons?.includes(String(lessonId));
                                                                if (hasSubItems && !isCompleted) {
                                                                    isCompleted = item.subItems.some(sub => 
                                                                        courseProgress?.metadata?.computedCompletedLessons?.includes(String(sub._id))
                                                                    );
                                                                }

                                                                const isClickable = !!lessonId || hasSubItems;

                                                                const icon = (() => {
                                                                    const iconClass = `h-4 w-4 text-gray-500 transition-colors`;
                                                                    
                                                                    switch (item.type) {
                                                                        case 'lesson': return <BookOpen className={iconClass} />;
                                                                        case 'video': return <Video className={iconClass} />;
                                                                        case 'article': return <FileText className={iconClass} />;
                                                                        case 'quiz': return <Lock className={iconClass} />;
                                                                        case 'project': return <Lock className={iconClass} />;
                                                                        case 'informational': return <FileText className={iconClass} />;
                                                                        default: return <Info className={iconClass} />;
                                                                    }
                                                                })();

                                                                return (
                                                                    <div key={iIdx} className="flex flex-col border-b border-gray-50 last:border-0 dark:border-gray-800/50">
                                                                        <div
                                                                            onClick={() => {
                                                                                if (hasSubItems) {
                                                                                    setExpandedSubItems(prev => ({ ...prev, [subKey]: !prev[subKey] }));
                                                                                } else if (isClickable && lessonId) {
                                                                                    navigate(`/practice/programming/${slug}/lesson/${lessonId}`);
                                                                                }
                                                                            }}
                                                                            className={`flex items-center gap-5 px-6 py-3 transition-colors group ${isClickable ? 'cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10' : 'opacity-60'}`}
                                                                        >
                                                                            <div className="w-5 shrink-0 flex justify-center">
                                                                                {isCompleted ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : icon}
                                                                            </div>
                                                                            <span className="w-20 shrink-0 text-xs font-bold uppercase tracking-wider text-gray-400 group-hover:text-blue-500 transition-colors">{label}</span>
                                                                            <span className={`text-sm font-semibold transition-colors ${isClickable ? 'text-gray-700 dark:text-gray-200 group-hover:text-blue-600' : 'text-gray-400'}`}>{item.title}</span>
                                                                            {isClickable && (
                                                                                <div className="ml-auto flex items-center gap-2">
                                                                                    {hasSubItems && (
                                                                                        <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded-md font-medium">
                                                                                            {item.subItems.length} lessons
                                                                                        </span>
                                                                                    )}
                                                                                    <ChevronRight className={`h-4 w-4 text-gray-300 group-hover:text-blue-500 transition-all ${isSubExpanded ? 'rotate-90 text-blue-500' : ''}`} />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        
                                                                        {/* Nested sub-items */}
                                                                        {hasSubItems && isSubExpanded && (
                                                                            <div className="bg-gray-50/30 dark:bg-white/5 border-y border-gray-100/50 dark:border-gray-800/50 py-1 space-y-0.5">
                                                                                {item.subItems.map((sub, sIdx) => {
                                                                                    const subCompleted = courseProgress?.metadata?.computedCompletedLessons?.includes(String(sub._id));
                                                                                    return (
                                                                                        <div
                                                                                            key={sIdx}
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                navigate(`/practice/programming/${slug}/lesson/${sub._id}`);
                                                                                            }}
                                                                                            className="flex items-center gap-5 pl-14 pr-6 py-2.5 hover:bg-blue-50/80 dark:hover:bg-blue-900/20 cursor-pointer group/sub"
                                                                                        >
                                                                                            <div className="w-5 shrink-0 flex justify-center">
                                                                                                {subCompleted ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <BookOpen className={`h-4 w-4 text-gray-500 transition-colors`} />}
                                                                                            </div>
                                                                                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover/sub:text-blue-600 transition-colors">
                                                                                                {sub.title}
                                                                                            </span>
                                                                                            <Play className="h-3 w-3 ml-auto text-gray-300 opacity-0 group-hover/sub:opacity-100 group-hover/sub:text-blue-500 transition-all" />
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                })()}

                                                {/* Module action bar */}
                                                <div className="flex items-center gap-4 px-6 pt-1">
                                                    <button 
                                                        onClick={() => {
                                                            const firstLesson = module.lessons?.[0];
                                                            if (firstLesson?._id) navigate(`/practice/programming/${slug}/lesson/${firstLesson._id}`);
                                                        }}
                                                        className="px-4 py-1.5 border border-[#3b19ff] text-[#3b19ff] font-semibold text-sm rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                    >
                                                        Start module practice
                                                    </button>
                                                    <span className="text-sm text-gray-500">
                                                        {(() => {
                                                            const modProg = courseProgress?.metadata?.module_progress?.find(m => String(m.module_id) === String(module._id));
                                                            const done = modProg?.lessons?.filter(l => l.completion_percentage === 100).length || 0;
                                                            return `${done} / ${module.lessonsCount || 0}`;
                                                        })()} concepts practiced
                                                    </span>
                                                    <span className="text-gray-300 dark:text-gray-600">|</span>
                                                    <button className="text-sm text-[#3b19ff] hover:underline font-medium">View cheatsheet</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-200">
                        <div className="flex items-center gap-3">
                            <RotateCcw className="h-4 w-4 shrink-0 text-gray-500" />
                            <div className="flex items-baseline gap-1">
                                <span className="font-bold">{selectedCourse.projectsCount}</span>
                                <span className="text-sm font-semibold">Projects</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-200">
                        <div className="flex items-center gap-3">
                            <BookOpen className="h-4 w-4 shrink-0 text-gray-500" />
                            <div className="flex items-baseline gap-1">
                                <span className="font-bold">{selectedCourse.lessonsCount}</span>
                                <span className="text-sm font-semibold">Lessons</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-200">
                        <div className="flex items-center gap-3">
                            <BarChart3 className="h-4 w-4 shrink-0 text-gray-500" />
                            <span className="text-sm font-semibold">{selectedCourse.level}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col bg-white dark:bg-black">
            <div className="mx-3 md:mx-4 my-3 md:my-4 bg-gray-100 dark:bg-zinc-900 rounded-[20px] p-3 md:p-5 transition-colors duration-300">
                <div className="max-w-7xl mx-auto w-full">
                    <header className="mb-6">
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-1">Explore Programming Courses</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Master the world's most popular technologies with hands-on practice.</p>
                    </header>

                    <div className="flex flex-col gap-4">
                        {courses.map((course) => (
                            <div
                                key={course.slug}
                                onClick={() => handleCourseClick(course.slug)}
                                className="bg-white dark:bg-black rounded-xl border dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 hover:shadow-md transition-all p-5 flex flex-col md:flex-row group cursor-pointer relative overflow-hidden gap-8 items-start"
                            >
                                <div className="h-20 w-20 flex-shrink-0 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    {getCourseIcon(course.slug)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-3 mb-4">
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white transition-colors">
                                            {course.name}
                                        </h3>
                                        <span className="px-3 py-1 bg-gray-100 dark:bg-zinc-800 text-[10px] font-black text-gray-500 uppercase tracking-widest rounded-full border border-gray-200 dark:border-white/5">
                                            {course.level}
                                        </span>
                                    </div>

                                    <CourseProgressBar progress={0} />

                                    <div className="flex items-center gap-8 mt-4">
                                        <div className="flex items-center gap-2">
                                            <Award className="h-4 w-4 text-orange-500" />
                                            <span className="text-[11px] font-black uppercase tracking-wider text-blue-600">{course.projectsCount} Projects</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="h-4 w-4 text-orange-500" />
                                            <span className="text-[11px] font-black uppercase tracking-wider text-blue-600">{course.lessonsCount} Lessons</span>
                                        </div>
                                        <button
                                            onClick={(e) => handleRestartClick(e, course)}
                                            className="text-[11px] font-black text-red-500 flex items-center gap-1.5 hover:underline uppercase tracking-wider"
                                        >
                                            <RotateCcw className="h-3 w-3" /> Restart progress
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2 shrink-0 md:ml-auto self-center">
                                    <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2">
                                        Explore <ChevronRight className="h-3 w-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <RestartConfirmationModal />
        </div>
    );
};

export default ProgrammingPage;
