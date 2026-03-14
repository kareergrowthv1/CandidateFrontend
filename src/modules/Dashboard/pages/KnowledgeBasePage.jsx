import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Coffee, TerminalSquare, Database, DatabaseZap, LayoutTemplate,
    FileCode2, Atom, Server, Hexagon, Settings, BrainCircuit,
    ChevronRight, Loader2, Zap, Search
} from 'lucide-react';
import { axiosInstance } from '../../../config/axiosConfig';

// Map icon string name to Lucide component
const ICON_MAP = {
    Coffee, TerminalSquare, Database, DatabaseZap, LayoutTemplate,
    FileCode2, Atom, Server, Hexagon, Settings, BrainCircuit
};

// Color palettes per topic slug for visual variety
const TOPIC_COLORS = {
    java: { bg: 'bg-orange-50', border: 'border-orange-100', icon: 'text-orange-500', badge: 'bg-orange-100 text-orange-700' },
    python: { bg: 'bg-blue-50', border: 'border-blue-100', icon: 'text-blue-500', badge: 'bg-blue-100 text-blue-700' },
    sql: { bg: 'bg-sky-50', border: 'border-sky-100', icon: 'text-sky-600', badge: 'bg-sky-100 text-sky-700' },
    mysql: { bg: 'bg-teal-50', border: 'border-teal-100', icon: 'text-teal-500', badge: 'bg-teal-100 text-teal-700' },
    mongodb: { bg: 'bg-green-50', border: 'border-green-100', icon: 'text-green-500', badge: 'bg-green-100 text-green-700' },
    postgresql: { bg: 'bg-indigo-50', border: 'border-indigo-100', icon: 'text-indigo-500', badge: 'bg-indigo-100 text-indigo-700' },
    'html-css': { bg: 'bg-rose-50', border: 'border-rose-100', icon: 'text-rose-500', badge: 'bg-rose-100 text-rose-700' },
    javascript: { bg: 'bg-yellow-50', border: 'border-yellow-100', icon: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700' },
    'react-js': { bg: 'bg-cyan-50', border: 'border-cyan-100', icon: 'text-cyan-500', badge: 'bg-cyan-100 text-cyan-700' },
    'node-js': { bg: 'bg-lime-50', border: 'border-lime-100', icon: 'text-lime-600', badge: 'bg-lime-100 text-lime-700' },
    angular: { bg: 'bg-red-50', border: 'border-red-100', icon: 'text-red-500', badge: 'bg-red-100 text-red-700' },
    devops: { bg: 'bg-slate-50', border: 'border-slate-200', icon: 'text-slate-600', badge: 'bg-slate-100 text-slate-700' },
    'ai-ml': { bg: 'bg-purple-50', border: 'border-purple-100', icon: 'text-purple-500', badge: 'bg-purple-100 text-purple-700' },
    'html-css': { bg: 'bg-orange-50', border: 'border-orange-100', icon: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' },
};

const DEFAULT_COLORS = { bg: 'bg-slate-50', border: 'border-slate-100', icon: 'text-slate-500', badge: 'bg-slate-100 text-slate-700' };

export default function KnowledgeBasePage() {
    const navigate = useNavigate();
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');

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

    const filteredTopics = topics.filter(t =>
        t.title.toLowerCase().includes(search.toLowerCase())
    );

    // Split booming and normal topics
    const boomingTopics = filteredTopics.filter(t => t.isBooming);
    const otherTopics = filteredTopics.filter(t => !t.isBooming);

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] w-full bg-white dark:bg-black">
                <Loader2 className="h-10 w-10 text-slate-400 animate-spin mb-4" />
                <p className="text-sm font-normal text-slate-500">Loading Knowledge Base...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] w-full px-4 py-12">
                <p className="text-sm font-medium text-red-600 mb-2">{error}</p>
                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

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
        <div className="w-full flex-1 flex flex-col bg-white dark:bg-black">
            <div className="flex-1 flex flex-col w-full max-w-full px-2 md:px-0 mx-auto pb-3 md:pb-4">

                {/* Search Bar Container - Same as Jobs Page */}
                <div className="px-3 pt-2 md:pt-4 shrink-0">
                    <div className="flex flex-col md:flex-row w-full gap-3 md:gap-4 mb-2 md:mb-3 mt-0">
                        {/* Search Box */}
                        <div className="relative flex-1 md:flex-[1.2] min-w-[200px] bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl shadow-sm focus-within:ring-4 focus-within:ring-blue-50 dark:focus-within:ring-blue-900/30 focus-within:border-blue-200 transition-all">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full bg-transparent pl-11 pr-4 py-2.5 md:py-3 text-[13px] font-semibold text-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none"
                                placeholder="Search topics... (e.g. Java, React, DevOps)"
                            />
                        </div>
                    </div>
                </div>

                {/* Main Content Area - Inner Gray Box (Matching Jobs Page) */}
                <div className="mx-3 md:mx-4 mb-3 md:mb-4 flex-1 min-h-0 overflow-y-auto bg-gray-100 dark:bg-zinc-900 rounded-[20px] p-2 md:p-3 transition-colors duration-300 shadow-inner">
                    {filteredTopics.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {filteredTopics.map(topic => <TopicCard key={topic._id} topic={topic} />)}
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-white dark:bg-black rounded-xl border dark:border-white/5">
                            <p className="text-slate-400 font-normal text-sm">No topics found for "{search}"</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
