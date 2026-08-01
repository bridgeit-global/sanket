/** Canonical EPIC form for lookups (DB stores uppercase). */
export function normalizeEpicNumber(epicNumber: string): string {
  return epicNumber.trim().toUpperCase();
}
