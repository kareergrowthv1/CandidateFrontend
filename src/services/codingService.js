/**
 * Coding Round service
 *
 * AI + Judge0 (Streaming AI backend):
 *   POST /coding/generate-coding-question
 *   POST /coding/run-code
 *
 * Persistence (CandidateBackend — MongoDB):
 *   POST /candidate-coding-responses/upsert
 *   GET  /candidate-coding-responses/candidate/:cId/position/:pId
 *   PUT  /candidate-coding-responses/:id/set/:si/question/:qi/save    → DRAFT
 *   PUT  /candidate-coding-responses/:id/set/:si/question/:qi/final   → SUBMITTED
 *   PUT  /candidate-coding-responses/:id/complete
 */
import { AI_BACKEND_URL, API_BASE_URL } from '../constants/api';

const AI_BASE = `${AI_BACKEND_URL}/coding`;
const DB_BASE = `${API_BASE_URL}/candidate-coding-responses`;

// ────────────────────────────────────────────────────────
// AI helpers
// ────────────────────────────────────────────────────────

export async function generateCodingQuestion({
  programmingLanguage,
  difficultyLevel,
  questionSource = 'Coding Library',
  topicTags = [],
  questionIndex = 0,
}) {
  const res = await fetch(`${AI_BASE}/generate-coding-question`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ programmingLanguage, difficultyLevel, questionSource, topicTags: topicTags.length ? topicTags : undefined, questionIndex }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Failed to generate question (${res.status})`);
  }
  return res.json();
}

export async function runCode({ sourceCode, language, testCases, timeoutSeconds = 10 }) {
  const res = await fetch(`${AI_BASE}/run-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceCode, language, testCases, timeoutSeconds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Code execution failed (${res.status})`);
  }
  return res.json();
}

// ────────────────────────────────────────────────────────
// MongoDB persistence helpers
// ────────────────────────────────────────────────────────

/**
 * Find or create the coding response document for this candidate+position.
 * If new and codingQuestionSets are provided, they are seeded.
 */
export async function upsertCodingResponse({ candidateId, positionId, questionSetId, totalQuestions, codingQuestionSets }) {
  const res = await fetch(`${DB_BASE}/upsert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidateId, positionId, questionSetId, totalQuestions, codingQuestionSets }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Upsert failed (${res.status})`);
  }
  return res.json();
}

/**
 * Load an existing coding response by candidateId + positionId.
 * Returns null if not found (404).
 */
export async function loadCodingResponse(candidateId, positionId) {
  const res = await fetch(`${DB_BASE}/candidate/${candidateId}/position/${positionId}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Load failed (${res.status})`);
  }
  return res.json();
}

/**
 * Save a DRAFT submission for one question.
 * Also persists latest test case run results.
 */
export async function saveDraft({ responseId, setIndex, qIndex, sourceCode, programmingLanguage, testCases, testCasesPassed, executionStatus }) {
  const res = await fetch(`${DB_BASE}/${responseId}/set/${setIndex}/question/${qIndex}/save`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceCode, programmingLanguage, testCases, testCasesPassed, executionStatus: executionStatus || 'IN_PROGRESS' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Save draft failed (${res.status})`);
  }
  return res.json();
}

/**
 * Final submission for one question. status=SUBMITTED, isFinalSubmission=true.
 */
export async function submitQuestion({ responseId, setIndex, qIndex, sourceCode, programmingLanguage, testCases, testCasesPassed }) {
  const res = await fetch(`${DB_BASE}/${responseId}/set/${setIndex}/question/${qIndex}/final`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceCode, programmingLanguage, testCases, testCasesPassed }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Final submission failed (${res.status})`);
  }
  return res.json();
}

/**
 * Mark the whole coding screening as completed.
 */
export async function completeCodingRound(responseId) {
  const res = await fetch(`${DB_BASE}/${responseId}/complete`, { method: 'PUT' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Complete failed (${res.status})`);
  }
  return res.json();
}

/**
 * Save AI-generated question content to MongoDB so the candidate sees the same
 * question on refresh / re-entry.
 * @param {{ responseId: string, setIndex: number, qIndex: number, questionData: object }} opts
 */
export async function saveQuestionContent({ responseId, setIndex, qIndex, questionData }) {
  const res = await fetch(`${DB_BASE}/${responseId}/set/${setIndex}/question/${qIndex}/content`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(questionData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Save question content failed (${res.status})`);
  }
  return res.json();
}
