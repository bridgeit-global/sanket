/** Tailwind badge classes per vertical name; falls back to a hashed palette. */
const PALETTE = [
  'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200',
  'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-200',
  'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-200',
  'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-200',
  'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-200',
  'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-200',
  'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200',
];

const OVERRIDES: Record<string, string> = {
  basic: PALETTE[0],
  yuvti: PALETTE[1],
  yuvak: PALETTE[5],
  mahila: PALETTE[2],
  students: PALETTE[3],
  minority: PALETTE[4],
};

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h << 5) - h + value.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function getVerticalBadgeClass(name: string): string {
  const key = name.trim().toLowerCase();
  return OVERRIDES[key] ?? PALETTE[hash(key) % PALETTE.length];
}
