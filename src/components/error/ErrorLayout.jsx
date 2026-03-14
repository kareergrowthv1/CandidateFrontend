import React from 'react';

const ErrorLayout = ({ title, subtitle, message, showScreenshotMessage = false, errorDetails = null, actionLink = null, actionLabel = null }) => {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center font-sans">
            {/* Robot Graphic (SVG Placeholder or Image) */}
            <div className="mb-8 relative w-64 h-64 md:w-80 md:h-80">
                {/* Abstract Robot Illustration using CSS/SVG shapes for premium feel/placeholder */}
                <svg className="w-full h-full text-red-500/80 drop-shadow-2xl" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="100" cy="100" r="90" fill="#FEE2E2" fillOpacity="0.5" />
                    <path d="M60 70C60 58.9543 68.9543 50 80 50H120C131.046 50 140 58.9543 140 70V130C140 141.046 131.046 150 120 150H80C68.9543 150 60 141.046 60 130V70Z" fill="#EF4444" />
                    <rect x="75" y="65" width="20" height="20" rx="10" fill="white" />
                    <rect x="105" y="65" width="20" height="20" rx="10" fill="white" />
                    <path d="M80 110H120" stroke="white" strokeWidth="8" strokeLinecap="round" />
                    <path d="M150 90L170 70M50 90L30 70" stroke="#EF4444" strokeWidth="6" strokeLinecap="round" />
                    <circle cx="160" cy="60" r="5" fill="#EF4444" />
                    <circle cx="40" cy="60" r="5" fill="#EF4444" />
                    {/* Sparks */}
                    <path d="M110 30L100 45L90 30" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
                </svg>
            </div>

            <h1 className="text-4xl font-bold text-gray-800 mb-2">{title}</h1>
            <h2 className="text-2xl font-semibold text-gray-600 mb-6">{subtitle}</h2>

            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-lg w-full mb-8 shadow-sm">
                <p className="text-gray-700 text-sm mb-4 leading-relaxed">
                    {message}
                    {showScreenshotMessage && (
                        <>
                            <br />
                            <span className="font-semibold text-red-600">Please take a screenshot of this page and provide it to the support team.</span>
                        </>
                    )}
                </p>

                {/* Optional: Display minimal error details for screenshot context */}
                {errorDetails && (
                    <div className="mt-4 p-3 bg-white rounded border border-red-100 text-left overflow-auto max-h-32 text-xs text-red-800 font-mono">
                        {errorDetails.toString()}
                    </div>
                )}
            </div>

            {actionLink && (
                <a
                    href={actionLink}
                    className="text-white bg-blue-600 hover:bg-blue-700 font-medium py-2.5 px-6 rounded-md shadow-md transition-all duration-300"
                >
                    {actionLabel || "Go Home"}
                </a>
            )}
        </div>
    );
};

export default ErrorLayout;
