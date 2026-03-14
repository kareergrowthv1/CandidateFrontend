import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Briefcase, Bookmark, ChevronRight, Play, Clock, Users, SlidersHorizontal, ChevronDown, X, Filter, Info, FileText, Building2, Share2 } from 'lucide-react';
import { getInternalJobs } from '../../../services/candidateService';

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
        <div className="w-full flex-1 flex flex-col bg-white dark:bg-black">

            {/* Header / Filter Area */}
            <div className="px-3 pt-2 md:pt-4 shrink-0">
                <div className="flex flex-col md:flex-row w-full gap-3 md:gap-4 mb-2 md:mb-3 mt-0">
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

            {/* Advanced Filters Modal */}
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
                            {/* Date Filter */}
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

                            {/* Sort Filter */}
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

                            {/* Salary Range */}
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

                            {/* IT / Non-IT */}
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

            {/* Main Content Area - Inner Gray Box */}
            <div className="mx-3 md:mx-4 mb-3 md:mb-4 flex-1 min-h-0 overflow-y-auto bg-gray-100 dark:bg-zinc-900 rounded-[20px] p-2 md:p-3 transition-colors duration-300">
                {loading ? (
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(9)].map((_, i) => (
                            <div key={i} className="animate-pulse bg-white dark:bg-zinc-800 rounded-2xl h-[280px]"></div>
                        ))}
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-black rounded-2xl flex flex-col items-center">
                        <Search className="w-12 h-12 text-slate-200 dark:text-zinc-700 mb-4" />
                        <p className="text-lg font-bold text-slate-500 dark:text-slate-400">No jobs found matching your search.</p>
                        <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">Try adjusting your filters or search terms.</p>
                    </div>
                ) : (
                    <div className="w-full">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                            {jobs.map((job, idx) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    key={job.id}
                                    onClick={() => setSelectedJob(job)}
                                    className="bg-white dark:bg-black rounded-xl border dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 hover:shadow-md transition-all p-5 flex flex-col group cursor-pointer relative overflow-hidden"
                                >
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-[14px] md:text-[18px] font-black text-slate-900 dark:text-white group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors truncate pr-2">
                                            {job.title}
                                        </h3>
                                    </div>
                                    <p className="text-[11px] md:text-[14px] font-normal text-slate-500 dark:text-slate-400 mt-0.5 truncate">{job.company}</p>
                                    <p className="text-[10px] font-normal text-slate-800 mt-1.5 md:hidden">
                                        Exp: {job.experienceRange ? job.experienceRange : 'Not disclosed'}
                                    </p>
                                    <p className="hidden md:block text-[10px] font-bold text-slate-400 mt-2">
                                        {new Date(job.postedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                    </p>

                                    <div className="hidden md:block mt-6 mb-6">
                                        <p className="text-[10px] md:text-[12px] leading-relaxed text-slate-600 line-clamp-3 font-normal">
                                            {job.description || "Exciting opportunity to join our dynamic team and make an impact. We are looking for talented individuals who are passionate about building great products. Work with modern technologies in a fast-paced, collaborative environment."}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 mt-5 md:mt-auto">
                                        <div className="px-3 py-1.5 text-slate-600 dark:text-slate-400 rounded-lg text-[11px] font-medium">
                                            {job.location || 'Remote'}
                                        </div>
                                        <div className="px-3 py-1.5 text-slate-600 dark:text-slate-400 rounded-lg text-[11px] font-medium truncate max-w-[110px]">
                                            {job.jobType || 'Full-time'}
                                        </div>
                                        <div className="hidden md:flex items-center gap-2 ml-auto">
                                            <div className="flex -space-x-2">
                                                <div className="w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center text-[8px] font-black text-white z-20">JS</div>
                                                <div className="w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center text-[8px] font-black text-white z-10">AM</div>
                                                <div className="w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center text-[8px] font-black text-white">TK</div>
                                            </div>
                                            <span className="text-[9px] font-bold tracking-tight text-slate-500 dark:text-slate-400">{Math.floor(Math.random() * 50) + 12}</span>
                                        </div>
                                    </div>

                                    <div className="hidden md:flex gap-3 mt-6 pt-5">
                                        <button className="flex-1 py-1.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 rounded-xl transition-colors text-center shadow-sm">
                                            View Details
                                        </button>
                                        <button className="flex-1 py-1.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 rounded-xl transition-colors text-center shadow-sm">
                                            Apply Now ↗
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Pagination - Prev, Number, Next */}
                        <div className="flex items-center justify-center gap-1 mt-12 pb-10">
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
                )
                }
            </div >

            {/* Mobile Job Details Drawer */}
            <AnimatePresence>
                {selectedJob && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedJob(null)}
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[60] md:hidden"
                        />
                        {/* Drawer */}
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            drag="y"
                            dragConstraints={{ top: 0, bottom: 0 }}
                            dragElastic={{ top: 0.05, bottom: 0.6 }}
                            onDragEnd={(_, info) => {
                                if (info.offset.y > 150) {
                                    setSelectedJob(null);
                                }
                            }}
                            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[32px] z-[70] md:hidden h-[95vh] flex flex-col shadow-2xl overflow-hidden touch-none"
                        >
                            {/* Handle & Header */}
                            <div className="pt-2 pb-4 px-6 flex flex-col items-center border-b border-slate-50 shrink-0 cursor-grab active:cursor-grabbing">
                                <div className="w-12 h-1.5 bg-slate-200 rounded-full mb-6 mt-1" />
                                <div className="w-full flex justify-between items-start">
                                    <div className="flex-1 pr-8">
                                        <h2 className="text-[18px] font-black text-slate-900 leading-tight tracking-tight">{selectedJob.title}</h2>
                                        <p className="text-[13px] font-normal text-slate-500 mt-1">{selectedJob.company}</p>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button className="p-2.5 bg-slate-50 rounded-full text-slate-400">
                                            <Bookmark size={18} />
                                        </button>
                                        <button className="p-2.5 bg-slate-50 rounded-full text-slate-400">
                                            <Share2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => setSelectedJob(null)}
                                            className="p-2.5 bg-slate-900 rounded-full text-white shadow-lg shadow-slate-200"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Tabs Navigation */}
                            <div className="flex px-6 border-b border-slate-100 bg-white sticky top-0 z-10 shrink-0 overflow-x-auto no-scrollbar">
                                {['Details', 'Description', 'Company'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`min-w-[100px] flex-1 py-4 text-[13px] font-bold transition-all relative whitespace-nowrap ${activeTab === tab ? 'text-slate-900' : 'text-slate-400'}`}
                                    >
                                        {tab === 'Details' && 'Details'}
                                        {tab === 'Description' && 'Job Description'}
                                        {tab === 'Company' && 'Company'}
                                        {activeTab === tab && (
                                            <motion.div
                                                layoutId="activeTab"
                                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900"
                                            />
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Content Area */}
                            <div className="flex-1 overflow-y-auto px-6 py-6 no-scrollbar pb-32">
                                {activeTab === 'Details' && (
                                    <div className="space-y-6">
                                        <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center gap-4">
                                            <div className="h-12 w-12 bg-white rounded-xl border border-slate-100 flex items-center justify-center text-[18px] font-black text-slate-800 shadow-sm">
                                                {selectedJob.company?.substring(0, 1) || 'J'}
                                            </div>
                                            <div>
                                                <h4 className="text-[14px] font-black text-slate-900">{selectedJob.title}</h4>
                                                <p className="text-[12px] font-normal text-slate-500">{selectedJob.company}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h3 className="text-[14px] font-black text-slate-900">Experience / Level</h3>
                                            <div className="flex items-center gap-3 text-slate-600">
                                                <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                                                    <Info size={16} />
                                                </div>
                                                <span className="text-[13px] font-bold">{selectedJob.experienceRange || '2-4 years'} Experience</span>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h3 className="text-[14px] font-black text-slate-900">Location & Mode</h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                                                    <MapPin size={16} className="text-slate-400" />
                                                    <span className="text-[12px] font-bold text-slate-700">{selectedJob.location || 'Remote'}</span>
                                                </div>
                                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                                                    <Briefcase size={16} className="text-slate-400" />
                                                    <span className="text-[12px] font-bold text-slate-700">{selectedJob.jobType || 'Full-time'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'Description' && (
                                    <div className="space-y-4">
                                        <h3 className="text-[15px] font-black text-slate-900">About the Role</h3>
                                        <p className="text-[13px] leading-relaxed text-slate-600 font-normal whitespace-pre-line">
                                            {selectedJob.description || "We are looking for an experienced professional to join our team. The ideal candidate will have a strong background in their respective field and a passion for delivering high-quality results. You will work closely with cross-functional teams to design, develop, and implement innovative solutions.\n\nKey Responsibilities:\n• Lead the development and implementation of key features\n• Collaborate with product managers and designers\n• Mentor junior team members and conduct code reviews\n• Optimize applications for maximum speed and scalability\n\nRequirements:\n• 3+ years of relevant experience\n• Strong problem-solving skills\n• Excellent communication and teamwork abilities\n• Bachelor's degree in a related field"}
                                        </p>
                                    </div>
                                )}

                                {activeTab === 'Company' && (
                                    <div className="space-y-6">
                                        <div className="p-4 bg-amber-50/30 rounded-2xl border border-amber-100/50">
                                            <div className="flex items-center gap-4 mb-3">
                                                <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                                                    <Building2 size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="text-[14px] font-black text-slate-900">{selectedJob.company}</h4>
                                                    <p className="text-[11px] font-normal text-slate-500">Innovation First · 500-1000 employees</p>
                                                </div>
                                            </div>
                                            <p className="text-[12px] leading-relaxed text-slate-600 font-normal">
                                                Based in San Francisco, we are a fast-growing tech company dedicated to building products that empower businesses to scale their operations efficiently. Our team is passionate about solving complex problems and creating intuitive user experiences.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Sticky Apply Button */}
                            <div className="shrink-0 p-6 bg-white border-t border-slate-100 pb-10">
                                <button className="w-full h-14 bg-slate-900 rounded-2xl text-[16px] font-black text-white shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                                    Apply Now
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div >
    );
}
