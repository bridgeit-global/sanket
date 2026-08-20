import 'server-only';

import { supabase } from '@/lib/supabase/server';
import {
  buildAppUploadPath,
  sanitizeStorageObjectKey,
} from '@/lib/storage/object-key';

export { buildAppUploadPath, sanitizeStorageObjectKey };

/** Public bucket for app uploads formerly stored in Vercel Blob. */
export const APP_UPLOADS_BUCKET = 'app-uploads';

const PUBLIC_OBJECT_MARKER = '/storage/v1/object/public/';

export type UploadedAppFile = {
  /** Object path inside the bucket (no leading slash). */
  path: string;
  /** Public HTTP URL suitable for direct `<a href>` / `<img src>`. */
  url: string;
  contentType: string;
};

export function getAppUploadPublicUrl(path: string): string {
  const { data } = supabase.storage.from(APP_UPLOADS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Parse a Supabase public object URL into bucket + path.
 * Returns null for non-Supabase / private / signed URLs.
 */
export function parseSupabasePublicObjectUrl(
  url: string,
): { bucket: string; path: string } | null {
  try {
    const parsed = new URL(url);
    const markerIndex = parsed.pathname.indexOf(PUBLIC_OBJECT_MARKER);
    if (markerIndex < 0) return null;
    const remainder = parsed.pathname.slice(
      markerIndex + PUBLIC_OBJECT_MARKER.length,
    );
    const slash = remainder.indexOf('/');
    if (slash <= 0) return null;
    const bucket = decodeURIComponent(remainder.slice(0, slash));
    const path = decodeURIComponent(remainder.slice(slash + 1));
    if (!bucket || !path) return null;
    return { bucket, path };
  } catch {
    return null;
  }
}

export function isVercelBlobUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return (
      host.endsWith('.blob.vercel-storage.com') ||
      host === 'blob.vercel-storage.com'
    );
  } catch {
    return false;
  }
}

export async function uploadAppFile({
  path,
  body,
  contentType,
  upsert = false,
}: {
  path: string;
  body: ArrayBuffer | Buffer | Blob | File | string;
  contentType: string;
  upsert?: boolean;
}): Promise<UploadedAppFile> {
  const safePath = sanitizeStorageObjectKey(path);
  const { error } = await supabase.storage
    .from(APP_UPLOADS_BUCKET)
    .upload(safePath, body, {
      contentType,
      upsert,
      cacheControl: '3600',
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return {
    path: safePath,
    url: getAppUploadPublicUrl(safePath),
    contentType,
  };
}

/**
 * Best-effort delete for a stored public URL.
 * Supabase public URLs are removed from `app-uploads` (or parsed bucket).
 * Legacy Vercel Blob URLs are ignored (no longer managed by the app).
 */
export async function removeStoredPublicUrl(url: string | null | undefined): Promise<void> {
  if (!url) return;
  if (isVercelBlobUrl(url)) return;

  const parsed = parseSupabasePublicObjectUrl(url);
  if (!parsed) return;

  const { error } = await supabase.storage
    .from(parsed.bucket)
    .remove([parsed.path]);

  if (error) {
    console.error('Storage delete failed:', error);
  }
}
