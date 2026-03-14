/**
 * Position Service - handles position management API calls
 */
import adminApiClient from './adminApiService';
import { API_ENDPOINTS } from '../constants/api';
import { getCachedResponse, setCachedResponse } from '../store/middleware/cacheMiddleware';

export const positionService = {
  /**
   * Get position by ID
   * @param {string} positionId - Position ID
   * @returns {Promise} Position data
   */
  getPositionById: async (positionId) => {
    const endpoint = API_ENDPOINTS.POSITIONS.GET_BY_ID(positionId);
    
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

export default positionService;
