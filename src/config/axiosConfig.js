/**
 * CandidateFrontend: login + test flow only.
 * authAxiosInstance = Auth API (login, OTP, register). axiosInstance = Candidate backend (test). adminAxiosInstance = Admin (instructions, positions).
 */
import axios from 'axios';
import { logRequest, logResponse, logError } from '../store/middleware/loggerMiddleware';
import {
  AUTH_API_BASE_URL,
  API_BASE_URL,
  ADMIN_API_BASE_URL,
} from '../constants/api';

// Candidate backend – test flow (status, submit, coding, etc.)
export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 100000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth API – login, OTP, register, refresh (SuperadminBackend)
// Tokens may be in localStorage (remember me) or sessionStorage (session only)
const getAuthItem = (key) => localStorage.getItem(key) || sessionStorage.getItem(key);
const setAuthItems = (items) => {
  Object.entries(items).forEach(([key, value]) => {
    if (value != null) {
      localStorage.setItem(key, value);
      sessionStorage.setItem(key, value);
    }
  });
};
const clearAuthItems = () => {
  ['accessToken', 'refreshToken', 'xsrfToken'].forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

export const authAxiosInstance = axios.create({
  baseURL: AUTH_API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

authAxiosInstance.interceptors.request.use(
  (config) => {
    const token = getAuthItem('accessToken');
    const xsrf = getAuthItem('xsrfToken');
    if (token && token !== 'null' && token !== 'undefined') config.headers.Authorization = `Bearer ${token}`;
    if (xsrf) config.headers['X-XSRF-Token'] = xsrf;
    return config;
  },
  (e) => Promise.reject(e)
);

authAxiosInstance.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    const hadToken = original.headers?.Authorization;
    if (err.response?.status === 401 && hadToken && !original._retry) {
      original._retry = true;
      const xsrf = getAuthItem('xsrfToken');
      const refreshToken = getAuthItem('refreshToken');
      try {
        const r = await axios.post(
          `${AUTH_API_BASE_URL}/auth-session/refresh`,
          refreshToken ? { refreshToken } : {},
          { withCredentials: true, headers: { 'X-XSRF-Token': xsrf || '' }, timeout: 10000 }
        );
        const data = r.data?.data;
        const accessToken = data?.accessToken;
        if (accessToken) {
          setAuthItems({
            accessToken,
            refreshToken: data?.refreshToken ?? getAuthItem('refreshToken'),
            xsrfToken: data?.xsrfToken ?? getAuthItem('xsrfToken'),
          });
          original.headers.Authorization = `Bearer ${accessToken}`;
          return authAxiosInstance(original);
        }
      } catch (_) {
        clearAuthItems();
        window.location.href = '/login';
        return Promise.reject(err);
      }
    }
    if (err.response?.status === 401 && hadToken) {
      clearAuthItems();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Admin backend – test flow only (instructions, positions, assessment summary)
export const adminAxiosInstance = axios.create({
  baseURL: ADMIN_API_BASE_URL,
  timeout: 100000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for CandidateBackend
axiosInstance.interceptors.request.use(
  (config) => {
    if (!config._suppressLogging) {
      logRequest(config);
    }

    // Add client ID header if available
    const clientId = sessionStorage.getItem('clientId');
    if (clientId) {
      config.headers['X-User-Cl'] = clientId;
    }

    // Add Authorization header
    const token = getAuthItem('accessToken');
    if (token && token !== 'null' && token !== 'undefined') {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add Tenant ID header
    const tenantId = sessionStorage.getItem('tenantId') || clientId;
    if (tenantId) {
      config.headers['X-Tenant-Id'] = tenantId;
    }

    return config;
  },
  (error) => {
    if (!error.config?._suppressLogging) {
      logError(error);
    }
    return Promise.reject(error);
  }
);

// Response interceptor for CandidateBackend
axiosInstance.interceptors.response.use(
  (response) => {
    if (!response.config?._suppressLogging) {
      logResponse(response);
    }
    return response;
  },
  async (error) => {
    if (!error.config?._suppressLogging) {
      logError(error);
    }

    // Handle 401 errors: clear session and redirect to login
    if (error.response && error.response.status === 401) {
      sessionStorage.clear();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Request interceptor for AdminBackend: use tenant DB name from verify (tenantId). Middleware reads x-user-cl first.
adminAxiosInstance.interceptors.request.use(
  (config) => {
    if (!config._suppressLogging) {
      logRequest(config);
    }
    const tenantDb = sessionStorage.getItem('tenantId') || sessionStorage.getItem('clientId');
    if (tenantDb) {
      config.headers['X-Tenant-Id'] = tenantDb;
      config.headers['X-User-Cl'] = tenantDb;
    }
    return config;
  },
  (error) => {
    if (!error.config?._suppressLogging) {
      logError(error);
    }
    return Promise.reject(error);
  }
);

// Response interceptor for AdminBackend
adminAxiosInstance.interceptors.response.use(
  (response) => {
    if (!response.config?._suppressLogging) {
      logResponse(response);
    }
    return response;
  },
  (error) => {
    if (!error.config?._suppressLogging) {
      logError(error);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
