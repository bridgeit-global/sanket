import { getBoothGeoUnits, extractBoothNumber } from './booth-geo-units';
import {
  filterBoothCommitteeMembers,
  filterTalukaCommitteeMembers,
  filterWardCommitteeMembers,
} from './member-list';
import {
  findBoothBlaForVertical,
  findBoothHeadForVertical,
  findTalukaHeadForVertical,
  findWardHeadForVertical,
} from './vertical-leaders';
import type { CadreConfig, CadreMemberCard } from './types';

export const CANVAS_COMMITTEE_PREVIEW_LIMIT = 4;

export type HierarchyCanvasBooth = {
  boothNo: string;
  adhyaksh: CadreMemberCard | null;
  bla: CadreMemberCard | null;
  committeeMembers: CadreMemberCard[];
  committeeTotal: number;
};

export type HierarchyCanvasWard = {
  wardGeoId: string;
  adhyaksh: CadreMemberCard | null;
  committeeMembers: CadreMemberCard[];
  committeeTotal: number;
  booths: HierarchyCanvasBooth[];
};

export type HierarchyCanvasData = {
  talukaAdhyaksh: CadreMemberCard | null;
  talukaCommitteeMembers: CadreMemberCard[];
  talukaCommitteeTotal: number;
  wards: HierarchyCanvasWard[];
};

export const EMPTY_CANVAS_DATA: HierarchyCanvasData = {
  talukaAdhyaksh: null,
  talukaCommitteeMembers: [],
  talukaCommitteeTotal: 0,
  wards: [],
};

function boothNumbersForWard(
  geoUnits: CadreConfig['geoUnits'],
  constituencyId: string,
  wardGeoId: string,
): string[] {
  return getBoothGeoUnits(geoUnits, constituencyId, wardGeoId)
    .map((unit) => extractBoothNumber(unit.name))
    .filter((boothNo): boothNo is string => Boolean(boothNo));
}

export function resolveHierarchyCanvasData(
  members: CadreMemberCard[],
  verticalId: string,
  wardGeoIds: string[],
  geoUnits: CadreConfig['geoUnits'],
  constituencyId: string,
  options?: { includeBooths?: boolean },
): HierarchyCanvasData {
  const includeBooths = options?.includeBooths ?? true;
  const talukaAdhyaksh = findTalukaHeadForVertical(members, verticalId);
  const talukaCommitteeAll = filterTalukaCommitteeMembers(members, verticalId);

  const wards = wardGeoIds.map((wardGeoId) => {
    const adhyaksh = findWardHeadForVertical(members, wardGeoId, verticalId);
    const wardCommitteeAll = filterWardCommitteeMembers(members, wardGeoId, verticalId);
    const boothNumbers = includeBooths
      ? boothNumbersForWard(geoUnits, constituencyId, wardGeoId)
      : [];

    const booths = boothNumbers.map((boothNo) => {
      const boothAdhyaksh = findBoothHeadForVertical(
        members,
        wardGeoId,
        boothNo,
        verticalId,
      );
      const bla = findBoothBlaForVertical(members, wardGeoId, boothNo, verticalId);
      const boothCommitteeAll = filterBoothCommitteeMembers(
        members,
        wardGeoId,
        boothNo,
        verticalId,
      );
      return {
        boothNo,
        adhyaksh: boothAdhyaksh,
        bla,
        committeeMembers: boothCommitteeAll,
        committeeTotal: boothCommitteeAll.length,
      };
    });

    return {
      wardGeoId,
      adhyaksh,
      committeeMembers: wardCommitteeAll,
      committeeTotal: wardCommitteeAll.length,
      booths,
    };
  });

  return {
    talukaAdhyaksh,
    talukaCommitteeMembers: talukaCommitteeAll,
    talukaCommitteeTotal: talukaCommitteeAll.length,
    wards,
  };
}

export function collectCanvasMemberIds(data: HierarchyCanvasData): Set<string> {
  const ids = new Set<string>();
  const add = (member: CadreMemberCard | null) => {
    if (member?.id) ids.add(member.id);
  };
  const addMany = (members: CadreMemberCard[]) => {
    for (const member of members) add(member);
  };

  add(data.talukaAdhyaksh);
  addMany(data.talukaCommitteeMembers);
  for (const ward of data.wards) {
    add(ward.adhyaksh);
    addMany(ward.committeeMembers);
    for (const booth of ward.booths) {
      add(booth.adhyaksh);
      add(booth.bla);
      addMany(booth.committeeMembers);
    }
  }
  return ids;
}

export function hydrateCanvasData(
  data: HierarchyCanvasData,
  membersById: Map<string, CadreMemberCard>,
): HierarchyCanvasData {
  const hydrate = (member: CadreMemberCard | null) =>
    member ? membersById.get(member.id) ?? member : null;
  const hydrateMany = (members: CadreMemberCard[]) =>
    members.map((member) => membersById.get(member.id) ?? member);

  return {
    talukaAdhyaksh: hydrate(data.talukaAdhyaksh),
    talukaCommitteeMembers: hydrateMany(data.talukaCommitteeMembers),
    talukaCommitteeTotal: data.talukaCommitteeTotal,
    wards: data.wards.map((ward) => ({
      wardGeoId: ward.wardGeoId,
      adhyaksh: hydrate(ward.adhyaksh),
      committeeMembers: hydrateMany(ward.committeeMembers),
      committeeTotal: ward.committeeTotal,
      booths: ward.booths.map((booth) => ({
        boothNo: booth.boothNo,
        adhyaksh: hydrate(booth.adhyaksh),
        bla: hydrate(booth.bla),
        committeeMembers: hydrateMany(booth.committeeMembers),
        committeeTotal: booth.committeeTotal,
      })),
    })),
  };
}
