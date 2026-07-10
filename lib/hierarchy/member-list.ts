import { getMemberDisplayName, getMemberPhone } from './geo-attribution';
import { postMatchesBoothScope } from './booth-geo-units';
import type { CadreMemberCard, CadreMemberPostDetail } from './types';

export const HIERARCHY_URL_PARAMS = {
  search: 'search',
  vertical: 'vertical',
  position: 'position',
  ward: 'ward',
  booth: 'boothNo',
  member: 'member',
  page: 'page',
  pageSize: 'pageSize',
  view: 'view',
} as const;

export const HIERARCHY_VIEWS = {
  canvas: 'canvas',
  allMembers: 'all-members',
  talukaCommittee: 'taluka-committee',
  wardCommittee: 'ward-committee',
  boothCommittee: 'booth-committee',
} as const;

export function filterTalukaCommitteeMembers(
  members: CadreMemberCard[],
  verticalId: string,
): CadreMemberCard[] {
  if (!verticalId) return [];
  return members.filter(
    (member) =>
      memberHasVertical(member, verticalId) &&
      member.posts.some((post) => post.positionLevelKey === 'taluka_committee'),
  );
}

export function memberHasVertical(member: CadreMemberCard, verticalId: string): boolean {
  return member.verticals.some((v) => v.id === verticalId);
}

export function filterWardCommitteeMembers(
  members: CadreMemberCard[],
  wardGeoId: string,
  verticalId: string,
): CadreMemberCard[] {
  if (!wardGeoId || !verticalId) return [];
  return members.filter(
    (member) =>
      memberHasVertical(member, verticalId) &&
      member.posts.some(
        (post) =>
          post.positionLevelKey === 'ward_committee' && post.wardGeoId === wardGeoId,
      ),
  );
}

export function filterBoothCommitteeMembers(
  members: CadreMemberCard[],
  wardGeoId: string,
  boothNo: string,
  verticalId?: string,
): CadreMemberCard[] {
  if (!wardGeoId || !boothNo) return [];
  return members.filter((member) => {
    if (verticalId && !memberHasVertical(member, verticalId)) return false;
    return member.posts.some(
      (post) =>
        post.positionLevelKey === 'booth_committee' &&
        postMatchesBoothScope(post, wardGeoId, boothNo),
    );
  });
}

export const DEFAULT_MEMBER_PAGE_SIZE = 30;
export const MEMBER_PAGE_SIZE_OPTIONS = [20, 30, 50] as const;

/** Server-side bootstrap chunk size — keeps Supabase `.in()` URLs under header limits. */
export const BOOTSTRAP_MEMBER_PAGE_SIZE = 50;

export function parseMemberPageSizeParam(value: string | null): number {
  const parsed = Number.parseInt(value ?? String(DEFAULT_MEMBER_PAGE_SIZE), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_MEMBER_PAGE_SIZE;
  return (MEMBER_PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed)
    ? parsed
    : DEFAULT_MEMBER_PAGE_SIZE;
}

export function parseMemberPageParam(value: string | null): number {
  const parsed = Number.parseInt(value ?? '1', 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
}

export function paginateMembers<T>(
  items: T[],
  page: number,
  pageSize: number,
): {
  items: T[];
  totalPages: number;
  currentPage: number;
  totalItems: number;
} {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    totalPages,
    currentPage,
    totalItems,
  };
}

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

function parseSearchTerms(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
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

function memberMatchesSearch(member: CadreMemberCard, query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;
  const qLower = trimmed.toLowerCase();
  const terms = parseSearchTerms(trimmed);

  const queryDigits = trimmed.replace(/\D/g, '');
  if (queryDigits.length > 0) {
    const phone = getMemberPhone(member);
    if (phone?.replace(/\D/g, '').includes(queryDigits)) return true;
  }

  if (member.epicNumber?.toLowerCase().includes(qLower)) return true;

  const nameText = getMemberNameSearchText(member);
  if (memberNameMatchesSearch(nameText, trimmed)) return true;

  if (terms.length > 1) return false;

  const term = terms[0];
  return member.posts.some(
    (p) =>
      p.positionName.toLowerCase().includes(term) ||
      (p.label ?? '').toLowerCase().includes(term),
  );
}

/** Members matching search across the full hierarchy (ignores geo/vertical filters). */
export function filterMembersGlobalSearch(
  members: CadreMemberCard[],
  search: string,
  memberId?: string,
): CadreMemberCard[] {
  return sortMembers(
    filterMembers(members, {
      search,
      memberId,
    }),
  );
}

function memberMatchesWard(member: CadreMemberCard, wardGeoId: string): boolean {
  return member.posts.some((p) => p.wardGeoId === wardGeoId);
}

function memberMatchesBooth(member: CadreMemberCard, boothNo: string): boolean {
  return member.posts.some((p) => p.boothNo === boothNo);
}

function memberMatchesPosition(member: CadreMemberCard, positionId: string): boolean {
  return member.posts.some((p) => p.positionId === positionId);
}

export type MemberFilterState = {
  search?: string;
  verticalId?: string;
  positionId?: string;
  wardGeoId?: string;
  boothNo?: string;
  memberId?: string;
};

export function filterMembers(
  members: CadreMemberCard[],
  filters: MemberFilterState,
): CadreMemberCard[] {
  const search = filters.search?.trim() ?? '';
  const verticalId = filters.verticalId?.trim() ?? '';
  const positionId = filters.positionId?.trim() ?? '';
  const wardGeoId = filters.wardGeoId?.trim() ?? '';
  const boothNo = filters.boothNo?.trim() ?? '';
  const memberId = filters.memberId?.trim() ?? '';

  return members.filter((member) => {
    if (memberId && member.id !== memberId) return false;
    if (search && !memberMatchesSearch(member, search)) return false;
    if (verticalId && !memberHasVertical(member, verticalId)) return false;
    if (positionId && !memberMatchesPosition(member, positionId)) return false;
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
