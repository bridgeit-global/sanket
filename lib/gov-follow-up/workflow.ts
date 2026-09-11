import type {
  GovFollowUpLogKind,
  GovFollowUpStatus,
} from '@/lib/db/schema';

/** Canonical stage order for a government follow-up matter. */
export const GOV_FOLLOW_UP_WORKFLOW_KINDS = [
  'submitted',
  'inward',
  'officer_identified',
  'follow_up',
  'file_movement',
  'query',
  'approval',
  'order',
  'closed',
] as const;

export type GovFollowUpWorkflowKind =
  (typeof GOV_FOLLOW_UP_WORKFLOW_KINDS)[number];

export function needsPendingWithFields(kind: GovFollowUpLogKind): boolean {
  return kind === 'file_movement' || kind === 'officer_identified';
}

export function workflowStepOf(
  kind: GovFollowUpLogKind | null | undefined,
): GovFollowUpWorkflowKind | null {
  if (!kind) return null;
  if (kind === 'compliance') return 'query';
  if (kind === 'note') return 'follow_up';
  if (
    (GOV_FOLLOW_UP_WORKFLOW_KINDS as readonly string[]).includes(kind)
  ) {
    return kind as GovFollowUpWorkflowKind;
  }
  return null;
}

export function suggestedNextLogKind(
  lastKind: GovFollowUpLogKind | null | undefined,
): GovFollowUpLogKind {
  const step = workflowStepOf(lastKind);
  if (step === 'submitted') return 'inward';
  if (step === 'inward') return 'officer_identified';
  if (step === 'officer_identified') return 'follow_up';
  return 'follow_up';
}

export function suggestedStatusForLogKind(
  kind: GovFollowUpLogKind,
): GovFollowUpStatus | null {
  if (kind === 'approval') return 'approval_pending';
  if (kind === 'order') return 'sanctioned';
  if (kind === 'closed') return 'closed';
  return null;
}

export type GovFollowUpLogBodyContext = {
  departmentName?: string | null;
  officeName?: string | null;
  officerName?: string | null;
  designation?: string | null;
  deskName?: string | null;
  inwardRefNo?: string | null;
};

function whereLabel(ctx: GovFollowUpLogBodyContext): string {
  return (ctx.departmentName || ctx.officeName || '').trim() || 'department';
}

function officerLabel(ctx: GovFollowUpLogBodyContext): string {
  return [ctx.officerName, ctx.designation].filter(Boolean).join(', ');
}

function forwardedTo(ctx: GovFollowUpLogBodyContext): string {
  return (
    officerLabel(ctx) ||
    (ctx.deskName || '').trim() ||
    (ctx.officeName || '').trim() ||
    'next desk'
  );
}

/** English fallback sentence when the user leaves "what happened" blank. */
export function defaultGovFollowUpLogBody(
  kind: GovFollowUpLogKind,
  ctx: GovFollowUpLogBodyContext,
): string {
  const inward = (ctx.inwardRefNo || '').trim();
  const officer = officerLabel(ctx);
  switch (kind) {
    case 'submitted':
      return inward
        ? `Letter submitted to ${whereLabel(ctx)}, inward no. ${inward}.`
        : `Letter submitted to ${whereLabel(ctx)}.`;
    case 'inward':
      return inward ? `Inward obtained, no. ${inward}.` : 'Inward obtained.';
    case 'officer_identified':
      return officer
        ? `Officer identified: ${officer}.`
        : 'Officer identified.';
    case 'follow_up':
      return 'Follow-up recorded.';
    case 'file_movement':
      return `File forwarded to ${forwardedTo(ctx)}.`;
    case 'query':
      return 'Query / compliance requested.';
    case 'compliance':
      return 'Clarification submitted.';
    case 'approval':
      return 'Awaiting approval / sanction.';
    case 'order':
      return 'Order received.';
    case 'closed':
      return 'Matter closed.';
    case 'note':
      return 'Note recorded.';
    default:
      return 'Follow-up recorded.';
  }
}
