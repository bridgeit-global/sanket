import { findSeniorMemberForGeo } from './geo-navigation';
import { postMatchesBoothScope } from './booth-geo-units';
import type { CadreMemberCard } from './types';

export type VerticalRef = {
  id: string;
  name: string;
  sortOrder: number;
};

function memberBelongsToVertical(member: CadreMemberCard, verticalId: string): boolean {
  return member.verticals.some((vertical) => vertical.id === verticalId);
}

export function findTalukaHeadForVertical(
  members: CadreMemberCard[],
  verticalId: string,
): CadreMemberCard | null {
  const verticalMembers = members.filter(
    (member) =>
      memberBelongsToVertical(member, verticalId) &&
      member.posts.some((post) => post.positionLevelKey === 'taluka'),
  );
  return findSeniorMemberForGeo(verticalMembers, { scope: 'constituency' });
}

export function findWardHeadForVertical(
  members: CadreMemberCard[],
  wardGeoId: string,
  verticalId: string,
): CadreMemberCard | null {
  const verticalMembers = members.filter(
    (member) =>
      memberBelongsToVertical(member, verticalId) &&
      member.posts.some(
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
  const verticalMembers = members.filter(
    (member) =>
      memberBelongsToVertical(member, verticalId) &&
      member.posts.some(
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
