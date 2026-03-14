/**
 * Uses the single test WebSocket for round questions and answers.
 * No API calls: get_round_questions, get_saved_answers, submit_answer via WebSocket only.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTestWs } from '../context/TestWsContext';

export function useTestRoundData(roundNumber, callbacks = {}) {
  const { testWsRef } = useTestWs() || {};
  const { onNextQuestion, onAllQuestionsAnswered } = callbacks;
  const onNextQuestionRef = useRef(onNextQuestion);
  const onAllQuestionsAnsweredRef = useRef(onAllQuestionsAnswered);
  onNextQuestionRef.current = onNextQuestion;
  onAllQuestionsAnsweredRef.current = onAllQuestionsAnswered;
  const [questions, setQuestions] = useState([]);
  const [savedAnswers, setSavedAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wsReady, setWsReady] = useState(false);
  const pendingRef = useRef({ round_questions: false, saved_answers: false });
  const lastSubmittedAnswerRef = useRef({ questionId: null, answer: '' });

  const sendAnswer = useCallback(
    (questionId, answer) => {
      const ws = testWsRef?.current;
      if (!ws || ws.readyState !== 1) return Promise.reject(new Error('WebSocket not open'));
      const round = String(roundNumber);
      return new Promise((resolve, reject) => {
        const onMsg = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.type === 'answer_saved' && data.question_id === questionId) {
              ws.removeEventListener('message', onMsg);
              console.log('[submit_answer] response: answer_saved', JSON.stringify({ type: 'answer_saved', question_id: data.question_id }, null, 2));
              resolve();
            } else if (data.type === 'error') {
              ws.removeEventListener('message', onMsg);
              reject(new Error(data.message || 'Save failed'));
            }
          } catch (_) {}
        };
        lastSubmittedAnswerRef.current = { questionId, answer: answer ?? '' };
        ws.addEventListener('message', onMsg);
        const payload = {
          type: 'submit_answer',
          question_id: questionId,
          round,
          answer: answer ?? '',
        };
        console.log('[submit_answer] payload:', JSON.stringify(payload, null, 2));
        ws.send(JSON.stringify(payload));
        setTimeout(() => {
          ws.removeEventListener('message', onMsg);
          resolve();
        }, 5000);
      });
    },
    [roundNumber, testWsRef]
  );

  const sendRoundComplete = useCallback(
    (payload) => {
      const ws = testWsRef?.current;
      if (!ws || ws.readyState !== 1) return Promise.reject(new Error('WebSocket not open'));
      return new Promise((resolve) => {
        const onMsg = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.type === 'round_complete_ok') {
              ws.removeEventListener('message', onMsg);
              console.log('[round_complete] response: round_complete_ok');
              resolve();
            }
          } catch (_) {}
        };
        ws.addEventListener('message', onMsg);
        const roundPayload = {
          type: 'round_complete',
          roundNumber: payload.roundNumber,
          roundTimeTaken: payload.roundTimeTaken,
          roundStartTime: payload.roundStartTime,
          roundEndTime: payload.roundEndTime,
        };
        console.log('[round_complete] payload:', JSON.stringify(roundPayload, null, 2));
        ws.send(JSON.stringify(roundPayload));
        setTimeout(() => {
          ws.removeEventListener('message', onMsg);
          resolve();
        }, 5000);
      });
    },
    [testWsRef]
  );

  useEffect(() => {
    const ws = testWsRef?.current;
    if (!ws) {
      setLoading(false);
      setWsReady(false);
      return;
    }
    const roundMatch = (dataRound) =>
      dataRound === roundNumber || String(dataRound) === String(roundNumber);

    const handleMessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'round_questions' && roundMatch(data.round)) {
          const qList = Array.isArray(data.questions) ? data.questions : [];
          setQuestions(qList);
          pendingRef.current.round_questions = false;
          // Round 1 & 2: screening doc returns questions with .answer; derive savedAnswers so UI can show "already answered"
          if (roundNumber === 1 || roundNumber === 2) {
            const derived = qList.map((q, i) => ({
              questionId: String(i),
              answerText: q && (q.answer != null ? q.answer : '') || '',
            }));
            setSavedAnswers(derived);
            pendingRef.current.saved_answers = false;
          }
        } else if (data.type === 'saved_answers' && roundMatch(data.round)) {
          setSavedAnswers(Array.isArray(data.answers) ? data.answers : []);
          pendingRef.current.saved_answers = false;
        } else if (data.type === 'answer_saved' && (roundNumber === 1 || roundNumber === 2)) {
          const { question_id } = data;
          const { answer } = lastSubmittedAnswerRef.current;
          const idx = typeof question_id === 'number' ? question_id : parseInt(String(question_id), 10);
          if (!Number.isNaN(idx) && answer !== undefined) {
            setQuestions((prev) =>
              prev.map((q, i) => (i === idx ? { ...q, answer } : q))
            );
            setSavedAnswers((prev) => {
              const next = [...(prev || [])];
              const found = next.findIndex((a) => String(a?.questionId) === String(question_id));
              if (found >= 0) next[found] = { ...next[found], answerText: answer };
              else next.push({ questionId: String(question_id), answerText: answer });
              return next;
            });
          }
        } else if (data.type === 'next_question' && roundMatch(data.round)) {
          const index = data.question_index ?? (typeof data.question_id === 'number' ? data.question_id : parseInt(String(data.question_id), 10));
          if (!Number.isNaN(index) && index >= 0) {
            const questionText = (data.question ?? '').trim();
            const timeToAnswer = data.timeToAnswer ?? undefined;
            const timeToPrepare = data.timeToPrepare ?? undefined;
            setQuestions((prev) => {
              if (index >= prev.length) {
                const newQ = { question: questionText || '', answer: '' };
                if (timeToAnswer !== undefined) newQ.timeToAnswer = timeToAnswer;
                if (timeToPrepare !== undefined) newQ.timeToPrepare = timeToPrepare;
                return [...prev, newQ];
              }
              if (questionText) {
                return prev.map((q, i) => (
                  i === index
                    ? { ...q, question: questionText,
                        ...(timeToAnswer !== undefined ? { timeToAnswer } : {}),
                        ...(timeToPrepare !== undefined ? { timeToPrepare } : {}) }
                    : q
                ));
              }
              return prev;
            });
            setSavedAnswers((prev) => {
              const next = [...(prev || [])];
              while (next.length <= index) next.push({ questionId: String(next.length), answerText: '' });
              return next;
            });
            // Run callback immediately so UI advances in same batch as state updates
            try {
              onNextQuestionRef.current?.(index);
            } catch (err) {
              console.warn('[useTestRoundData] onNextQuestion callback error:', err);
            }
          }
        } else if (data.type === 'all_questions_answered' && roundMatch(data.round)) {
          setTimeout(() => { onAllQuestionsAnsweredRef.current?.(); }, 0);
        }
        if (!pendingRef.current.round_questions && !pendingRef.current.saved_answers) {
          setLoading(false);
        }
      } catch (_) {}
    };
    let timeoutId;
    const sendRequests = () => {
      setWsReady(true);
      pendingRef.current = { round_questions: true, saved_answers: true };
      setLoading(true);
      ws.send(JSON.stringify({ type: 'get_round_questions', round: roundNumber }));
      // Round 1 & 2: screening doc has answers in round_questions; no separate get_saved_answers
      if (roundNumber !== 1 && roundNumber !== 2) {
        ws.send(JSON.stringify({ type: 'get_saved_answers', round: roundNumber }));
      } else {
        pendingRef.current.saved_answers = false;
      }
      // Round 3 (coding) and Round 4 (aptitude) need AI generation — allow up to 45s before giving up
      // Round 1/2 (screening) are fast DB lookups — 10s is sufficient
      const loadingTimeout = (roundNumber === 3 || roundNumber === 4) ? 45000 : 10000;
      timeoutId = setTimeout(() => {
        if (pendingRef.current.round_questions || pendingRef.current.saved_answers) {
          console.warn(`[useTestRoundData] No round_questions/saved_answers received in ${loadingTimeout / 1000}s. Ensure Streaming AI (port 9000) is running.`);
          pendingRef.current.round_questions = false;
          pendingRef.current.saved_answers = false;
          setQuestions((q) => (q.length ? q : []));
          setSavedAnswers((a) => (a.length ? a : []));
          setLoading(false);
        }
      }, loadingTimeout);
    };
    ws.addEventListener('message', handleMessage);
    if (ws.readyState !== 1) {
      setWsReady(false);
      ws.addEventListener('open', sendRequests);
      return () => {
        ws.removeEventListener('open', sendRequests);
        ws.removeEventListener('message', handleMessage);
        if (timeoutId) clearTimeout(timeoutId);
      };
    }
    sendRequests();
    return () => {
      ws.removeEventListener('message', handleMessage);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [roundNumber, testWsRef]);

  const reportAnswerSavedAndNext = useCallback(
    (questionId, answer, nextQuestionIndex, nextQuestionText, allQuestionsAnswered, nextTimeToAnswer, nextTimeToPrepare) => {
      lastSubmittedAnswerRef.current = { questionId, answer: answer ?? '' };
      setSavedAnswers((prev) => {
        const next = [...(prev || [])];
        const found = next.findIndex((a) => String(a?.questionId) === String(questionId));
        if (found >= 0) next[found] = { ...next[found], answerText: answer ?? '' };
        else next.push({ questionId: String(questionId), answerText: answer ?? '' });
        return next;
      });
      if (allQuestionsAnswered) {
        setTimeout(() => onAllQuestionsAnsweredRef.current?.(), 0);
        return;
      }
      if (nextQuestionIndex != null && nextQuestionIndex >= 0) {
        setQuestions((prev) => {
          if (nextQuestionIndex >= prev.length) {
            const newQ = { question: nextQuestionText || '', answer: '' };
            if (nextTimeToAnswer !== undefined) newQ.timeToAnswer = nextTimeToAnswer;
            if (nextTimeToPrepare !== undefined) newQ.timeToPrepare = nextTimeToPrepare;
            return [...prev, newQ];
          }
          if (nextQuestionText) {
            return prev.map((q, i) => (
              i === nextQuestionIndex
                ? { ...q, question: nextQuestionText,
                    ...(nextTimeToAnswer !== undefined ? { timeToAnswer: nextTimeToAnswer } : {}),
                    ...(nextTimeToPrepare !== undefined ? { timeToPrepare: nextTimeToPrepare } : {}) }
                : q
            ));
          }
          return prev;
        });
        setSavedAnswers((prev) => {
          const next = [...(prev || [])];
          while (next.length <= nextQuestionIndex) next.push({ questionId: String(next.length), answerText: '' });
          return next;
        });
        try {
          onNextQuestionRef.current?.(nextQuestionIndex);
        } catch (err) {
          console.warn('[useTestRoundData] onNextQuestion callback error:', err);
        }
      }
    },
    []
  );

  return { questions, savedAnswers, loading, wsReady, sendAnswer, sendRoundComplete, reportAnswerSavedAndNext };
}
