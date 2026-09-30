export const ADM_FUND_REQUEST_LETTER_STATUSES = [
  'pending',
  'linked',
  'sanctioned',
  'rejected',
] as const;

export type AdmFundRequestLetterStatus =
  (typeof ADM_FUND_REQUEST_LETTER_STATUSES)[number];

export function isAdmFundRequestLetterStatus(
  value: string,
): value is AdmFundRequestLetterStatus {
  return (ADM_FUND_REQUEST_LETTER_STATUSES as readonly string[]).includes(
    value,
  );
}

/** Linked and sanctioned letters must point at an ADM fund record. */
export function fundRequestLetterStatusRequiresFund(
  status: AdmFundRequestLetterStatus,
): boolean {
  return status === 'linked' || status === 'sanctioned';
}

/**
 * A fund link moves a pending letter to linked.
 * Linked and sanctioned letters must keep a fund id.
 */
export function resolveFundRequestLetterLink(input: {
  status: AdmFundRequestLetterStatus;
  fundRecordId: string | null;
}):
  | { status: AdmFundRequestLetterStatus; fundRecordId: string | null }
  | { error: string } {
  let status = input.status;
  const fundRecordId = input.fundRecordId;

  if (fundRecordId && status === 'pending') {
    status = 'linked';
  }

  if (fundRequestLetterStatusRequiresFund(status) && !fundRecordId) {
    return { error: 'Link an ADM fund for this status' };
  }

  return { status, fundRecordId };
}

export function admFundOptionLabel(parts: {
  categoryName: string;
  financialYear: string;
  batchLabel?: string | null;
}): string {
  return [parts.categoryName, parts.financialYear, parts.batchLabel?.trim()]
    .filter((part): part is string => Boolean(part))
    .join(' · ');
}
