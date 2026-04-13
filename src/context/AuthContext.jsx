import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAxiosInstance } from '../config/axiosConfig';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem('user');
        if (!stored) return null;
        try { return JSON.parse(stored); } catch { return null; }
    });
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return !!localStorage.getItem('accessToken') || !!localStorage.getItem('user');
    });
    const [registrationPaid, setRegistrationPaid] = useState(false);
    const [loading, setLoading] = useState(true);

    console.log('[AuthContext] Initial/Current State:', { isAuthenticated, loading, user: !!user });

    useEffect(() => {
        const checkAuth = async () => {
            // If already have user from localStorage, we can start with loading=false if we trust it,
            // but for security we still want to verify.
            if (user) {
                setLoading(false);
            }
            try {
                const { data } = await authAxiosInstance.get('/auth-session/me');
                if (data.success && data.data.user) {
                    const rawUser = data.data.user;
                    const mappedUser = {
                        ...rawUser,
                        id: rawUser.id || rawUser.userId || rawUser.candidate_id || ''
                    };
                    setIsAuthenticated(true);
                    setUser(mappedUser);
                    localStorage.setItem('user', JSON.stringify(mappedUser));
                }
            } catch (err) {
                console.log('Not logged in (rehydration check)');
            } finally {
                setLoading(false);
            }
        };
        checkAuth();
    }, []);

    const login = (userData) => {
        const mappedUser = {
            ...userData,
            id: userData.id || userData.userId || userData.candidate_id || ''
        };
        setIsAuthenticated(true);
        setUser(mappedUser);
        if (mappedUser && 'registrationPaid' in mappedUser) {
            setRegistrationPaid(!!mappedUser.registrationPaid);
        }
    };

    const logout = () => {
        setIsAuthenticated(false);
        setUser(null);
        setRegistrationPaid(false);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, registrationPaid, setRegistrationPaid, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
