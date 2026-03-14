import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

// Apply theme to <html> immediately (synchronous, runs at module load)
function applyTheme(dark) {
    if (dark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

export function ThemeProvider({ children }) {
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const dark = saved ? saved === 'dark' : prefersDark;
        // Apply immediately during initialization (synchronous)
        applyTheme(dark);
        return dark;
    });

    const toggleTheme = () => {
        setIsDark(prev => {
            const next = !prev;
            // Apply immediately on toggle (synchronous, before re-render)
            applyTheme(next);
            localStorage.setItem('theme', next ? 'dark' : 'light');
            return next;
        });
    };

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
    return ctx;
}
