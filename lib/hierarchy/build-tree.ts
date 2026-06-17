const LEVEL_COLORS: Record<string, string> = {
  vertical: '#6366f1',
  committee_hub: '#64748b',
  taluka: '#1e40af',
  taluka_committee: '#7c3aed',
  taluka_committee_group: '#7c3aed',
  wards_group: '#0d9488',
  ward: '#0d9488',
  booth: '#ca8a04',
  booth_committee: '#c2410c',
  ward_committee: '#9333ea',
  ward_committee_group: '#9333ea',
  booths_group: '#ca8a04',
  booth_group: '#ca8a04',
};

export function getLevelColor(levelKey: string): string {
  return LEVEL_COLORS[levelKey] ?? '#64748b';
}
