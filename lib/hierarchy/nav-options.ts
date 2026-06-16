import { isVerticalHubNode } from './forest-builder';
import {
  extractWardNumber,
  getNodeDisplayName,
  resolveEffectiveWardGeoId,
} from './map-filters';
import type { CadreConfig, CadreNodeDetail } from './types';
import { getRequiredWardGeoUnits } from './vacant-slots';

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

function sortGeoUnitsByWardNumber(
  a: CadreConfig['geoUnits'][number],
  b: CadreConfig['geoUnits'][number],
): number {
  const na = Number(extractWardNumber(a.name) ?? 0);
  const nb = Number(extractWardNumber(b.name) ?? 0);
  if (na !== nb) return na - nb;
  return a.name.localeCompare(b.name);
}

function pickWardNodeForGeo(
  nodes: CadreNodeDetail[],
  verticalId: string,
  wardGeoId: string,
): CadreNodeDetail | undefined {
  const candidates = nodes.filter(
    (n) =>
      n.verticalId === verticalId &&
      n.positionLevelKey === 'ward' &&
      n.wardGeoId === wardGeoId,
  );
  return (
    candidates.find((n) => !n.isVacant && getNodeDisplayName(n)) ?? candidates[0]
  );
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
  config?: CadreConfig,
  constituencyId?: string,
): NavSelectOption[] {
  if (config && constituencyId) {
    return getRequiredWardGeoUnits(config.geoUnits, constituencyId)
      .sort(sortGeoUnitsByWardNumber)
      .map((geo) => {
        const node = pickWardNodeForGeo(nodes, verticalId, geo.id);
        return {
          value: geo.id,
          label: node ? formatWardLabel(node) : geo.name,
        };
      });
  }

  const wards = nodes
    .filter(
      (n) =>
        n.verticalId === verticalId &&
        n.positionLevelKey === 'ward' &&
        n.wardGeoId,
    )
    .sort(sortByWardNumber);

  const byGeo = new Map<string, CadreNodeDetail>();
  for (const ward of wards) {
    if (!ward.wardGeoId) continue;
    if (!byGeo.has(ward.wardGeoId)) byGeo.set(ward.wardGeoId, ward);
  }

  return [...byGeo.values()]
    .sort(sortByWardNumber)
    .flatMap((ward) => {
      if (!ward.wardGeoId) return [];
      return [{ value: ward.wardGeoId, label: formatWardLabel(ward) }];
    });
}

export function buildBoothOptions(
  nodes: CadreNodeDetail[],
  wardGeoId: string,
): NavSelectOption[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return nodes
    .filter(
      (n) =>
        n.positionLevelKey === 'booth' &&
        resolveEffectiveWardGeoId(n, byId) === wardGeoId &&
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

export type NavPath = {
  verticalId: string;
  wardGeoId: string;
  boothNo: string;
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
