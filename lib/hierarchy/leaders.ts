import { findSeniorMemberForGeo } from './geo-navigation';
import type { CadreMemberCard, CadreMemberPostDetail } from './types';

export type HierarchyWardHead = {
  wardGeoId: string;
  member: CadreMemberCard | null;
};

export type HierarchyLeaders = {
  talukaAdhyaksh: CadreMemberCard | null;
  wardHeads: HierarchyWardHead[];
};

/** Pick taluka (constituency-scope) and ward adhyaksh from members already filtered to a vertical. */
export function resolveHierarchyLeaders(
  members: CadreMemberCard[],
  wardGeoIds: string[],
): HierarchyLeaders {
  const talukaAdhyaksh = findSeniorMemberForGeo(members, { scope: 'constituency' });
  const wardHeads = wardGeoIds.map((wardGeoId) => ({
    wardGeoId,
    member: findSeniorMemberForGeo(members, { scope: 'ward', wardGeoId }),
  }));
  return { talukaAdhyaksh, wardHeads };
}

/** Minimal member cards used only for leader resolution from post rows. */
export function buildStubMembersFromPosts(
  postsByMemberId: Map<string, CadreMemberPostDetail[]>,
  verticalId?: string,
): CadreMemberCard[] {
  const verticals = verticalId
    ? [{ id: verticalId, name: '', isPrimary: true, sortOrder: 0 }]
    : [];

  return [...postsByMemberId.entries()]
    .map(([id, posts]) => ({
      id,
      constituencyId: null,
      personName: null,
      personPhone: null,
      personEmail: null,
      photoUrl: null,
      userId: null,
      epicNumber: null,
      notes: null,
      isActive: true,
      verticals,
      posts: verticalId
        ? posts.filter((post) => post.verticalId === verticalId)
        : posts,
      linkedUser: null,
      linkedVoter: null,
      whatsappPhone: null,
    }))
    .filter((member) => member.posts.length > 0);
}
