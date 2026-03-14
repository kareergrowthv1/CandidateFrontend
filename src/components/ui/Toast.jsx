import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

const Toast = ({ message, type = 'info', onClose, duration = 3000 }) => {
    useEffect(() => {
        if (duration) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const icons = {
        success: <CheckCircle className="w-5 h-5 text-green-500" />,
        error: <AlertCircle className="w-5 h-5 text-red-500" />,
        info: <Info className="w-5 h-5 text-blue-500" />,
        warning: <AlertCircle className="w-5 h-5 text-yellow-500" />,
        alert: <AlertCircle className="w-5 h-5 text-red-600" />,
    };

    const styles = {
        success: 'border-green-200 bg-green-50',
        error: 'border-red-200 bg-red-50',
        info: 'border-blue-200 bg-blue-50',
        warning: 'border-yellow-200 bg-yellow-50',
        alert: 'border-red-200 bg-white text-red-600',
    };

    return (
        <div className={twMerge(
            "fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg transition-all duration-300 animate-in slide-in-from-right",
            styles[type] || styles.info
        )}>
            {icons[type] || icons.info}
            <p className={twMerge("text-sm font-medium", type === 'alert' ? 'text-red-600' : 'text-gray-800')}>{message}</p>
            <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full transition-colors">
                <X className="w-4 h-4 text-gray-400" />
            </button>
        </div>
    );
};

export default Toast;
