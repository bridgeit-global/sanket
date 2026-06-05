export function extractEpicFromPayload(payload: string): string | null {
  const raw = (payload ?? '').trim();
  if (!raw) return null;

  // Common EPIC format is 3 letters + 7 digits (10 chars), but we also accept
  // uppercase alphanumeric variants seen in some datasets.
  const strict = raw.toUpperCase();
  if (/^[A-Z]{3}\d{7}$/.test(strict)) return strict;

  // Try to find EPIC-like token embedded in a longer string.
  // Prefer the strict 3+7 pattern; otherwise fall back to a 10-char alnum token.
  const strictMatch = strict.match(/\b([A-Z]{3}\d{7})\b/);
  if (strictMatch?.[1]) return strictMatch[1];

  // Some barcode payloads include delimiters or key/value pairs.
  // Look for "EPIC" / "ID" hints first, then extract a token nearby.
  const hinted = strict.match(/(?:EPIC|VOTER\s*ID|VOTERID|ID)[^A-Z0-9]*([A-Z0-9]{8,15})/);
  if (hinted?.[1]) return hinted[1].toUpperCase();

  const looseMatch = strict.match(/\b([A-Z0-9]{10})\b/);
  if (looseMatch?.[1]) return looseMatch[1];

  return null;
}
