/**
 * Coding practice: load topics + counts first, then questions per topic on demand.
 */
import { axiosInstance } from '../config/axiosConfig';
import { API_ENDPOINTS } from '../constants/api';

/**
 * GET /coding-practice — topics with question counts only (no question bodies).
 * @returns {Promise<{ topics: Array<{ id, name, description, questionCount }> }>}
 */
export async function getCodingPracticeTopics() {
  const { data } = await axiosInstance.get(API_ENDPOINTS.CODING_PRACTICE);
  if (!data?.success || !data?.data) {
    throw new Error(data?.message || 'Failed to load coding practice');
  }
  return data.data;
}

/**
 * GET /coding-practice/categories — grouped topics with question counts.
 * @returns {Promise<{ categories: Array<{ id, name, description, topics: Array<{ id, name, description, questionCount }> }> }>}
 */
export async function getCodingPracticeCategories() {
  const { data } = await axiosInstance.get(`${API_ENDPOINTS.CODING_PRACTICE}/categories`);
  if (!data?.success || !data?.data) {
    throw new Error(data?.message || 'Failed to load coding categories');
  }
  return data.data;
}

/**
 * GET /coding-practice/:topicId — questions for one topic. Call when user clicks a section card.
 * @returns {Promise<{ topic: { id, name, description, questionCount }, questions: Array }>}
 */
export async function getCodingPracticeQuestionsByTopic(topicId) {
  const { data } = await axiosInstance.get(`${API_ENDPOINTS.CODING_PRACTICE}/${encodeURIComponent(topicId)}`);
  if (!data?.success || !data?.data) {
    throw new Error(data?.message || 'Failed to load topic questions');
  }
  return data.data;
}

/**
 * POST /run-code — run code via Judge0 (CandidateBackend). For Practice section.
 * Sends test case input values from DB; backend extracts args and runs each test dynamically.
 * @param {{ sourceCode: string, language: string, testCases: Array<{ input: string, expectedOutput: string }>, timeoutSeconds?: number, functionName?: string, functionSignature?: string, boilerplateByLanguage?: { javascript?: string, java?: string, python?: string } }} opts
 * @returns {Promise<{ results: Array }>}
 */
export async function runPracticeCode({
  sourceCode,
  language,
  testCases,
  timeoutSeconds = 10,
  functionName,
  functionSignature,
  boilerplateByLanguage,
  rawCode,
}) {
  const { data } = await axiosInstance.post(API_ENDPOINTS.RUN_CODE, {
    sourceCode,
    language: (language || 'javascript').toLowerCase(),
    rawCode,
    testCases: (testCases || []).map((tc, i) => ({
      testCaseId: tc.testCaseId || `tc-${i}`,
      input: tc.input ?? '',
      expectedOutput: tc.expectedOutput ?? tc.output ?? '',
    })),
    timeoutSeconds,
    functionName: functionName || undefined,
    functionSignature: functionSignature || undefined,
    boilerplateByLanguage: boilerplateByLanguage || undefined,
  });
  if (!data?.success) {
    throw new Error(data?.message || 'Code execution failed');
  }
  return data.data;
}

/**
 * GET /coding-practice/response — load saved response for one question (code, language, starCount, runResults).
 * @returns {Promise<{ code, language, starCount, runResults } | null>}
 */
export async function getPracticeResponse(candidateId, questionId) {
  if (!candidateId || !questionId) return null;
  const { data } = await axiosInstance.get(`${API_ENDPOINTS.CODING_PRACTICE}/response`, {
    params: { candidateId, questionId },
  });
  if (!data?.success) throw new Error(data?.message || 'Failed to load response');
  return data.data ?? null;
}

/**
 * POST /coding-practice/response — create new (first time). Fails if record already exists.
 * @param {{ candidateId: string, questionId: string, topicId: string, code: string, language: string, starCount?: number, runResults?: Array }} payload
 */
export async function savePracticeResponse(payload) {
  const { data } = await axiosInstance.post(`${API_ENDPOINTS.CODING_PRACTICE}/response`, payload);
  if (!data?.success) throw new Error(data?.message || 'Failed to save response');
  return data.data;
}

/**
 * PUT /coding-practice/response — update existing (code, response, test case results, star). Fails if no record.
 * @param {{ candidateId: string, questionId: string, topicId: string, code: string, language: string, starCount?: number, runResults?: Array }} payload
 */
export async function updatePracticeResponse(payload) {
  const { data } = await axiosInstance.put(`${API_ENDPOINTS.CODING_PRACTICE}/response`, payload);
  if (!data?.success) throw new Error(data?.message || 'Failed to update response');
  return data.data;
}

/**
 * GET /coding-practice/responses/stats — lightweight star summary for stats cards (byTopic, byQuestion). Reduces DB load.
 * @returns {Promise<{ byQuestion: Record<string, number>, byTopic: Record<string, { attempted: number, totalStars: number } }>}
 */
export async function getPracticeResponseStats(candidateId) {
  if (!candidateId) return { byQuestion: {}, byTopic: {} };
  const { data } = await axiosInstance.get(`${API_ENDPOINTS.CODING_PRACTICE}/responses/stats`, {
    params: { candidateId },
  });
  if (!data?.success) throw new Error(data?.message || 'Failed to load stats');
  return data.data ?? { byQuestion: {}, byTopic: {} };
}
