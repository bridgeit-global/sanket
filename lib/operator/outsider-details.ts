export type OutsiderDetails = {
  name: string;
  mobile: string;
  voterId?: string;
};

const OUTSIDER_LINE_RE =
  /Outsider Details - Name: (.+), Mobile: (\d+)(?:, Voter ID: ([^\n\r]+))?/;

export function formatOutsiderDetails(details: OutsiderDetails): string {
  const voterPart = details.voterId?.trim()
    ? `, Voter ID: ${details.voterId.trim()}`
    : '';
  return `Outsider Details - Name: ${details.name.trim()}, Mobile: ${details.mobile.trim()}${voterPart}`;
}

export function parseOutsiderDetails(
  description: string | null | undefined,
): OutsiderDetails | null {
  if (!description) return null;
  const match = description.match(OUTSIDER_LINE_RE);
  if (!match) return null;
  const name = match[1]?.trim();
  const mobile = match[2]?.trim();
  const voterId = match[3]?.trim();
  if (!name || !mobile) return null;
  return { name, mobile, voterId: voterId || undefined };
}

export function stripOutsiderDetails(
  description: string | null | undefined,
): string | null {
  if (description == null) return null;
  const stripped = description
    .replace(OUTSIDER_LINE_RE, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return stripped.length > 0 ? stripped : null;
}
