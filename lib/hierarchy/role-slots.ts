import {
  getMemberDisplayName,
  getMemberPhone,
} from '@/lib/hierarchy/geo-attribution';
import type { CadreMemberCard } from '@/lib/hierarchy/types';

export type RoleAssignee = {
  id: string;
  name: string;
  phone: string | null;
};

export type RoleSlot = {
  role: string;
  assignees: RoleAssignee[];
};

/** Exact positionName match after DB remap — no legacy aliases. */
export function buildRoleSlots(
  roles: string[],
  members: CadreMemberCard[],
  levelKey: string,
): RoleSlot[] {
  const displayRoles = roles.length > 0 ? roles : ['Executive Member'];
  return displayRoles.map((role) => {
    const assignees: RoleAssignee[] = [];
    const seen = new Set<string>();
    for (const member of members) {
      const holdsRole = member.posts.some(
        (post) =>
          post.positionLevelKey === levelKey && post.positionName === role,
      );
      if (!holdsRole || seen.has(member.id)) continue;
      seen.add(member.id);
      assignees.push({
        id: member.id,
        name: getMemberDisplayName(member),
        phone: getMemberPhone(member),
      });
    }
    return { role, assignees };
  });
}
