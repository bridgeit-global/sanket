import 'server-only';

import { randomBytes } from 'node:crypto';

import { supabase } from '@/lib/supabase/server';
import { throwOnSupabaseError } from '@/lib/db/errors';
import { ChatSDKError } from '../errors';
import { TABLES } from './schema';
import type { ShortUrl } from './schema';

const CODE_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CODE_LENGTH = 7;
const MAX_CODE_ATTEMPTS = 5;

/** Generate a URL-safe base62 code (collision-resistant at this length). */
function generateCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

type ShortUrlRow = {
  id: string;
  code: string;
  target_url: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  created_by: string | null;
  expires_at: string | null;
  created_at: string;
};

function mapShortUrlRow(row: ShortUrlRow): ShortUrl {
  return {
    id: row.id,
    code: row.code,
    targetUrl: row.target_url,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    createdBy: row.created_by,
    expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    createdAt: new Date(row.created_at),
  };
}

/**
 * Create a short URL pointing at either a private Storage object
 * (`storageBucket` + `storagePath`, signed on demand at redirect time) or a
 * plain external `targetUrl`. Returns the generated short code.
 */
export async function createShortUrl(input: {
  storageBucket?: string;
  storagePath?: string;
  targetUrl?: string;
  createdBy?: string | null;
  expiresInDays?: number;
}): Promise<{ code: string }> {
  if (!input.storagePath && !input.targetUrl) {
    throw new ChatSDKError(
      'bad_request:api',
      'createShortUrl requires a storagePath or targetUrl',
    );
  }

  const expiresAt =
    input.expiresInDays != null
      ? new Date(
          Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000,
        ).toISOString()
      : null;

  let lastError: unknown = null;
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const code = generateCode();
    const { error } = await supabase.from(TABLES.shortUrl).insert({
      code,
      target_url: input.targetUrl ?? null,
      storage_bucket: input.storageBucket ?? null,
      storage_path: input.storagePath ?? null,
      created_by: input.createdBy ?? null,
      expires_at: expiresAt,
    });

    if (!error) return { code };

    // 23505 = unique_violation: code collided, retry with a fresh code.
    if (error.code === '23505') {
      lastError = error;
      continue;
    }

    throwOnSupabaseError(error, 'Failed to create short URL');
  }

  console.error('Failed to create short URL after retries', lastError);
  throw new ChatSDKError('bad_request:database', 'Failed to create short URL');
}

/** Look up a short URL by code. Returns `null` if missing or expired. */
export async function getShortUrlByCode(code: string): Promise<ShortUrl | null> {
  const { data, error } = await supabase
    .from(TABLES.shortUrl)
    .select(
      'id, code, target_url, storage_bucket, storage_path, created_by, expires_at, created_at',
    )
    .eq('code', code)
    .maybeSingle();
  throwOnSupabaseError(error, 'Failed to look up short URL');

  if (!data) return null;

  const shortUrl = mapShortUrlRow(data as ShortUrlRow);
  if (shortUrl.expiresAt && shortUrl.expiresAt.getTime() < Date.now()) {
    return null;
  }
  return shortUrl;
}
