import type { CadreMemberCard } from './types';

/** Hierarchy UI surfaces that may show a member's WhatsApp contact. Extend as needed. */
export type HierarchyWhatsAppContext = 'taluka_overview' | 'ward_overview' | 'booth_overview';

const WHATSAPP_VISIBLE_CONTEXTS = new Set<HierarchyWhatsAppContext>(['taluka_overview']);

export function getMemberWhatsAppForContext(
  member: CadreMemberCard,
  context: HierarchyWhatsAppContext,
): string | null {
  if (!WHATSAPP_VISIBLE_CONTEXTS.has(context)) return null;
  return member.whatsappPhone ?? null;
}
