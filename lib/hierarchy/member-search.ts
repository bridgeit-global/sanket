import { getMemberPhone } from './geo-attribution';
import { extractWardNumber } from './member-list';
import type { CadreMemberCard } from './types';

export function parseSearchTerms(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

export function extractSearchDigits(query: string): string {
  return query.replace(/\D/g, '');
}

/** Ward numbers referenced in a query (e.g. "ward 140", "140"). */
export function extractWardNumbersFromQuery(query: string): number[] {
  const numbers = new Set<number>();
  const trimmed = query.trim();

  for (const match of trimmed.matchAll(/ward\s*(\d+)/gi)) {
    const parsed = Number.parseInt(match[1], 10);
    if (Number.isFinite(parsed)) numbers.add(parsed);
  }

  for (const token of trimmed.split(/\s+/)) {
    if (/^\d{1,4}$/.test(token)) {
      const parsed = Number.parseInt(token, 10);
      if (Number.isFinite(parsed)) numbers.add(parsed);
    }
  }

  return [...numbers];
}

function normalizeBoothToken(value: string): string {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? String(parsed) : value.trim();
}

/** Booth numbers referenced in a query (e.g. "booth 01", "booth 3"). */
export function extractBoothNumbersFromQuery(query: string): string[] {
  const booths = new Set<string>();
  const trimmed = query.trim();

  for (const match of trimmed.matchAll(/booth\s*(\d+)/gi)) {
    booths.add(normalizeBoothToken(match[1]));
  }

  if (/booth/i.test(trimmed)) {
    for (const token of trimmed.split(/\s+/)) {
      if (/^\d{1,3}$/.test(token)) booths.add(normalizeBoothToken(token));
    }
  }

  return [...booths];
}

function getMemberNameSearchText(member: CadreMemberCard): string {
  return [member.personName, member.linkedVoter?.fullName]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(' ')
    .toLowerCase();
}

/** Name-only search (full phrase or all whitespace-separated terms). */
export function memberNameMatchesSearch(name: string, query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;
  const qLower = trimmed.toLowerCase();
  const nameLower = name.toLowerCase();
  if (nameLower.includes(qLower)) return true;
  const terms = parseSearchTerms(trimmed);
  if (terms.length > 1) return terms.every((term) => nameLower.includes(term));
  return nameLower.includes(qLower);
}

function memberMatchesWardNumbers(member: CadreMemberCard, wardNumbers: number[]): boolean {
  if (wardNumbers.length === 0) return false;
  return member.posts.some((post) => {
    const wardNumber = extractWardNumber(post.wardGeoName ?? null);
    return wardNumbers.includes(wardNumber);
  });
}

function memberMatchesBoothNumbers(member: CadreMemberCard, boothNumbers: string[]): boolean {
  if (boothNumbers.length === 0) return false;
  const normalized = new Set(boothNumbers.map(normalizeBoothToken));
  return member.posts.some((post) => {
    if (!post.boothNo) return false;
    return normalized.has(normalizeBoothToken(post.boothNo));
  });
}

/** Client-side member search used for small scoped lists. */
export function memberMatchesSearch(member: CadreMemberCard, query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;
  const qLower = trimmed.toLowerCase();
  const terms = parseSearchTerms(trimmed);

  const queryDigits = extractSearchDigits(trimmed);
  if (queryDigits.length > 0) {
    const phone = getMemberPhone(member);
    if (phone?.replace(/\D/g, '').includes(queryDigits)) return true;
  }

  if (member.epicNumber?.toLowerCase().includes(qLower)) return true;

  const nameText = getMemberNameSearchText(member);
  if (memberNameMatchesSearch(nameText, trimmed)) return true;

  const wardNumbers = extractWardNumbersFromQuery(trimmed);
  if (memberMatchesWardNumbers(member, wardNumbers)) return true;

  const boothNumbers = extractBoothNumbersFromQuery(trimmed);
  if (memberMatchesBoothNumbers(member, boothNumbers)) return true;

  if (terms.length > 1) return false;

  const term = terms[0];
  return member.posts.some(
    (post) =>
      post.positionName.toLowerCase().includes(term) ||
      (post.label ?? '').toLowerCase().includes(term) ||
      (post.wardGeoName ?? '').toLowerCase().includes(term) ||
      (post.boothNo ?? '').toLowerCase().includes(term),
  );
}
