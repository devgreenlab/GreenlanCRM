'use client';

import { useLanguage } from '@/context/language-context';
import id from '@/locales/id.json';
import en from '@/locales/en.json';

const translations = {
  id,
  en,
};

type TranslationKey = keyof typeof id;

export const useTranslation = () => {
  const { locale } = useLanguage();

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    // Fallback to 'id' if locale is not found or if a key is missing in the current locale
    const translationSet = translations[locale] || translations.id;
    const fallbackSet = translations.id;
    
    let text = translationSet[key] || fallbackSet[key] || key;

    if (params) {
      Object.keys(params).forEach((paramKey) => {
        text = text.replace(new RegExp(`{${paramKey}}`, 'g'), String(params[paramKey]));
      });
    }

    return text;
  };

  return { t, locale };
};
