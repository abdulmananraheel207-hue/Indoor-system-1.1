import React from 'react';

const LoadingSpinner = ({ size = 'medium', text = 'Loading...' }) => {
    const sizeClasses = {
        small: 'w-8 h-8',
        medium: 'w-12 h-12',
        large: 'w-16 h-16'
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[200px]">
            <div className={`${sizeClasses[size]} animate-spin rounded-full border-4 border-blue-200 border-t-blue-600`}></div>
            {text && (
                <p className="mt-4 text-gray-600 font-medium">{text}</p>
            )}
        </div>
    );
};

export default LoadingSpinner;