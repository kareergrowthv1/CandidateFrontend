import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Coffee, TerminalSquare, Database, DatabaseZap, LayoutTemplate,
    FileCode2, Atom, Server, Hexagon, Settings, BrainCircuit,
    ChevronLeft, ChevronRight, BookOpen, Code2, Link2, Loader2, ExternalLink, List
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
    javascript: { bg: 'bg-yellow-50', border: 'border-yellow-100', icon: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700' },
    'react-js': { bg: 'bg-cyan-50', border: 'border-cyan-100', icon: 'text-cyan-500', badge: 'bg-cyan-100 text-cyan-700' },
    'node-js': { bg: 'bg-lime-50', border: 'border-lime-100', icon: 'text-lime-600', badge: 'bg-lime-100 text-lime-700' },
    angular: { bg: 'bg-red-50', border: 'border-red-100', icon: 'text-red-500', badge: 'bg-red-100 text-red-700' },
    devops: { bg: 'bg-slate-50', border: 'border-slate-200', icon: 'text-slate-600', badge: 'bg-slate-100 text-slate-700' },
    'ai-ml': { bg: 'bg-purple-50', border: 'border-purple-100', icon: 'text-purple-500', badge: 'bg-purple-100 text-purple-700' },
    'html-css': { bg: 'bg-orange-50', border: 'border-orange-100', icon: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' },
};

const DEFAULT_COLORS = { bg: 'bg-slate-50', border: 'border-slate-100', icon: 'text-slate-500', badge: 'bg-slate-100 text-slate-700' };

const CONTENT_TYPE_CONFIG = {
    article: { label: 'Article', Icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-50' },
    snippet: { label: 'Code Snippet', Icon: Code2, color: 'text-green-600', bg: 'bg-green-50' },
    video_link: { label: 'Video', Icon: Link2, color: 'text-rose-500', bg: 'bg-rose-50' },
};

// Placeholder content so topics without DB content still show useful info
const PLACEHOLDER_CONTENT = {
    java: [], // Now fetched from MongoDB
    python: [
        { type: 'article', title: 'Python Data Types', content: 'Python supports int, float, str, list, tuple, dict, set, and bool. Python is dynamically typed, so you don\'t need to declare types explicitly...' },
        { type: 'snippet', title: 'List Comprehension', content: 'squares = [n**2 for n in range(10)]\nprint(squares)  # [0, 1, 4, 9, 16, 25, 36, 49, 64, 81]' },
        { type: 'article', title: 'Python Decorators', content: 'Decorators are a design pattern that allow you to modify the functionality of a function using another function...' },
    ],
    'react-js': [
        { type: 'article', title: 'Understanding React Hooks', content: 'React Hooks are functions that let you "hook into" React state and lifecycle features from function components. The most common hooks are useState and useEffect...' },
        { type: 'snippet', title: 'useState Example', content: 'import { useState } from "react";\n\nfunction Counter() {\n  const [count, setCount] = useState(0);\n  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;\n}' },
        { type: 'article', title: 'React Component Lifecycle', content: 'In function components, useEffect serves the purpose of the class-based lifecycle methods: componentDidMount, componentDidUpdate, and componentWillUnmount...' },
    ],
    'ai-ml': [
        { type: 'video_link', title: 'Introduction to Neural Networks (3Blue1Brown)', content: 'https://www.youtube.com/watch?v=aircAruvnKk' },
        { type: 'article', title: 'What is Machine Learning?', content: 'Machine Learning is a subset of AI where computer systems learn from data to perform specific tasks without being explicitly programmed. Types include Supervised, Unsupervised, and Reinforcement Learning...' },
        { type: 'article', title: 'Key ML Algorithms', content: 'Linear Regression, Logistic Regression, Decision Trees, Random Forest, SVM, K-Means Clustering, and Neural Networks are the most commonly asked-about algorithms in interviews...' },
    ],
    devops: [
        { type: 'article', title: 'DevOps Principles', content: 'DevOps bridges the gap between development and operations teams. Key principles include Continuous Integration (CI), Continuous Delivery (CD), Infrastructure as Code, and monitoring...' },
        { type: 'article', title: 'Docker Basics', content: 'Docker is a platform for containerizing applications. A container bundles the code, dependencies, and runtime together so it can run consistently across environments...' },
    ],
};


export default function TopicDetailsPage() {
    const { topicSlug, itemSlug } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [contentLoading, setContentLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [activeSubIndex, setActiveSubIndex] = useState(-1);
    const [expandedCategories, setExpandedCategories] = useState({});
    const [fullItemContent, setFullItemContent] = useState(null);
    const [showIndexMobile, setShowIndexMobile] = useState(false);
    const [activeTab, setActiveTab] = useState('html');

    // 1. Fetch Index (Topics list)
    useEffect(() => {
        async function fetchIndex() {
            try {
                setLoading(true);
                const res = await axiosInstance.get(`/api/knowledge-base/content/${topicSlug}`);
                const fetchedData = res.data?.data || null;
                setData(fetchedData);

                // Reset state on topic change
                setActiveIndex(0);
                setActiveSubIndex(-1);
                setFullItemContent(null);

                // Auto-set tab for html-css
                if (topicSlug === 'html-css' && fetchedData?.contents?.length > 0) {
                    const firstItem = fetchedData.contents[0];
                    if (firstItem.order > 20) setActiveTab('css');
                    else setActiveTab('html');
                }
            } catch (err) {
                if (err.response?.status === 404) {
                    setError('Topic not found.');
                } else {
                    setError('Could not load content. Please try again.');
                }
            } finally {
                setLoading(false);
            }
        }
        fetchIndex();
    }, [topicSlug]);

    // 2. Sync activeIndex from URL itemSlug
    useEffect(() => {
        if (!data || !data.contents || data.contents.length === 0) return;
        if (!itemSlug) {
            setActiveIndex(0);
            return;
        }

        const index = data.contents.findIndex(item => toSlug(item.title) === itemSlug);
        if (index !== -1) {
            setActiveIndex(index);
            // If item is found, also ensure the correct tab is active for html-css
            if (topicSlug === 'html-css') {
                const item = data.contents[index];
                if (item.order > 20) setActiveTab('css');
                else setActiveTab('html');
            }
        }
    }, [itemSlug, data, topicSlug]);

    // 3. Fetch Full Item Content when activeIndex changes
    useEffect(() => {
        if (!data || !data.contents || data.contents.length === 0) return;

        const currentItem = data.contents[activeIndex];
        if (!currentItem || !currentItem._id) return;

        async function fetchItemDetail() {
            try {
                setContentLoading(true);
                const res = await axiosInstance.get(`/api/knowledge-base/item/${topicSlug}/${currentItem._id}`);
                setFullItemContent(res.data?.data || null);
            } catch (err) {
                console.error('Error fetching item detail:', err);
            } finally {
                setContentLoading(false);
            }
        }

        fetchItemDetail();
    }, [topicSlug, activeIndex, data]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] w-full">
                <Loader2 className="h-10 w-10 text-slate-400 animate-spin mb-4" />
                <p className="text-sm font-normal text-slate-500">Loading content...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] w-full px-4 py-12">
                <p className="text-sm font-normal text-red-600 mb-4">{error || 'Topic not found.'}</p>
                <button
                    type="button"
                    onClick={() => navigate('/knowledge-base')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200 transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" /> Back to Knowledge Base
                </button>
            </div>
        );
    }

    const { topic, contents } = data;
    const colors = TOPIC_COLORS[topic.slug] || DEFAULT_COLORS;
    const IconComponent = ICON_MAP[topic.icon] || Database;

    const displayContents = (contents && contents.length > 0)
        ? contents
        : (PLACEHOLDER_CONTENT[topic.slug] || []);

    const stripNumber = (title) => {
        if (!title) return '';
        return title.replace(/^\d+\.\s*/, '').replace(/^\d+\s+/, '').trim();
    };

    const toSlug = (title) => {
        const clean = stripNumber(title).toLowerCase().trim();
        if (clean === 'introduction to html') return 'intro_html';
        if (clean === 'introduction to css') return 'intro_css';
        if (clean.includes('introduction')) return 'introduction';
        if (clean === 'road map') return 'road_map';
        if (clean.includes('operator')) return 'operators';
        if (clean.includes('condition statement')) return 'conditionals';
        if (clean.includes('loop statement')) return 'loops';
        if (clean.includes('array')) return 'arrays';
        if (clean.includes('string function')) return 'strings';
        if (clean.includes('static') && !clean.includes('non-static')) return 'static';
        if (clean.includes('non-static') || clean.includes('jvm memory')) return 'jvm_memory';
        if (clean.includes('class and object')) return 'class_object';
        if (clean.includes('programming')) return 'programming';
        return clean.replace(/\s+/g, '_')
            .replace(/[^\w-]+/g, '')
            .replace(/^_+|_+$/g, '');
    };

    const toggleCategory = (idx) => {
        setExpandedCategories(prev => ({
            ...prev,
            [idx]: !prev[idx]
        }));
    };

    const handleItemClick = (idx) => {
        const item = displayContents[idx];
        if (item.subtopics && item.subtopics.length > 0) {
            toggleCategory(idx);
        }
        navigate(`/knowledge-base/${topicSlug}/${toSlug(item.title)}`);
        setActiveIndex(idx);
        setActiveSubIndex(-1);
    };

    const handleSubItemClick = (parentIdx, subIdx) => {
        const parentItem = displayContents[parentIdx];
        navigate(`/knowledge-base/${topicSlug}/${toSlug(parentItem.title)}`);
        setActiveIndex(parentIdx);
        setActiveSubIndex(subIdx);
    };

    const activeItem = activeSubIndex >= 0
        ? (fullItemContent?.subtopics?.[activeSubIndex] || {})
        : (fullItemContent || {});

    const handleNext = () => {
        const currentItem = displayContents[activeIndex];
        if (activeSubIndex < (currentItem?.subtopics?.length || 0) - 1) {
            setActiveSubIndex(prev => prev + 1);
        } else if (activeIndex < displayContents.length - 1) {
            const nextItem = displayContents[activeIndex + 1];
            navigate(`/knowledge-base/${topicSlug}/${toSlug(nextItem.title)}`);
            setActiveIndex(prev => prev + 1);
            setActiveSubIndex(-1);
        }
    };

    const handlePrev = () => {
        if (activeSubIndex > 0) {
            setActiveSubIndex(prev => prev - 1);
        } else if (activeSubIndex === 0) {
            setActiveSubIndex(-1);
        } else if (activeIndex > 0) {
            const prevItem = displayContents[activeIndex - 1];
            navigate(`/knowledge-base/${topicSlug}/${toSlug(prevItem.title)}`);
            if (prevItem.subtopics && prevItem.subtopics.length > 0) {
                setActiveIndex(activeIndex - 1);
                setActiveSubIndex(prevItem.subtopics.length - 1);
            } else {
                setActiveIndex(activeIndex - 1);
                setActiveSubIndex(-1);
            }
        }
    };

    const renderContentBody = (item) => {
        if (contentLoading) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[40vh] w-full">
                    <Loader2 className="h-8 w-8 text-blue-500/20 animate-spin mb-3" />
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Fetching Content...</p>
                </div>
            );
        }
        if (!item || (!item.content && item.type !== 'category')) return null;
        const typeConfig = CONTENT_TYPE_CONFIG[item.type] || CONTENT_TYPE_CONFIG.article;
        const { Icon: TypeIcon } = typeConfig;

        return (
            <div className="space-y-6">
                <h2 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-white leading-tight">
                    {stripNumber(item.title)}
                </h2>

                <div className="prose prose-slate dark:prose-invert max-w-none">
                    {item.type === 'snippet' ? (
                        <div className="relative group">
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="bg-slate-800 text-white text-[10px] px-2 py-1 rounded font-bold">CODE</span>
                            </div>
                            <pre className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-[13px] font-mono text-emerald-400 overflow-x-auto shadow-2xl leading-relaxed whitespace-pre-wrap">
                                {item.content}
                            </pre>
                        </div>
                    ) : item.type === 'video_link' ? (
                        <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl p-8 text-center space-y-4">
                            <div className="w-16 h-16 bg-white dark:bg-black rounded-full flex items-center justify-center mx-auto shadow-sm">
                                <Link2 className="h-8 w-8 text-rose-500" />
                            </div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Watch Tutorial</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">This resource is a video tutorial. Click the link below to watch it in a new tab.</p>
                            <a
                                href={item.content}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-rose-500 text-white font-black text-sm hover:bg-rose-600 transition-all shadow-lg shadow-rose-200"
                            >
                                Open Video <ExternalLink className="h-4 w-4" />
                            </a>
                        </div>
                    ) : (
                        <div className="text-[13px] md:text-[14px] text-slate-800 dark:text-slate-300 leading-relaxed font-normal antialiased">
                            {(() => {
                                const lines = item.content.split('\n');
                                const elements = [];
                                let i = 0;

                                while (i < lines.length) {
                                    const line = lines[i];
                                    const nextLine = (lines[i + 1] || '').trim();

                                    // 1. Explicit Code Blocks (Terminal or Flow)
                                    if (line.trim().startsWith('```')) {
                                        const type = line.trim().slice(3).trim(); // java, flow, etc.
                                        let codeLines = [];
                                        i++;
                                        while (i < lines.length && !lines[i].trim().startsWith('```')) {
                                            codeLines.push(lines[i]);
                                            i++;
                                        }

                                        if (type === 'flow') {
                                            // Render Flowchart Group (High-contrast diagram look)
                                            elements.push(
                                                <div key={`flow-${i}`} className="my-8 p-8 rounded-xl bg-slate-950 border border-slate-800 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] font-mono text-[13px] text-slate-300 leading-normal overflow-x-auto whitespace-pre text-center">
                                                    <div className="inline-block text-left mx-auto">
                                                        {codeLines.join('\n')}
                                                    </div>
                                                </div>
                                            );
                                        } else {
                                            // Render Terminal Window
                                            elements.push(
                                                <div key={`code-${i}`} className="my-8 rounded-xl overflow-hidden shadow-2xl border border-slate-800 bg-[#0d1117]">
                                                    <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-slate-800">
                                                        <div className="flex gap-1.5">
                                                            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></div>
                                                            <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></div>
                                                            <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></div>
                                                        </div>
                                                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Java Console</span>
                                                    </div>
                                                    <pre className="p-6 overflow-x-auto font-mono text-[13px] leading-relaxed text-slate-300 scrollbar-thin scrollbar-thumb-slate-800">
                                                        <code>{codeLines.join('\n')}</code>
                                                    </pre>
                                                </div>
                                            );
                                        }
                                        i++; continue;
                                    }

                                    // 2. Header Detection (All Black, Monochromatic)
                                    if (line.trim().startsWith('#### ')) {
                                        const title = line.trim().replace('#### ', '');
                                        elements.push(<h3 key={i} className="text-[17px] font-semibold mt-5 mb-1 text-slate-900 dark:text-white uppercase tracking-wide">{title}</h3>);
                                        i++; continue;
                                    }

                                    if (line.trim().startsWith('### ')) {
                                        const title = line.trim().replace('### ', '');
                                        elements.push(<h2 key={i} className="text-[20px] font-semibold mt-6 mb-2 text-slate-900 dark:text-white uppercase tracking-tight">{title}</h2>);
                                        i++; continue;
                                    }

                                    // 3. Spacing Marker
                                    if (line.trim() === '&nbsp;') {
                                        elements.push(<div key={i} className="h-4"></div>);
                                        i++; continue;
                                    }

                                    // 4. List & Bullet Item Handling (Monochromatic Bullet)
                                    if (line.trim().startsWith('•') || line.trim().startsWith('- ') || line.trim().startsWith('* ') || line.match(/^\d+\.\s/)) {
                                        const content = line.trim().replace(/^[•\-\*]\s*|^\d+\.\s*/, '').replace(/\*\*/g, '');

                                        // Auto-bold the label before the colon if it exists
                                        const colonIndex = content.indexOf(':');
                                        let finalContent = content;
                                        if (colonIndex > 0 && colonIndex < 50) {
                                            const label = content.substring(0, colonIndex);
                                            const remaining = content.substring(colonIndex);
                                            finalContent = (
                                                <>
                                                    <span className="font-semibold text-slate-900 dark:text-white">{label}</span>
                                                    <span className="font-normal text-slate-700 dark:text-slate-300">{remaining}</span>
                                                </>
                                            );
                                        }

                                        elements.push(
                                            <div key={i} className="flex gap-2.5 mb-1 ml-1 text-slate-700 dark:text-slate-300 font-normal leading-relaxed antialiased">
                                                <span className="text-slate-900 dark:text-slate-400 shrink-0 font-bold">•</span>
                                                <div>{finalContent}</div>
                                            </div>
                                        );
                                        i++; continue;
                                    }

                                    // 5. Image Detection
                                    const imageMatch = line.match(/!\[(.*?)\]\((.*?)\)/);
                                    if (imageMatch) {
                                        const rawSrc = imageMatch[2]?.trim() || '';
                                        // Resolve image path: if it's a full URL or already absolute, use as-is.
                                        // Otherwise, assume it lives in /assets/images/knowledge-base/
                                        let resolvedSrc = rawSrc;
                                        if (rawSrc && !rawSrc.startsWith('http') && !rawSrc.startsWith('/')) {
                                            // Strip any leading "./" or subdirectory and use just the filename
                                            const filename = rawSrc.split('/').pop();
                                            resolvedSrc = `/assets/images/knowledge-base/${filename}`;
                                        } else if (!rawSrc) {
                                            resolvedSrc = '';
                                        }
                                        elements.push(
                                            <div key={i} className="my-6 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-lg bg-white dark:bg-zinc-900">
                                                <img
                                                    src={resolvedSrc}
                                                    alt={imageMatch[1]}
                                                    className="w-full h-auto object-contain"
                                                    onError={(e) => { e.target.closest('div').style.display = 'none'; }}
                                                />
                                                {imageMatch[1] && <p className="px-4 py-2.5 text-xs text-center text-slate-400 bg-slate-50 dark:bg-white/5 border-t border-slate-200 dark:border-white/10 italic">{imageMatch[1]}</p>}
                                            </div>
                                        );
                                        i++; continue;
                                    }

                                    // 6. Label Detection (Title: \n Description)
                                    // Automatically bold any line that ends with a colon
                                    if (line.trim().endsWith(':')) {
                                        const cleanLabel = line.trim().replace(/\*\*/g, '');
                                        elements.push(
                                            <p key={i} className="mb-0 text-slate-900 dark:text-white font-semibold leading-relaxed">
                                                {cleanLabel}
                                            </p>
                                        );
                                        i++; continue;
                                    }

                                    // 7. Table Detection
                                    if (line.trim().startsWith('|')) {
                                        const tableLines = [];
                                        while (i < lines.length && lines[i].trim().startsWith('|')) {
                                            tableLines.push(lines[i].trim());
                                            i++;
                                        }

                                        if (tableLines.length > 0) {
                                            const header = tableLines[0].split('|').filter(c => c.trim()).map(c => c.trim());
                                            const rows = tableLines.slice(2).map(l => l.split('|').filter(c => c.trim()).map(c => c.trim()));

                                            elements.push(
                                                <div key={i} className="my-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10 shadow-sm">
                                                    <table className="w-full text-left text-[13px] leading-relaxed">
                                                        <thead className="bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white font-semibold border-b border-slate-200 dark:border-white/10">
                                                            <tr>
                                                                {header.map((h, hi) => <th key={hi} className="px-4 py-2.5">{h}</th>)}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                                            {rows.map((row, ri) => (
                                                                <tr key={ri} className="bg-white dark:bg-transparent">
                                                                    {row.map((cell, ci) => <td key={ci} className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{cell}</td>)}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            );
                                            continue;
                                        }
                                    }

                                    // 8. Normal Paragraphs
                                    if (line.trim().length > 0) {
                                        const cleanLine = line.replace(/\*\*/g, '');
                                        const colonIndex = cleanLine.indexOf(':');

                                        if (colonIndex > 0 && colonIndex < 50 && !cleanLine.startsWith('http')) {
                                            const label = cleanLine.substring(0, colonIndex);
                                            const remaining = cleanLine.substring(colonIndex);
                                            elements.push(
                                                <p key={i} className="mb-1 leading-relaxed antialiased">
                                                    <span className="text-slate-900 dark:text-white font-semibold">{label}</span>
                                                    <span className="text-slate-700 dark:text-slate-300 font-normal">{remaining}</span>
                                                </p>
                                            );
                                        } else {
                                            elements.push(<p key={i} className="mb-1 text-slate-700 dark:text-slate-300 leading-relaxed font-normal">{cleanLine}</p>);
                                        }
                                    } else if (elements.length > 0 && elements[elements.length - 1].type !== 'div') {
                                        elements.push(<div key={i} className="h-0.5"></div>);
                                    }
                                    i++;
                                }

                                return elements;
                            })()}
                        </div>
                    )}
                </div>
            </div>
        );
    };
    // Sidebar rendering helper
    const renderSidebarItem = (item, idx) => {
        const isParentActive = activeIndex === idx && activeSubIndex === -1;
        const hasSubtopics = item.subtopics && item.subtopics.length > 0;
        const isExpanded = expandedCategories[idx];
        const isRoadmap = item.title === 'Road Map';
        const isIntro = item.title.toLowerCase().includes('introduction');

        return (
            <div key={idx} className="mb-0.5">
                <button
                    onClick={() => handleItemClick(idx)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-all ${isParentActive
                        ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50'
                        : isRoadmap
                            ? 'text-emerald-700 dark:text-emerald-400 font-bold hover:bg-emerald-50 dark:hover:bg-emerald-900/10'
                            : isIntro
                                ? 'text-slate-900 dark:text-white font-bold hover:bg-slate-50 dark:hover:bg-white/5'
                                : 'text-slate-900 hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent'
                        }`}
                >
                    <span className="text-[13px] whitespace-normal leading-snug">
                        {isRoadmap ? 'Road Map' : stripNumber(item.title)}
                    </span>
                    {hasSubtopics && (
                        <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    )}
                </button>

                {hasSubtopics && isExpanded && (
                    <div className="ml-4 mt-0.5 border-l border-slate-100 dark:border-white/5">
                        {item.subtopics.map((sub, sIdx) => {
                            const isSubActive = activeIndex === idx && activeSubIndex === sIdx;
                            return (
                                <button
                                    key={sIdx}
                                    onClick={() => handleSubItemClick(idx, sIdx)}
                                    className={`w-full flex items-start px-3 py-1.5 rounded-lg text-left transition-all ${isSubActive
                                        ? 'text-blue-600 dark:text-blue-400'
                                        : 'text-slate-700 hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent'
                                        }`}
                                >
                                    <span className="text-[12px] font-normal whitespace-normal leading-snug">
                                        • {stripNumber(sub.title)}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden font-sans bg-white dark:bg-black">
            {/* Top Gap - for visual consistency with KnowledgeBase pages */}
            <div className="h-3 md:h-4 shrink-0" />

            {/* Main Content Area - Inner Gray Box (Static, Full Height) */}
            <div className="mx-3 md:mx-4 mb-3 md:mb-4 flex-1 min-h-0 bg-gray-100 dark:bg-zinc-900 rounded-[20px] shadow-sm flex flex-col lg:flex-row overflow-hidden transition-colors duration-300">

                {/* Main Content (Left) */}
                <div className="flex-1 h-full min-h-0 overflow-y-auto p-2 md:px-5 md:py-6 bg-gray-100 dark:bg-zinc-900 border-r border-slate-200 dark:border-white/5">
                    <div className="max-w-3xl mx-auto lg:ml-0">

                        {renderContentBody(activeItem)}
                    </div>
                </div>

                {/* Sidebar Index (Right) */}
                <div className={`
                    fixed lg:relative inset-y-0 right-0 z-40 w-72 lg:w-64 bg-white dark:bg-black border-l border-slate-200 dark:border-white/10 flex flex-col overflow-hidden shrink-0 transition-transform duration-300 lg:translate-x-0 shadow-2xl lg:shadow-none
                    ${showIndexMobile ? 'translate-x-0' : 'translate-x-full'}
                `}>
                    <div className="flex items-center justify-between p-4 lg:hidden border-b border-slate-100 dark:border-white/5">
                        <span className="text-sm font-bold text-slate-800 dark:text-white">Index</span>
                        <button onClick={() => setShowIndexMobile(false)} className="p-2 -mr-2 text-slate-400 hover:text-slate-600">
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="flex-1 h-full min-h-0 overflow-y-auto p-1.5 pt-4">
                        {/* HTML/CSS Toggle */}
                        {topicSlug === 'html-css' && (
                            <div className="px-2 mb-4">
                                <div className="flex p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-white/5">
                                    <button
                                        onClick={() => {
                                            setActiveTab('html');
                                            if (data.contents[activeIndex].order > 20) {
                                                const firstHtml = data.contents.find(i => i.order <= 20);
                                                if (firstHtml) {
                                                    navigate(`/knowledge-base/${topicSlug}/${toSlug(firstHtml.title)}`);
                                                    setActiveIndex(data.contents.indexOf(firstHtml));
                                                    setActiveSubIndex(-1);
                                                }
                                            }
                                        }}
                                        className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${activeTab === 'html'
                                            ? 'bg-white dark:bg-zinc-700 text-orange-600 dark:text-orange-400 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300'
                                            }`}
                                    >
                                        HTML
                                    </button>
                                    <button
                                        onClick={() => {
                                            setActiveTab('css');
                                            if (data.contents[activeIndex].order <= 20) {
                                                const firstCss = data.contents.find(i => i.order > 20);
                                                if (firstCss) {
                                                    navigate(`/knowledge-base/${topicSlug}/${toSlug(firstCss.title)}`);
                                                    setActiveIndex(data.contents.indexOf(firstCss));
                                                    setActiveSubIndex(-1);
                                                }
                                            }
                                        }}
                                        className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${activeTab === 'css'
                                            ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300'
                                            }`}
                                    >
                                        CSS
                                    </button>
                                </div>
                            </div>
                        )}

                        {displayContents.map((item, idx) => {
                            // Filter for html-css specifically
                            if (topicSlug === 'html-css') {
                                if (activeTab === 'html' && item.order > 20) return null;
                                if (activeTab === 'css' && item.order <= 20) return null;
                            }
                            return renderSidebarItem(item, idx);
                        })}
                    </div>
                </div>

                {/* Mobile Toggle Button */}
                <button
                    onClick={() => setShowIndexMobile(true)}
                    className="lg:hidden fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 dark:bg-white text-white dark:text-black shadow-2xl hover:scale-110 active:scale-95 transition-all"
                >
                    <List className="h-6 w-6" />
                </button>

                {/* Mobile Overlay */}
                {showIndexMobile && (
                    <div
                        className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden"
                        onClick={() => setShowIndexMobile(false)}
                    />
                )}
            </div>
        </div>
    );
}
