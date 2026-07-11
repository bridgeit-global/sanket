import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { auth } from '@/app/(auth)/auth';
import { myProvider } from '@/lib/ai/providers';
import { toLocaleDigits, toWesternDigits } from '@/lib/locale-digits';

type LetterLocale = 'en' | 'mr';

function hasDevanagari(text: string) {
  return /[\u0900-\u097F]/.test(text);
}

function applyLocaleDigits(text: string, locale: LetterLocale): string {
  return locale === 'mr' ? toLocaleDigits(text, 'mr') : toWesternDigits(text);
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const modules = (session?.user?.modules as string[]) || [];
    if (!session?.user || !modules.includes('letter-generation')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { text, targetLocale } = (body ?? {}) as { text?: unknown; targetLocale?: unknown };

    const input = typeof text === 'string' ? text : '';
    const trimmed = input.trim();
    const target = targetLocale === 'en' || targetLocale === 'mr' ? (targetLocale as LetterLocale) : null;

    if (!trimmed || !target) {
      return NextResponse.json(
        { error: 'text and targetLocale (en|mr) are required' },
        { status: 400 },
      );
    }

    const detected: LetterLocale = hasDevanagari(trimmed) ? 'mr' : 'en';
    if (detected === target) {
      return NextResponse.json({ detected, translated: applyLocaleDigits(trimmed, target) });
    }

    const targetLabel = target === 'mr' ? 'Marathi (Devanagari script)' : 'English';

    const { text: translatedRaw } = await generateText({
      model: myProvider.languageModel('chat-model'),
      maxRetries: 2,
      temperature: 0,
      system: [
        'You are a precise translation engine for Indian postal addresses and short names.',
        'Translate the user input to the requested language.',
        'Preserve line breaks exactly as the input (do not add/remove extra lines).',
        'Do not add quotes, bullet points, labels, or any extra commentary.',
        'Do not add city, state, or pincode unless they already appear in the input.',
        'When translating to Marathi, convert all Western digits (0-9) to Devanagari digits (०-९).',
        'When translating to English, convert Devanagari digits (०-९) to Western digits (0-9).',
        'Translate common address abbreviations naturally (e.g. "plot no" → "प्लॉट क्रमांक", "near" → "जवळ").',
      ].join('\n'),
      prompt: `Target language: ${targetLabel}\n\nText:\n${trimmed}`,
    });

    const translated = applyLocaleDigits((translatedRaw ?? '').trim() || trimmed, target);
    return NextResponse.json({ detected, translated });
  } catch (error) {
    console.error('Error translating text:', error);
    return NextResponse.json({ error: 'Failed to translate' }, { status: 500 });
  }
}
