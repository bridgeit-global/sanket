import { findSeniorMemberForGeo } from './geo-navigation';
import { postMatchesBoothScope } from './booth-geo-units';
import type { CadreMemberCard } from './types';

export type VerticalRef = {
  id: string;
  name: string;
  sortOrder: number;
};

function memberHasPostForVertical(
  member: CadreMemberCard,
  verticalId: string,
  predicate: (post: CadreMemberCard['posts'][number]) => boolean,
): boolean {
  return member.posts.some(
    (post) => post.verticalId === verticalId && predicate(post),
  );
}

export function findTalukaHeadForVertical(
  members: CadreMemberCard[],
  verticalId: string,
): CadreMemberCard | null {
  const verticalMembers = members.filter((member) =>
    memberHasPostForVertical(
      member,
      verticalId,
      (post) => post.positionLevelKey === 'taluka',
    ),
  );
  return findSeniorMemberForGeo(verticalMembers, { scope: 'constituency' });
}

export function findWardHeadForVertical(
  members: CadreMemberCard[],
  wardGeoId: string,
  verticalId: string,
): CadreMemberCard | null {
  const verticalMembers = members.filter((member) =>
    memberHasPostForVertical(
      member,
      verticalId,
      (post) => post.positionLevelKey === 'ward' && post.wardGeoId === wardGeoId,
    ),
  );
  return findSeniorMemberForGeo(verticalMembers, { scope: 'ward', wardGeoId });
}

export function findBoothHeadForVertical(
  members: CadreMemberCard[],
  wardGeoId: string,
  boothNo: string,
  verticalId: string,
): CadreMemberCard | null {
  const verticalMembers = members.filter((member) =>
    memberHasPostForVertical(
      member,
      verticalId,
      (post) =>
        post.positionLevelKey === 'booth' &&
        postMatchesBoothScope(post, wardGeoId, boothNo),
    ),
  );
  return findSeniorMemberForGeo(verticalMembers, {
    scope: 'booth',
    wardGeoId,
    boothNo,
  });
}

export function findBoothBlasForVertical(
  members: CadreMemberCard[],
  wardGeoId: string,
  boothNo: string,
  verticalId: string,
): CadreMemberCard[] {
  const matching = members.filter((member) =>
    memberHasPostForVertical(
      member,
      verticalId,
      (post) =>
        post.positionLevelKey === 'booth_bla' &&
        postMatchesBoothScope(post, wardGeoId, boothNo),
    ),
  );

  return matching.sort((a, b) => {
    const postA = a.posts.find(
      (p) =>
        p.verticalId === verticalId &&
        p.positionLevelKey === 'booth_bla' &&
        postMatchesBoothScope(p, wardGeoId, boothNo),
    );
    const postB = b.posts.find(
      (p) =>
        p.verticalId === verticalId &&
        p.positionLevelKey === 'booth_bla' &&
        postMatchesBoothScope(p, wardGeoId, boothNo),
    );
    if (postA && postB) {
      const orderA = postA.sortOrder ?? 0;
      const orderB = postB.sortOrder ?? 0;
      if (orderA !== orderB) return orderA - orderB;
    }
    return (a.personName ?? '').localeCompare(b.personName ?? '');
  });
}

export function findBoothBlaForVertical(
  members: CadreMemberCard[],
  wardGeoId: string,
  boothNo: string,
  verticalId: string,
): CadreMemberCard | null {
  const blas = findBoothBlasForVertical(members, wardGeoId, boothNo, verticalId);
  return blas[0] ?? null;
}
