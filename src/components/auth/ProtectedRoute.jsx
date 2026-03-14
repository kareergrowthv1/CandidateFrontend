import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const getAuthItem = (key) => (typeof window !== 'undefined' ? (localStorage.getItem(key) || sessionStorage.getItem(key)) : null);

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, login } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) return;
    const token = getAuthItem('accessToken');
    if (token) {
      const raw = getAuthItem('user');
      try {
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed) login(parsed);
        else login({ id: '', email: '', username: 'Candidate' });
      } catch {
        login({ id: '', email: '', username: 'Candidate' });
      }
    }
  }, [isAuthenticated, login]);

  const hasToken = getAuthItem('accessToken');

  if (!hasToken && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
