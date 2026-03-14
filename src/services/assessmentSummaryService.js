/**
 * Assessment Summary Service - calls CandidateBackend (VITE_API_BASE_URL) at /candidate/assessment-summary.
 * Round timing uses AdminBackend (VITE_ADMIN_API_URL) for direct API – no WebSocket.
 */
import apiClient from './apiService';
import { adminAxiosInstance } from '../config/axiosConfig';
import { API_ENDPOINTS } from '../constants/api';

export const assessmentSummaryService = {
  /**
   * Get assessment summary by position and candidate
   * GET /candidate/assessment-summary?positionId=...&candidateId=... (CandidateBackend)
   */
  getAssessmentSummary: async (positionId, candidateId) => {
    const questionId = sessionStorage.getItem('questionSetId') || '';
    const assessmentSummaryId = sessionStorage.getItem('assessmentSummaryId') || sessionStorage.getItem('assessment_summary_id') || '';
    const qs = new URLSearchParams({
      positionId: String(positionId),
      candidateId: String(candidateId),
    });
    if (questionId) qs.set('questionId', questionId);
    if (assessmentSummaryId) qs.set('assessmentSummaryId', assessmentSummaryId);
    const url = `${API_ENDPOINTS.ASSESSMENT_SUMMARIES.GET}?${qs.toString()}`;
    const tenantId = sessionStorage.getItem('tenantId');
    const headers = tenantId ? { 'X-Tenant-Id': tenantId } : {};
    const response = await apiClient.get(url, { headers });
    return response.data;
  },

  /**
   * Helper function to determine next round based on assessment summary
   * @param {Object} assessmentSummary - Assessment summary data
   * @returns {string|null} Next round name or null if all complete
   */
  getNextAssignedRound: (assessmentSummary) => {
    const data = assessmentSummary?.data || assessmentSummary;
    
    // Check each round in order to find the next assigned but incomplete round
    // round1 = general, round2 = position, round3 = coding, round4 = aptitude
    if (data.round1Assigned && !data.round1Completed) {
      return 'round1';
    }
    if (data.round2Assigned && !data.round2Completed) {
      return 'round2';
    }
    if (data.round3Assigned && !data.round3Completed) {
      return 'round3';
    }
    if (data.round4Assigned && !data.round4Completed) {
      return 'round4';
    }
    
    // If all assigned rounds are completed
    return null;
  },

  /**
   * Helper function to get assigned rounds list
   * @param {Object} assessmentSummary - Assessment summary data
   * @returns {Array<string>} List of assigned round names
   */
  getAssignedRounds: (assessmentSummary) => {
    const data = assessmentSummary?.data || assessmentSummary;
    const assignedRounds = [];
    
    if (data.round1Assigned) assignedRounds.push('round1');
    if (data.round2Assigned) assignedRounds.push('round2');
    if (data.round3Assigned) assignedRounds.push('round3');
    if (data.round4Assigned) assignedRounds.push('round4');
    
    return assignedRounds;
  },

  /**
   * Update assessment summary (CandidateBackend). Uses PATCH /candidate/assessment-summary.
   * Payload: { candidateId, positionId, tenantId?, assessmentStartTime?, round1StartTime?, round1EndTime?, round1TimeTaken?, round1Completed?, ... }
   */
  updateAssessmentSummary: async (payload) => {
    const positionId = payload.positionId || sessionStorage.getItem('positionId');
    const candidateId = payload.candidateId || sessionStorage.getItem('candidateId');
    const questionId = payload.questionId || payload.questionSetId || sessionStorage.getItem('questionSetId') || '';
    const assessmentSummaryId = payload.assessmentSummaryId || sessionStorage.getItem('assessmentSummaryId') || sessionStorage.getItem('assessment_summary_id') || '';
    if (!positionId || !candidateId) throw new Error('positionId and candidateId required');
    const tenantId = payload.tenantId || sessionStorage.getItem('tenantId');
    const body = { candidateId, positionId, ...payload };
    if (questionId) body.questionId = questionId;
    if (assessmentSummaryId) body.assessmentSummaryId = assessmentSummaryId;
    if (tenantId) body.tenantId = tenantId;
    const headers = tenantId ? { 'X-Tenant-Id': tenantId } : {};
    const response = await apiClient.patch(API_ENDPOINTS.ASSESSMENT_SUMMARIES.PATCH, body, { headers });
    if (response.data?.data) {
      const summary = response.data.data;
      const json = typeof summary === 'string' ? summary : JSON.stringify(summary);
      localStorage.setItem('assessmentSummary', json);
      sessionStorage.setItem('assessmentSummary', json);
    }
    return response.data;
  },

  /**
   * Update round timing (AdminBackend). Direct API – no WebSocket.
   * PUT /candidates/assessment-summaries/round-timing
   * Payload: { positionId, candidateId, roundNumber, roundCompleted, roundTimeTaken, roundStartTime, roundEndTime }
   */
  updateRoundTiming: async (payload) => {
    const positionId = payload.positionId || sessionStorage.getItem('positionId');
    const candidateId = payload.candidateId || sessionStorage.getItem('candidateId');
    const assessmentSummaryId = payload.assessmentSummaryId
      || sessionStorage.getItem('assessmentSummaryId')
      || sessionStorage.getItem('assessment_summary_id')
      || '';
    const questionSetId = payload.questionSetId || sessionStorage.getItem('questionSetId') || '';
    if (!positionId || !candidateId || payload.roundNumber == null) {
      throw new Error('positionId, candidateId, and roundNumber are required');
    }
    const body = {
      positionId,
      candidateId,
      roundNumber: payload.roundNumber,
      roundCompleted: payload.roundCompleted ?? true,
      roundTimeTaken: payload.roundTimeTaken ?? '',
      roundStartTime: payload.roundStartTime ?? '',
      roundEndTime: payload.roundEndTime ?? '',
    };
    if (assessmentSummaryId) body.assessmentSummaryId = assessmentSummaryId;
    if (questionSetId) body.questionSetId = questionSetId;
    const response = await adminAxiosInstance.put(API_ENDPOINTS.ROUND_TIMING, body);
    if (response.data?.data) {
      const json = typeof response.data.data === 'string' ? response.data.data : JSON.stringify(response.data.data);
      localStorage.setItem('assessmentSummary', json);
      sessionStorage.setItem('assessmentSummary', json);
    }
    return response.data;
  },

  // NOTE: createAssessmentSummary (POST) is intentionally removed from CandidateTest.
  // The assessment summary is created ONLY by AdminBackend when the admin adds a candidate for the exam.
  // CandidateTest only reads (GET) and updates (PATCH) the existing admin-created record.
};

export default assessmentSummaryService;
