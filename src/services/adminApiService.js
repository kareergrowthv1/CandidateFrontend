/**
 * Admin API Service using configured admin axios instance
 */
import { adminAxiosInstance } from '../config/axiosConfig';

// Export the configured admin axios instance
const adminApiClient = adminAxiosInstance;

export default adminApiClient;
