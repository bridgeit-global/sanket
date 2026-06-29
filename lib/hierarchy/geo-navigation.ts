import type { CadreMemberCard, CadreMemberPostDetail } from './types';

const TALUKA_LEVELS = new Set(['taluka', 'taluka_committee']);

export type GeoBreadcrumbTarget =
  | { scope: 'constituency' }
  | { scope: 'taluka'; talukaId: string }
  | { scope: 'ward'; wardGeoId: string }
  | { scope: 'booth'; wardGeoId: string | null; boothNo: string };

export type PostBreadcrumbItem = {
  label: string;
  target: GeoBreadcrumbTarget;
};

function comparePosts(a: CadreMemberPostDetail, b: CadreMemberPostDetail): number {
  if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  if (a.positionLevelSortOrder !== b.positionLevelSortOrder) {
    return a.positionLevelSortOrder - b.positionLevelSortOrder;
  }
  return a.positionSortOrder - b.positionSortOrder;
}

function postMatchesGeoScope(
  post: CadreMemberPostDetail,
  target: GeoBreadcrumbTarget,
): boolean {
  switch (target.scope) {
    case 'constituency':
      return !post.wardGeoId && !post.boothNo;
    case 'taluka':
      return post.talukaId === target.talukaId;
    case 'ward':
      return post.wardGeoId === target.wardGeoId;
    case 'booth':
      if (post.boothNo !== target.boothNo) return false;
      return target.wardGeoId == null || post.wardGeoId === target.wardGeoId;
  }
}

/** Breadcrumb segments with geography targets for senior-member navigation. */
export function getPostBreadcrumbItems(post: CadreMemberPostDetail): PostBreadcrumbItem[] {
  const items: PostBreadcrumbItem[] = [
    { label: 'Constituency', target: { scope: 'constituency' } },
  ];
  if (post.talukaName && post.talukaId && TALUKA_LEVELS.has(post.positionLevelKey)) {
    items.push({
      label: post.talukaName,
      target: { scope: 'taluka', talukaId: post.talukaId },
    });
  }
  if (post.wardGeoName && post.wardGeoId) {
    items.push({
      label: post.wardGeoName,
      target: { scope: 'ward', wardGeoId: post.wardGeoId },
    });
  }
  if (post.boothNo) {
    items.push({
      label: `Booth ${post.boothNo}`,
      target: {
        scope: 'booth',
        wardGeoId: post.wardGeoId,
        boothNo: post.boothNo,
      },
    });
  }
  return items;
}

/**
 * Member holding the most senior post (lowest sort order) in the given geography.
 * Lower position / level sort orders rank higher in the org chart.
 */
export function findSeniorMemberForGeo(
  members: CadreMemberCard[],
  target: GeoBreadcrumbTarget,
): CadreMemberCard | null {
  let best: { member: CadreMemberCard; post: CadreMemberPostDetail } | null = null;

  for (const member of members) {
    for (const post of member.posts) {
      if (!postMatchesGeoScope(post, target)) continue;
      if (!best || comparePosts(post, best.post) < 0) {
        best = { member, post };
      }
    }
  }

  return best?.member ?? null;
}
