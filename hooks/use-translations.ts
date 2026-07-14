'use client';

import { useLanguage } from '@/components/language-provider';
import enMessages from '@/messages/en.json';
import mrMessages from '@/messages/mr.json';

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
  ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
  : `${Key}`;
}[keyof ObjectType & (string | number)];

type TranslationKey = NestedKeyOf<typeof import('@/messages/en.json')>;

const CATALOGS = {
  en: enMessages as Record<string, unknown>,
  mr: mrMessages as Record<string, unknown>,
} as const;

export function useTranslations() {
  const { locale, setLocale } = useLanguage();

  const resolveKey = (catalog: Record<string, unknown>, key: string): string | null => {
    const keys = key.split('.');
    let value: unknown = catalog;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return null;
      }
    }

    return typeof value === 'string' ? value : null;
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    // Resolve from statically imported catalogs keyed by locale. This avoids
    // raw keys when the LanguageProvider context messages are empty, stale, or
    // out of sync with a service-worker-cached component chunk.
    const value =
      resolveKey(CATALOGS[locale] ?? CATALOGS.en, key) ??
      resolveKey(CATALOGS.en, key);

    if (!value) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }

    if (!params) return value;

    // Process ICU plural: {varName, plural, one {text} other {text}}
    let result = value.replace(
      /\{(\w+),\s*plural,\s*((?:[^{}]|\{[^{}]*\})*)\}/g,
      (_match: string, varName: string, options: string) => {
        const count = Number(params[varName] ?? 0);
        const optionMap: Record<string, string> = {};
        const optionRegex = /=?(\w+)\s*\{([^}]*)\}/g;
        for (const match of options.matchAll(optionRegex)) {
          optionMap[match[1]] = match[2];
        }
        const selected =
          (count === 1 && optionMap.one ? optionMap.one : null) ??
          optionMap.other ??
          _match;
        return selected.replace(/#/g, String(count));
      }
    );

    // Replace remaining simple {key} parameters
    result = result.replace(/\{(\w+)\}/g, (_match: string, paramKey: string) => {
      return params[paramKey]?.toString() ?? _match;
    });

    return result;
  };

  return {
    t,
    locale,
    setLocale,
  };
}
