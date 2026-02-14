import React, { createContext, useState, useContext, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        const savedLang = localStorage.getItem('language');
        return savedLang || 'en';
    });

    useEffect(() => {
        if (language === 'ur') {
            document.documentElement.dir = 'rtl';
            document.documentElement.lang = 'ur';
        } else {
            document.documentElement.dir = 'ltr';
            document.documentElement.lang = 'en';
        }
    }, [language]);

    const toggleLanguage = () => {
        setLanguage(prev => {
            const newLang = prev === 'en' ? 'ur' : 'en';
            localStorage.setItem('language', newLang);
            return newLang;
        });
    };

    return (
        <LanguageContext.Provider value={{ language, toggleLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
};