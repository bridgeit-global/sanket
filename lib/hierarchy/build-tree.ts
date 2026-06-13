const LEVEL_COLORS: Record<string, string> = {
  vertical: '#6366f1',
  committee_hub: '#64748b',
  taluka: '#1e40af',
  ward: '#0d9488',
  booth: '#ca8a04',
  booth_committee: '#c2410c',
  ward_committee: '#9333ea',
};

export function getLevelColor(levelKey: string): string {
  return LEVEL_COLORS[levelKey] ?? '#64748b';
}
