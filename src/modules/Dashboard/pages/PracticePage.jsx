import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronDown, Code2, Loader2, Star, Play, Send, Check, X } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useAuth } from '../../../context/AuthContext';
import { getCodingPracticeCategories, getCodingPracticeQuestionsByTopic, runPracticeCode, getPracticeResponse, savePracticeResponse, updatePracticeResponse, getPracticeResponseStats } from '../../../services/codingPracticeService';
import { saveCodingStats } from '../../../services/candidateService';

function getCandidateId() {
  const fromSession = sessionStorage.getItem('candidateId');
  if (fromSession) return fromSession;
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    if (u?.id) return String(u.id);
  } catch (_) { }
  return '';
}

function toQuestionSlug(question) {
  if (!question?.name) return '';
  return encodeURIComponent(question.name);
}

function matchQuestionSlug(question, slug) {
  if (!slug || !question?.name) return false;
  try {
    return decodeURIComponent(slug) === question.name || question.name === slug;
  } catch {
    return question.name === slug;
  }
}

const RATINGS_STORAGE_KEY = 'coding-practice-ratings';
const MAX_STARS = 5;

function loadRatings() {
  try {
    const raw = localStorage.getItem(RATINGS_STORAGE_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw);
    return typeof o === 'object' && o !== null ? o : {};
  } catch {
    return {};
  }
}

function saveRatings(ratings) {
  try {
    localStorage.setItem(RATINGS_STORAGE_KEY, JSON.stringify(ratings));
  } catch { }
}

export default function PracticePage() {
  const { topicId: topicIdParam, questionSlug, category: categoryParam } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [topicQuestionsLoading, setTopicQuestionsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [questionsByTopic, setQuestionsByTopic] = useState({});
  const [view, setView] = useState('sections'); // 'sections' | 'categories' | 'topics' | 'questions' | 'question'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [ratings, setRatings] = useState(loadRatings);
  const [code, setCode] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [runOutput, setRunOutput] = useState(null); // legacy; use runResults for Judge0 test results
  const [runResults, setRunResults] = useState([]);
  const [runError, setRunError] = useState(null); // error message when run fails (e.g. Judge0 not configured)
  const [isRunning, setIsRunning] = useState(false);
  const [responseStats, setResponseStats] = useState({ byQuestion: {}, byTopic: {} }); // star counts from CodingResponse for stats cards
  const [savedByLanguage, setSavedByLanguage] = useState({}); // { javascript: { code, runResults, starCount }, ... } for current question
  const editorWrapRef = useRef(null);

  const setRating = useCallback((questionId, value, e) => {
    e?.stopPropagation?.();
    setRatings((prev) => {
      const next = { ...prev, [questionId]: value };
      saveRatings(next);
      return next;
    });
  }, []);

  const getRating = useCallback((id) => ratings[id] ?? 0, [ratings]);

  // Persist to DB: check if response exists; if not POST (create), else PUT (update). Then refresh stats.
  const persistResponse = useCallback(async (payload) => {
    const candidateId = getCandidateId() || (user?.id != null ? String(user.id) : '');
    if (!candidateId || !selectedQuestion || !selectedTopic) return;
    const { code: c, language: lang, starCount: stars, runResults: results } = payload;
    try {
      const existing = await getPracticeResponse(candidateId, selectedQuestion.id);
      const body = {
        candidateId,
        questionId: selectedQuestion.id,
        topicId: selectedTopic.id,
        code: c ?? code,
        language: lang ?? selectedLanguage,
        starCount: stars ?? (results?.length ? Math.round((results.filter((r) => r?.passed).length / results.length) * 5) : 0),
        runResults: Array.isArray(results) ? results : runResults,
      };
      if (!existing) {
        await savePracticeResponse(body);
      } else {
        await updatePracticeResponse(body);
      }
      const stats = await getPracticeResponseStats(candidateId);
      setResponseStats(stats || { byQuestion: {}, byTopic: {} });
    } catch (_) { }
  }, [selectedQuestion, selectedTopic, code, selectedLanguage, runResults, user?.id]);

  // Load categories (sections -> categories -> topics -> questions).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getCodingPracticeCategories()
      .then(({ categories: c }) => {
        if (!cancelled) setCategories(c || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load coding categories');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Load response stats for stats cards (byTopic, byQuestion) when candidate is known. Reduces DB load.
  useEffect(() => {
    const candidateId = getCandidateId() || (user?.id != null ? String(user.id) : '');
    if (!candidateId || !categories.length) return;
    let cancelled = false;
    getPracticeResponseStats(candidateId)
      .then((data) => {
        if (!cancelled && data) setResponseStats(data);
      })
      .catch(() => { });
    return () => { cancelled = true; };
  }, [categories.length, user?.id]);

  // Sync URL -> selected topic and view (after categories loaded).
  useEffect(() => {
    if (loading || !categories.length) return;

    // 1. Root: /assessment/coding
    if (topicIdParam === 'coding' && !categoryParam) {
      setView('categories');
      setSelectedCategory(null);
      setSelectedTopic(null);
      setSelectedQuestion(null);
      return;
    }

    // 2. Category View: /assessment/coding/:category
    if (categoryParam && !topicIdParam) {
      const foundCat = categories.find(c => c.name.toLowerCase() === categoryParam.toLowerCase());
      if (foundCat) {
        setSelectedCategory(foundCat);
        setView('topics');
        setSelectedTopic(null);
      } else {
        setView('categories');
      }
      return;
    }

    // 3. Topic View: /assessment/coding/:category/:topicId
    if (categoryParam && topicIdParam && topicIdParam !== 'coding') {
      const foundCat = categories.find(c => c.name.toLowerCase() === categoryParam.toLowerCase());
      if (foundCat) {
        const foundTopic = foundCat.topics.find(t => t.id === topicIdParam);
        if (foundTopic) {
          setSelectedCategory(foundCat);
          setSelectedTopic(foundTopic);
          setView('questions');
          return;
        }
      }
    }

    // Fallback or Question logic
    if (topicIdParam && !categoryParam) {
      // Legacy or custom topic routes (unstructured)
      let foundCategory = null;
      let foundTopic = null;
      for (const cat of categories) {
        const t = cat.topics.find((x) => x.id === topicIdParam);
        if (t) {
          foundCategory = cat;
          foundTopic = t;
          break;
        }
      }
      if (foundTopic) {
        setSelectedCategory(foundCategory);
        setSelectedTopic(foundTopic);
        setView('questions');
        return;
      }
    }

    if (!topicIdParam && !categoryParam && !questionSlug) {
      setView('sections');
    }
  }, [loading, topicIdParam, categoryParam, questionSlug, categories]);

  // When a topic is selected, load its questions on demand (if not already loaded).
  useEffect(() => {
    if (!selectedTopic || view !== 'questions') return;
    if (questionsByTopic[selectedTopic.id] != null) {
      if (questionSlug) {
        const list = questionsByTopic[selectedTopic.id] || [];
        const q = list.find((qu) => matchQuestionSlug(qu, questionSlug));
        if (q) {
          setSelectedQuestion(q);
          setRunOutput(null);
          setRunResults([]);
          setRunError(null);
          setView('question');
        }
      }
      return;
    }
    let cancelled = false;
    setTopicQuestionsLoading(true);
    getCodingPracticeQuestionsByTopic(selectedTopic.id)
      .then(({ topic: t, questions: qs }) => {
        if (!cancelled) {
          setQuestionsByTopic((prev) => ({ ...prev, [selectedTopic.id]: qs || [] }));
          if (questionSlug && (qs || []).length > 0) {
            const q = (qs || []).find((qu) => matchQuestionSlug(qu, questionSlug));
            if (q) {
              setSelectedQuestion(q);
              setRunOutput(null);
              setRunResults([]);
              setRunError(null);
              setView('question');
            }
          }
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load topic questions');
      })
      .finally(() => {
        if (!cancelled) setTopicQuestionsLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedTopic?.id, view, questionSlug, questionsByTopic]);


  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setSelectedTopic(null);
    setSelectedQuestion(null);
    setView('topics');
    setError(null);
    navigate(`/assessment/coding/${category.name.toLowerCase()}`);
  };

  const handleTopicClick = (topic) => {
    setSelectedTopic(topic);
    setSelectedQuestion(null);
    setView('questions');
    setError(null);
    if (selectedCategory) {
      navigate(`/assessment/coding/${selectedCategory.name.toLowerCase()}/${topic.id}`);
    } else {
      navigate(`/assessment/${topic.id}`);
    }
  };

  const handleQuestionClick = (question) => {
    // Save current question to DB before switching.
    if (selectedQuestion && selectedTopic && selectedQuestion.id !== question.id) {
      const total = runResults.length;
      const passed = runResults.filter((r) => r?.passed).length;
      const starCount = total ? Math.round((passed / total) * 5) : 0;
      persistResponse({ code, language: selectedLanguage, starCount, runResults }).catch(() => { });
    }
    setSelectedQuestion(question);
    setRunOutput(null);
    setRunResults([]);
    setRunError(null);
    setView('question');

    const slug = toQuestionSlug(question);
    if (selectedCategory && selectedTopic && slug) {
      navigate(`/assessment/coding/${selectedCategory.name.toLowerCase()}/${selectedTopic.id}/${slug}`);
    } else if (selectedTopic && slug) {
      navigate(`/assessment/${selectedTopic.id}/${slug}`);
    }
  };

  const handleBack = () => {
    if (view === 'question' && selectedQuestion && selectedTopic) {
      const total = runResults.length;
      const passed = runResults.filter((r) => r?.passed).length;
      const starCount = total ? Math.round((passed / total) * 5) : 0;
      persistResponse({ code, language: selectedLanguage, starCount, runResults }).catch(() => { });
      setView('questions');
      setSelectedQuestion(null);
      if (selectedCategory) {
        navigate(`/assessment/coding/${selectedCategory.name.toLowerCase()}/${selectedTopic.id}`);
      } else {
        navigate(`/assessment/${selectedTopic.id}`);
      }
      return;
    }
    if (view === 'questions' && selectedTopic) {
      setView('topics');
      setSelectedTopic(null);
      if (selectedCategory) {
        navigate(`/assessment/coding/${selectedCategory.name.toLowerCase()}`);
      } else {
        navigate('/assessment/coding');
      }
      return;
    }
    if (view === 'topics' && selectedCategory) {
      setView('categories');
      setSelectedCategory(null);
      navigate('/assessment/coding');
      return;
    }
    if (view === 'categories') {
      setView('sections');
      navigate('/assessment');
      return;
    }
    if (view === 'categories') {
      setView('sections');
      setSelectedCategory(null);
      setSelectedTopic(null);
      setSelectedQuestion(null);
      navigate('/assessment', { replace: true });
      return;
    }
    navigate('/assessment', { replace: true });
  };

  const handleSectionClick = (sectionId) => {
    if (sectionId === 'coding') {
      setView('categories');
      navigate('/assessment/coding', { replace: true });
    }
  };

  const questions = selectedTopic ? (questionsByTopic[selectedTopic.id] || []) : [];

  const allowedLanguages = selectedQuestion?.allowedLanguages || ['java', 'python', 'javascript'];
  const starterByLanguage = selectedQuestion?.starterCodeByLanguage || {};

  const getStarterForLanguage = useCallback((lang) => {
    const key = (lang || 'javascript').toLowerCase();
    return starterByLanguage[key] || starterByLanguage.javascript || (selectedQuestion?.functionSignature ? `// Implement:\n${selectedQuestion.functionSignature}\n{\n  // your code here\n}\n` : '// Write your solution here\n');
  }, [starterByLanguage, selectedQuestion?.functionSignature]);

  // When opening a question: load saved response (byLanguage); set code and runResults for current language only.
  useEffect(() => {
    if (view !== 'question' || !selectedQuestion) return;
    const candidateId = getCandidateId() || (user?.id != null ? String(user.id) : '');
    if (candidateId) {
      let cancelled = false;
      getPracticeResponse(candidateId, selectedQuestion.id)
        .then((data) => {
          if (cancelled) return;
          const byLang = data?.byLanguage && typeof data.byLanguage === 'object' ? data.byLanguage : {};
          setSavedByLanguage(byLang);
          const lang = (selectedLanguage || 'javascript').toLowerCase();
          const langData = byLang[lang] || byLang.javascript || {};
          if (langData.code != null && langData.code !== '') {
            setCode(langData.code);
          } else {
            setCode(getStarterForLanguage(selectedLanguage));
          }
          setRunResults(Array.isArray(langData.runResults) ? langData.runResults : []);
          setRunError(null);
        })
        .catch(() => {
          setSavedByLanguage({});
          setCode(getStarterForLanguage(selectedLanguage));
          setRunResults([]);
          setRunError(null);
        });
      return () => { cancelled = true; };
    }
    setSavedByLanguage({});
    setCode(getStarterForLanguage(selectedLanguage));
    setRunResults([]);
  }, [selectedQuestion?.id, view, getStarterForLanguage, user?.id]);

  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    setSelectedLanguage(lang);
    setRunError(null);
    const key = lang.toLowerCase();
    const saved = savedByLanguage[key] || savedByLanguage.javascript;
    if (saved?.code != null && saved.code !== '') {
      setCode(saved.code);
    } else {
      setCode(getStarterForLanguage(lang));
    }
    setRunResults(Array.isArray(saved?.runResults) ? saved.runResults : []);
  };

  const handleRunCode = async () => {
    if (!selectedQuestion || isRunning) return;
    const examples = selectedQuestion.examples || [];
    const testCases = examples.map((ex) => ({ input: ex.input ?? '', expectedOutput: String(ex.output ?? '') }));
    if (testCases.length === 0) {
      setRunError('No test cases for this question.');
      setRunResults([]);
      return;
    }
    setIsRunning(true);
    setRunError(null);
    setRunResults([]);
    try {
      const { results } = await runPracticeCode({
        sourceCode: code,
        language: selectedLanguage,
        testCases,
        timeoutSeconds: 10,
        functionName: selectedQuestion.name || null,
        functionSignature: selectedQuestion.functionSignature || null,
        boilerplateByLanguage: selectedQuestion.boilerplateByLanguage || undefined,
      });
      const list = Array.isArray(results) ? results : [];
      setRunResults(list);
      const passed = list.filter((r) => r?.passed).length;
      const failed = list.length - passed;
      const starCount = list.length ? Math.round((passed / list.length) * 5) : 0;
      
      // Persist to MongoDB (Code/Response)
      await persistResponse({ code, language: selectedLanguage, starCount, runResults: list });
      
      // Persist to MySQL (Analytics/Stats)
      const cid = getCandidateId() || (user?.id != null ? String(user.id) : '');
      if (cid && selectedQuestion?.id) {
        await saveCodingStats({
          candidateId: cid,
          codingQuestionId: selectedQuestion.id,
          passedCount: passed,
          failedCount: failed
        }).catch(e => console.error('Failed to save MySQL coding stats:', e));
      }
      const langKey = (selectedLanguage || 'javascript').toLowerCase();
      setSavedByLanguage((prev) => ({ ...prev, [langKey]: { code, runResults: list, starCount } }));
    } catch (err) {
      setRunError(err.message || 'Run failed');
      setRunResults([]);
    } finally {
      setIsRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] w-full px-4 py-12">
        <Loader2 className="h-10 w-10 text-slate-400 animate-spin mb-4" />
        <p className="text-sm font-normal text-slate-500">Loading...</p>
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

  return (
    <div className="w-full h-full flex flex-col bg-transparent">
      <div className="flex-1 flex flex-col min-h-0 transition-colors duration-300">
        <div className="w-full min-h-0 flex flex-col">
          {view === 'sections' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <button
                type="button"
                onClick={() => navigate('/assessment/coding')}
                className="bg-white dark:bg-black rounded-2xl border border-slate-200/60 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:shadow-lg hover:shadow-slate-200/20 transition-all p-4 md:p-5 pb-3 md:pb-4 flex flex-col text-left group cursor-pointer relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-slate-200 w-full sm:w-auto"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-[17px] md:text-[19px] font-black text-slate-900 dark:text-white flex items-center gap-2 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                    <Code2 className="h-4 w-4 shrink-0 text-slate-400" />
                    Coding
                  </h3>
                </div>
                <p className="text-xs md:text-sm font-normal text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                  Sharpen your skills with real-world coding problems. Run and test your solutions in our powerful integrated editor.
                </p>
                <div className="flex gap-2 mt-auto pt-1 w-full">
                  <div className="px-3 py-1 text-[10px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 w-fit">
                    {categories.reduce((acc, cat) => acc + cat.topics.length, 0)} Topics
                  </div>
                  <div className="px-3 py-1 text-[10px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 w-fit">
                    {categories.reduce((acc, cat) => acc + cat.topics.reduce((sum, t) => sum + (t.questionCount || 0), 0), 0)} Questions
                  </div>
                </div>
              </button>
            </div>
          )}

          {view === 'categories' && (
            <div className="w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {categories.map((category) => {
                  const totalQuestions = category.topics.reduce((sum, t) => sum + (t.questionCount || 0), 0);
                  return (
                    <button
                      key={category.name}
                      type="button"
                      onClick={() => handleCategoryClick(category)}
                      className="bg-white dark:bg-black rounded-2xl border border-slate-200/60 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:shadow-lg hover:shadow-slate-200/20 transition-all p-4 md:p-5 pb-3 md:pb-4 flex flex-col text-left group cursor-pointer relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-slate-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-[17px] md:text-[19px] font-black text-slate-900 dark:text-white flex items-center gap-2 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                          <Code2 className="h-4 w-4 shrink-0 text-slate-400" />
                          {category.name}
                        </h3>
                      </div>
                      <p className="text-[12px] md:text-[13px] font-normal text-slate-500 dark:text-slate-400 leading-relaxed mb-4 line-clamp-2">
                        {category.description}
                      </p>
                      <div className="flex gap-2 mt-auto w-full">
                        <div className="px-3 py-1 text-[10px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 w-fit">
                          {category.topics.length} Topics
                        </div>
                        <div className="px-3 py-1 text-[10px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 w-fit">
                          {totalQuestions} Questions
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {categories.length === 0 && (
                <p className="text-sm text-slate-500 py-12 text-center bg-white rounded-xl border border-slate-100">No categories found.</p>
              )}
            </div>
          )}

          {view === 'topics' && selectedCategory && (
            <div className="w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {selectedCategory.topics.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => handleTopicClick(topic)}
                    className="bg-white dark:bg-black rounded-2xl border border-slate-200/60 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:shadow-lg hover:shadow-slate-200/20 transition-all p-4 md:p-5 pb-3 md:pb-4 flex flex-col text-left group cursor-pointer relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-[16px] md:text-[18px] font-black text-slate-900 dark:text-white flex items-center gap-2 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                        <Code2 className="h-4 w-4 shrink-0 text-slate-300 dark:text-zinc-600" />
                        {topic.name || topic.id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </h3>
                      <div className="flex items-center gap-2">
                        {(responseStats.byTopic[topic.id]?.attempted > 0 || responseStats.byTopic[topic.id]?.totalStars > 0) && (
                          <span className="text-[10px] font-black text-slate-900 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                            {responseStats.byTopic[topic.id].totalStars}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] md:text-[13px] font-normal text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                      {topic.description || `${topic.id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} practice problems.`}
                    </p>
                    <div className="flex gap-2 mt-4 w-full">
                      <div className="px-3 py-1 text-[10px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 w-fit">
                        {topic.questionCount || 0} Questions
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {selectedCategory.topics.length === 0 && (
                <p className="text-sm text-slate-500 py-12 text-center bg-white rounded-xl border border-slate-100">No topics found for this category.</p>
              )}
            </div>
          )}

          {view === 'questions' && (
            <div className="w-full"> {/* Removed negative margin to restore top gap */}
              {topicQuestionsLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-slate-300 animate-spin mb-2" />
                  <p className="text-sm text-slate-400 font-medium">Crunching data...</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {questions.map((question) => {
                      const r = getRating(question.id);
                      return (
                        <div
                          key={question.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleQuestionClick(question)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleQuestionClick(question); } }}
                          className="text-left bg-white dark:bg-black border border-slate-100 dark:border-white/5 rounded-xl p-4 cursor-pointer hover:shadow-md hover:border-slate-300 dark:hover:border-white/10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-100 dark:focus:ring-white/5"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[13px] font-black text-slate-900 dark:text-white truncate pr-2 flex-1 min-w-0">
                              {question.name}
                            </span>
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${question.difficulty === 'E'
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-amber-50 text-amber-600'
                                }`}
                            >
                              {question.difficulty === 'E' ? 'Easy' : 'Hard'}
                            </span>
                          </div>
                          <p className="text-[10px] font-normal text-slate-500 line-clamp-2 mb-4">
                            {question.description || 'Master the fundamental concepts through this hands-on challenge.'}
                          </p>
                          <div className="flex items-center justify-end gap-0.5 mt-auto" onClick={(e) => e.stopPropagation()}>
                            {(() => {
                              const savedStars = responseStats.byQuestion[question.id] ?? null;
                              if (savedStars != null && savedStars > 0) {
                                return [1, 2, 3, 4, 5].map((n) => (
                                  <Star key={n} className={`h-3 w-3 shrink-0 ${n <= savedStars ? 'fill-amber-400 text-amber-500' : 'text-slate-100'}`} />
                                ));
                              }
                              return [1, 2, 3, 4, 5].map((n) => (
                                <Star key={n} className="h-3 w-3 text-slate-100" />
                              ));
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {questions.length === 0 && !topicQuestionsLoading && (
                    <p className="text-sm text-slate-500 py-12 text-center bg-white rounded-xl border border-slate-100">No questions found in this topic.</p>
                  )}
                </>
              )}
            </div>
          )}
          {/* Question detail: same UI and alignment as CandidateTest coding round — 40% problem / 60% editor + test cases */}
          {view === 'question' && selectedQuestion && (() => {
            const diffLabel = selectedQuestion.difficulty === 'E' ? 'Easy' : selectedQuestion.difficulty === 'H' ? 'Hard' : 'Medium';
            const diffColor = { Easy: 'bg-green-100 text-green-800', Medium: 'bg-yellow-100 text-yellow-800', Hard: 'bg-red-100 text-red-800' }[diffLabel] || 'bg-gray-100 text-gray-700';
            return (
              <div className="w-full flex flex-col rounded-xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-zinc-950/90 min-w-0">
                <div className="flex flex-col lg:flex-row min-h-0 min-w-0">
                  {/* LEFT — Problem description; naturally grows with content */}
                  <div className="w-full lg:w-[40%] min-w-0 bg-white/80 lg:border-r-2 border-gray-200 flex-shrink-0">
                    <div className="p-6 min-w-0 overflow-x-hidden">
                      <div className="mb-5">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h1 className="text-lg font-bold text-gray-900">{selectedQuestion.name}</h1>
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${diffColor}`}>{diffLabel}</span>
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">{selectedLanguage === 'java' ? 'Java' : selectedLanguage === 'python' ? 'Python' : 'JavaScript'}</span>
                          <div className="flex items-center gap-0.5 ml-auto">
                            {(() => {
                              const langKey = (selectedLanguage || 'javascript').toLowerCase();
                              const savedForLang = savedByLanguage[langKey] || savedByLanguage.javascript;
                              const savedStars = savedForLang && typeof savedForLang.starCount === 'number' ? savedForLang.starCount : 0;
                              if (runResults.length > 0) {
                                const passed = runResults.filter((r) => r.passed).length;
                                const total = runResults.length;
                                const runStars = total ? Math.round((passed / total) * 5) : 0;
                                return [1, 2, 3, 4, 5].map((n) => (
                                  <Star key={n} className={`h-4 w-4 shrink-0 ${n <= runStars ? 'fill-amber-400 text-amber-500' : 'text-gray-200'}`} aria-label={`${runStars} of 5 stars (${selectedLanguage})`} />
                                ));
                              }
                              if (savedStars > 0) {
                                return [1, 2, 3, 4, 5].map((n) => (
                                  <Star key={n} className={`h-4 w-4 shrink-0 ${n <= savedStars ? 'fill-amber-400 text-amber-500' : 'text-gray-200'}`} aria-label={`${savedStars} of 5 stars (${selectedLanguage})`} />
                                ));
                              }
                              return [1, 2, 3, 4, 5].map((n) => (
                                <Star key={n} className={`h-4 w-4 shrink-0 ${n <= getRating(selectedQuestion.id) ? 'fill-amber-400 text-amber-500' : 'text-gray-200'}`} />
                              ));
                            })()}
                          </div>
                        </div>
                      </div>

                      <section className="mb-5 min-w-0">
                        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Problem Description</h2>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line break-words">{selectedQuestion.description || 'No description.'}</p>
                      </section>

                      {/* Test case table: show only after user has run (runResults.length > 0) */}
                      {(selectedQuestion?.examples?.length ?? 0) > 0 && runResults.length > 0 && (
                        <section className="border-gray-200 min-w-0">
                          {runError && (
                            <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                              <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                              <span>{runError}</span>
                            </div>
                          )}
                          <div className="rounded overflow-hidden border-2 border-gray-900">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-gray-100 border-b-2 border-gray-900">
                                  <th className="px-3 py-2 font-bold text-gray-900 border-r border-gray-700">Expected</th>
                                  <th className="px-3 py-2 font-bold text-gray-900">Run</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedQuestion.examples.map((ex, idx) => {
                                  const result = runResults[idx];
                                  const passed = result?.passed;
                                  const hasRun = result != null;
                                  const expectedLabel = ex.input != null && ex.output != null
                                    ? `${String(ex.input).trim()} → ${String(ex.output).trim()}`
                                    : ex.input != null
                                      ? String(ex.input).trim()
                                      : '—';
                                  return (
                                    <tr key={`tc-${idx}`} className="border-b border-gray-300 last:border-b-0">
                                      <td className="px-3 py-2 text-gray-800 font-mono align-middle break-all border-r border-gray-300">
                                        {expectedLabel}
                                      </td>
                                      <td className="px-3 py-2 align-middle">
                                        {hasRun ? (
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-mono text-gray-800 break-all">{result.actualOutput ?? '—'}</span>
                                            <span className={`inline-block px-1.5 py-0.5 text-xs font-semibold rounded ${passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                              {passed ? 'OK' : 'Fail'}
                                            </span>
                                            {passed ? <Check className="h-4 w-4 shrink-0 text-green-600" aria-hidden /> : <X className="h-4 w-4 shrink-0 text-red-600" aria-hidden />}
                                          </div>
                                        ) : (
                                          <span className="text-gray-400">—</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          {runResults.length > 0 && (
                            runResults.every((r) => r.passed) ? (
                              <div className="mt-4 flex items-center justify-center gap-2">
                                <svg className="h-8 w-8 text-green-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span className="text-base font-bold text-gray-900">All Correct</span>
                              </div>
                            ) : (
                              <div className="mt-4 flex items-center justify-center gap-2">
                                <svg className="h-6 w-6 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm font-bold text-gray-900">Some test cases failed</span>
                              </div>
                            )
                          )}
                        </section>
                      )}
                    </div>
                  </div>

                  {/* RIGHT — Editor + Console; naturally flows below problem description on mobile, side-by-side on desktop */}
                  <div className="w-full lg:w-[60%] flex flex-col bg-white dark:bg-zinc-950 min-w-0 border-t-2 lg:border-t-0 lg:border-l-2 border-gray-100 dark:border-white/5">
                    <div className="flex flex-col lg:flex-1 border-b-2 border-gray-200 min-h-0 overflow-visible">
                      <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center justify-between shrink-0 flex-wrap gap-2 relative z-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-gray-700">Code Editor</span>
                          <select
                            value={selectedLanguage}
                            onChange={handleLanguageChange}
                            className="text-xs text-blue-600 font-medium bg-blue-50 border border-blue-100 px-2 py-1 rounded cursor-pointer"
                            aria-label="Code language"
                          >
                            {allowedLanguages.map((lang) => (
                              <option key={lang} value={lang}>
                                {lang === 'java' ? 'Java' : lang === 'python' ? 'Python' : 'JavaScript'}
                              </option>
                            ))}
                          </select>
                          {runResults.length > 0 && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${runResults.every((r) => r.passed) ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>
                              {runResults.filter((r) => r.passed).length}/{runResults.length} passed
                            </span>
                          )}
                          {isRunning && <span className="text-xs text-gray-500">Running via Judge0…</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleRunCode}
                            disabled={isRunning}
                            className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                            Run
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await persistResponse({ code, language: selectedLanguage, runResults });
                              setRunError(null);
                            }}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition-all"
                          >
                            Submit
                          </button>
                        </div>
                      </div>
                      {/* Editor wrapper: on mobile fixed height so box scrolls with page; desktop flex-1 for full height */}
                      <div
                        ref={editorWrapRef}
                        className="practice-code-editor-wrap relative z-10 w-full h-[450px] lg:h-[500px] bg-[#1e1e1e] overflow-hidden"
                      >
                        <style>{`
                          .practice-code-editor-wrap [aria-label*="Keyboard"],
                          .practice-code-editor-wrap [aria-label*="Accessibility"],
                          .practice-code-editor-wrap [title*="keyboard"],
                          .practice-code-editor-wrap button[aria-label*="keyboard"] { display: none !important; }
                          .practice-code-editor-wrap .monaco-editor .monaco-hover,
                          .practice-code-editor-wrap .monaco-editor [class*="hover"],
                          .practice-code-editor-wrap .monaco-editor .overflowingContentWidgets { z-index: 10000 !important; }
                          .practice-code-editor-wrap .monaco-editor .monaco-hover,
                          .practice-code-editor-wrap .monaco-editor .monaco-resizable-hover { top: 8px !important; bottom: auto !important; }
                          .practice-code-editor-wrap .monaco-editor .overflowingContentWidgets .monaco-hover,
                          .practice-code-editor-wrap .monaco-editor .overflowingContentWidgets .monaco-resizable-hover { top: 8px !important; bottom: auto !important; }
                        `}</style>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} aria-hidden="false">
                          <Editor
                            key={`${selectedQuestion?.id}-${selectedLanguage}`}
                            height="100%"
                            defaultLanguage={selectedLanguage === 'java' ? 'java' : selectedLanguage === 'python' ? 'python' : 'javascript'}
                            language={selectedLanguage === 'java' ? 'java' : selectedLanguage === 'python' ? 'python' : 'javascript'}
                            value={code}
                            onChange={(value) => setCode(value ?? '')}
                            theme="vs-dark"
                            loading={
                              <div className="w-full h-full flex items-center justify-center bg-[#1e1e1e] text-gray-400 text-sm min-h-[360px]">Loading editor…</div>
                            }
                            options={{
                              fontSize: 14,
                              fontFamily: 'Consolas, "Cascadia Code", "Fira Code", Monaco, "Courier New", monospace',
                              fontLigatures: true,
                              lineHeight: 22,
                              minimap: { enabled: false },
                              scrollBeyondLastLine: false,
                              automaticLayout: true,
                              tabSize: 4,
                              wordWrap: 'on',
                              suggestOnTriggerCharacters: true,
                              quickSuggestions: { other: true, comments: false, strings: false },
                              parameterHints: { enabled: true },
                              acceptSuggestionOnEnter: 'on',
                              snippetSuggestions: 'top',
                              suggest: { showKeywords: true, showSnippets: true },
                              formatOnType: true,
                              formatOnPaste: true,
                              bracketPairColorization: { enabled: true },
                              renderLineHighlight: 'line',
                              cursorBlinking: 'smooth',
                              cursorSmoothCaretAnimation: 'on',
                              smoothScrolling: true,
                              padding: { top: 12, bottom: 12 },
                              accessibilitySupport: 'off',
                              fixedOverflowWidgets: true,
                            }}
                          />
                        </div>
                      </div>
                      {/* Console / Output Panel — The "Terminal" */}
                      <div className="border-t-2 border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-zinc-900 min-h-[250px] flex flex-col">
                        <div className="px-4 py-2 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-white dark:bg-zinc-950">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Console / Output</span>
                          {runResults.length > 0 && (
                            <button
                              type="button"
                              onClick={() => { setRunResults([]); setRunError(null); }}
                              className="text-[10px] font-bold text-blue-600 hover:text-blue-700"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <div className="flex-1 p-4 font-mono text-xs">
                          {isRunning ? (
                            <div className="flex items-center gap-2 text-gray-500 italic">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Executing code...
                            </div>
                          ) : runError ? (
                            <div className="text-red-500 whitespace-pre-wrap">{runError}</div>
                          ) : runResults.length > 0 ? (
                            <div className="space-y-3">
                              {runResults.map((result, idx) => (
                                <div key={idx} className={`p-2 rounded border ${result.passed ? 'bg-green-50/50 border-green-100 dark:bg-green-900/10 dark:border-green-900/20' : 'bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-900/20'}`}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-[10px] uppercase">Test Case {idx + 1}</span>
                                    <span className={`text-[10px] font-bold ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
                                      {result.passed ? 'PASSED' : 'FAILED'}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 gap-1">
                                    <div><span className="text-gray-400">Input:</span> {result.input || 'N/A'}</div>
                                    <div><span className="text-gray-400">Expected:</span> {result.expectedOutput || 'N/A'}</div>
                                    <div><span className="text-gray-400">Actual:</span> <span className={result.passed ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>{result.actualOutput || 'N/A'}</span></div>
                                    {result.errorMessage && <div className="text-red-500 mt-1 border-t border-red-100 dark:border-red-900/30 pt-1">{result.errorMessage}</div>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-gray-400 italic">Run your code to see output here.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
