import type { CadreNodeDetail } from './types';

export const COMMITTEE_HUB_PREFIX = 'committee-hub:';
export const COMMITTEE_HUB_LEVEL_KEY = 'committee_hub';
/** Collapse when a parent has this many or more committee siblings. */
export const COMMITTEE_COLLAPSE_THRESHOLD = 7;

const COMMITTEE_LEVELS = ['ward_committee', 'booth_committee'] as const;
type CommitteeLevel = (typeof COMMITTEE_LEVELS)[number];

export function committeeHubId(parentId: string, levelKey: CommitteeLevel): string {
  return `${COMMITTEE_HUB_PREFIX}${parentId}::${levelKey}`;
}

export function isCommitteeHubNode(node: Pick<CadreNodeDetail, 'id'>): boolean {
  return node.id.startsWith(COMMITTEE_HUB_PREFIX);
}

export function parseCommitteeHubId(
  hubId: string,
): { parentId: string; levelKey: CommitteeLevel } | null {
  if (!hubId.startsWith(COMMITTEE_HUB_PREFIX)) return null;
  const rest = hubId.slice(COMMITTEE_HUB_PREFIX.length);
  const sep = rest.indexOf('::');
  if (sep < 0) return null;
  const parentId = rest.slice(0, sep);
  const levelKey = rest.slice(sep + 2);
  if (levelKey !== 'ward_committee' && levelKey !== 'booth_committee') return null;
  return { parentId, levelKey };
}

export type CommitteeHubStats = {
  totalNodes: number;
  vacantNodes: number;
  levelKey: CommitteeLevel;
  levelLabel: string;
  parentId: string;
};

export type CommitteeHubResult = {
  nodes: CadreNodeDetail[];
  hubMembers: Map<string, CadreNodeDetail[]>;
  hubStats: Map<string, CommitteeHubStats>;
};

function committeeLevelLabel(levelKey: CommitteeLevel): string {
  return levelKey === 'ward_committee' ? 'Ward Committee' : 'Booth Committee';
}

function makeCommitteeHubNode(
  parentId: string,
  levelKey: CommitteeLevel,
  members: CadreNodeDetail[],
): CadreNodeDetail {
  const sample = members[0];
  if (!sample) {
    throw new Error('makeCommitteeHubNode requires at least one member');
  }
  const label = committeeLevelLabel(levelKey);
  return {
    id: committeeHubId(parentId, levelKey),
    parentId,
    verticalId: sample.verticalId,
    positionId: sample.positionId,
    constituencyId: sample.constituencyId,
    divisionId: sample.divisionId,
    districtId: sample.districtId,
    talukaId: sample.talukaId,
    wardGeoId: sample.wardGeoId,
    electionId: sample.electionId,
    boothNo: sample.boothNo,
    personName: `${members.length} ${label} members`,
    personPhone: null,
    personEmail: null,
    photoUrl: null,
    userId: null,
    epicNumber: null,
    notes: null,
    isVacant: false,
    isActive: true,
    appointedAt: null,
    termEndsAt: null,
    positionName: sample.positionName,
    positionSortOrder: sample.positionSortOrder,
    positionLevelKey: COMMITTEE_HUB_LEVEL_KEY,
    positionLevelName: label,
    verticalName: sample.verticalName,
    divisionName: sample.divisionName,
    districtName: sample.districtName,
    talukaName: sample.talukaName,
    wardGeoName: sample.wardGeoName,
    linkedUser: null,
    linkedVoter: null,
  };
}

/**
 * Replaces wide sibling rows of committee members with a single hub card when
 * count meets {@link COMMITTEE_COLLAPSE_THRESHOLD}. Members in
 * `preserveMemberIds` (search matches, URL focus) keep the row expanded.
 */
export function applyCommitteeHubCollapse(
  nodes: CadreNodeDetail[],
  opts?: { preserveMemberIds?: ReadonlySet<string> },
): CommitteeHubResult {
  const preserveIds = opts?.preserveMemberIds ?? new Set<string>();
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const childrenByParent = new Map<string, CadreNodeDetail[]>();

  for (const node of nodes) {
    if (!node.parentId || isCommitteeHubNode(node)) continue;
    const list = childrenByParent.get(node.parentId) ?? [];
    list.push(node);
    childrenByParent.set(node.parentId, list);
  }

  const collapsedChildIds = new Set<string>();
  const hubMembers = new Map<string, CadreNodeDetail[]>();
  const hubStats = new Map<string, CommitteeHubStats>();
  const hubNodes: CadreNodeDetail[] = [];

  for (const [parentId, children] of childrenByParent) {
    if (!nodeById.has(parentId)) continue;

    for (const levelKey of COMMITTEE_LEVELS) {
      const committeeChildren = children.filter(
        (c) => c.positionLevelKey === levelKey && !collapsedChildIds.has(c.id),
      );
      if (committeeChildren.length < COMMITTEE_COLLAPSE_THRESHOLD) continue;
      if (committeeChildren.some((c) => preserveIds.has(c.id))) continue;

      const hubId = committeeHubId(parentId, levelKey);
      const vacantNodes = committeeChildren.filter((c) => c.isVacant).length;

      const sortedMembers = [...committeeChildren].sort((a, b) =>
        (a.personName ?? a.linkedVoter?.fullName ?? '').localeCompare(
          b.personName ?? b.linkedVoter?.fullName ?? '',
        ),
      );

      hubMembers.set(hubId, sortedMembers);
      hubStats.set(hubId, {
        totalNodes: committeeChildren.length,
        vacantNodes,
        levelKey,
        levelLabel: committeeLevelLabel(levelKey),
        parentId,
      });
      hubNodes.push(makeCommitteeHubNode(parentId, levelKey, committeeChildren));

      for (const child of committeeChildren) {
        collapsedChildIds.add(child.id);
      }
    }
  }

  const result = nodes.filter((n) => !collapsedChildIds.has(n.id));
  result.push(...hubNodes);

  return { nodes: result, hubMembers, hubStats };
}

/** True when any collapsed member matches the given id set. */
export function committeeHubHasMatch(
  hubId: string,
  hubMembers: Map<string, CadreNodeDetail[]>,
  matchIds: ReadonlySet<string>,
): boolean {
  if (matchIds.size === 0) return false;
  const members = hubMembers.get(hubId);
  if (!members) return false;
  return members.some((m) => matchIds.has(m.id));
}
