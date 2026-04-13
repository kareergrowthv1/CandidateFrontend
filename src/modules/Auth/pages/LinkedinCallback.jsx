import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { authAxiosInstance } from '../../../config/axiosConfig';

export default function LinkedinCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { showToast } = useToast();
  const hasHandled = useRef(false);

  useEffect(() => {
    if (hasHandled.current) return;

    const handleLinkedinLogin = async () => {
      const params = new URLSearchParams(window.location.search);
      const status = params.get('status');

      if (!status) return;

      hasHandled.current = true;

      const urlAccessToken = params.get('accessToken');
      const urlRefreshToken = params.get('refreshToken');
      const urlXsrfToken = params.get('xsrfToken');

      if (status === 'success') {
        try {
          if (urlAccessToken) {
            localStorage.setItem('accessToken', urlAccessToken);
            if (urlRefreshToken) localStorage.setItem('refreshToken', urlRefreshToken);
            if (urlXsrfToken) localStorage.setItem('xsrfToken', urlXsrfToken);
          }

          const { data } = await authAxiosInstance.get('/auth-session/me');

          if (data.success && data.data.user) {
            login(data.data.user);
            localStorage.setItem('user', JSON.stringify(data.data.user));
            showToast('Successfully logged in with LinkedIn!', 'success');
            navigate('/dashboard');
          } else {
            throw new Error('Failed to retrieve user profile');
          }
        } catch (err) {
          console.error('LinkedIn sign-in verification failed:', err);
          showToast('Failed to complete sign-in. Please try again.', 'error');
          navigate('/login');
        }
      } else {
        const message = params.get('message') || 'LinkedIn login failed.';
        showToast(message, 'error');
        navigate('/login');
      }
    };

    handleLinkedinLogin();
  }, [location, login, navigate, showToast]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#0077b5] border-t-transparent"></div>
        <p className="text-sm font-bold text-slate-900 uppercase tracking-widest animate-pulse">
          Completing LinkedIn Sign-In...
        </p>
        <p className="text-xs text-slate-500">Establishing session...</p>
      </div>
    </div>
  );
}
