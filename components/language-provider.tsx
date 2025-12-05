'use client';

import * as React from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const LOCALE_COOKIE_NAME = 'locale';
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

type Locale = 'en' | 'mr';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  messages: Record<string, any>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Load messages dynamically
const loadMessages = async (locale: Locale): Promise<Record<string, any>> => {
  try {
    const messages = await import(`@/messages/${locale}.json`);
    return messages.default;
  } catch (error) {
    console.error(`Failed to load messages for locale: ${locale}`, error);
    // Fallback to English
    const fallback = await import('@/messages/en.json');
    return fallback.default;
  }
};

interface LanguageProviderProps {
  children: React.ReactNode;
  defaultLocale?: Locale;
}

export function LanguageProvider({
  children,
  defaultLocale = 'en',
}: LanguageProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [messages, setMessages] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Initialize locale from cookie on mount
  useEffect(() => {
    const getLocaleFromCookie = (): Locale => {
      if (typeof document === 'undefined') return defaultLocale;

      const cookies = document.cookie.split(';');
      const localeCookie = cookies.find((cookie) =>
        cookie.trim().startsWith(`${LOCALE_COOKIE_NAME}=`),
      );

      if (localeCookie) {
        const value = localeCookie.split('=')[1]?.trim();
        if (value === 'en' || value === 'mr') {
          return value as Locale;
        }
      }

      return defaultLocale;
    };

    const initialLocale = getLocaleFromCookie();
    setLocaleState(initialLocale);
  }, [defaultLocale]);

  // Load messages when locale changes
  useEffect(() => {
    const loadMessagesForLocale = async () => {
      setIsLoading(true);
      const loadedMessages = await loadMessages(locale);
      setMessages(loadedMessages);
      setIsLoading(false);
    };

    loadMessagesForLocale();
  }, [locale]);

  // Update HTML lang attribute
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);

    // Save to cookie
    if (typeof document !== 'undefined') {
      document.cookie = `${LOCALE_COOKIE_NAME}=${newLocale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}`;
    }
  }, []);

  const value: LanguageContextType = {
    locale,
    setLocale,
    messages,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
