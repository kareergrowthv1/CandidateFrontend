/**
 * Candidate Service - handles candidate-related API calls
 */
import { axiosInstance } from '../config/axiosConfig';

export const getCandidateProfile = async (candidateId) => {
    if (!candidateId) return null;
    const { data } = await axiosInstance.get(`/candidates/profile/${candidateId}`);
    if (!data?.success) throw new Error(data?.message || 'Failed to fetch profile');
    return data.data;
};

/**
 * Fetch all dashboard stats + top 8 latest jobs in one call.
 * @returns {{ stats: { totalJobs, appliedJobs, solvedCount, totalStars, practiceCount }, latestJobs: [] }}
 */
export const getDashboardStats = async (candidateId) => {
    if (!candidateId) return { stats: {}, latestJobs: [] };
    const { data } = await axiosInstance.get(`/candidates/dashboard-stats/${candidateId}`);
    if (!data?.success) throw new Error(data?.message || 'Failed to fetch dashboard stats');
    return data.data;
};

/**
 * Fetch unified dashboard activity feed.
 */
export const getDashboardActivity = async (candidateId) => {
    if (!candidateId) return [];
    const { data } = await axiosInstance.get(`/candidates/dashboard-activity/${candidateId}`);
    if (!data?.success) throw new Error(data?.message || 'Failed to fetch dashboard activity');
    return data.data;
};

/**
 * Fetch performance statistics based on latest mock sessions.
 */
export const getPerformanceStats = async (candidateId) => {
    if (!candidateId) return null;
    const { data } = await axiosInstance.get(`/candidates/performance-stats/${candidateId}`);
    if (!data?.success) throw new Error(data?.message || 'Failed to fetch performance stats');
    return data.data;
};

export const getPerformanceHistory = async (candidateId, params = {}) => {
    if (!candidateId) return [];
    const { data } = await axiosInstance.get(`/candidates/performance-history/${candidateId}`, { params });
    if (!data?.success) throw new Error(data?.message || 'Failed to fetch performance history');
    return data.data;
};

export const getCodingAnalytics = async (candidateId, params = {}) => {
    if (!candidateId) return [];
    const { data } = await axiosInstance.get(`/candidates/coding-analytics/${candidateId}`, { params });
    if (!data?.success) throw new Error(data?.message || 'Failed to fetch coding analytics');
    return data.data;
};

export const saveCodingStats = async (payload) => {
    const { data } = await axiosInstance.post('/candidates/coding-stats', payload);
    if (!data?.success) throw new Error(data?.message || 'Failed to save coding stats');
    return data.data;
};

/**
 * Fetch internal job listings from superadmin_db
 * @param {object} params - { page, limit, search, location }
 */
export const getInternalJobs = async (params = {}) => {
    const { data } = await axiosInstance.get('/candidates/internaljobs', { params });
    if (!data?.success) throw new Error(data?.message || 'Failed to fetch jobs');
    return data.data; // { items, pagination }
};
/**
 * AI-powered Fake Offer Detection
 * @param {FormData} formData - Contains offerLetter, companyName, website, address, ctc
 */
export const verifyOfferLetter = async (formData) => {
    const { data } = await axiosInstance.post('/candidates/fake-offer/verify', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    if (!data?.success) throw new Error(data?.message || 'Verification failed');
    return data.data;
};
/**
 * Fetch latest 5 offer verification results for the candidate.
 */
export const getOfferVerificationHistory = async () => {
    const { data } = await axiosInstance.get('/candidates/fake-offer/history');
    if (!data?.success) throw new Error(data?.message || 'Failed to fetch history');
    return data.data;
};
