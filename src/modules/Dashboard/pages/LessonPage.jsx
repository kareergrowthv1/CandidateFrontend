import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { ChevronLeft, ChevronRight, Play, BookOpen, FileText, Lock, Video, Info, SquareCheck, Lightbulb } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { updateCandidateProgress, markLessonComplete, markModuleComplete, getCandidateProgress } from '../../../services/programmingService';
import { runPracticeCode } from '../../../services/codingPracticeService';
import { API_BASE_URL } from '../../../constants/api';
import { Cpu, Coffee, Globe, Trophy, Star, ArrowRight, Code, Check, X, RotateCcw, Copy } from 'lucide-react';

const API_BASE = API_BASE_URL;

const fetchLesson = async (lessonId) => {
    const res = await axios.get(`${API_BASE}/api/programming/lessons/${lessonId}`);
    return res.data;
};

const ITEM_ICON = {
    lesson: <BookOpen className="h-3.5 w-3.5" />,
    video: <Video className="h-3.5 w-3.5" />,
    article: <FileText className="h-3.5 w-3.5" />,
    quiz: <Lock className="h-3.5 w-3.5" />,
    project: <Lock className="h-3.5 w-3.5" />,
    informational: <Info className="h-3.5 w-3.5" />,
};

// ─── Syntax Highlighter ──────────────────────────────────────────────────
const highlightJava = (code) => {
    if (!code) return '';
    let html = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Comments (Green)
    html = html.replace(/(\/\/.*)/g, '<span style="color: #6a9955">$1</span>');
    html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color: #6a9955">$1</span>');

    // Strings (Orange/Brown)
    html = html.replace(/("(?:\\.|[^"\\])*")(?![^<]*>)/g, '<span style="color: #ce9178">$1</span>');

    // Keywords (Blue)
    const keywords = ['public', 'private', 'protected', 'static', 'final', 'class', 'extends', 'implements', 'new', 'return', 'void', 'int', 'double', 'float', 'boolean', 'char', 'if', 'else', 'for', 'while', 'import', 'package', 'this', 'super', 'null', 'true', 'false'];
    const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b(?![^<]*>)`, 'g');
    html = html.replace(keywordRegex, '<span style="color: #569cd6">$1</span>');

    // Types / Classes (Greenish-Blue: Capitalized words)
    html = html.replace(/\b([A-Z][a-zA-Z0-9_]+)\b(?![^<]*>)/g, '<span style="color: #4ec9b0">$1</span>');

    // Numbers (Light Green)
    html = html.replace(/\b(\d+)\b(?![^<]*>)/g, '<span style="color: #b5cea8">$1</span>');

    return html;
};

// ─── Content Block Renderer ──────────────────────────────────────────────────
function ContentRenderer({ blocks, completedCheckpoints = {}, level = 0 }) {
    const [openHints, setOpenHints] = useState({});

    if (!blocks?.length) return null;
    return (
        <div className="space-y-4">
            {blocks.map((block, i) => {
                switch (block.type) {
                    case 'label':
                        return <p key={i} className="text-[10px] font-black uppercase tracking-widest text-gray-400">{block.value}</p>;
                    case 'heading':
                        return <h1 key={i} className="text-[22px] font-black text-gray-900 leading-snug">{block.value}</h1>;
                    case 'duration':
                        return <p key={i} className="text-xs text-gray-400 font-medium -mt-2">{block.value}</p>;
                    case 'section_heading':
                        return (
                            <div key={i} className="flex items-center gap-2 pt-4 pb-1 border-t border-gray-200">
                                {block.value === 'Instructions' && <SquareCheck className="h-4 w-4 text-gray-600" />}
                                {block.value === 'Concept Review' && <BookOpen className="h-4 w-4 text-gray-600" />}
                                {block.value === 'Community Support' && <Info className="h-4 w-4 text-gray-600" />}
                                <h3 className="text-sm font-bold text-gray-700">{block.value}</h3>
                            </div>
                        );
                    case 'text':
                        return <p key={i} className={`text-[13.5px] text-gray-700 leading-relaxed ${block.className || ''}`}>{block.value}</p>;
                    case 'rich_text':
                        // Renders inline HTML from trusted seed content (bold, italic, code, links, kbd)
                        return <p key={i} className={`text-[13.5px] text-gray-700 leading-relaxed ${block.className || ''}`} dangerouslySetInnerHTML={{ __html: block.value }} />;
                    case 'checkpoint':
                        const status = completedCheckpoints[block.index]; // can be 'success', 'fail', or undefined
                        let boxClasses = 'bg-white border-gray-300';
                        let icon = null;

                        if (status === 'success') {
                            boxClasses = 'bg-green-500 border-green-500 shadow-sm';
                            icon = <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />;
                        } else if (status === 'fail') {
                            boxClasses = 'bg-red-500 border-red-500 shadow-sm';
                            icon = <X className="h-3.5 w-3.5 text-white" strokeWidth={3} />;
                        }

                        return (
                            <div key={i} className={`flex items-start gap-4 pl-1`}>
                                <div className={`mt-0.5 h-5 w-5 rounded-sm border-2 shrink-0 flex items-center justify-center transition-all duration-300 ${boxClasses}`}>
                                    {icon}
                                </div>
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-start gap-2">
                                        <span className="text-[14px] font-bold text-gray-900 leading-snug">{block.index}.</span>
                                        <div 
                                            className="text-[14px] text-gray-700 leading-snug font-medium flex-1"
                                            dangerouslySetInnerHTML={{ __html: block.value }}
                                        />
                                    </div>
                                    {block.content && (
                                        <div className="pl-0 space-y-4">
                                            <ContentRenderer blocks={block.content} completedCheckpoints={completedCheckpoints} level={level + 1} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    case 'image':
                        return (
                            <div key={i} className="my-6">
                                <img
                                    src={block.value}
                                    alt={block.caption || ''}
                                    className="w-full max-w-3xl mx-auto rounded-md shadow-sm border border-gray-100"
                                />
                                {block.caption && <p className="text-[12px] text-center text-gray-400 mt-2">{block.caption}</p>}
                            </div>
                        );
                    case 'code_block':
                        return (
                            <div key={i} className="relative group/code my-3">
                                <pre className="bg-black text-[#d4d4d4] text-[13px] rounded-sm p-4 overflow-x-auto font-mono leading-relaxed shadow-lg border border-white/5">
                                    <code dangerouslySetInnerHTML={{ __html: highlightJava(block.value) }} />
                                </pre>
                                <div className="absolute top-3 right-3 opacity-0 group-hover/code:opacity-100 transition-opacity flex gap-2">
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(block.value);
                                        }}
                                        className="p-1 hover:bg-white/10 rounded transition-colors"
                                        title="Copy Code"
                                    >
                                        <Copy className="h-4 w-4 text-gray-400" />
                                    </button>
                                </div>
                            </div>
                        );
                    case 'list':
                        return (
                            <ul key={i} className="list-disc pl-6 space-y-3 my-3">
                                {block.value.map((item, j) => (
                                    <li 
                                        key={j} 
                                        className="text-[14px] text-gray-700 leading-relaxed pl-1"
                                        dangerouslySetInnerHTML={{ __html: item }}
                                    />
                                ))}
                            </ul>
                        );
                    case 'hint':
                        return (
                            <div key={i} className={`border border-yellow-200 rounded-sm overflow-hidden my-4 shadow-sm w-full`}>
                                <button
                                    onClick={() => setOpenHints(h => ({ ...h, [i]: !h[i] }))}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 bg-[#fff9c4] text-gray-800 text-[14px] font-bold text-left hover:bg-[#fff59d] transition-colors"
                                >
                                    Stuck? Get a hint
                                    <ChevronRight className={`h-4 w-4 ml-auto transition-transform text-gray-500 ${openHints[i] ? 'rotate-90' : ''}`} />
                                </button>
                                {openHints[i] && (
                                    <div className="px-5 py-5 text-[14px] text-gray-700 bg-[#fffdf0] border-t border-yellow-100">
                                        {Array.isArray(block.value) ? <ContentRenderer blocks={block.value} completedCheckpoints={completedCheckpoints} level={level + 1} /> : block.value}
                                    </div>
                                )}
                            </div>
                        );
                    default:
                        return null;
                }
            })}
        </div>
    );
}

// ─── Progress Report Component ──────────────────────────────────────────────
function ProgressReport({ skills, onContinue }) {
    const skillList = [
        { name: 'Computer science', key: 'computer_science', icon: <Cpu className="h-5 w-5 text-gray-400" />, color: 'bg-[#facc15]' },
        { name: 'Java', key: 'java', icon: <Coffee className="h-5 w-5 text-gray-400" />, color: 'bg-[#facc15]' },
        { name: 'Web development', key: 'web_development', icon: <Code className="h-5 w-5 text-gray-400" />, color: 'bg-[#facc15]' },
    ];

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-[#0f172a] text-white p-6 overflow-y-auto w-full font-sans">
            <div className="max-w-3xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="text-left">
                    <h1 className="text-2xl font-bold tracking-tight text-white mb-6">Lesson complete</h1>
                    <h3 className="text-[17px] font-bold text-white tracking-wide mb-4">What you're learning to do</h3>
                </div>

                {/* Subskill Card */}
                <div className="bg-[#131a2b] rounded-md p-6 border border-slate-700/50 relative overflow-hidden group shadow-lg">
                    <div className="flex items-center justify-between gap-6 relative z-10 w-full">
                        <div className="space-y-4 flex-1">
                            <div className="inline-block px-3 py-0.5 rounded-full border border-slate-600/80 mb-1">
                                <span className="text-[11px] font-semibold tracking-wider text-slate-300 uppercase">Subskill</span>
                            </div>
                            <h2 className="text-xl font-bold text-white">Write and compile basic Java programs.</h2>
                            <div className="flex gap-4 text-[13px] font-medium text-slate-400 mt-2">
                                <span className="bg-slate-800/80 px-2 py-1 rounded text-slate-300">Computer science</span>
                                <span className="bg-slate-800/80 px-2 py-1 rounded text-slate-300">Java</span>
                                <span className="bg-slate-800/80 px-2 py-1 rounded text-slate-300">Web development</span>
                            </div>
                        </div>
                        <div className="relative h-24 w-24 shrink-0 mr-4">
                            <svg className="h-full w-full -rotate-90">
                                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-700/60" />
                                <circle 
                                    cx="48" cy="48" r="40" 
                                    stroke="currentColor" strokeWidth="6" 
                                    fill="transparent" 
                                    className="text-[#facc15] transition-all duration-[1500ms] cubic-bezier(0.4, 0, 0.2, 1)" 
                                    strokeDasharray="251.2" 
                                    strokeDashoffset={251.2 * (1 - 0.33)} 
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-[20px] font-black text-white">33%</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-left py-2">
                    <p className="text-[17px] font-bold text-white">You earned <span className="text-[#facc15]">25 Points</span> each toward your skills!</p>
                </div>

                {/* Skill Bars Card */}
                <div className="bg-[#131a2b] rounded-md p-6 border border-slate-700/50 shadow-lg relative">
                    <div className="flex flex-col w-full relative">
                        {/* Grid markers header */}
                        <div className="flex w-full text-[12px] text-slate-400 font-semibold border-b border-slate-700/50 pb-3 mb-6 relative">
                            <div className="w-[45%]" /> {/* Spacer for left column */}
                            <div className="flex-1 flex justify-between pr-24 relative z-10">
                                <span>0</span>
                                <span>20</span>
                                <span>40</span>
                            </div>
                        </div>
                        
                        {/* Vertical fain divider lines behind bars */}
                        <div className="absolute left-[45%] top-[40px] bottom-0 border-l border-slate-700/30 z-0" />
                        <div className="absolute left-[72.5%] top-[40px] bottom-0 border-l border-slate-700/30 z-0" />
                        <div className="absolute right-24 top-[40px] bottom-0 border-l border-slate-700/30 w-0 z-0" />

                        <div className="space-y-6 relative z-10 w-full mb-2">
                            {skillList.map((skill, i) => (
                                <div key={i} className="flex items-center w-full">
                                    {/* Left Text and Icon */}
                                    <div className="flex items-center gap-3 w-[45%]">
                                        <div className="text-slate-400 flex items-center justify-center h-8 w-8">
                                            {skill.icon}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[14px] font-bold text-white">{skill.name}</span>
                                            <span className="text-[9px] font-bold bg-white text-black px-[6px] py-[2px] rounded-full uppercase tracking-widest">New</span>
                                        </div>
                                    </div>
                                    
                                    {/* Progress Bar Container */}
                                    <div className="flex-1 flex items-center pr-24">
                                        <div className="w-full relative h-[14px] overflow-visible flex items-center">
                                            {/* Bar Track (Empty line behind) */}
                                            {/* Not explicitly visible in image, but the yellow bar exists */}
                                            <div 
                                                className={`absolute inset-y-0 left-0 ${skill.color} rounded-full transition-all duration-[2000ms] delay-500 cubic-bezier(0.4, 0, 0.2, 1) h-full z-10`} 
                                                style={{ width: `${(25/40) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Right Points Text */}
                                    <div className="flex items-center gap-3 w-24 justify-end shrink-0 text-[13px] font-bold">
                                        <span className="text-white whitespace-nowrap">0 Points</span>
                                        <ArrowRight className="h-[14px] w-[14px] text-white stroke-[3]" />
                                        <span className="text-[#facc15] whitespace-nowrap">25 Points</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function LessonPage() {
    const { slug, moduleSlug, lessonSlug, lessonId: paramLessonId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [lessonId, setLessonId] = useState(paramLessonId || location.state?.lessonId || null);
    const [lesson, setLesson] = useState(null);
    const [loading, setLoading] = useState(true);
    const [completedCheckpoints, setCompletedCheckpoints] = useState({});

    const [code, setCode] = useState('');
    const [output, setOutput] = useState('');
    const [outputError, setOutputError] = useState('');
    const [running, setRunning] = useState(false);
    const [htmlPreviewCode, setHtmlPreviewCode] = useState('');
    const [outputHeight, setOutputHeight] = useState(180);
    const [candidateSkills, setCandidateSkills] = useState({});

    // Terminal State
    const [terminalLines, setTerminalLines] = useState([]);

    const [terminalInput, setTerminalInput] = useState('');
    const [isCompiled, setIsCompiled] = useState(false);
    const [hasCheckedLs, setHasCheckedLs] = useState(false);

    // Sync local lessonId with URL params
    useEffect(() => {
        if (paramLessonId && paramLessonId !== lessonId) {
            setLessonId(paramLessonId);
        }
    }, [paramLessonId]);

    // Reset state when lesson changes (ID or Slugs)
    useEffect(() => {
        setTerminalLines([]);

        setTerminalInput('');
        setIsCompiled(false);
        setHasCheckedLs(false);
        setCompletedCheckpoints({});
        setOutput('');
        setOutputError('');
        setHtmlPreviewCode('');
        setRunning(false);
        // Important: Force loading state to show fresh fetch
        setLoading(true);
    }, [lessonId, paramLessonId, lessonSlug, moduleSlug]);

    const validateOutput = (text, criteria, code = '') => {
        if (!criteria?.length) return {};
        
        const sortedCriteria = [...criteria].sort((a, b) => a.index - b.index);
        
        // 1. Independent Raw Match Check
        const matches = {};
        sortedCriteria.forEach(c => {
            const matchOutput = c.match ? new RegExp(c.match, 'm').test(text) : true;
            const matchCode = c.matchCode ? new RegExp(c.matchCode, 'm').test(code) : true;
            matches[c.index] = matchOutput && matchCode;
        });

        // 2. Full Reset Rule: If entire lesson was done, then broken, reset everything.
        const allPreviouslyDone = sortedCriteria.length > 0 && 
            sortedCriteria.every(c => completedCheckpoints[c.index] === 'success');
        const anyCurrentFail = Object.values(matches).some(v => v === false);

        if (allPreviouslyDone && anyCurrentFail) {
            // Strict sequential logic for reset
            const resetState = {};
            let previousFailed = false;
            sortedCriteria.forEach(c => {
                if (!previousFailed && matches[c.index]) {
                    resetState[c.index] = 'success';
                } else {
                    resetState[c.index] = 'fail';
                    previousFailed = true;
                }
            });
            return resetState;
        }

        // 3. Lenient Progress Logic (Persistence + Sequential completion)
        const nextState = { ...completedCheckpoints };
        sortedCriteria.forEach(c => {
            // Current one is a success IF:
            // a) It was already a success (Persistence) OR
            // b) It matches NOW AND all previous were either done before OR match now (Lenient Sequential)
            
            if (nextState[c.index] === 'success') {
                // Keep it green
                nextState[c.index] = 'success';
            } else {
                const canComplete = matches[c.index] && sortedCriteria
                    .filter(prev => prev.index < c.index)
                    .every(prev => nextState[prev.index] === 'success' || matches[prev.index]);

                if (canComplete) {
                    nextState[c.index] = 'success';
                } else {
                    nextState[c.index] = 'fail';
                }
            }
        });

        return nextState;
    };

    const handleTerminalCommand = (e) => {
        if (e.key !== 'Enter' || !terminalInput.trim()) return;

        // Auto-save code on command run as well
        if (user?.id && slug && lessonId) {
            updateCandidateProgress(user.id, slug, { [`savedCode.${lessonId}`]: code }).catch(e => console.error('Auto-save failed', e));
        }

        const cmd = terminalInput.trim();
        const newLines = [...terminalLines, { type: 'input', value: cmd }];
        const args = cmd.split(' ');
        const baseCmd = args[0].toLowerCase();

        if (baseCmd === 'clear') {
            setTerminalLines([]);
        } else if (baseCmd === 'ls') {
            newLines.push({ type: 'output', value: isCompiled ? 'Compiling.java  Compiling.class' : 'Compiling.java' });
            if (!isCompiled) setHasCheckedLs(true);
        } else if (baseCmd === 'javac') {
            const file = args[1];
            if (file === 'Compiling.java') {
                // Check if code has the missing semicolon - looking for the EXACT fixed line
                const isFixed = code.includes('System.out.println("Java statements end with a semicolon.");');
                
                if (!isFixed) {
                    // Still broken
                    newLines.push({ type: 'output', value: 'Compiling.java:6: error: \';\' expected', color: 'text-red-400' });
                    newLines.push({ type: 'output', value: '    System.out.println("Java statements end with a semicolon.")', color: 'text-gray-400' });
                    newLines.push({ type: 'output', value: '                                                       ^', color: 'text-red-400' });
                    newLines.push({ type: 'output', value: '1 error', color: 'text-red-400' });
                    setIsCompiled(false);
                } else {
                    // Fixed!
                    newLines.push({ type: 'output', value: 'Compilation successful.', color: 'text-green-400' });
                    setIsCompiled(true);
                }
            } else {
                newLines.push({ type: 'output', value: `javac: file not found: ${file || ''}`, color: 'text-red-400' });
            }
        } else if (baseCmd === 'java') {
            const file = args[1];
            if (file === 'Compiling') {
                if (isCompiled) {
                    newLines.push({ type: 'output', value: 'Java is a class-based language.' });
                    newLines.push({ type: 'output', value: 'Java classes have a \'main\' method.' });
                    newLines.push({ type: 'output', value: 'Java statements end with a semicolon.' });
                    newLines.push({ type: 'output', value: 'Programming is... fun!' });
                } else {
                    newLines.push({ type: 'output', value: 'Error: Could not find or load main class Compiling', color: 'text-red-400' });
                }
            } else {
                newLines.push({ type: 'output', value: `Error: Could not find or load main class ${file || ''}`, color: 'text-red-400' });
            }
        } else {
            newLines.push({ type: 'output', value: `Command not found: ${baseCmd}`, color: 'text-red-400' });
        }

        setTerminalLines(newLines);
        setTerminalInput('');
    };

    const handleCheckWork = () => {
        const newCompleted = {};
        const lessonTitle = lesson?.title || '';
        const isLesson6 = lessonTitle.includes('Catching Errors');
        const isLesson7 = lessonTitle.includes('Creating Executables');

        const inputs = terminalLines.filter(l => l.type === 'input').map(l => l.value.trim());

        if (isLesson6) {
            // Checkpoint 1: Run javac Compiling.java (even if it fails)
            const pass1 = inputs.some(cmd => cmd.includes('javac Compiling.java'));
            newCompleted[1] = pass1 ? 'success' : 'fail';

            // Checkpoint 2: Run ls (Only if 1 passed)
            const pass2 = pass1 && inputs.includes('ls');
            newCompleted[2] = pass2 ? 'success' : 'fail';

            // Checkpoint 3: Fix code and compile (Only if 2 passed)
            const pass3 = pass2 && isCompiled;
            newCompleted[3] = pass3 ? 'success' : 'fail';
        } else if (isLesson7) {
            // Checkpoint 1: Run ls (to see uncompiled file)
            const pass1 = inputs.includes('ls');
            newCompleted[1] = pass1 ? 'success' : 'fail';

            // Checkpoint 2: Compile the file (Only if 1 passed)
            const pass2 = pass1 && isCompiled;
            newCompleted[2] = pass2 ? 'success' : 'fail';

            // Checkpoint 3: Run java Compiling (Only if 2 passed)
            const pass3 = pass2 && inputs.includes('java Compiling');
            newCompleted[3] = pass3 ? 'success' : 'fail';
        }

        setCompletedCheckpoints(newCompleted);

        // Auto-save checkpoint state on Check click
        if (user?.id && slug && lessonId) {
            updateCandidateProgress(user.id, slug, { [`checkpoints.${lessonId}`]: newCompleted }).catch(e => console.error(e));
            
            const allSuccess = Object.values(newCompleted).length > 0 &&
                Object.values(newCompleted).every(v => v === 'success');
                
            if (allSuccess) {
                // Tally points for newly completed checkpoints
                let earnedPoints = 0;
                lesson?.content?.filter(b => b.type === 'checkpoint').forEach(chk => {
                    if (newCompleted[chk.index] === 'success' && completedCheckpoints[chk.index] !== 'success') {
                        earnedPoints += (chk.points || 5);
                    }
                });
                
                const pointsUpdate = earnedPoints > 0 ? { [slug]: earnedPoints } : null;
                markLessonComplete(user.id, slug, lessonId, pointsUpdate).catch(e => console.error(e));
            }
        }
    };
    const isDragging = useRef(false);
    const dragStartY = useRef(0);
    const dragStartH = useRef(0);

    useEffect(() => {
        const loadLesson = async () => {
            setLoading(true);
            try {
                // Priority: URL Param > State
                let currentLessonId = paramLessonId || lessonId;

                // Reset outputs and terminal when switching lessons
                setOutput('');
                setOutputError('');
                setTerminalInput('');
                setIsCompiled(false);
                setHasCheckedLs(false);

                // If it's a new lesson, clear term logs (optional - some prefer to keep)
                // setTerminalLines([]); 

                // If we don't have an ID but have slugs, fetch course to find the ID
                if (!currentLessonId && slug && moduleSlug && lessonSlug) {
                    const courseRes = await axios.get(`${API_BASE}/api/programming/courses/${slug}`);
                    const course = courseRes.data;
                    const slugify = (text) => text?.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '') || '';

                    for (const mod of course.modules || []) {
                        if (slugify(mod.title) === moduleSlug) {
                            for (const les of mod.lessons || []) {
                                if (slugify(les.title) === lessonSlug) {
                                    currentLessonId = les._id;
                                    setLessonId(currentLessonId);
                                    break;
                                }
                            }
                        }
                        if (currentLessonId) break;
                    }
                }

                if (!currentLessonId) {
                    setLoading(false);
                    return;
                }

                const data = await fetchLesson(currentLessonId);
                setLesson(data);
                
                let savedCode = null;
                let savedCheckpoints = null;
                if (user?.id && slug) {
                    try {
                        const progress = await getCandidateProgress(user.id, slug, { lessonId: currentLessonId });
                        if (progress?.metadata?.savedCode) {
                            savedCode = progress.metadata.savedCode[currentLessonId];
                        }
                        if (progress?.metadata?.checkpoints) {
                            savedCheckpoints = progress.metadata.checkpoints[currentLessonId];
                        }
                        updateCandidateProgress(user.id, slug, { lastLessonId: currentLessonId }).catch(e => console.error(e));
                    } catch (e) {
                        console.error('Failed to get candidate progress', e);
                    }
                }

                setCode(savedCode || data.starterCode || '');
                if (savedCheckpoints && typeof savedCheckpoints === 'object') {
                    setCompletedCheckpoints(savedCheckpoints);
                } else {
                    setCompletedCheckpoints({});
                }
            } catch (err) {
                console.error('Failed to load lesson', err);
            } finally {
                setLoading(false);
            }
        };

        loadLesson();
    }, [lessonId, paramLessonId, location.state?.lessonId, user?.id, slug, moduleSlug, lessonSlug]);

    const prevLesson = lesson?.prevLesson || null;
    const nextLesson = lesson?.nextLesson || null;
    const currentIdx = lesson?.indexInModule ?? -1;
    const totalInModule = lesson?.totalInModule ?? 0;

    const handleLessonNavigation = async (targetLesson) => {
        if (!targetLesson) {
            // No next lesson in this module -> Module Complete!
            if (user?.id && slug && lesson?.moduleId) {
                try {
                    // Mark the FINAL lesson as complete too
                    if (lessonId) {
                        await markLessonComplete(user.id, slug, lessonId);
                    }

                    const pointsUpdate = { computer_science: 25, java: 25, web_development: 25 };
                    await markModuleComplete(user.id, slug, lesson.moduleId, pointsUpdate);
                    
                    // Fetch latest points/progress for the report
                    const res = await axios.get(`${API_BASE}/api/programming/candidate-skills/${slug}/${user.id}`);
                    
                    // Navigate to dynamic progress page with points data
                    console.log('Navigating to progress page:', `/practice/programming/${slug}/lesson/${lessonId}/progress`);
                    navigate(`/practice/programming/${slug}/lesson/${lessonId}/progress`, {
                        state: {
                            points: res.data.points || 0,
                            subskillTitle: "Write and compile basic Java programs."
                        }
                    });
                } catch (e) {
                    console.error('Failed to complete module', e);
                    // Still try to navigate to report if we have IDs
                    if (lessonId && slug) {
                        console.log('Attempting fallback navigation to progress page...');
                        navigate(`/practice/programming/${slug}/lesson/${lessonId}/progress`);
                    } else {
                        navigate(`/practice/programming/${slug}`);
                    }
                }
            } else {
                console.warn('DEBUG: Navigation failed - missing criteria or moduleId', {
                    userId: user?.id,
                    slug,
                    moduleId: lesson?.moduleId,
                    lessonId
                });
                // If it's the LAST lesson and we have slug/lessonId, we should STILL show the report
                if (lessonId && slug) {
                    navigate(`/practice/programming/${slug}/lesson/${lessonId}/progress`);
                } else {
                    navigate(`/practice/programming/${slug}`);
                }
            }
            return;
        }

        // Before moving to next lesson, mark current as complete
        if (user?.id && slug && lessonId) {
            markLessonComplete(user.id, slug, lessonId).catch(e => console.error(e));
        }

        setLessonId(targetLesson._id);
        navigate(`/practice/programming/${slug}/lesson/${targetLesson._id}`);
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(code);
    };

    const handleResetCode = () => {
        if (lesson?.starterCode) {
            setCode(lesson.starterCode);
        }
    };

    // Helper: extract all checkpoint indices from lesson content
    const getCheckpointIndices = (lessonData) => {
        if (!lessonData?.content?.length) return [];
        return lessonData.content
            .filter(b => b.type === 'checkpoint')
            .map(b => b.index);
    };

    const handleRun = async () => {
        // Auto-save code on 'Run' click
        if (user?.id && slug && lessonId) {
            updateCandidateProgress(user.id, slug, { [`savedCode.${lessonId}`]: code }).catch(e => console.error('Auto-save failed', e));
        }

        // HTML: render in iframe preview instead of calling Judge0
        if (lesson?.language === 'html') {
            setOutputError('');
            setOutput('');
            setHtmlPreviewCode(code || '');
            return;
        }

        setRunning(true);
        setOutput('');
        setOutputError('');
        try {
            const resultList = await runPracticeCode({
                sourceCode: code,
                language: lesson?.language || 'java',
                testCases: [{ input: '', expectedOutput: '' }],
                timeoutSeconds: 10,
                rawCode: true,
            });
            const result = resultList?.results?.[0];
            if (result?.errorMessage) {
                setOutputError(result.errorMessage);
                // DO NOT wipe existing ticks on error anymore. 
                // Just mark the current evaluation as potentially failed if it was a success.
            } else {
                const outText = result?.actualOutput || '';
                setOutput(outText || '(no output)');

                let newCompleted = { ...completedCheckpoints };

                if (lesson?.validationCriteria?.length) {
                    // Use explicit criteria from DB — case sensitive
                    newCompleted = validateOutput(outText, lesson.validationCriteria, code);
                } else {
                    // Fallback: only mark green if there is REAL non-empty output
                    const indices = getCheckpointIndices(lesson);
                    const hasRealOutput = outText.trim().length > 0;
                    if (hasRealOutput) {
                        indices.forEach(idx => { newCompleted[idx] = 'success'; });
                    } else {
                        // No output produced — mark all fail
                        indices.forEach(idx => { newCompleted[idx] = 'fail'; });
                    }
                }

                setCompletedCheckpoints(newCompleted);

                // Save checkpoint state to DB
                const allSuccess = Object.values(newCompleted).length > 0 &&
                    Object.values(newCompleted).every(v => v === 'success');

                if (user?.id && slug && lessonId) {
                    updateCandidateProgress(user.id, slug, { [`checkpoints.${lessonId}`]: newCompleted }).catch(e => console.error(e));
                    // Mark lesson complete in DB when all checkpoints pass
                    if (allSuccess) {
                        // Tally points for newly completed checkpoints
                        let earnedPoints = 0;
                        lesson?.content?.filter(b => b.type === 'checkpoint').forEach(chk => {
                            if (newCompleted[chk.index] === 'success' && completedCheckpoints[chk.index] !== 'success') {
                                earnedPoints += (chk.points || 5);
                            }
                        });
                        
                        const pointsUpdate = earnedPoints > 0 ? { [slug]: earnedPoints } : null;
                        markLessonComplete(user.id, slug, lessonId, pointsUpdate).catch(e => console.error(e));
                    }
                }
            }
        } catch (err) {
            setOutputError(err.message || 'Execution failed');
        } finally {
            setRunning(false);
        }
    };


    // Drag-to-resize output panel
    const onMouseDown = (e) => {
        isDragging.current = true;
        dragStartY.current = e.clientY;
        dragStartH.current = outputHeight;
        document.body.style.userSelect = 'none';
    };
    useEffect(() => {
        const onMove = (e) => {
            if (!isDragging.current) return;
            const delta = dragStartY.current - e.clientY;
            setOutputHeight(Math.max(80, Math.min(400, dragStartH.current + delta)));
        };
        const onUp = () => {
            isDragging.current = false;
            document.body.style.userSelect = '';
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, []);

    if (loading) {
        return (
            <div className="flex h-full min-h-[400px] items-center justify-center bg-[#1e1e1e]">
                <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-blue-400" />
            </div>
        );
    }
    if (!lesson) {
        return <div className="flex h-full min-h-[400px] items-center justify-center text-gray-400">Lesson not found.</div>;
    }

    return (
        <div className="flex flex-col h-full w-full bg-transparent">
            {/* ── Main 2-column body ── */}
            <div className="flex flex-col lg:flex-row flex-1 bg-transparent">

                {/* ── LEFT: Scrollable lesson content ── */}
                <div className="w-full lg:w-1/2 flex flex-col shrink-0 lg:border-r border-gray-200 bg-white">
                    {/* ── Top Nav (now inside Left Pane) ── */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-white shrink-0">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate(`/practice/programming/${slug}`)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                            >
                                <ChevronLeft className="h-4 w-4" /> Back to Course
                            </button>
                            <span className="text-gray-300">|</span>
                            <span className="text-xs font-semibold text-gray-800 truncate max-w-[150px]">{lesson.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {prevLesson && (
                                <button
                                    onClick={() => handleLessonNavigation(prevLesson)}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" /> Back
                                </button>
                            )}
                                    <button
                                        onClick={() => handleLessonNavigation(nextLesson)}
                                        className="flex items-center gap-1 px-4 py-1.5 text-xs font-semibold rounded transition-colors bg-[#3b19ff] text-white hover:bg-blue-700 cursor-pointer"
                                    >
                                        {nextLesson ? 'Next' : 'Submit'} <ChevronRight className="h-3.5 w-3.5" />
                                    </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto w-full scrollbar-hide flex flex-col">
                        <div className="px-6 py-6 flex-1 shrink-0">
                            <ContentRenderer blocks={lesson.content} completedCheckpoints={completedCheckpoints} />
                        </div>
                        {/* Bottom nav in left panel */}
                        <div className="bg-white border-t border-gray-200 px-6 py-3 flex justify-between text-xs text-gray-500 w-full shrink-0">
                            <span>{currentIdx + 1} / {totalInModule || '?'}</span>
                            <span className="text-gray-400">{lesson.type}</span>
                        </div>
                    </div>
                </div>

                {/* ── RIGHT: Editor + Output ── */}
                <div className="w-full lg:w-1/2 flex flex-col min-w-0 bg-[#1e1e1e] h-[600px] lg:h-full overflow-hidden border-t-4 lg:border-t-0 border-[#252526]">

                    {/* Editor header */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#252526] shrink-0">
                        <div className="flex items-center gap-2 text-[11px] text-gray-400">
                            <FileText className="h-3.5 w-3.5" />
                            <span>{lesson?.fileName || (lesson?.language === 'html' ? 'index.html' : 'script.js')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleCopyCode}
                                title="Copy code"
                                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors"
                            >
                                <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                                onClick={handleResetCode}
                                title="Reset code"
                                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                            <button
                                onClick={lesson.isTerminal ? handleCheckWork : handleRun}
                                disabled={running}
                                className="flex items-center gap-2 px-4 py-1.5 bg-[#3b19ff] hover:bg-blue-600 disabled:opacity-60 text-white text-xs font-bold rounded transition-colors"
                            >
                                {lesson.isTerminal ? (
                                    <>
                                        <SquareCheck className="h-3.5 w-3.5" />
                                        Check
                                    </>
                                ) : (
                                    <>
                                        <Play className="h-3 w-3" fill="white" />
                                        {running ? 'Running...' : 'Run'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Monaco Editor */}
                    <div className="flex-1 min-h-0 overflow-hidden">
                        <Editor
                            height="100%"
                            defaultLanguage={lesson.language || 'java'}
                            language={lesson.language || 'java'}
                            value={code}
                            onChange={(val) => setCode(val || '')}
                            theme="vs-dark"
                            options={{
                                fontSize: 13,
                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                minimap: { enabled: false },
                                lineNumbers: 'on',
                                scrollBeyondLastLine: false,
                                renderLineHighlight: 'line',
                                padding: { top: 12, bottom: 12 },
                                tabSize: 2,
                            }}
                        />
                    </div>

                    {/* Drag handle */}
                    <div
                        onMouseDown={onMouseDown}
                        className="h-1 bg-[#3e3e42] hover:bg-[#3b19ff] cursor-row-resize transition-colors shrink-0"
                    />

                    {/* Output / Terminal panel */}
                    <div style={{ height: outputHeight }} className="shrink-0 overflow-hidden flex flex-col bg-[#0d0d0d]">
                        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-[#1a1a1a] shrink-0">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                {lesson.isTerminal ? 'Terminal' : 'Output'}
                            </span>
                            {((!lesson.isTerminal && (output || outputError || (lesson?.language === 'html' && htmlPreviewCode))) || (lesson.isTerminal && terminalLines.length > 0)) && (
                                <button
                                    onClick={() => {
                                        if (lesson.isTerminal) setTerminalLines([]);
                                        else { setOutput(''); setOutputError(''); setHtmlPreviewCode(''); }
                                    }}
                                    className="ml-auto text-[10px] text-gray-500 hover:text-gray-300"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 py-3 font-mono text-[12px] leading-relaxed">
                            {lesson.isTerminal ? (
                                <div className="space-y-1">
                                    {terminalLines.map((line, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            {line.type === 'input' && <span className="text-blue-400">$</span>}
                                            <span className={line.color || 'text-white'}>{line.value}</span>
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-2">
                                        <span className="text-blue-400">$</span>
                                        <input
                                            autoFocus
                                            type="text"
                                            value={terminalInput}
                                            onChange={(e) => setTerminalInput(e.target.value)}
                                            onKeyDown={handleTerminalCommand}
                                            className="flex-1 bg-transparent border-none outline-none text-white font-mono"
                                            placeholder="..."
                                        />
                                    </div>
                                </div>
                            ) : lesson?.language === 'html' ? (
                                <>
                                    {!htmlPreviewCode && (
                                        <span className="text-gray-600">Click Run to view your webpage...</span>
                                    )}
                                    {htmlPreviewCode && (
                                        <iframe
                                            title="HTML preview"
                                            srcDoc={htmlPreviewCode}
                                            className="w-full h-full min-h-[200px] border-0 bg-white rounded"
                                            sandbox="allow-scripts"
                                        />
                                    )}
                                </>
                            ) : (
                                <>
                                    {!output && !outputError && !running && (
                                        <span className="text-gray-600">Click Run to execute your code...</span>
                                    )}
                                    {running && <span className="text-yellow-400 animate-pulse">Running code...</span>}
                                    {outputError && <pre className="text-red-400 whitespace-pre-wrap">{outputError}</pre>}
                                    {output && <pre className="text-green-400 whitespace-pre-wrap">{output}</pre>}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
