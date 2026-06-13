import { isVerticalHubNode } from './forest-builder';
import {
  extractWardNumber,
  getNodeDisplayName,
} from './map-filters';
import type { CadreNodeDetail } from './types';

export type NavSelectOption = { value: string; label: string };

export function formatWardLabel(node: CadreNodeDetail): string {
  const wardLabel = node.wardGeoName ?? (extractWardNumber(node.wardGeoName) ? `Ward ${extractWardNumber(node.wardGeoName)}` : 'Ward');
  const name = getNodeDisplayName(node);
  return name ? `${wardLabel} — ${name}` : wardLabel;
}

function sortByWardNumber(a: CadreNodeDetail, b: CadreNodeDetail): number {
  const na = Number(extractWardNumber(a.wardGeoName) ?? 0);
  const nb = Number(extractWardNumber(b.wardGeoName) ?? 0);
  if (na !== nb) return na - nb;
  return (a.wardGeoName ?? '').localeCompare(b.wardGeoName ?? '');
}

function sortByBoothNo(a: CadreNodeDetail, b: CadreNodeDetail): number {
  const na = Number(a.boothNo ?? 0);
  const nb = Number(b.boothNo ?? 0);
  if (na !== nb) return na - nb;
  return (a.boothNo ?? '').localeCompare(b.boothNo ?? '');
}

export function buildVerticalOptions(
  verticals: Array<{ id: string; name: string }>,
): NavSelectOption[] {
  return verticals.map((v) => ({ value: v.id, label: v.name }));
}

export function buildWardOptions(
  nodes: CadreNodeDetail[],
  verticalId: string,
): NavSelectOption[] {
  const wards = nodes
    .filter(
      (n) =>
        n.verticalId === verticalId &&
        n.positionLevelKey === 'ward' &&
        n.wardGeoId &&
        !n.isVacant,
    )
    .sort(sortByWardNumber);

  const byGeo = new Map<string, CadreNodeDetail>();
  for (const ward of wards) {
    if (!ward.wardGeoId) continue;
    if (!byGeo.has(ward.wardGeoId)) byGeo.set(ward.wardGeoId, ward);
  }

  return [...byGeo.entries()].map(([geoId, ward]) => ({
    value: geoId,
    label: formatWardLabel(ward),
  }));
}

/** Ward committee members are children of the ward adhyaksh (Basic vertical). */
export function buildWardCommitteeOptions(
  nodes: CadreNodeDetail[],
  wardGeoId: string,
): NavSelectOption[] {
  const wardNodeIds = new Set(
    nodes
      .filter((n) => n.positionLevelKey === 'ward' && n.wardGeoId === wardGeoId)
      .map((n) => n.id),
  );

  return nodes
    .filter(
      (n) =>
        n.positionLevelKey === 'ward_committee' &&
        n.wardGeoId === wardGeoId &&
        n.parentId != null &&
        wardNodeIds.has(n.parentId),
    )
    .sort((a, b) => getNodeDisplayName(a).localeCompare(getNodeDisplayName(b)))
    .map((n) => ({
      value: n.id,
      label: getNodeDisplayName(n) || n.positionName,
    }));
}

export function buildBoothOptions(
  nodes: CadreNodeDetail[],
  wardGeoId: string,
): NavSelectOption[] {
  return nodes
    .filter(
      (n) =>
        n.positionLevelKey === 'booth' &&
        n.wardGeoId === wardGeoId &&
        n.boothNo,
    )
    .sort(sortByBoothNo)
    .flatMap((n) => {
      if (!n.boothNo) return [];
      const name = getNodeDisplayName(n);
      return [
        {
          value: n.boothNo,
          label: `Booth ${n.boothNo}${name ? ` — ${name}` : ''}`,
        },
      ];
    });
}

export function buildBoothCommitteeOptions(
  nodes: CadreNodeDetail[],
  wardGeoId: string,
  boothNo: string,
): NavSelectOption[] {
  const boothIds = new Set(
    nodes
      .filter(
        (n) =>
          n.positionLevelKey === 'booth' &&
          n.wardGeoId === wardGeoId &&
          n.boothNo === boothNo,
      )
      .map((n) => n.id),
  );

  return nodes
    .filter(
      (n) =>
        n.positionLevelKey === 'booth_committee' &&
        n.wardGeoId === wardGeoId &&
        n.boothNo === boothNo &&
        n.parentId != null &&
        boothIds.has(n.parentId),
    )
    .sort((a, b) => getNodeDisplayName(a).localeCompare(getNodeDisplayName(b)))
    .map((n) => ({
      value: n.id,
      label: getNodeDisplayName(n) || n.positionName,
    }));
}

export type NavPath = {
  verticalId: string;
  wardGeoId: string;
  wardMemberId: string;
  boothNo: string;
  boothMemberId: string;
};

/** Walk ancestors to backfill cascading nav from a matched node. */
export function resolveNavPathFromNode(
  node: CadreNodeDetail,
  nodes: CadreNodeDetail[],
): Partial<NavPath> {
  if (isVerticalHubNode(node)) return {};

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const path: Partial<NavPath> = { verticalId: node.verticalId };

  if (node.wardGeoId) path.wardGeoId = node.wardGeoId;
  if (node.boothNo) path.boothNo = node.boothNo;

  if (node.positionLevelKey === 'ward_committee') {
    path.wardMemberId = node.id;
  } else if (node.positionLevelKey === 'booth_committee') {
    path.boothMemberId = node.id;
  }

  let current = node.parentId ? byId.get(node.parentId) : undefined;
  while (current) {
    if (current.positionLevelKey === 'ward' && current.wardGeoId) {
      path.wardGeoId = current.wardGeoId;
    }
    if (current.positionLevelKey === 'booth' && current.boothNo) {
      path.boothNo = current.boothNo;
    }
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  return path;
}

export function inferDepthFromNav(path: {
  boothMemberId?: string;
  boothNo?: string;
  wardMemberId?: string;
}): 'ward' | 'booth' | 'committee' | undefined {
  if (path.boothMemberId) return 'committee';
  if (path.boothNo) return 'booth';
  if (path.wardMemberId) return 'ward';
  return undefined;
}
