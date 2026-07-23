import { getPostBreadcrumbItems } from './geo-navigation';
import type { CadreMemberCard, CadreMemberPostDetail } from './types';

const TALUKA_LEVELS = new Set(['taluka', 'taluka_committee']);
const WARD_LEVELS = new Set(['ward', 'ward_committee']);
const BOOTH_LEVELS = new Set(['booth', 'booth_committee', 'booth_bla']);

/** Short geo chip for a post, e.g. "Main Taluka", "Ward 140", "Booth 12". */
export function getPostGeoChip(post: CadreMemberPostDetail): string | null {
  const { positionLevelKey, talukaName, wardGeoName, boothNo } = post;

  if (BOOTH_LEVELS.has(positionLevelKey)) {
    if (boothNo) return `Booth ${boothNo}`;
    return wardGeoName ?? null;
  }
  if (WARD_LEVELS.has(positionLevelKey)) {
    return wardGeoName ?? null;
  }
  if (TALUKA_LEVELS.has(positionLevelKey)) {
    return talukaName ?? null;
  }
  return boothNo ? `Booth ${boothNo}` : wardGeoName ?? talukaName ?? null;
}

/** Uppercase-friendly breadcrumb segments, e.g. ["Constituency", "Ward 140", "Booth 12"]. */
export function getPostBreadcrumb(post: CadreMemberPostDetail): string[] {
  return getPostBreadcrumbItems(post).map((item) => item.label);
}

/** Single-line geo context, e.g. "Ward 140 · Booth 12". */
export function getPostGeoContextLine(post: CadreMemberPostDetail): string | null {
  const parts = getPostBreadcrumb(post).slice(1);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function getMemberDisplayName(member: CadreMemberCard): string {
  return (
    member.personName ??
    member.linkedVoter?.fullName ??
    member.linkedUser?.userId ??
    '—'
  );
}

export function getMemberPhone(member: CadreMemberCard): string | null {
  return member.personPhone ?? member.linkedVoter?.mobile ?? null;
}
