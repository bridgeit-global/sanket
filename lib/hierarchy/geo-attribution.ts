import type { CadreNodeDetail } from './types';

export type NodeGeoAttribution = {
  /** Primary geo label, e.g. "Ward 144" or "Booth 42". */
  primary: string | null;
  /** Secondary context, e.g. ward name under a booth node. */
  secondary: string | null;
};

/** Ward/booth labels for map cards and detail panels. */
export function getNodeGeoAttribution(cadre: CadreNodeDetail): NodeGeoAttribution {
  const { positionLevelKey, wardGeoName, boothNo } = cadre;

  if (positionLevelKey === 'taluka') {
    return { primary: null, secondary: null };
  }

  if (positionLevelKey === 'ward' || positionLevelKey === 'ward_committee') {
    return { primary: wardGeoName, secondary: null };
  }

  if (positionLevelKey === 'booth' || positionLevelKey === 'booth_committee') {
    const boothLabel = boothNo ? `Booth ${boothNo}` : null;
    if (boothLabel && wardGeoName) {
      return { primary: boothLabel, secondary: wardGeoName };
    }
    return { primary: boothLabel ?? wardGeoName, secondary: null };
  }

  if (boothNo) {
    return {
      primary: wardGeoName,
      secondary: `Booth ${boothNo}`,
    };
  }

  return { primary: wardGeoName, secondary: null };
}

export function getNodePersonLabel(cadre: CadreNodeDetail): string {
  return (
    cadre.personName ?? cadre.linkedVoter?.fullName ?? cadre.linkedUser?.userId ?? '—'
  );
}

export function formatVacantCardTitle(cadre: CadreNodeDetail): string {
  const { primary } = getNodeGeoAttribution(cadre);
  if (primary) return `${primary} — Vacant`;
  return 'Vacant';
}

/** Card title for filled nodes; mirrors vacant "geo — label" when geo is known. */
export function formatFilledCardTitle(cadre: CadreNodeDetail): string {
  const personName = getNodePersonLabel(cadre);
  const { primary } = getNodeGeoAttribution(cadre);
  if (primary) return `${primary} — ${personName}`;
  return personName;
}

/** Ward context under a booth title when primary geo is already in the title line. */
export function formatFilledGeoSubtitle(cadre: CadreNodeDetail): string | null {
  const { primary, secondary } = getNodeGeoAttribution(cadre);
  return primary && secondary ? secondary : null;
}

export function formatGeoContextLine(cadre: CadreNodeDetail): string | null {
  const { primary, secondary } = getNodeGeoAttribution(cadre);
  if (primary && secondary) return `${secondary} · ${primary}`;
  return primary ?? secondary;
}
