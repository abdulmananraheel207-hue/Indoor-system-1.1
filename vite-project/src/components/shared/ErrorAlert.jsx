import React from 'react';
import { AlertCircle, X } from 'lucide-react';

const ErrorAlert = ({ message, onClose, retry }) => {
    return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="flex-1">
                    <p className="text-sm text-red-700">{message}</p>
                    {retry && (
                        <button
                            onClick={retry}
                            className="mt-2 text-sm font-medium text-red-600 hover:text-red-800"
                        >
                            Try again
                        </button>
                    )}
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="text-red-400 hover:text-red-600 ml-3"
                    >
                        <X className="h-5 w-5" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default ErrorAlert;