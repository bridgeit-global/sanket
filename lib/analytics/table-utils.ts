/** Shared helpers for chat analytics result tables. */

export type AnalyticsRow = Record<string, unknown>;

export function rowsToCsv(columns: string[], rows: AnalyticsRow[]): string {
  const escape = (value: unknown) => {
    const text =
      value === null || value === undefined ? '' : String(value);
    if (/[",\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const header = columns.map(escape).join(',');
  const body = rows.map((row) => columns.map((col) => escape(row[col])).join(','));
  return [header, ...body].join('\n');
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function compareCellValues(a: unknown, b: unknown): number {
  const aNull = a === null || a === undefined || a === '';
  const bNull = b === null || b === undefined || b === '';
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;

  const aNum = typeof a === 'number' ? a : Number(String(a).replace(/,/g, ''));
  const bNum = typeof b === 'number' ? b : Number(String(b).replace(/,/g, ''));
  if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
    return aNum - bNum;
  }
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

export function sortRows(
  rows: AnalyticsRow[],
  column: string,
  direction: 'asc' | 'desc',
): AnalyticsRow[] {
  const sorted = [...rows].sort((left, right) =>
    compareCellValues(left[column], right[column]),
  );
  return direction === 'asc' ? sorted : sorted.reverse();
}

const META_KEYS = new Set([
  'partNo',
  'wardNo',
  'partCount',
  'parts',
  'totalValidVotes',
  'nota',
  'totalVotes',
  'rejectedVotes',
  'tenderedVotes',
  'metricValue',
  'leadingCandidate',
  'margin',
  'leader',
  'candidate',
  'votes',
]);

/** Columns that look like candidate vote fields (exclude meta). */
export function candidateVoteColumns(columns: string[]): string[] {
  return columns.filter((col) => !META_KEYS.has(col));
}

/**
 * Prefer a compact Form 20 column set when many candidate columns exist.
 * Keeps geography/metrics + top candidates by max votes across rows (or named ones).
 */
export function compactForm20Columns(
  columns: string[],
  rows: AnalyticsRow[],
  preferredCandidates: string[] = [],
  maxCandidates = 3,
): string[] {
  const candidates = candidateVoteColumns(columns);
  if (candidates.length <= maxCandidates) return columns;

  const preferred = preferredCandidates.filter((name) => candidates.includes(name));
  const remaining = candidates.filter((name) => !preferred.includes(name));

  const scores = remaining.map((name) => {
    let max = 0;
    for (const row of rows) {
      const value = Number(row[name]);
      if (!Number.isNaN(value) && value > max) max = value;
    }
    return { name, max };
  });
  scores.sort((a, b) => b.max - a.max);

  const picked = [
    ...preferred,
    ...scores.slice(0, Math.max(0, maxCandidates - preferred.length)).map((s) => s.name),
  ];

  const meta = columns.filter((col) => META_KEYS.has(col));
  return [...meta, ...picked];
}

/** Pick label + numeric value columns for a simple bar chart (≤12 rows). */
export function pickBarSeries(
  columns: string[],
  rows: AnalyticsRow[],
): { labelKey: string; valueKey: string } | null {
  if (rows.length === 0 || rows.length > 12) return null;

  const labelCandidates = [
    'candidate',
    'wardNo',
    'partNo',
    'religion_group',
    'caste_group',
    'gender',
    'election_type',
    'booth_no',
  ];
  const valueCandidates = [
    'votes',
    'voter_count',
    'totalVotes',
    'metricValue',
    'count',
  ];

  const labelKey =
    labelCandidates.find((key) => columns.includes(key)) ??
    columns.find((col) =>
      rows.every((row) => typeof row[col] === 'string' || typeof row[col] === 'number'),
    );

  const valueKey =
    valueCandidates.find((key) => columns.includes(key)) ??
    columns.find((col) =>
      rows.every((row) => {
        const n = Number(row[col]);
        return row[col] !== null && row[col] !== undefined && !Number.isNaN(n);
      }),
    );

  if (!labelKey || !valueKey || labelKey === valueKey) return null;
  return { labelKey, valueKey };
}

export function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}
