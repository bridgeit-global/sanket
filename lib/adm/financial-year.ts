/** Indian financial year helpers (Apr–Mar), formatted as `YYYY-YY` e.g. `2025-26`. */

export function formatFinancialYear(startYear: number): string {
  const end = String((startYear + 1) % 100).padStart(2, '0');
  return `${startYear}-${end}`;
}

/** FY start calendar year for a date (months 0–11; Apr+ → same year). */
export function getFinancialYearStartYear(date: Date = new Date()): number {
  const month = date.getMonth();
  const year = date.getFullYear();
  return month >= 3 ? year : year - 1;
}

export function getCurrentFinancialYear(date: Date = new Date()): string {
  return formatFinancialYear(getFinancialYearStartYear(date));
}

/**
 * Build a list of FY labels around the current year.
 * @param past How many prior FYs to include
 * @param future How many upcoming FYs to include
 */
export function listFinancialYears(
  past = 5,
  future = 3,
  date: Date = new Date(),
): string[] {
  const currentStart = getFinancialYearStartYear(date);
  const years: string[] = [];
  for (let start = currentStart + future; start >= currentStart - past; start--) {
    years.push(formatFinancialYear(start));
  }
  return years;
}

/** Ensure `value` appears in the options list (e.g. legacy / out-of-range FY). */
export function financialYearOptions(
  value?: string | null,
  past = 5,
  future = 3,
): string[] {
  const years = listFinancialYears(past, future);
  if (value && !years.includes(value)) {
    return [value, ...years].sort((a, b) => b.localeCompare(a));
  }
  return years;
}
