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

function hasLatinLetters(text: string) {
  return /[A-Za-z]/.test(text);
}

function applyLocaleDigits(text: string, locale: LetterLocale): string {
  return locale === 'mr' ? toLocaleDigits(text, 'mr') : toWesternDigits(text);
}

/** Count alphanumeric / Devanagari word tokens (ignores punctuation). */
function wordTokenCount(text: string): number {
  const matches = text.match(/[A-Za-z0-9\u0900-\u097F]+/g);
  return matches?.length ?? 0;
}

/** Lines that look like leaked model reasoning / markdown instructions. */
const LEAKED_THINKING_LINE_RE =
  /^\s*(\d+[\).\]]\s+|\*\*|#{1,6}\s|(step|note|rule|combine|then|next|finally)\b)/i;

/**
 * Strip wrapping quotes / fences, and drop trailing thinking leakage
 * (e.g. "खान.\n\n4.  **Combine" → "खान.").
 */
function cleanModelOutput(text: string, target: LetterLocale): string {
  let out = text.trim();
  if (
    (out.startsWith('"') && out.endsWith('"')) ||
    (out.startsWith("'") && out.endsWith("'")) ||
    (out.startsWith('“') && out.endsWith('”')) ||
    (out.startsWith('‘') && out.endsWith('’'))
  ) {
    out = out.slice(1, -1).trim();
  }
  if (out.startsWith('```') && out.endsWith('```')) {
    out = out.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim();
  }

  // Gemini thinking sometimes spills into the answer after a blank line.
  const blocks = out.split(/\n\s*\n/);
  if (blocks.length > 1) {
    const kept: string[] = [];
    for (const block of blocks) {
      const line = block.trim();
      if (!line) continue;
      if (LEAKED_THINKING_LINE_RE.test(line)) break;
      if (target === 'mr' && hasLatinLetters(line) && !hasDevanagari(line)) break;
      if (target === 'en' && hasDevanagari(line) && !hasLatinLetters(line)) break;
      kept.push(line);
    }
    if (kept.length > 0) out = kept.join('\n');
  }

  // Same for single-newline spills: keep leading script-consistent lines only.
  const lines = out.split('\n');
  if (lines.length > 1) {
    const kept: string[] = [];
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) {
        if (kept.length > 0) break;
        continue;
      }
      if (LEAKED_THINKING_LINE_RE.test(line)) break;
      if (target === 'mr' && hasLatinLetters(line)) break;
      if (target === 'en' && hasDevanagari(line) && !hasLatinLetters(line)) break;
      kept.push(line);
    }
    if (kept.length > 0) out = kept.join('\n');
  }

  return out.trim();
}

const COMMENTARY_RE =
  /\b(already written|devanagari script|cannot|can't|sorry|as an ai|transliterat(e|ion) (of|for)|here is|here's|converted (to|as)|output:|result:|combine)\b/i;

/**
 * Reject meta-commentary, wrong-script, and truncated answers so callers never
 * fill address fields with partial or explanatory model output.
 */
function isValidTransliteration(
  source: string,
  output: string,
  target: LetterLocale,
): boolean {
  if (!output) return false;
  if (COMMENTARY_RE.test(output)) return false;
  if (LEAKED_THINKING_LINE_RE.test(output)) return false;

  // Commentary is usually much longer than a short name/address fragment.
  if (output.length > Math.max(80, source.length * 4)) return false;

  const sourceWords = wordTokenCount(source);
  const outputWords = wordTokenCount(output);
  // Truncation guard: short names must keep every word; longer text may drop one.
  const minWords =
    sourceWords <= 4 ? sourceWords : Math.max(1, sourceWords - 1);
  if (sourceWords >= 2 && outputWords < minWords) {
    return false;
  }

  if (target === 'mr') {
    // Latin source that needs Devanagari must produce some Devanagari.
    if (hasLatinLetters(source) && !hasDevanagari(output)) return false;
    // No leftover Latin letters after transliteration (digits/punct OK).
    if (hasLatinLetters(output)) return false;
    return true;
  }

  // English target: reject leftover Devanagari when the source had it.
  if (hasDevanagari(source) && hasDevanagari(output) && !hasLatinLetters(output)) {
    return false;
  }
  return true;
}

const SYSTEM_PROMPT = [
  'You are a phonetic transliteration engine for Indian postal addresses and short names.',
  'Return ONLY the full transliterated text — every word from the input, in the same order.',
  'Never drop, summarize, or omit any word, locality, area, or punctuation that appears in the input.',
  'Do NOT translate meaning. Keep the same words; only change the script.',
  'English → Marathi/Hindi: write each English word in Devanagari as it sounds (Mumbai→मुंबई, New→न्यू not नवीन, Near→नियर not जवळ, Plot→प्लॉट, Road→रोड, Colony→कॉलनी, Street→स्ट्रीट, No→नं., Govandi→गोवंडी).',
  'Marathi/Hindi → English: write each Devanagari word in Latin letters as it sounds (मुंबई→Mumbai, न्यू→New, गौतम→Gautam, नगर→Nagar, गोवंडी→Govandi).',
  'Example: New Gautam Nagar, Govandi → न्यू गौतम नगर, गोवंडी',
  'Example: plot no 12 → प्लॉट नं. १२',
  'Preserve commas, hyphens, and line breaks exactly as in the input.',
  'Do not invent extra city, state, or pincode text that is not in the input — but always keep every word that is in the input.',
  'When converting to Marathi, convert Western digits (0-9) to Devanagari digits (०-९).',
  'When converting to English, convert Devanagari digits (०-९) to Western digits (0-9).',
  'Never add commentary, labels, quotes, numbered steps, or markdown.',
  'Reply with a single line only.',
].join('\n');

async function transliterateOnce(
  trimmed: string,
  target: LetterLocale,
  retry: boolean,
): Promise<string> {
  const targetLabel = target === 'mr' ? 'Marathi Devanagari' : 'English Latin';
  const wordCount = wordTokenCount(trimmed);
  const prompt = retry
    ? [
        `Transliterate EVERY one of the ${wordCount} word(s) to ${targetLabel}.`,
        'Reply with a single line containing only the complete transliteration.',
        'Do not explain, number steps, or add markdown.',
        '',
        trimmed,
      ].join('\n')
    : `Target: ${targetLabel}\n\nText:\n${trimmed}`;

  const { text: translatedRaw } = await generateText({
    model: myProvider.languageModel('artifact-model'),
    maxRetries: 2,
    temperature: 0,
    // Devanagari needs more tokens per Latin character than a 6× heuristic.
    maxOutputTokens: Math.min(1024, Math.max(128, trimmed.length * 12)),
    system: SYSTEM_PROMPT,
    prompt,
    // Gemini 3.x defaults to medium thinking; for short transliteration that
    // leaks reasoning into the answer (e.g. "खान.\n\n4. **Combine").
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingLevel: 'minimal',
          includeThoughts: false,
        },
      },
    },
  });

  return cleanModelOutput((translatedRaw ?? '').trim(), target);
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

    let translatedRaw = await transliterateOnce(trimmed, target, false);
    if (!isValidTransliteration(trimmed, translatedRaw, target)) {
      translatedRaw = await transliterateOnce(trimmed, target, true);
    }

    // Short names: if the model still truncates/leaks, transliterate word-by-word.
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (
      !isValidTransliteration(trimmed, translatedRaw, target) &&
      words.length >= 2 &&
      words.length <= 6
    ) {
      const parts: string[] = [];
      let ok = true;
      for (const word of words) {
        const part = await transliterateOnce(word, target, true);
        if (!isValidTransliteration(word, part, target)) {
          ok = false;
          break;
        }
        parts.push(part);
      }
      if (ok) translatedRaw = parts.join(' ');
    }

    if (!isValidTransliteration(trimmed, translatedRaw, target)) {
      console.error('Translate model returned invalid output', {
        input: trimmed,
        target,
        output: translatedRaw,
      });
      return NextResponse.json(
        { error: 'Failed to translate', detected },
        { status: 502 },
      );
    }

    const translated = applyLocaleDigits(translatedRaw || trimmed, target);
    return NextResponse.json({ detected, translated });
  } catch (error) {
    console.error('Error translating text:', error);
    return NextResponse.json({ error: 'Failed to translate' }, { status: 500 });
  }
}
