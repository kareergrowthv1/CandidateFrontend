/**
 * API Constants – all base URLs from .env only (import.meta.env)
 */
const e = import.meta.env;

const requireEnv = (key) => {
  const value = String(e[key] || '').trim();
  if (!value) {
    throw new Error(`${key} is required in .env`);
  }
  return value.replace(/\/$/, '');
};

export const AUTH_API_BASE_URL = requireEnv('VITE_AUTH_API_URL');
export const API_BASE_URL = requireEnv('VITE_API_BASE_URL');
export const ADMIN_API_BASE_URL = requireEnv('VITE_ADMIN_API_URL');
export const AI_BACKEND_URL = requireEnv('VITE_AI_BACKEND_URL');
export const STREAMING_WS_BASE = AI_BACKEND_URL.replace(/^http/, 'ws');
export const AI_WS_URL = requireEnv('VITE_AI_WS_URL');
export const CANDIDATE_DEFAULT_ORGANIZATION_ID = String(e.VITE_CANDIDATE_DEFAULT_ORGANIZATION_ID || '').trim();

export const API_ENDPOINTS = {
  // AdminBackend (VITE_ADMIN_API_URL) – verify, assessment-summaries, round-timing
  ROUND_TIMING: '/candidates/assessment-summaries/round-timing',
  PRIVATE_LINKS: {
    VERIFY: '/private-links/verify/by/email-and-code',
    UPDATE_STATUS: '/private-links/update-interview-status',
    SET_TEST_STARTED: '/private-links/set-test-started',
  },
  // CandidateBackend (VITE_API_BASE_URL) – assessment summary; send tenantId in body or X-Tenant-Id header
  ASSESSMENT_SUMMARIES: {
    GET: '/candidate/assessment-summary',
    CREATE: '/candidate/assessment-summary',
    PATCH: '/candidate/assessment-summary',
  },
  // CandidateBackend (VITE_API_BASE_URL) public – save/load Q&A
  PUBLIC_QUESTION_ANSWERS: {
    GET: '/public/question-answers',
    POST: '/public/question-answers',
  },
  // CandidateBackend – coding practice from MongoDB (Practice section)
  CODING_PRACTICE: '/coding-practice',
  // CandidateBackend – run code via Judge0 (Practice section)
  RUN_CODE: '/run-code',
  
  // AdminBackend endpoints (mounted at /admins)
  POSITIONS: {
    GET_BY_ID: (id) => `/admins/positions/${id}`,
  },
  QUESTION_SETS: {
    GET_BY_ID: (id) => `/admins/question-sets/${id}`,
  },
  QUESTION_SECTIONS: {
    GET_BY_QUESTION_SET: (questionSetId) => `/admins/question-sections/question-set/${questionSetId}`,
  },
  INSTRUCTIONS: {
    GET_BY_QUESTION_SET: (questionSetId) => `/admins/assessment-instructions/question-set/${questionSetId}`,
  },
  // Streaming AI (VITE_AI_BACKEND_URL) – submit answer and get next question (round 1 & 2)
  SUBMIT_ANSWER_AND_GET_NEXT: '/api/submit-answer-and-get-next',

  // CandidateBackend – update candidate status in admin's Candidates page
  // PUT /candidate-status/position/:positionId/candidate/:candidateId
  // Body: { status }  Header: X-Tenant-Id
  CANDIDATE_STATUS: {
    UPDATE: (positionId, candidateId) =>
      `/candidate-status/position/${positionId}/candidate/${candidateId}`,
  },
};
