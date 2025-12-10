// components/NotFound.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
            <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
            <h2 className="text-2xl font-semibold text-gray-600 mb-6">Page Not Found</h2>
            <p className="text-gray-500 mb-8 text-center max-w-md">
                The page you are looking for doesn't exist or has been moved.
            </p>
            <div className="flex space-x-4">
                <Link
                    to="/"
                    className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
                >
                    Go to Home
                </Link>
                <Link
                    to="/dashboard"
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    Go to Dashboard
                </Link>
            </div>
        </div>
    );
};

export default NotFound;