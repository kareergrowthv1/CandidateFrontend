import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, animate, useTransform } from 'framer-motion';
import { Search, MapPin, Briefcase, Bookmark, ChevronRight, Play, Clock, Users, SlidersHorizontal, ChevronDown, X, Filter, Info, FileText, Building2, Share2, Instagram, Facebook, Twitter, MoreHorizontal, Globe, Calendar, DollarSign, Check } from 'lucide-react';
import { getInternalJobs } from '../../../services/candidateService';
import { useParams, useNavigate } from 'react-router-dom';

export default function JobsPage() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalJobs, setTotalJobs] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [limit] = useState(12);

    const [filters, setFilters] = useState({
        location: '',
        jobMode: '',
        date: '',
        sort: 'Newest',
        salaryRange: '',
        itNonIt: 'All'
    });
    const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState(null);
    const [activeTab, setActiveTab] = useState('Details');
    const [isCopied, setIsCopied] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [mobileTab, setMobileTab] = useState('Description');
    const [isMobileExpanded, setIsMobileExpanded] = useState(false);
    const mobileY = useMotionValue(0);
    const borderRadius = useTransform(mobileY, [0, window.innerHeight * 0.08], [0, 32]);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const { jobId } = useParams();
    const navigate = useNavigate();

    // Synchronize selectedJob with URL params
    useEffect(() => {
        if (jobId && jobs.length > 0) {
            const job = jobs.find(j => j._id === jobId || j.id === jobId);
            if (job) {
                setSelectedJob(job);
            }
        } else if (!jobId) {
            setSelectedJob(null);
        }
    }, [jobId, jobs]);

    // Reset mobile expansion when job changes
    useEffect(() => {
        if (isMobile && selectedJob) {
            // Animate IN to partial state (8vh) when a job is selected
            mobileY.set(window.innerHeight); // Start off-screen
            animate(mobileY, window.innerHeight * 0.08, {
                type: "spring",
                stiffness: 300,
                damping: 30,
                mass: 0.8
            });
            setIsMobileExpanded(false);
        }
    }, [selectedJob, isMobile, mobileY]);

    const handleMobileClose = () => {
        animate(mobileY, window.innerHeight, {
            type: "spring",
            stiffness: 300,
            damping: 30,
            onComplete: () => {
                navigate('/jobs');
                setIsMobileExpanded(false);
            }
        });
    };

    const handleJobClick = (job) => {
        const titleSlug = job.title.replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '');
        navigate(`/jobs/${job._id || job.id}/${titleSlug}`);
    };

    const handleShare = async () => {
        const shareData = {
            title: selectedJob.title,
            text: `Check out this ${selectedJob.title} opening at ${selectedJob.company}`,
            url: window.location.href,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(window.location.href);
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            }
        } catch (err) {
            console.error('Share failed', err);
            // Fallback to copy
            await navigator.clipboard.writeText(window.location.href);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    useEffect(() => {
        let timeoutId;
        async function fetchJobs() {
            setLoading(true);
            try {
                const data = await getInternalJobs({
                    page: currentPage,
                    limit,
                    search: searchQuery,
                    ...filters
                });
                setJobs(data.items || []);
                setTotalJobs(data.pagination?.total || 0);
            } catch (err) {
                console.error('Failed to load jobs', err);
            } finally {
                setLoading(false);
            }
        }

        timeoutId = setTimeout(() => {
            fetchJobs();
        }, 400);

        return () => clearTimeout(timeoutId);
    }, [searchQuery, filters, currentPage, limit]);

    // Reset page back to 1 if search/filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filters]);

    return (
        <div className="w-full h-full flex flex-col bg-transparent overflow-hidden">
            <AnimatePresence mode="wait">
                {(!selectedJob || isMobile) ? (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 flex flex-col overflow-hidden"
                    >
                        {/* Header / Filter Area */}
                        <div className="px-0 pt-0 shrink-0">
                            <div className="flex flex-col md:flex-row w-full gap-2 md:gap-3 mb-1.5 md:mb-2 mt-0">
                                {/* Search Box */}
                                <div className="relative flex-1 md:flex-[1.2] min-w-[200px] bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl shadow-sm focus-within:ring-4 focus-within:ring-blue-50 dark:focus-within:ring-blue-900/30 focus-within:border-blue-200 transition-all">
                                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                        <Search className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-transparent pl-11 pr-4 py-2.5 md:py-3 text-[13px] font-semibold text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none"
                                        placeholder="Search jobs by title, company, or skills..."
                                    />
                                </div>

                                <div className="flex flex-row gap-2 md:gap-3 flex-1">
                                    {/* Location Filter */}
                                    <div className="relative flex-1 min-w-0 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl shadow-sm transition-all">
                                        <MapPin className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 h-3.5 md:h-4 w-3.5 md:w-4 text-slate-400" />
                                        <select
                                            value={filters.location}
                                            onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                                            className="w-full appearance-none bg-transparent pl-9 md:pl-11 pr-8 md:pr-10 py-2.5 md:py-3 text-[11px] md:text-[12px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer focus:outline-none dark:bg-black"
                                        >
                                            <option value="">Location</option>
                                            <option value="Bengaluru">Bengaluru</option>
                                            <option value="Remote">Remote</option>
                                            <option value="Pune">Pune</option>
                                            <option value="Hyderabad">Hyderabad</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 h-3 md:h-3.5 w-3 md:w-3.5 text-slate-300 pointer-events-none" />
                                    </div>

                                    {/* Job Mode Filter */}
                                    <div className="relative flex-1 min-w-[100px] md:min-w-[140px] bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl shadow-sm transition-all">
                                        <Briefcase className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 h-3.5 md:h-4 w-3.5 md:w-4 text-slate-400" />
                                        <select
                                            value={filters.jobMode}
                                            onChange={(e) => setFilters({ ...filters, jobMode: e.target.value })}
                                            className="w-full appearance-none bg-transparent pl-9 md:pl-11 pr-8 md:pr-10 py-2.5 md:py-3 text-[11px] md:text-[12px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer focus:outline-none dark:bg-black"
                                        >
                                            <option value="">Job Mode</option>
                                            <option value="Full-time">Full-time</option>
                                            <option value="Contract">Contract</option>
                                            <option value="Internship">Internship</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 h-3 md:h-3.5 w-3 md:w-3.5 text-slate-300 pointer-events-none" />
                                    </div>

                                    {/* Advanced Filter Trigger */}
                                    <button
                                        onClick={() => setIsAdvancedFilterOpen(true)}
                                        className="bg-blue-600 rounded-xl shadow-md hover:bg-blue-700 px-4 md:px-6 py-2.5 md:py-3 flex items-center justify-center gap-2 text-[11px] md:text-[12px] font-black text-white transition-colors uppercase tracking-wider md:min-w-[120px]"
                                    >
                                        <SlidersHorizontal size={14} className="text-white/70" />
                                        <span className="hidden md:inline">Filters</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Advanced Filters Modal (stays same) */}
                        {isAdvancedFilterOpen && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsAdvancedFilterOpen(false)} />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="relative bg-white dark:bg-zinc-900 rounded-xl w-full max-w-md shadow-2xl overflow-hidden border dark:border-white/10"
                                >
                                    <div className="flex items-center justify-between p-4 border-b border-slate-100">
                                        <h2 className="text-sm font-black text-slate-900">Advanced Filters</h2>
                                        <button onClick={() => setIsAdvancedFilterOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                                            <X size={16} className="text-slate-400" />
                                        </button>
                                    </div>

                                    <div className="p-5 space-y-5">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Post Date</label>
                                            <div className="flex flex-wrap gap-2">
                                                {['All', 'Last 24h', 'Last Week', 'Last Month'].map((d) => (
                                                    <button
                                                        key={d}
                                                        onClick={() => setFilters({ ...filters, date: d })}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filters.date === d ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                                                    >
                                                        {d}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Sort By</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {['Newest', 'Salary: High to Low', 'Most Applicants', 'Relevance'].map((s) => (
                                                    <button
                                                        key={s}
                                                        onClick={() => setFilters({ ...filters, sort: s })}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold text-left transition-all ${filters.sort === s ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent'}`}
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Salary Range (LPA)</label>
                                            <select
                                                value={filters.salaryRange}
                                                onChange={(e) => setFilters({ ...filters, salaryRange: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-100"
                                            >
                                                <option value="">Any Range</option>
                                                <option value="3-6">3 - 6 LPA</option>
                                                <option value="6-12">6 - 12 LPA</option>
                                                <option value="12-25">12 - 25 LPA</option>
                                                <option value="25+">25+ LPA</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Domain</label>
                                            <div className="flex gap-2">
                                                {['All', 'IT', 'Non-IT'].map((t) => (
                                                    <button
                                                        key={t}
                                                        onClick={() => setFilters({ ...filters, itNonIt: t })}
                                                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${filters.itNonIt === t ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                                                    >
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-50 flex gap-3">
                                        <button
                                            onClick={() => {
                                                setFilters({ location: '', jobMode: '', date: '', sort: 'Newest', salaryRange: '', itNonIt: 'All' });
                                                setIsAdvancedFilterOpen(false);
                                            }}
                                            className="flex-1 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
                                        >
                                            Reset All
                                        </button>
                                        <button
                                            onClick={() => setIsAdvancedFilterOpen(false)}
                                            className="flex-[2] py-2 bg-blue-600 text-white rounded-xl text-xs font-black tracking-wider hover:bg-blue-700 transition-colors shadow-lg"
                                        >
                                            APPLY FILTERS
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto no-scrollbar">
                            {loading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                                    {[...Array(9)].map((_, i) => (
                                        <div key={i} className="animate-pulse bg-white dark:bg-zinc-800 rounded-2xl h-[280px]"></div>
                                    ))}
                                </div>
                            ) : jobs.length === 0 ? (
                                <div className="text-center py-10 bg-white/50 dark:bg-black/50 rounded-2xl flex flex-col items-center mx-1 mt-2">
                                    <Search className="w-12 h-12 text-slate-200 dark:text-zinc-700 mb-4" />
                                    <p className="text-lg font-bold text-slate-500 dark:text-slate-400">No jobs found matching your search.</p>
                                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">Try adjusting your filters or search terms.</p>
                                </div>
                            ) : (
                                <div className="w-full px-0 pt-1 pb-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
                                        {jobs.map((job, idx) => (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                key={job.id}
                                                onClick={() => handleJobClick(job)}
                                                className="bg-white dark:bg-black rounded-xl border dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 hover:shadow-md transition-all p-5 flex flex-col group cursor-pointer relative overflow-hidden"
                                            >
                                                {/* Header & Title Section */}
                                                <div className="flex flex-col">
                                                    <h3 className="text-[14px] md:text-[18px] font-black text-slate-900 dark:text-white group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors truncate">
                                                        {job.title}
                                                    </h3>
                                                    <div className="flex items-center gap-2 mt-1 mb-0 pb-0 border-none">
                                                        <p className="text-[11px] md:text-[13px] font-normal text-slate-500 dark:text-slate-400 truncate">
                                                            {job.company}
                                                        </p>
                                                        <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-zinc-700 shrink-0" />
                                                        <span className="text-[11px] md:text-[13px] font-normal text-blue-600 dark:text-blue-400 shrink-0">
                                                            {job.experienceRange || '2-4 Years'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Job Description Snippet */}
                                                <div className="mt-3 hidden md:block">
                                                    <p className="text-[10px] md:text-[12px] leading-relaxed text-slate-600 dark:text-zinc-500 line-clamp-2 font-normal">
                                                        {job.description || "Exciting opportunity to join our dynamic team and make an impact."}
                                                    </p>
                                                </div>

                                                {/* Tags & Applied Row */}
                                                <div className="mt-4 flex items-center justify-between">
                                                    <div className="flex flex-wrap gap-2">
                                                        <span className="px-2.5 py-1 bg-transparent border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 text-[10px] md:text-[11px] font-bold rounded-md uppercase tracking-wider">
                                                            {job.jobType || job.position_type || 'Full-time'}
                                                        </span>
                                                        <span className="px-2.5 py-1 bg-transparent border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 text-[10px] md:text-[11px] font-bold rounded-md uppercase tracking-wider flex items-center gap-1">
                                                            <MapPin size={10} /> {job.location || 'Remote'}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        <div className="flex -space-x-1.5 overflow-hidden">
                                                            {['bg-blue-400', 'bg-purple-400', 'bg-orange-400'].map((color, i) => (
                                                                <div key={i} className={`inline-block h-5 w-5 md:h-6 md:w-6 rounded-full ring-2 ring-white dark:ring-black ${color}`} />
                                                            ))}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">+12</span>
                                                    </div>
                                                </div>

                                                {/* Action Buttons Row */}
                                                <div className="mt-3.5 pt-2.5 border-t dark:border-white/5 flex gap-3">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleJobClick(job); }}
                                                        className="flex-1 py-1.5 bg-white dark:bg-zinc-950 text-black dark:text-white font-normal text-[12px] md:text-[13px] rounded-xl border border-slate-200 dark:border-zinc-800 transition-all shadow-[0_0_15px_rgba(0,0,0,0.06)] dark:shadow-[0_0_20px_rgba(0,0,0,0.4)] hover:shadow-lg active:scale-95"
                                                    >
                                                        View
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); /* apply logic */ }}
                                                        className="flex-1 py-1.5 bg-white dark:bg-zinc-950 text-black dark:text-white font-normal text-[12px] md:text-[13px] rounded-xl border border-slate-200 dark:border-zinc-800 transition-all shadow-[0_0_15px_rgba(0,0,0,0.06)] dark:shadow-[0_0_20px_rgba(0,0,0,0.4)] hover:shadow-lg active:scale-95"
                                                    >
                                                        Apply
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* Pagination */}
                                    <div className="flex items-center justify-center gap-1 mt-12 mb-10">
                                        <button
                                            disabled={currentPage === 1}
                                            onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => Math.max(1, prev - 1)); }}
                                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${currentPage === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'}`}
                                        >
                                            Prev
                                        </button>
                                        {(() => {
                                            const totalPages = Math.ceil(totalJobs / limit);
                                            const pages = [];
                                            for (let n = 1; n <= Math.min(totalPages, 5); n++) {
                                                pages.push(
                                                    <button
                                                        key={n}
                                                        onClick={(e) => { e.stopPropagation(); setCurrentPage(n); }}
                                                        className={`h-8 w-8 flex items-center justify-center rounded-lg text-[11px] font-bold transition-all ${currentPage === n ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                                                    >
                                                        {n}
                                                    </button>
                                                );
                                            }
                                            return pages;
                                        })()}
                                        <button
                                            disabled={currentPage * limit >= totalJobs}
                                            onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => prev + 1); }}
                                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${currentPage * limit >= totalJobs ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'}`}
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex-1 flex flex-col bg-[#F8F9FB] dark:bg-zinc-950 overflow-hidden rounded-2xl border dark:border-white/5 shadow-sm"
                    >
                        <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                            {/* Banner & Logo Header */}
                            <div className="relative h-[240px] w-full shrink-0 group">
                                <img
                                    src={selectedJob.headerImage || "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200"}
                                    alt="Office"
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                                {/* Circular Overlapping Logo */}
                                <div className="absolute -bottom-10 left-8">
                                    <div className="h-24 w-24 bg-white dark:bg-zinc-900 rounded-full p-1 shadow-2xl border-4 border-[#F8F9FB] dark:border-zinc-950 overflow-hidden">
                                        <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-800 to-black flex items-center justify-center text-white overflow-hidden">
                                            {selectedJob.companyLogo ? (
                                                <img src={selectedJob.companyLogo} alt={selectedJob.company} className="w-full h-full object-cover" />
                                            ) : (
                                                <Building2 size={36} className="text-white/20" />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Header Socials overlay */}
                                {(selectedJob.socialLinks && Object.values(selectedJob.socialLinks).some(link => !!link)) && (
                                    <div className="absolute bottom-6 right-8 flex gap-2">
                                        {Object.entries(selectedJob.socialLinks).map(([platform, link]) => {
                                            if (!link) return null;
                                            const Icon = platform === 'instagram' ? Instagram : platform === 'twitter' ? Twitter : platform === 'facebook' ? Facebook : Users;
                                            return (
                                                <a key={platform} href={link} target="_blank" rel="noreferrer" className="p-2 bg-white/10 hover:bg-white/30 backdrop-blur-md rounded-full text-white transition-all">
                                                    <Icon size={16} />
                                                </a>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Job Header Info */}
                            <div className="px-8 mt-14 flex flex-wrap items-start justify-between gap-6">
                                <div className="space-y-1">
                                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                                        {selectedJob.title}
                                        <span className="text-[11px] font-bold text-slate-400 bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded-md uppercase tracking-widest leading-none">
                                            Posted {Math.floor((new Date() - new Date(selectedJob.postedAt)) / (1000 * 60 * 60 * 24))} days ago
                                        </span>
                                    </h1>
                                    <p className="text-base font-semibold text-slate-600 dark:text-slate-400">
                                        {selectedJob.company}
                                    </p>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 flex-wrap">
                                        Job ID: {selectedJob.id?.substring(0, 8) || 'N/A'}
                                    </p>
                                </div>

                                <div className="flex flex-col items-end gap-3">
                                    <div className="flex items-center gap-2">
                                        <button className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition-all uppercase tracking-widest">
                                            Apply Now
                                        </button>
                                        <button
                                            onClick={handleShare}
                                            className="p-3 bg-white dark:bg-zinc-900 border dark:border-white/5 rounded-xl text-slate-400 hover:text-blue-600 transition-all shadow-sm flex items-center gap-2"
                                        >
                                            {isCopied ? <Check size={18} className="text-blue-600" /> : <Share2 size={18} />}
                                            {isCopied && <span className="text-[10px] font-bold text-blue-600">COPIED</span>}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid Cards */}
                            <div className="px-8 mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { label: 'Experience Level', value: selectedJob.experienceRange || 'Intermediate', icon: SlidersHorizontal },
                                    { label: 'Job Type', value: selectedJob.jobType || 'Full-time', icon: Briefcase },
                                    { label: 'Work Mode', value: (selectedJob.location?.toLowerCase().includes('remote') || !selectedJob.location) ? 'Remote' : 'On-site', icon: Globe },
                                    { label: 'Salary/Rate', value: selectedJob.salaryRange || 'N/A', icon: MapPin }
                                ].map((stat, i) => (
                                    <div key={i} className="bg-white dark:bg-zinc-900 p-4 rounded-xl border dark:border-white/5 shadow-sm space-y-2">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                                        <p className="text-[14px] font-normal text-slate-700 dark:text-zinc-200">{stat.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Content Grid */}
                            <div className="px-8 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Left Column: About & JD */}
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border dark:border-white/5 shadow-sm space-y-8">
                                        <section className="space-y-4">
                                            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight pb-3 border-b dark:border-white/5">About the Company</h2>
                                            <p className="text-slate-500 dark:text-slate-400 text-[14px] leading-relaxed font-normal">
                                                {selectedJob.companyDescription || `Join ${selectedJob.company}, a leading innovator in the industry. We are dedicated to building products that empower businesses to scale their operations efficiently and create meaningful experiences for users worldwide.`}
                                            </p>
                                        </section>

                                        <section className="space-y-4">
                                            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight pb-3 border-b dark:border-white/5">Job Description</h2>
                                            <div className="text-slate-500 dark:text-slate-400 text-[14px] leading-relaxed font-normal whitespace-pre-line space-y-4">
                                                {selectedJob.description || "We are looking for an experienced professional to join our team. The ideal candidate will have a strong background in their respective field and a passion for delivering high-quality results."}
                                            </div>
                                        </section>
                                    </div>
                                </div>

                                {/* Right Column: Requirements */}
                                <div className="space-y-4">
                                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border dark:border-white/5 shadow-sm h-fit space-y-6 sticky top-6">
                                        <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight pb-3 border-b dark:border-white/5">Requirements</h2>
                                        <ul className="space-y-4">
                                            {(selectedJob.requirements && Array.isArray(selectedJob.requirements)) ? (
                                                selectedJob.requirements.map((req, i) => (
                                                    <li key={i} className="flex items-start gap-3 group">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-zinc-700 mt-2 shrink-0 group-hover:bg-blue-600 transition-colors" />
                                                        <span className="text-[13px] font-normal text-slate-600 dark:text-slate-400 leading-snug">{req}</span>
                                                    </li>
                                                ))
                                            ) : (
                                                <div className="text-slate-400 font-normal text-[13px] leading-relaxed italic">
                                                    {selectedJob.requirements || "Details about specific requirements will be shared during the interview process."}
                                                </div>
                                            )}
                                        </ul>

                                        <div className="pt-6 border-t dark:border-white/5">
                                            <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border dark:border-white/5 flex items-center justify-between">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Posted on</p>
                                                    <p className="text-[13px] font-bold text-slate-900 dark:text-white">
                                                        {new Date(selectedJob.postedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </p>
                                                </div>
                                                <Calendar className="text-slate-300" size={20} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile View Toggle / Drawer */}
            <AnimatePresence>
                {(isMobile && selectedJob) && (
                    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleMobileClose}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            style={{ 
                                y: mobileY,
                                borderTopLeftRadius: borderRadius,
                                borderTopRightRadius: borderRadius
                            }}
                            drag="y"
                            dragConstraints={{ top: 0, bottom: window.innerHeight }}
                            dragElastic={0.05} // Very low elasticity for 1:1 follow-finger
                            onDragEnd={(_, info) => {
                                const { offset, velocity } = info;
                                const currentY = mobileY.get();
                                const partialY = window.innerHeight * 0.08;
                                const threshold = 80;
                                
                                // Decision logic for snapping and closing
                                if (offset.y > threshold || velocity.y > 600) {
                                    // If we were at partial, close it. If we were at full, go to partial.
                                    if (!isMobileExpanded) {
                                        handleMobileClose();
                                    } else {
                                        animate(mobileY, partialY, { type: "spring", stiffness: 300, damping: 30 });
                                        setIsMobileExpanded(false);
                                    }
                                } else if (offset.y < -threshold || velocity.y < -600) {
                                    // Dragged up: snap to full
                                    animate(mobileY, 0, { type: "spring", stiffness: 300, damping: 30 });
                                    setIsMobileExpanded(true);
                                } else {
                                    // Snap back to current state
                                    const targetY = isMobileExpanded ? 0 : partialY;
                                    animate(mobileY, targetY, { type: "spring", stiffness: 300, damping: 30 });
                                }
                            }}
                            className="relative bg-white dark:bg-zinc-950 w-full h-[100dvh] flex flex-col overflow-hidden shadow-2xl shadow-black/50 touch-none"
                        >
                            {/* Drawer Handle Area (Dedicated Drag Target) */}
                            <div className="w-full pt-4 pb-2 flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing bg-white dark:bg-zinc-950">
                                <div className="w-12 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full" />
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 pb-24 no-scrollbar">
                                {/* Header (Compact Header like reference) */}
                                <div className="flex items-center py-4 sticky top-0 bg-white dark:bg-zinc-950 z-10 -mx-6 px-6 border-none">
                                    <button
                                        onClick={handleMobileClose}
                                        className="p-2 -ml-2 text-slate-400 shrink-0"
                                    >
                                        <X size={24} />
                                    </button>
                                    <div className="flex-1 min-w-0 pl-2">
                                        <h1 className="text-[15px] font-black text-slate-900 dark:text-white leading-tight uppercase truncate">
                                            {selectedJob.title}
                                        </h1>
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest truncate">
                                            {selectedJob.company}
                                        </p>
                                    </div>
                                </div>

                                {/* Horizontal Scrollable Tabs (Refined) */}
                                <div className="flex items-center gap-8 overflow-x-auto no-scrollbar border-b dark:border-white/5 -mx-6 px-6 mb-8">
                                    {['About', 'Description', 'Requirements'].map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setMobileTab(tab)}
                                            className={`relative py-4 text-[14px] font-bold whitespace-nowrap transition-all ${mobileTab === tab ? 'text-black dark:text-white' : 'text-slate-400'
                                                }`}
                                        >
                                            {tab === 'About' ? 'About Company' : tab === 'Description' ? 'Job Description' : tab}
                                            {mobileTab === tab && (
                                                <motion.div
                                                    layoutId="mobileTabUnderline"
                                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white rounded-full"
                                                />
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Tab Content Rendering (Refined) */}
                                <div className="space-y-6">
                                    {mobileTab === 'About' && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
                                            <h2 className="text-[13px] font-bold text-slate-800 dark:text-white mb-4">About Company</h2>
                                            <p className="text-[14px] leading-relaxed text-slate-600 dark:text-zinc-400 font-normal">
                                                {selectedJob.companyDescription || `Join ${selectedJob.company}, a leading innovator in the industry dedicated to building world-class products and experiences.`}
                                            </p>
                                        </div>
                                    )}

                                    {mobileTab === 'Description' && (
                                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
                                            {/* Metadata Stack (No Boxes) */}
                                            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                                {[
                                                    { label: 'Experience', value: selectedJob.experienceRange || '2-4 Years' },
                                                    { label: 'Job Type', value: selectedJob.jobType || 'Full-time' },
                                                    { label: 'Location', value: selectedJob.location || 'Remote' },
                                                    { label: 'Salary/Month', value: selectedJob.salaryRange || 'N/A' }
                                                ].map((stat, i) => (
                                                    <div key={i} className="space-y-1">
                                                        <p className="text-[11px] font-bold text-slate-400 tracking-wide">{stat.label}</p>
                                                        <p className="text-[14px] font-normal text-slate-600 dark:text-zinc-200">{stat.value}</p>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="space-y-4 pt-4 border-t dark:border-white/5">
                                                <h2 className="text-[14px] font-bold text-slate-800 dark:text-white">Full Job Description</h2>
                                                <div className="text-[14px] leading-relaxed text-slate-600 dark:text-zinc-400 font-normal whitespace-pre-line">
                                                    {selectedJob.description}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {mobileTab === 'Requirements' && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
                                            <h2 className="text-[13px] font-bold text-slate-800 dark:text-white">Technical Requirements</h2>
                                            <div className="space-y-4 text-[14px] leading-relaxed text-slate-600 dark:text-zinc-400 font-normal">
                                                {(selectedJob.requirements && Array.isArray(selectedJob.requirements)) ? (
                                                    <ul className="space-y-3">
                                                        {selectedJob.requirements.map((req, i) => (
                                                            <li key={i} className="flex items-start gap-3">
                                                                <div className="h-1 w-1 rounded-full bg-slate-400 mt-2 shrink-0" />
                                                                <span>{req}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p>{selectedJob.requirements}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Sticky Mobile Actions */}
                            <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/95 dark:bg-black/95 backdrop-blur-md border-t dark:border-white/5 flex gap-4">
                                <button className="flex-1 py-3 bg-blue-600 text-white font-bold text-[14px] rounded-2xl shadow-lg shadow-blue-600/20">
                                    Apply Now
                                </button>
                                <button
                                    onClick={handleShare}
                                    className="p-4 bg-slate-50 dark:bg-zinc-900 border dark:border-white/5 rounded-2xl text-slate-400 shadow-sm"
                                >
                                    {isCopied ? <Check size={20} className="text-blue-600" /> : <Share2 size={20} />}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
