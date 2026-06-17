import { VERTICAL_LEVEL_KEY } from './forest-builder';
import type { CadreConfig, CadreNodeDetail } from './types';

/** Next level down the chain: vertical hub → taluka → ward → booth → committee. */
const CHILD_LEVEL_BY_PARENT: Record<string, string> = {
  [VERTICAL_LEVEL_KEY]: 'taluka',
  taluka: 'ward',
  ward: 'booth',
  booth: 'booth_committee',
  taluka_committee_group: 'taluka_committee',
  ward_committee_group: 'ward_committee',
  booth_group: 'booth_committee',
};

export function getSuggestedChildPositionId(
  parentLevelKey: string | null,
  config: CadreConfig,
): string {
  const childLevel = parentLevelKey ? CHILD_LEVEL_BY_PARENT[parentLevelKey] : 'taluka';
  if (!childLevel) return '';
  return (
    config.positions.find((p) => p.isActive && p.levelKey === childLevel)?.id ?? ''
  );
}

export function getPositionLevelKey(
  positionId: string,
  config: CadreConfig,
): string | null {
  return config.positions.find((p) => p.id === positionId)?.levelKey ?? null;
}

export function positionNeedsWard(levelKey: string | null): boolean {
  return (
    levelKey != null &&
    ['ward', 'booth', 'booth_committee', 'ward_committee'].includes(levelKey)
  );
}

export function positionNeedsBooth(levelKey: string | null): boolean {
  return levelKey != null && ['booth', 'booth_committee'].includes(levelKey);
}

/** Ward/booth context a new child should inherit from its parent. */
export function getInheritedGeo(parent: CadreNodeDetail | null): {
  wardGeoId: string;
  boothNo: string;
} {
  if (!parent) return { wardGeoId: '', boothNo: '' };

  if (parent.positionLevelKey === 'booth_group') {
    return {
      wardGeoId: parent.wardGeoId ?? '',
      boothNo: parent.boothNo ?? '',
    };
  }

  if (parent.positionLevelKey === 'ward_committee_group') {
    return {
      wardGeoId: parent.wardGeoId ?? '',
      boothNo: '',
    };
  }

  const keepBooth = ['booth', 'booth_committee'].includes(parent.positionLevelKey);
  return {
    wardGeoId: parent.wardGeoId ?? '',
    boothNo: keepBooth ? parent.boothNo ?? '' : '',
  };
}
