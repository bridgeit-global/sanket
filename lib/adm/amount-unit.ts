export type AdmAmountUnit = 'rupees' | 'thousands' | 'lakhs';

export const ADM_AMOUNT_UNITS: AdmAmountUnit[] = [
  'rupees',
  'thousands',
  'lakhs',
];

/** Convert a display amount in the given unit to integer rupees. */
export function unitAmountToRupees(
  displayAmount: number,
  unit: AdmAmountUnit,
): number {
  if (!Number.isFinite(displayAmount) || displayAmount < 0) return 0;
  switch (unit) {
    case 'thousands':
      return Math.round(displayAmount * 1000);
    case 'lakhs':
      return Math.round(displayAmount * 100_000);
    default:
      return Math.round(displayAmount);
  }
}

/** Convert integer rupees to a display amount in the given unit. */
export function rupeesToUnitAmount(
  rupees: number,
  unit: AdmAmountUnit,
): number {
  if (!Number.isFinite(rupees) || rupees < 0) return 0;
  switch (unit) {
    case 'thousands':
      return rupees / 1000;
    case 'lakhs':
      return rupees / 100_000;
    default:
      return rupees;
  }
}

export function formatAdmAmount(
  rupees: number,
  unit: AdmAmountUnit,
): string {
  const display = rupeesToUnitAmount(rupees, unit);
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: unit === 'rupees' ? 0 : 3,
    minimumFractionDigits: unit === 'rupees' ? 0 : 0,
  }).format(display);

  switch (unit) {
    case 'thousands':
      return `₹${formatted} (×1000)`;
    case 'lakhs':
      return `₹${formatted} L`;
    default:
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(rupees);
  }
}
