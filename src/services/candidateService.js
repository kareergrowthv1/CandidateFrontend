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
 * Fetch internal job listings from superadmin_db
 * @param {object} params - { page, limit, search, location }
 */
export const getInternalJobs = async (params = {}) => {
    const { data } = await axiosInstance.get('/candidates/internaljobs', { params });
    if (!data?.success) throw new Error(data?.message || 'Failed to fetch jobs');
    return data.data; // { items, pagination }
};
