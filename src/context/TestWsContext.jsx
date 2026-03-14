import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { STREAMING_WS_BASE } from '../constants/api';

const TestWsContext = createContext(null);

export const TestWsProvider = ({ children }) => {
  const testWsRef = useRef(null);
  const [transcript, setTranscript] = useState('');
  const fullTextRef = useRef('');
  const testStartedSentRef = useRef(false);
  // pending promise-based WS requests: key → { resolve, reject, timer }
  const pendingWsRequests = useRef({});

  const onMessage = useCallback((data) => {
    // Resolve any waiting sendWsRequest promise for this message type
    if (data?.type) {
      // Key is either "type_questionIndex" (for indexed ops) or just "type"
      const key = data.questionIndex != null
        ? `${data.type}_${data.questionIndex}`
        : data.type;
      if (pendingWsRequests.current[key]) {
        const { resolve, timer } = pendingWsRequests.current[key];
        clearTimeout(timer);
        delete pendingWsRequests.current[key];
        resolve(data);
        return;
      }
    }
    if (data?.type === 'transcript') {
      if (data.error) {
        const errMsg = ' [Error: ' + data.error + ']';
        queueMicrotask(() => setTranscript((t) => t + errMsg));
        return;
      }
      const text = (data.text || '').trim();
      if (data.is_final && text) {
        const prev = fullTextRef.current;
        const sep = prev ? ' ' : '';
        fullTextRef.current = prev + sep + text;
        queueMicrotask(() => setTranscript(text));
      } else if (text) {
        queueMicrotask(() => setTranscript(text));
      }
    }
  }, []);

  const clearTranscript = useCallback(() => {
    fullTextRef.current = '';
    queueMicrotask(() => setTranscript(''));
  }, []);

  const getFullText = useCallback(() => fullTextRef.current || transcript, [transcript]);

  /** Reconnect test WebSocket after refresh. Resolves when connected and init_ok received. */
  const connectTestWs = useCallback(() => {
    const positionId = sessionStorage.getItem('positionId');
    const candidateId = sessionStorage.getItem('candidateId');
    const questionSetId = sessionStorage.getItem('questionSetId');
    const assessmentSummaryId = sessionStorage.getItem('assessmentSummaryId') || sessionStorage.getItem('assessment_summary_id') || '';
    const currentExamKey = `${positionId || ''}_${candidateId || ''}_${questionSetId || ''}_${assessmentSummaryId}`;
    const ws = testWsRef?.current;
    if (ws && ws.readyState === 1) {
      if ((ws.__examKey || '') === currentExamKey) {
        return Promise.resolve();
      }
      try { ws.close(); } catch (_) { }
      testWsRef.current = null;
    }
    const clientId = sessionStorage.getItem('clientId');
    const tenantId = sessionStorage.getItem('tenantId');
    if (!clientId || !positionId || !candidateId || !STREAMING_WS_BASE) {
      return Promise.reject(new Error('Missing session: complete email verification first'));
    }
    const base = STREAMING_WS_BASE.replace(/\/$/, '');
    const wsUrl = `${base}/ws/test`;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WebSocket connect timeout')), 15000);
      try {
        const testWs = new WebSocket(wsUrl);
        testWs.onopen = () => {
          const isConversational = sessionStorage.getItem('isConversational') === 'true';
          const crossQuestionCountGeneral = parseInt(sessionStorage.getItem('crossQuestionCountGeneral') || '2', 10) || 2;
          const crossQuestionCountPosition = parseInt(sessionStorage.getItem('crossQuestionCountPosition') || '2', 10) || 2;
          testWs.send(JSON.stringify({
            type: 'init',
            client_id: clientId,
            position_id: positionId,
            candidate_id: candidateId,
            question_set_id: questionSetId || '',
            assessment_summary_id: assessmentSummaryId,
            tenant_id: tenantId || undefined,
            is_conversational: isConversational,
            cross_question_count_general: Math.min(4, Math.max(1, crossQuestionCountGeneral)),
            cross_question_count_position: Math.min(4, Math.max(1, crossQuestionCountPosition)),
          }));
        };
        testWs.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            onMessage(data);
            if (data?.type === 'init_ok') {
              clearTimeout(timeout);
              const wsSummaryId = data?.session?.assessment_summary_id || '';
              if (wsSummaryId) {
                sessionStorage.setItem('assessmentSummaryId', String(wsSummaryId));
                sessionStorage.setItem('assessment_summary_id', String(wsSummaryId));
              }
              const summary = data.assessmentSummary;
              const valid = summary != null && typeof summary === 'object' && summary.success !== false && (summary.data != null || summary.round1Assigned != null);
              if (valid) {
                try {
                  localStorage.setItem('assessmentSummary', typeof summary === 'string' ? summary : JSON.stringify(summary));
                } catch (_) { }
              }
              if (data.nextRound != null) sessionStorage.setItem('wsNextRound', String(data.nextRound));
              sessionStorage.setItem('isAssessmentCompleted', data.isAssessmentCompleted ? 'true' : 'false');
              testWs.__examKey = currentExamKey;
              testWsRef.current = testWs;
              if (!data.isAssessmentCompleted && !testStartedSentRef.current) {
                testStartedSentRef.current = true;
                // Removed testEntryService call as it is part of the deleted test flow
              }
              resolve();
            } else if (data?.type === 'error') {
              clearTimeout(timeout);
              reject(new Error(data.message || 'Init failed'));
            }
          } catch (_) { }
        };
        testWs.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('WebSocket error'));
        };
        testWs.onclose = () => {
          clearTimeout(timeout);
          if (testWsRef.current === testWs) testWsRef.current = null;
        };
        // Assign ref only on init_ok so consumers see a fully initialized connection
      } catch (e) {
        clearTimeout(timeout);
        reject(e);
      }
    });
  }, [onMessage]);

  const isTestWsConnected = useCallback(() => {
    const ws = testWsRef?.current;
    return ws && ws.readyState === 1;
  }, []);

  /** Send a raw message over the test WS (fire-and-forget). */
  const sendWsMessage = useCallback((msg) => {
    const ws = testWsRef.current;
    if (!ws || ws.readyState !== 1) throw new Error('WebSocket not connected');
    ws.send(JSON.stringify(msg));
  }, []);

  /**
   * Send a WS message and wait for a specific response type.
   * @param {object} msg - message to send; must have a `type` field
   * @param {object} [opts]
   * @param {string} [opts.responseType] - expected response type (default: msg.type + '_ok')
   * @param {number} [opts.timeout=60000] - timeout in ms
   * @returns {Promise<object>} resolves with the response message data
   */
  const sendWsRequest = useCallback((msg, { responseType, timeout = 60000 } = {}) => {
    const resType = responseType || `${msg.type}_ok`;
    const key = msg.questionIndex != null ? `${resType}_${msg.questionIndex}` : resType;
    return new Promise((resolve, reject) => {
      const ws = testWsRef.current;
      if (!ws || ws.readyState !== 1) {
        reject(new Error('WebSocket not connected'));
        return;
      }
      const timer = setTimeout(() => {
        delete pendingWsRequests.current[key];
        reject(new Error(`WS request timeout: ${key}`));
      }, timeout);
      pendingWsRequests.current[key] = { resolve, reject, timer };
      ws.send(JSON.stringify(msg));
    });
  }, []);

  return (
    <TestWsContext.Provider
      value={{
        testWsRef,
        transcript,
        setTranscript,
        clearTranscript,
        fullTextRef,
        onMessage,
        getFullText,
        connectTestWs,
        isTestWsConnected,
        sendWsMessage,
        sendWsRequest,
      }}
    >
      {children}
    </TestWsContext.Provider>
  );
};

export const useTestWs = () => {
  const context = useContext(TestWsContext);
  return context;
};
