import type { PostgrestError } from '@supabase/supabase-js';
import { ChatSDKError } from '../errors';

export function throwOnSupabaseError(
  error: PostgrestError | null,
  message: string,
): void {
  if (error) {
    console.error(message, {
      code: error.code,
      details: error.details,
      hint: error.hint,
      message: error.message,
    });
    throw new ChatSDKError('bad_request:database', `${message}: ${error.message}`);
  }
}

export function wrapDatabaseError(error: unknown, message: string): never {
  console.error(message, error);
  throw new ChatSDKError('bad_request:database', message);
}
