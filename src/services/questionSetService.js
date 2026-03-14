/**
 * Question Set Service - question set by ID (AdminBackend). Used for test entry fetchAllTestData.
 */
import adminApiClient from './adminApiService';
import { API_ENDPOINTS } from '../constants/api';
import { getCachedResponse, setCachedResponse } from '../store/middleware/cacheMiddleware';

export const questionSetService = {
  getQuestionSetById: async (questionSetId) => {
    const endpoint = API_ENDPOINTS.QUESTION_SETS.GET_BY_ID(questionSetId);
    const cached = getCachedResponse(endpoint);
    if (cached) return cached;
    const response = await adminApiClient.get(endpoint);
    setCachedResponse(endpoint, response.data);
    return response.data;
  },
};

export default questionSetService;
