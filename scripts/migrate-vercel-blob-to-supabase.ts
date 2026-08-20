/**
 * Migrate ALL objects from the Vercel Blob store into Supabase Storage
 * (`app-uploads`), then rewrite DB columns that still point at Blob URLs.
 *
 * Prerequisites:
 *   - Migration `app_file_storage_buckets` applied (bucket exists)
 *   - `.env.local` has Supabase URL + service role key
 *   - `.env.local` has `BLOB_READ_WRITE_TOKEN` (needed to list the store)
 *
 * Usage:
 *   pnpm storage:migrate-blob --dry-run
 *   pnpm storage:migrate-blob
 *
 * Does not delete objects from Vercel Blob (verify first, then remove the store).
 */
import dotenv from 'dotenv';
import { createHash } from 'node:crypto';
import { list } from '@vercel/blob';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  resolveServiceRoleKey,
  resolveSupabaseUrl,
} from '../lib/supabase/config';
import { sanitizeStorageObjectKey } from '../lib/storage/object-key';

dotenv.config({ path: '.env.local' });
dotenv.config();

const APP_UPLOADS_BUCKET = 'app-uploads';
/** Allow large voter CSV exports (was 25MB; a few Blob exports exceed that). */
const APP_UPLOADS_MAX_BYTES = 200 * 1024 * 1024;
const BLOB_HOST_RE = /(^|\.)blob\.vercel-storage\.com$/i;
const PAGE_SIZE = 1000;

type UrlRow = {
  table: string;
  id: string;
  column: string;
  url: string;
};

type ListedBlob = {
  url: string;
  pathname: string;
  contentType?: string;
};

function isVercelBlobUrl(url: string): boolean {
  try {
    return BLOB_HOST_RE.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

function storagePathFromBlob(blob: ListedBlob): string {
  const raw =
    blob.pathname.replace(/^\//, '').trim() ||
    new URL(blob.url).pathname.replace(/^\//, '');
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // keep raw
  }
  const sanitized = sanitizeStorageObjectKey(decoded || `orphaned/${Date.now()}`);

  // Non-ASCII / special names collapse after sanitize — add a stable hash so
  // keys stay unique (display name remains in DB file_name for the UI).
  const hadUnsafeChars = /[^\x20-\x7E]|[/?%*:|"<>]/.test(decoded);
  if (!hadUnsafeChars) return sanitized;

  const hash = createHash('sha1').update(blob.url).digest('hex').slice(0, 12);
  const lastSlash = sanitized.lastIndexOf('/');
  const dir = lastSlash >= 0 ? sanitized.slice(0, lastSlash + 1) : '';
  const file = lastSlash >= 0 ? sanitized.slice(lastSlash + 1) : sanitized;
  const lastDot = file.lastIndexOf('.');
  const base = lastDot > 0 ? file.slice(0, lastDot) : file;
  const ext = lastDot > 0 ? file.slice(lastDot) : '';
  return `${dir}${base}-${hash}${ext}`;
}

function parseArgs() {
  const dryRun = process.argv.includes('--dry-run');
  return { dryRun };
}

function requireBlobToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN is required to list the Vercel Blob store',
    );
  }
  return token;
}

/** Enumerate every object in the Vercel Blob store (paginated). */
async function listAllVercelBlobs(token: string): Promise<ListedBlob[]> {
  const all: ListedBlob[] = [];
  let cursor: string | undefined;

  do {
    const page = await list({
      token,
      cursor,
      limit: 1000,
    });
    for (const blob of page.blobs) {
      all.push({
        url: blob.url,
        pathname: blob.pathname,
        contentType:
          'contentType' in blob && typeof blob.contentType === 'string'
            ? blob.contentType
            : undefined,
      });
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  return all;
}

async function selectAllRows(
  supabase: SupabaseClient,
  table: string,
  columns: string,
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  let from = 0;

  for (; ;) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, to);
    if (error) throw error;
    const batch = (data ?? []) as unknown as Record<string, unknown>[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function collectFileUrlRows(
  supabase: SupabaseClient,
): Promise<UrlRow[]> {
  const specs: Array<{ table: string; column: string }> = [
    { table: 'RegisterAttachment', column: 'file_url' },
    { table: 'DailyProgrammeAttachment', column: 'file_url' },
    { table: 'BeneficiaryServiceAttachment', column: 'file_url' },
    { table: 'ProjectGroundMedia', column: 'file_url' },
    { table: 'ProjectAttachment', column: 'file_url' },
    { table: 'AdmDocument', column: 'file_url' },
    { table: 'AdmDemandLetter', column: 'file_url' },
    { table: 'ExportJob', column: 'file_url' },
    { table: 'LetterMaster', column: 'letterhead_url' },
  ];

  const rows: UrlRow[] = [];

  for (const spec of specs) {
    try {
      const data = await selectAllRows(
        supabase,
        spec.table,
        `id, ${spec.column}`,
      );
      for (const row of data) {
        const url = row[spec.column];
        if (typeof url === 'string' && isVercelBlobUrl(url)) {
          rows.push({
            table: spec.table,
            id: String(row.id),
            column: spec.column,
            url,
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Skip ${spec.table}.${spec.column}: ${message}`);
    }
  }

  return rows;
}

async function collectJsonUrlRows(supabase: SupabaseClient): Promise<
  Array<{
    table: string;
    id: string;
    urls: string[];
    raw: unknown;
  }>
> {
  const out: Array<{
    table: string;
    id: string;
    urls: string[];
    raw: unknown;
  }> = [];

  for (const table of ['CadreWhatsAppBroadcast', 'CadreWhatsAppMessage'] as const) {
    try {
      const data = await selectAllRows(supabase, table, 'id, image_urls');
      for (const row of data) {
        const raw = row.image_urls;
        const list = Array.isArray(raw)
          ? raw.filter((u): u is string => typeof u === 'string')
          : [];
        const blobUrls = list.filter(isVercelBlobUrl);
        if (blobUrls.length > 0) {
          out.push({
            table,
            id: String(row.id),
            urls: blobUrls,
            raw,
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Skip ${table}.image_urls: ${message}`);
    }
  }

  return out;
}

/** Ensure `app-uploads` exists (migration may not have been pushed to remote yet). */
async function ensureAppUploadsBucket(supabase: SupabaseClient): Promise<void> {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    throw new Error(`Failed to list storage buckets: ${listError.message}`);
  }
  const existing = buckets?.find((b) => b.id === APP_UPLOADS_BUCKET);
  if (existing) {
    // Prefer SQL-applied limits; Storage API may reject raising beyond plan caps.
    const { error } = await supabase.storage.updateBucket(APP_UPLOADS_BUCKET, {
      public: true,
      fileSizeLimit: APP_UPLOADS_MAX_BYTES,
    });
    if (error) {
      console.warn(
        `Could not update bucket limits via API (${error.message}); continuing with existing bucket settings.`,
      );
    } else {
      console.log(
        `Bucket "${APP_UPLOADS_BUCKET}" ready (max ${APP_UPLOADS_MAX_BYTES} bytes)`,
      );
    }
    return;
  }

  const { error } = await supabase.storage.createBucket(APP_UPLOADS_BUCKET, {
    public: true,
    fileSizeLimit: APP_UPLOADS_MAX_BYTES,
  });
  if (error) {
    throw new Error(
      `Bucket "${APP_UPLOADS_BUCKET}" missing and create failed: ${error.message}. Apply migration 20260820114455_app_file_storage_buckets.sql (or create the bucket in Studio).`,
    );
  }
  console.log(`Created bucket "${APP_UPLOADS_BUCKET}"`);
}

async function migrateBlobToStorage(
  supabase: SupabaseClient,
  blob: ListedBlob,
  cache: Map<string, string>,
  dryRun: boolean,
): Promise<string> {
  const cached = cache.get(blob.url);
  if (cached) return cached;

  const path = storagePathFromBlob(blob);
  if (dryRun) {
    const fake = `[dry-run]${path}`;
    cache.set(blob.url, fake);
    return fake;
  }

  const res = await fetch(blob.url);
  if (!res.ok) {
    throw new Error(`Download failed (${res.status}): ${blob.url}`);
  }
  const contentType =
    blob.contentType ||
    res.headers.get('content-type') ||
    'application/octet-stream';
  const buffer = Buffer.from(await res.arrayBuffer());

  const { error } = await supabase.storage
    .from(APP_UPLOADS_BUCKET)
    .upload(path, buffer, { contentType, upsert: true });
  if (error) {
    throw new Error(`Upload failed for ${path}: ${error.message}`);
  }

  const { data } = supabase.storage
    .from(APP_UPLOADS_BUCKET)
    .getPublicUrl(path);
  const publicUrl = data.publicUrl as string;
  cache.set(blob.url, publicUrl);
  return publicUrl;
}

async function main() {
  const { dryRun } = parseArgs();
  const token = requireBlobToken();
  const supabase = createClient(resolveSupabaseUrl(), resolveServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(
    dryRun
      ? 'Dry run — list store + plan DB rewrites (no uploads / updates)'
      : 'Migrating full Vercel Blob store → Supabase Storage',
  );

  await ensureAppUploadsBucket(supabase);

  // 1) Full store inventory (source of truth for “all files”)
  console.log('\nListing Vercel Blob store…');
  const storeBlobs = await listAllVercelBlobs(token);
  console.log(`Store contains ${storeBlobs.length} object(s)`);

  const cache = new Map<string, string>();
  let uploadOk = 0;
  let uploadFailed = 0;

  for (const [index, blob] of storeBlobs.entries()) {
    try {
      await migrateBlobToStorage(supabase, blob, cache, dryRun);
      uploadOk += 1;
      if ((index + 1) % 25 === 0 || index + 1 === storeBlobs.length) {
        console.log(`  uploaded ${index + 1}/${storeBlobs.length}`);
      }
    } catch (error) {
      uploadFailed += 1;
      console.error(`✗ store object ${blob.pathname}:`, error);
    }
  }

  // 2) Rewrite DB rows that still reference Blob URLs
  const fileRows = await collectFileUrlRows(supabase);
  console.log(`\nDB scalar Blob URL row(s): ${fileRows.length}`);

  let rewriteOk = 0;
  let rewriteFailed = 0;
  let dbUrlsMissingFromStore = 0;

  for (const row of fileRows) {
    try {
      let nextUrl = cache.get(row.url);
      if (!nextUrl) {
        dbUrlsMissingFromStore += 1;
        nextUrl = await migrateBlobToStorage(
          supabase,
          { url: row.url, pathname: new URL(row.url).pathname },
          cache,
          dryRun,
        );
      }
      if (!dryRun) {
        const { error } = await supabase
          .from(row.table)
          .update({ [row.column]: nextUrl })
          .eq('id', row.id);
        if (error) throw error;
      }
      rewriteOk += 1;
    } catch (error) {
      rewriteFailed += 1;
      console.error(`✗ ${row.table}.${row.column} ${row.id}:`, error);
    }
  }

  const jsonRows = await collectJsonUrlRows(supabase);
  console.log(`DB WhatsApp image_urls row(s) with Blob: ${jsonRows.length}`);

  for (const row of jsonRows) {
    try {
      const listValues = Array.isArray(row.raw) ? [...row.raw] : [];
      for (let i = 0; i < listValues.length; i++) {
        const item = listValues[i];
        if (typeof item === 'string' && isVercelBlobUrl(item)) {
          let nextUrl = cache.get(item);
          if (!nextUrl) {
            dbUrlsMissingFromStore += 1;
            nextUrl = await migrateBlobToStorage(
              supabase,
              { url: item, pathname: new URL(item).pathname },
              cache,
              dryRun,
            );
          }
          listValues[i] = nextUrl;
        }
      }
      if (!dryRun) {
        const { error } = await supabase
          .from(row.table)
          .update({ image_urls: listValues })
          .eq('id', row.id);
        if (error) throw error;
      }
      rewriteOk += 1;
    } catch (error) {
      rewriteFailed += 1;
      console.error(`✗ ${row.table}.image_urls ${row.id}:`, error);
    }
  }

  // Chat Message_v2 attachments may embed Blob URLs in JSON
  try {
    const messages = await selectAllRows(
      supabase,
      'Message_v2',
      'id, attachments',
    );
    let msgRewrites = 0;
    for (const row of messages) {
      const serialized = JSON.stringify(row.attachments ?? null);
      if (!serialized.includes('blob.vercel-storage.com')) continue;
      try {
        const matches = serialized.match(
          /https:\/\/[^"\\\s]+blob\.vercel-storage\.com[^"\\\s]*/g,
        );
        if (!matches?.length) continue;
        let next = serialized;
        for (const blobUrl of new Set(matches)) {
          const decoded = blobUrl.replace(/\\u0026/g, '&');
          let publicUrl = cache.get(decoded);
          if (!publicUrl) {
            dbUrlsMissingFromStore += 1;
            publicUrl = await migrateBlobToStorage(
              supabase,
              { url: decoded, pathname: new URL(decoded).pathname },
              cache,
              dryRun,
            );
          }
          next = next.split(blobUrl).join(publicUrl);
        }
        if (!dryRun) {
          const { error } = await supabase
            .from('Message_v2')
            .update({ attachments: JSON.parse(next) })
            .eq('id', row.id);
          if (error) throw error;
        }
        msgRewrites += 1;
        rewriteOk += 1;
      } catch (error) {
        rewriteFailed += 1;
        console.error(`✗ Message_v2.attachments ${row.id}:`, error);
      }
    }
    console.log(`Message_v2 attachment row(s) rewritten: ${msgRewrites}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Skip Message_v2.attachments: ${message}`);
  }

  const referencedUrls = new Set(fileRows.map((r) => r.url));
  for (const row of jsonRows) {
    for (const url of row.urls) referencedUrls.add(url);
  }
  const orphanCount = storeBlobs.filter((b) => !referencedUrls.has(b.url))
    .length;

  console.log(`
Summary${dryRun ? ' (dry-run)' : ''}:
  Blob store objects:     ${storeBlobs.length}
  Uploaded / planned:     ${uploadOk} (failed ${uploadFailed})
  DB rows rewritten:      ${rewriteOk} (failed ${rewriteFailed})
  Unique URLs cached:     ${cache.size}
  Store orphans (no DB):  ${orphanCount}  ← still copied to Supabase
  DB URLs missing store:  ${dbUrlsMissingFromStore}
`);

  if (uploadFailed > 0 || rewriteFailed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
