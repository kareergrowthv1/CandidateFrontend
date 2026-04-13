import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { authAxiosInstance } from '../../../config/axiosConfig';

export default function MicrosoftCallback() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const { showToast } = useToast();
    const hasHandled = useRef(false);

    useEffect(() => {
        if (hasHandled.current) return;

        const handleMicrosoftLogin = async () => {
            console.log('[MicrosoftCallback] Search:', window.location.search);
            const params = new URLSearchParams(window.location.search);
            const status = params.get('status');
            
            // If no status, it might be a middle re-render, don't show error yet
            if (!status) return;

            hasHandled.current = true;
            
            const urlAccessToken = params.get('accessToken');
            const urlRefreshToken = params.get('refreshToken');
            const urlXsrfToken = params.get('xsrfToken');

            if (status === 'success') {
                try {
                    // 1. Save tokens to localStorage
                    if (urlAccessToken) {
                        localStorage.setItem('accessToken', urlAccessToken);
                        if (urlRefreshToken) localStorage.setItem('refreshToken', urlRefreshToken);
                        if (urlXsrfToken) localStorage.setItem('xsrfToken', urlXsrfToken);
                    }

                    // 2. Fetch profile to confirm session
                    const { data } = await authAxiosInstance.get('/auth-session/me');
                    
                    if (data.success && data.data.user) {
                        login(data.data.user);
                        localStorage.setItem('user', JSON.stringify(data.data.user));
                        showToast('Successfully logged in with Microsoft!', 'success');
                        navigate('/dashboard');
                    } else {
                        throw new Error('Failed to retrieve user profile');
                    }
                } catch (err) {
                    console.error('Microsoft sign-in verification failed:', err);
                    showToast('Failed to complete sign-in. Please try again.', 'error');
                    navigate('/login');
                }
            } else {
                const message = params.get('message') || 'Microsoft login was cancelled or failed.';
                showToast(message, 'error');
                navigate('/login');
            }
        };

        handleMicrosoftLogin();
    }, [location, login, navigate, showToast]);

    return (
        <div className="flex h-screen w-screen items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                <p className="text-sm font-bold text-slate-900 uppercase tracking-widest animate-pulse">
                    Completing Microsoft Sign-In...
                </p>
                <p className="text-xs text-slate-500">Connecting to secure session...</p>
            </div>
        </div>
    );
}
