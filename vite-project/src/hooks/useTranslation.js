import { useLanguage } from '../context/LanguageContext';
import en from '../locales/en';
import ur from '../locales/ur';

const translations = {
    en,
    ur
};

export const useTranslation = () => {
    const { language } = useLanguage();

    const t = (key) => {
        const translation = translations[language]?.[key];
        if (!translation) {
            console.warn(`Translation missing for key: ${key} in language: ${language}`);
            return key;
        }
        return translation;
    };

    return { t, language };
};