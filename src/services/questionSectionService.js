/**
 * Question Section Service - handles question section management API calls
 */
import adminApiClient from './adminApiService';
import { API_ENDPOINTS } from '../constants/api';
import { getCachedResponse, setCachedResponse } from '../store/middleware/cacheMiddleware';

export const questionSectionService = {
  /**
   * Get question section by question set ID
   * @param {string} questionSetId - Question Set ID
   * @returns {Promise} Question section data
   */
  getQuestionSectionByQuestionSet: async (questionSetId) => {
    const endpoint = API_ENDPOINTS.QUESTION_SECTIONS.GET_BY_QUESTION_SET(questionSetId);
    
    // Check cache first
    const cached = getCachedResponse(endpoint);
    if (cached) {
      return cached;
    }

    const response = await adminApiClient.get(endpoint);
    setCachedResponse(endpoint, response.data);
    return response.data;
  }
};

export default questionSectionService;
