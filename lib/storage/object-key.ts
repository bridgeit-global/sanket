/**
 * Supabase Storage object-key helpers (safe to import from scripts and server).
 * Keys must be ASCII-safe; original display names stay in DB `file_name`.
 */

/** One path segment: letters, digits, dot, underscore, hyphen only. */
export function sanitizeStorageKeySegment(value: string): string {
  const ascii = value
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '') // drop non-ASCII (Devanagari, em dash, etc.)
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
    .slice(0, 180);
  return ascii || 'file';
}

/**
 * Sanitize a full object path (slash-separated). Preserves directory structure;
 * each segment is ASCII-safe. Empty segments are dropped.
 */
export function sanitizeStorageObjectKey(path: string): string {
  const trimmed = path.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!trimmed) return `file-${Date.now()}`;

  const segments = trimmed.split('/').map((part) => {
    // Keep extension on last segment when possible
    const lastDot = part.lastIndexOf('.');
    if (lastDot > 0 && lastDot < part.length - 1) {
      const base = sanitizeStorageKeySegment(part.slice(0, lastDot));
      const ext = sanitizeStorageKeySegment(part.slice(lastDot + 1));
      return ext ? `${base}.${ext}` : base;
    }
    return sanitizeStorageKeySegment(part);
  });

  return segments.filter(Boolean).join('/') || `file-${Date.now()}`;
}

/** Build a unique object path under a feature prefix. */
export function buildAppUploadPath(
  prefix: string,
  originalFileName: string,
  uniquePart: string = String(Date.now()),
): string {
  const safePrefix = sanitizeStorageObjectKey(prefix);
  const safeName = sanitizeStorageKeySegment(originalFileName);
  // Prefer keeping a real extension from the original name
  const extMatch = originalFileName.match(/\.([a-zA-Z0-9]{1,12})$/);
  const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : '';
  const base =
    safeName === 'file' || !safeName
      ? `upload${ext}`
      : safeName.includes('.')
        ? safeName
        : `${safeName}${ext}`;
  return `${safePrefix}/${uniquePart}-${base}`;
}
