import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Coffee, TerminalSquare, Database, DatabaseZap, LayoutTemplate,
    FileCode2, Atom, Server, Hexagon, Settings, BrainCircuit,
    ChevronRight, Loader2, Zap, Search, BookOpen, Hash, X
} from 'lucide-react';
import { axiosInstance } from '../../../config/axiosConfig';

const ICON_MAP = {
    Coffee, TerminalSquare, Database, DatabaseZap, LayoutTemplate,
    FileCode2, Atom, Server, Hexagon, Settings, BrainCircuit
};

const TOPIC_COLORS = {
    java: { bg: 'bg-orange-50', border: 'border-orange-100', icon: 'text-orange-500', badge: 'bg-orange-100 text-orange-700' },
    python: { bg: 'bg-blue-50', border: 'border-blue-100', icon: 'text-blue-500', badge: 'bg-blue-100 text-blue-700' },
    sql: { bg: 'bg-sky-50', border: 'border-sky-100', icon: 'text-sky-600', badge: 'bg-sky-100 text-sky-700' },
    mysql: { bg: 'bg-teal-50', border: 'border-teal-100', icon: 'text-teal-500', badge: 'bg-teal-100 text-teal-700' },
    mongodb: { bg: 'bg-green-50', border: 'border-green-100', icon: 'text-green-500', badge: 'bg-green-100 text-green-700' },
    postgresql: { bg: 'bg-indigo-50', border: 'border-indigo-100', icon: 'text-indigo-500', badge: 'bg-indigo-100 text-indigo-700' },
    'html-css': { bg: 'bg-orange-50', border: 'border-orange-100', icon: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' },
    javascript: { bg: 'bg-yellow-50', border: 'border-yellow-100', icon: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700' },
    'react-js': { bg: 'bg-cyan-50', border: 'border-cyan-100', icon: 'text-cyan-500', badge: 'bg-cyan-100 text-cyan-700' },
    'node-js': { bg: 'bg-lime-50', border: 'border-lime-100', icon: 'text-lime-600', badge: 'bg-lime-100 text-lime-700' },
    angular: { bg: 'bg-red-50', border: 'border-red-100', icon: 'text-red-500', badge: 'bg-red-100 text-red-700' },
    devops: { bg: 'bg-slate-50', border: 'border-slate-200', icon: 'text-slate-600', badge: 'bg-slate-100 text-slate-700' },
    'ai-ml': { bg: 'bg-purple-50', border: 'border-purple-100', icon: 'text-purple-500', badge: 'bg-purple-100 text-purple-700' },
};

const DEFAULT_COLORS = { bg: 'bg-slate-50', border: 'border-slate-100', icon: 'text-slate-500', badge: 'bg-slate-100 text-slate-700' };

// ── Debounce hook ──────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

// ── Type badge config ──────────────────────────────────────────────────────────
const TYPE_CONFIG = {
    topic:   { label: 'Course',   icon: BookOpen, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    content: { label: 'Topic',    icon: Hash,     color: 'text-slate-600 bg-slate-50 border-slate-200' },
    subitem: { label: 'Section',  icon: Hash,     color: 'text-slate-500 bg-slate-50 border-slate-100' },
};

export default function KnowledgeBasePage() {
    const navigate = useNavigate();
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const searchRef = useRef(null);
    const dropdownRef = useRef(null);
    const debouncedSearch = useDebounce(search, 300);

    useEffect(() => {
        async function fetchTopics() {
            try {
                setLoading(true);
                const res = await axiosInstance.get('/api/knowledge-base/topics');
                setTopics(res.data?.data || []);
            } catch (err) {
                console.error('KnowledgeBase fetch error:', err);
                setError('Could not load topics. Please try again.');
            } finally {
                setLoading(false);
            }
        }
        fetchTopics();
    }, []);

    // Backend search on debounced input
    useEffect(() => {
        if (!debouncedSearch || debouncedSearch.length < 2) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }
        let cancelled = false;
        setSearchLoading(true);
        axiosInstance.get(`/api/knowledge-base/search?q=${encodeURIComponent(debouncedSearch)}`)
            .then(res => {
                if (cancelled) return;
                setSearchResults(res.data?.data || []);
                setShowDropdown(true);
                setActiveIndex(-1);
            })
            .catch(() => {
                if (!cancelled) setSearchResults([]);
            })
            .finally(() => { if (!cancelled) setSearchLoading(false); });
        return () => { cancelled = true; };
    }, [debouncedSearch]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (
                searchRef.current && !searchRef.current.contains(e.target) &&
                dropdownRef.current && !dropdownRef.current.contains(e.target)
            ) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleResultClick = (result) => {
        setShowDropdown(false);
        setSearch('');
        navigate(result.url);
    };

    const handleKeyDown = (e) => {
        if (!showDropdown || searchResults.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(i => Math.min(i + 1, searchResults.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            handleResultClick(searchResults[activeIndex]);
        } else if (e.key === 'Escape') {
            setShowDropdown(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] w-full bg-transparent">
                <Loader2 className="h-10 w-10 text-slate-400 animate-spin mb-4" />
                <p className="text-sm font-normal text-slate-500">Loading Knowledge Base...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] w-full px-4 py-12">
                <p className="text-sm font-medium text-red-600 mb-2">{error}</p>
                <button type="button" onClick={() => window.location.reload()}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors">
                    Retry
                </button>
            </div>
        );
    }

    const filteredTopics = search.length >= 2 && searchResults.length === 0 && !searchLoading
        ? topics.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
        : topics;

    const TopicCard = ({ topic }) => {
        const colors = TOPIC_COLORS[topic.slug] || DEFAULT_COLORS;
        const IconComponent = ICON_MAP[topic.icon] || Database;
        return (
            <button
                type="button"
                onClick={() => navigate(`/knowledge-base/${topic.slug}`)}
                className={`${colors.bg} dark:bg-black ${colors.border} dark:border-white/10 rounded-lg border hover:shadow-md hover:border-opacity-70 dark:hover:border-white/20 transition-all p-4 flex flex-col text-left group cursor-pointer w-full focus:outline-none focus:ring-2 focus:ring-slate-200`}
            >
                <div className="flex items-center gap-3 mb-3 w-full">
                    <div className={`shrink-0 p-2.5 rounded-lg ${colors.bg} dark:bg-black ${colors.border} dark:border-white/10 border`}>
                        <IconComponent className={`h-5 w-5 ${colors.icon} dark:text-white`} />
                    </div>
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                        <h3 className="text-[15px] font-black text-slate-900 dark:text-white truncate group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                            {topic.title}
                        </h3>
                        {topic.isBooming && (
                            <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-normal px-2 py-0.5 rounded-full ${colors.badge} dark:bg-black dark:text-white dark:border dark:border-white/20`}>
                                <Zap className="h-2.5 w-2.5" /> Booming
                            </span>
                        )}
                    </div>
                </div>
                <p className="text-xs font-normal text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 mb-3 flex-1">
                    {topic.description}
                </p>
                <div className="flex items-center justify-end gap-1 mt-auto text-slate-400 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors w-full">
                    <span className="text-[11px] font-normal">Explore</span>
                    <ChevronRight className="h-3 w-3" />
                </div>
            </button>
        );
    };

    return (
        <div className="w-full h-full flex flex-col bg-transparent">
            <div className="flex-1 flex flex-col w-full max-w-full px-2 md:px-0 mx-auto pb-3 md:pb-4">
                {/* Search Bar Container */}
                <div className="px-1 pt-2 md:pt-4 shrink-0">
                    <div className="flex flex-col md:flex-row w-full gap-3 md:gap-4 mb-2 md:mb-3">
                        {/* Search Box with dropdown */}
                        <div className="relative flex-1 md:flex-[1.2] min-w-[200px]" ref={searchRef}>
                            <div className="flex items-center bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl shadow-sm focus-within:ring-4 focus-within:ring-blue-50 dark:focus-within:ring-blue-900/30 focus-within:border-blue-200 transition-all">
                                <div className="pl-4 flex items-center">
                                    {searchLoading
                                        ? <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                                        : <Search className="h-4 w-4 text-slate-400" />
                                    }
                                </div>
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                                    onKeyDown={handleKeyDown}
                                    className="flex-1 bg-transparent pl-3 pr-4 py-2.5 md:py-3 text-[13px] font-semibold text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none"
                                    placeholder="Search topics, headings, sections... (e.g. Loops, Variables)"
                                />
                                {search && (
                                    <button onClick={() => { setSearch(''); setShowDropdown(false); setSearchResults([]); }} className="pr-3 text-slate-400 hover:text-slate-600">
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            {/* Search Dropdown */}
                            {showDropdown && searchResults.length > 0 && (
                                <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                                    <div className="px-3 py-2 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Top Results</span>
                                        <span className="text-[10px] text-slate-400">{searchResults.length} found</span>
                                    </div>
                                    {searchResults.map((result, idx) => {
                                        const tc = TYPE_CONFIG[result.type] || TYPE_CONFIG.content;
                                        const TypeIcon = tc.icon;
                                        return (
                                            <button
                                                key={`${result.topicSlug}-${result.title}-${idx}`}
                                                onMouseDown={() => handleResultClick(result)}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                                                    activeIndex === idx
                                                        ? 'bg-blue-50 dark:bg-blue-500/10'
                                                        : 'hover:bg-slate-50 dark:hover:bg-white/5'
                                                }`}
                                            >
                                                <div className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-zinc-800">
                                                    <TypeIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[13px] font-semibold text-slate-800 dark:text-white truncate">{result.title}</p>
                                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{result.subtitle}</p>
                                                </div>
                                                <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${tc.color}`}>
                                                    {tc.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="px-0 py-0 flex-1 min-h-0 transition-colors duration-300">
                    {filteredTopics.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {filteredTopics.map(topic => <TopicCard key={topic._id} topic={topic} />)}
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-white dark:bg-black rounded-xl border dark:border-white/5">
                            <p className="text-slate-400 font-normal text-sm">No results for "{search}"</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

