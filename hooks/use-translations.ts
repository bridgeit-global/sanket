'use client';

import { useLanguage } from '@/components/language-provider';

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
  ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
  : `${Key}`;
}[keyof ObjectType & (string | number)];

type TranslationKey = NestedKeyOf<typeof import('@/messages/en.json')>;

export function useTranslations() {
  const { locale, setLocale, messages } = useLanguage();

  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = messages;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }

    if (typeof value !== 'string') {
      console.warn(`Translation value is not a string for key: ${key}`);
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
        let m: RegExpExecArray | null;
        while ((m = optionRegex.exec(options)) !== null) {
          optionMap[m[1]] = m[2];
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
