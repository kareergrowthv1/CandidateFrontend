/**
 * Error handling utilities for API errors
 */

// Error action types
export const API_ERROR = 'api/error';
export const AUTH_ERROR = 'auth/error';

/**
 * Handle API errors
 * @param {Error} error - Error object
 * @param {Function} showToast - Function to show toast notification
 */
export const handleApiError = (error, showToast) => {
  console.error('API Error:', error);
  
  // Handle different error types
  if (error.response?.status === 401 || error.response?.status === 403) {
    console.log('Unauthorized error - should redirect to email verification');
    // Clear session and redirect
    sessionStorage.clear();
    if (showToast) {
      showToast('Session expired. Please verify your email again.', 'error');
    }
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    return { type: AUTH_ERROR, shouldRedirect: true };
  }
  
  // Trigger toast notification if available
  if (showToast) {
    const errorMessage = error.response?.data?.message || 
                       error.response?.data?.error || 
                       error.message || 
                       'An error occurred';
    showToast(errorMessage, 'error');
  }
  
  return { type: API_ERROR, error };
};

/**
 * Handle authentication errors
 * @param {Error} error - Error object
 * @param {Function} showToast - Function to show toast notification
 */
export const handleAuthError = (error, showToast) => {
  console.error('Auth Error:', error);
  
  if (showToast) {
    const errorMessage = error.response?.data?.error || 
                       error.message || 
                       'Authentication error';
    showToast(errorMessage, 'error');
  }
  
  return { type: AUTH_ERROR, error };
};

export default {
  handleApiError,
  handleAuthError
};
