'use client';

import * as React from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import enMessages from '@/messages/en.json';
import mrMessages from '@/messages/mr.json';

const LOCALE_COOKIE_NAME = 'locale';
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

type Locale = 'en' | 'mr';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  messages: Record<string, any>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const MESSAGE_CATALOG: Record<Locale, Record<string, unknown>> = {
  en: enMessages,
  mr: mrMessages,
};

function getMessagesForLocale(locale: Locale): Record<string, unknown> {
  return MESSAGE_CATALOG[locale] ?? MESSAGE_CATALOG.en;
}

interface LanguageProviderProps {
  children: React.ReactNode;
  defaultLocale?: Locale;
}

export function LanguageProvider({
  children,
  defaultLocale = 'en',
}: LanguageProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [messages, setMessages] = useState<Record<string, unknown>>(() =>
    getMessagesForLocale(defaultLocale),
  );

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
    setMessages(getMessagesForLocale(initialLocale));
  }, [defaultLocale]);

  useEffect(() => {
    setMessages(getMessagesForLocale(locale));
  }, [locale]);

  // Update HTML lang attribute
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setMessages(getMessagesForLocale(newLocale));

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
