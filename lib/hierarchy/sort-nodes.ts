import type { CadreNodeDetail } from './types';

function displayName(cadre: CadreNodeDetail): string {
  return cadre.personName ?? cadre.linkedVoter?.fullName ?? cadre.positionName;
}

/** Sibling ordering: level sortOrder → position sortOrder → name. */
export function compareSiblingNodes(a: CadreNodeDetail, b: CadreNodeDetail): number {
  const levelOrder =
    (a.positionLevelSortOrder ?? 999) - (b.positionLevelSortOrder ?? 999);
  if (levelOrder !== 0) return levelOrder;

  const positionOrder = (a.positionSortOrder ?? 999) - (b.positionSortOrder ?? 999);
  if (positionOrder !== 0) return positionOrder;

  return displayName(a).localeCompare(displayName(b), undefined, { sensitivity: 'base' });
}
