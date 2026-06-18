import { getMemberDisplayName } from './geo-attribution';
import type { CadreMemberCard, CadreMemberPostDetail } from './types';

export const HIERARCHY_URL_PARAMS = {
  search: 'search',
  vertical: 'vertical',
  ward: 'ward',
  booth: 'boothNo',
} as const;

/** Headline post shown big on the card (primary flag, then sort order, then level). */
export function getPrimaryPost(
  member: CadreMemberCard,
): CadreMemberPostDetail | null {
  if (member.posts.length === 0) return null;
  return [...member.posts].sort(comparePosts)[0] ?? null;
}

/** Secondary posts rendered as "Label (Alt)" lines under the headline. */
export function getAltPosts(member: CadreMemberCard): CadreMemberPostDetail[] {
  const primary = getPrimaryPost(member);
  return member.posts.filter((p) => p.id !== primary?.id).sort(comparePosts);
}

export function getPostTitle(post: CadreMemberPostDetail): string {
  return post.label?.trim() || post.positionName;
}

function comparePosts(a: CadreMemberPostDetail, b: CadreMemberPostDetail): number {
  if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  if (a.positionLevelSortOrder !== b.positionLevelSortOrder) {
    return a.positionLevelSortOrder - b.positionLevelSortOrder;
  }
  return a.positionSortOrder - b.positionSortOrder;
}

export function extractWardNumber(wardGeoName: string | null): number {
  if (!wardGeoName) return Number.MAX_SAFE_INTEGER;
  const match = wardGeoName.match(/Ward\s+(\d+)/i);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function memberMatchesSearch(member: CadreMemberCard, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (getMemberDisplayName(member).toLowerCase().includes(q)) return true;
  if ((member.epicNumber ?? '').toLowerCase().includes(q)) return true;
  return member.posts.some(
    (p) =>
      p.positionName.toLowerCase().includes(q) ||
      (p.label ?? '').toLowerCase().includes(q),
  );
}

function memberHasVertical(member: CadreMemberCard, verticalId: string): boolean {
  return member.verticals.some((v) => v.id === verticalId);
}

function memberMatchesWard(member: CadreMemberCard, wardGeoId: string): boolean {
  return member.posts.some((p) => p.wardGeoId === wardGeoId);
}

function memberMatchesBooth(member: CadreMemberCard, boothNo: string): boolean {
  return member.posts.some((p) => p.boothNo === boothNo);
}

export type MemberFilterState = {
  search?: string;
  verticalId?: string;
  wardGeoId?: string;
  boothNo?: string;
};

export function filterMembers(
  members: CadreMemberCard[],
  filters: MemberFilterState,
): CadreMemberCard[] {
  const search = filters.search?.trim() ?? '';
  const verticalId = filters.verticalId?.trim() ?? '';
  const wardGeoId = filters.wardGeoId?.trim() ?? '';
  const boothNo = filters.boothNo?.trim() ?? '';

  return members.filter((member) => {
    if (search && !memberMatchesSearch(member, search)) return false;
    if (verticalId && !memberHasVertical(member, verticalId)) return false;
    if (wardGeoId && !memberMatchesWard(member, wardGeoId)) return false;
    if (boothNo && !memberMatchesBooth(member, boothNo)) return false;
    return true;
  });
}

/** Order by primary post level (taluka -> ward -> booth -> committee), ward, name. */
export function sortMembers(members: CadreMemberCard[]): CadreMemberCard[] {
  return [...members].sort((a, b) => {
    const pa = getPrimaryPost(a);
    const pb = getPrimaryPost(b);
    const la = pa?.positionLevelSortOrder ?? Number.MAX_SAFE_INTEGER;
    const lb = pb?.positionLevelSortOrder ?? Number.MAX_SAFE_INTEGER;
    if (la !== lb) return la - lb;
    const wa = extractWardNumber(pa?.wardGeoName ?? null);
    const wb = extractWardNumber(pb?.wardGeoName ?? null);
    if (wa !== wb) return wa - wb;
    return getMemberDisplayName(a).localeCompare(getMemberDisplayName(b));
  });
}

// --- Position level helpers (replaces tree child-position logic) ---

export function positionNeedsWard(levelKey: string | null): boolean {
  return (
    levelKey != null &&
    ['ward', 'booth', 'booth_committee', 'ward_committee'].includes(levelKey)
  );
}

export function positionNeedsBooth(levelKey: string | null): boolean {
  return levelKey != null && ['booth', 'booth_committee'].includes(levelKey);
}

export function positionNeedsTaluka(levelKey: string | null): boolean {
  return levelKey != null && ['taluka', 'taluka_committee'].includes(levelKey);
}
