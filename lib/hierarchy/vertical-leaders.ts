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

export function findBoothBlaForVertical(
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
        post.positionLevelKey === 'booth_bla' &&
        postMatchesBoothScope(post, wardGeoId, boothNo),
    ),
  );
  return findSeniorMemberForGeo(verticalMembers, {
    scope: 'booth',
    wardGeoId,
    boothNo,
  });
}
