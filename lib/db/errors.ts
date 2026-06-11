import type { PostgrestError } from '@supabase/supabase-js';
import { ChatSDKError } from '../errors';

export function throwOnSupabaseError(
  error: PostgrestError | null,
  message: string,
): void {
  if (error) {
    console.error(message, error);
    throw new ChatSDKError('bad_request:database', message);
  }
}

export function wrapDatabaseError(error: unknown, message: string): never {
  console.error(message, error);
  throw new ChatSDKError('bad_request:database', message);
}
