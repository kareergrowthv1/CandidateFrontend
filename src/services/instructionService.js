/**
 * Instruction Service - assessment instructions (AdminBackend). Returns normalized array for UI.
 */
import adminApiClient from './adminApiService';
import { API_ENDPOINTS } from '../constants/api';
import { getCachedResponse, setCachedResponse } from '../store/middleware/cacheMiddleware';

function normalizeInstructionsResponse(body) {
  if (!body) return [];
  const data = body.data ?? body;
  if (data && typeof data === 'object' && data.content != null) {
    return [{ content: data.content, instructionText: data.content }];
  }
  if (Array.isArray(data)) return data;
  if (Array.isArray(body)) return body;
  return [];
}

export const instructionService = {
  getInstructionsByQuestionSet: async (questionSetId) => {
    const endpoint = API_ENDPOINTS.INSTRUCTIONS.GET_BY_QUESTION_SET(questionSetId);
    const cached = getCachedResponse(endpoint);
    if (cached) return normalizeInstructionsResponse(cached);
    const response = await adminApiClient.get(endpoint);
    setCachedResponse(endpoint, response.data);
    return normalizeInstructionsResponse(response.data);
  },
};

export default instructionService;
