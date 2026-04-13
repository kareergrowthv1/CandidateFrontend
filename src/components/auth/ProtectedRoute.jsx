import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Loader from '../ui/Loader';

const getAuthItem = (key) => (typeof window !== 'undefined' ? (localStorage.getItem(key) || sessionStorage.getItem(key)) : null);

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, user, registrationPaid, setRegistrationPaid, loading: authLoading } = useAuth();
  const location = useLocation();
  const [isCheckingPayment, setIsCheckingPayment] = useState(true);

  console.log('[ProtectedRoute] Rendering', { path: location.pathname, isAuthenticated, authLoading, user: !!user });

  // Fetch/Verify payment status if authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setIsCheckingPayment(false);
      return;
    }

    const checkPaymentStatus = async () => {
      try {
        if (user && user.id) {
          const { axiosInstance } = await import('../../config/axiosConfig');
          const { data } = await axiosInstance.get(`/candidates/profile/${user.id}`);
          if (data?.success && data.data) {
            setRegistrationPaid(!!data.data.registrationPaid);
          }
        }
      } catch (err) {
        console.error('Failed to verify payment status:', err);
      } finally {
        setIsCheckingPayment(false);
      }
    };

    checkPaymentStatus();
  }, [isAuthenticated, setRegistrationPaid]);

  // 1. Show loader while AuthContext is rehydrating session from cookies
  if (authLoading) {
      return <Loader />;
  }

  // 2. If not authenticated after loading, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Show loader while checking payment/plan status
  if (isCheckingPayment) {
      return <Loader />;
  }

  // 4. Redirect to subscription if not paid (and not already on subscription page)
  if (!registrationPaid && location.pathname !== '/subscription') {
    return <Navigate to="/subscription" replace />;
  }

  // 5. If already paid and trying to access subscription, redirect to dashboard
  if (registrationPaid && location.pathname === '/subscription') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
