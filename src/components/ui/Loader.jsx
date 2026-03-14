import React from 'react';

const Loader = () => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="relative flex items-center justify-center">
                <div className="absolute w-24 h-24 rounded-full border-4 border-t-purple-600 border-r-transparent border-b-blue-600 border-l-transparent animate-spin"></div>
                <div className="absolute w-16 h-16 rounded-full border-4 border-t-blue-600 border-r-transparent border-b-purple-600 border-l-transparent animate-spin animation-delay-500"></div>
                <div className="w-4 h-4 bg-gray-900 rounded-full animate-pulse"></div>
            </div>
        </div>
    );
};

export default Loader;
