import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const LanguageToggle = () => {
    const { language, toggleLanguage } = useLanguage();

    return (
        <button
            onClick={toggleLanguage}
            className="flex items-center p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            aria-label="Toggle language"
        >
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <span className={`text-sm font-medium ${language === 'en' ? 'text-blue-600' : 'text-gray-500'}`}>
                    EN
                </span>
                <div className={`w-12 h-6 flex items-center bg-gray-300 rounded-full p-1 duration-300 ease-in-out ${language === 'ur' ? 'bg-green-500' : ''}`}>
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${language === 'ur' ? 'translate-x-6' : ''}`}></div>
                </div>
                <span className={`text-sm font-medium ${language === 'ur' ? 'text-green-600' : 'text-gray-500'}`}>
                    اردو
                </span>
            </div>
        </button>
    );
};

export default LanguageToggle;