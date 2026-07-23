/** English org-chart committee roles only (no Hindi/Marathi mixed titles). */

export const TALUKA_WARD_COMMITTEE_ROLES = [
  'Working President',
  'Vice President',
  'General Secretary',
  'Secretary',
  'Joint Secretary',
  'Treasurer',
  'Organization Secretary',
  'Office Secretary',
  'Executive Member',
] as const;

export const BOOTH_COMMITTEE_ROLES = [
  'Vice President',
  'Treasurer',
  'Secretary',
  'Organization Secretary',
  'Joint Secretary',
  'Executive Member',
] as const;

export function isChartCommitteeRole(
  levelKey: string,
  positionName: string,
): boolean {
  if (levelKey === 'taluka_committee' || levelKey === 'ward_committee') {
    return (TALUKA_WARD_COMMITTEE_ROLES as readonly string[]).includes(positionName);
  }
  if (levelKey === 'booth_committee') {
    return (BOOTH_COMMITTEE_ROLES as readonly string[]).includes(positionName);
  }
  return true;
}

/**
 * Chart role order only. Prefer roles that exist in DB config;
 * if none match (stale DB), fall back to the full chart list.
 */
export function resolveChartCommitteeRoles(
  levelKey: 'taluka_committee' | 'ward_committee' | 'booth_committee',
  dbNames: string[],
): string[] {
  const allow =
    levelKey === 'booth_committee' ? BOOTH_COMMITTEE_ROLES : TALUKA_WARD_COMMITTEE_ROLES;
  const fromDb = allow.filter((name) => dbNames.includes(name));
  return fromDb.length > 0 ? [...fromDb] : [...allow];
}
