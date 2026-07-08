import type { CadreWhatsAppBroadcastTarget as BroadcastTarget } from '@/lib/db/schema';
import { filterMembers } from './member-list';
import type { CadreConfig, CadreMemberCard } from './types';

export type { BroadcastTarget };

export type BroadcastTranslateFn = (
  key: string,
  params?: Record<string, string | number>,
) => string;

const TARGET_SEPARATOR = ' · ';

function englishFallback(
  key: string,
  params: Record<string, string | number> = {},
): string {
  switch (key) {
    case 'whatsappBroadcastTargetAllVertical':
      return `All ${params.vertical} members in ${params.constituency}`;
    case 'whatsappBroadcastTargetAllMembers':
      return `All members in ${params.constituency}`;
    case 'whatsappBroadcastTargetBooth':
      return `Booth ${params.booth}`;
    default:
      return Object.values(params).join(TARGET_SEPARATOR) || String(params.constituency ?? '');
  }
}

function translateTarget(
  t: BroadcastTranslateFn | undefined,
  key: string,
  params: Record<string, string | number>,
): string {
  if (t) return t(`hierarchyModule.${key}`, params);
  return englishFallback(key, params);
}

export function buildBroadcastTargetLabel(
  target: BroadcastTarget,
  config: CadreConfig,
  constituencyLabel = 'AC 172',
  t?: BroadcastTranslateFn,
): string {
  if (
    target.verticalId &&
    target.constituencyId &&
    !target.wardGeoId &&
    !target.boothNo &&
    !target.positionId
  ) {
    const vertical = config.verticals.find((v) => v.id === target.verticalId);
    return translateTarget(t, 'whatsappBroadcastTargetAllVertical', {
      vertical: vertical?.name ?? 'vertical',
      constituency: constituencyLabel,
    });
  }

  if (
    target.constituencyId &&
    !target.verticalId &&
    !target.wardGeoId &&
    !target.boothNo &&
    !target.positionId
  ) {
    return translateTarget(t, 'whatsappBroadcastTargetAllMembers', {
      constituency: constituencyLabel,
    });
  }

  const parts: string[] = [];
  if (target.wardGeoId) {
    const ward = config.geoUnits.find((g) => g.id === target.wardGeoId);
    parts.push(ward?.name ?? 'Ward');
  }
  if (target.boothNo) {
    parts.push(
      translateTarget(t, 'whatsappBroadcastTargetBooth', {
        booth: target.boothNo,
      }),
    );
  }
  if (target.verticalId) {
    const vertical = config.verticals.find((v) => v.id === target.verticalId);
    parts.push(vertical?.name ?? 'Vertical');
  }
  if (target.positionId) {
    const position = config.positions.find((p) => p.id === target.positionId);
    parts.push(position?.name ?? 'Position');
  }

  return parts.length > 0 ? parts.join(TARGET_SEPARATOR) : constituencyLabel;
}

export type BroadcastTargetOption = {
  id: string;
  label: string;
  target: BroadcastTarget;
};

export function buildBroadcastTargetOptions(input: {
  config: CadreConfig;
  constituencyId: string;
  constituencyLabel?: string;
  verticalId?: string;
  wardGeoId?: string;
  boothNo?: string;
  positionId?: string;
  boothNumbers?: string[];
  t?: BroadcastTranslateFn;
}): BroadcastTargetOption[] {
  const constituencyLabel = input.constituencyLabel ?? `AC ${input.constituencyId}`;
  const options: BroadcastTargetOption[] = [];

  if (input.verticalId) {
    const target: BroadcastTarget = {
      constituencyId: input.constituencyId,
      verticalId: input.verticalId,
    };
    options.push({
      id: 'vertical-constituency',
      label: buildBroadcastTargetLabel(target, input.config, constituencyLabel, input.t),
      target,
    });
  }

  if (input.wardGeoId) {
    const wardTarget: BroadcastTarget = { wardGeoId: input.wardGeoId };
    options.push({
      id: 'ward',
      label: buildBroadcastTargetLabel(wardTarget, input.config, constituencyLabel, input.t),
      target: wardTarget,
    });

    if (input.verticalId) {
      const wardVerticalTarget: BroadcastTarget = {
        wardGeoId: input.wardGeoId,
        verticalId: input.verticalId,
      };
      options.push({
        id: 'ward-vertical',
        label: buildBroadcastTargetLabel(
          wardVerticalTarget,
          input.config,
          constituencyLabel,
          input.t,
        ),
        target: wardVerticalTarget,
      });
    }

    const boothNumbers =
      input.boothNumbers ??
      (input.boothNo ? [input.boothNo] : []);
    for (const booth of boothNumbers) {
      const boothTarget: BroadcastTarget = {
        wardGeoId: input.wardGeoId,
        boothNo: booth,
      };
      options.push({
        id: `booth-${booth}`,
        label: buildBroadcastTargetLabel(boothTarget, input.config, constituencyLabel, input.t),
        target: boothTarget,
      });

      if (input.verticalId) {
        const boothVerticalTarget: BroadcastTarget = {
          wardGeoId: input.wardGeoId,
          boothNo: booth,
          verticalId: input.verticalId,
        };
        options.push({
          id: `booth-vertical-${booth}`,
          label: buildBroadcastTargetLabel(
            boothVerticalTarget,
            input.config,
            constituencyLabel,
            input.t,
          ),
          target: boothVerticalTarget,
        });
      }
    }
  }

  if (input.positionId) {
    const positionTarget: BroadcastTarget = { positionId: input.positionId };
    if (input.constituencyId) positionTarget.constituencyId = input.constituencyId;
    if (input.wardGeoId) positionTarget.wardGeoId = input.wardGeoId;
    if (input.verticalId) positionTarget.verticalId = input.verticalId;
    options.push({
      id: 'position',
      label: buildBroadcastTargetLabel(positionTarget, input.config, constituencyLabel, input.t),
      target: positionTarget,
    });
  }

  if (!input.wardGeoId && input.constituencyId) {
    const constituencyTarget: BroadcastTarget = { constituencyId: input.constituencyId };
    options.push({
      id: 'constituency',
      label: buildBroadcastTargetLabel(
        constituencyTarget,
        input.config,
        constituencyLabel,
        input.t,
      ),
      target: constituencyTarget,
    });
  }

  const seen = new Set<string>();
  return options.filter((option) => {
    const key = JSON.stringify(option.target);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function resolveBroadcastRecipients(
  members: CadreMemberCard[],
  target: BroadcastTarget,
): {
  recipients: Array<{ memberId: string; whatsappPhone: string }>;
  skippedNoWhatsapp: number;
} {
  const matched = filterMembers(members, {
    verticalId: target.verticalId,
    wardGeoId: target.wardGeoId,
    boothNo: target.boothNo,
    positionId: target.positionId,
  }).filter((member) => {
    if (!target.constituencyId) return true;
    return (
      member.constituencyId === target.constituencyId || member.constituencyId === null
    );
  });

  const seen = new Set<string>();
  const recipients: Array<{ memberId: string; whatsappPhone: string }> = [];
  let skippedNoWhatsapp = 0;

  for (const member of matched) {
    if (seen.has(member.id)) continue;
    seen.add(member.id);
    const phone = member.whatsappPhone?.trim();
    if (!phone) {
      skippedNoWhatsapp += 1;
      continue;
    }
    recipients.push({ memberId: member.id, whatsappPhone: phone });
  }

  return { recipients, skippedNoWhatsapp };
}

export function parseBroadcastTarget(body: unknown): BroadcastTarget | null {
  if (!body || typeof body !== 'object') return null;
  const row = body as Record<string, unknown>;
  const target: BroadcastTarget = {};

  const constituencyId =
    typeof row.constituencyId === 'string' ? row.constituencyId.trim() : '';
  const verticalId = typeof row.verticalId === 'string' ? row.verticalId.trim() : '';
  const wardGeoId = typeof row.wardGeoId === 'string' ? row.wardGeoId.trim() : '';
  const boothNo = typeof row.boothNo === 'string' ? row.boothNo.trim() : '';
  const positionId = typeof row.positionId === 'string' ? row.positionId.trim() : '';

  if (constituencyId) target.constituencyId = constituencyId;
  if (verticalId) target.verticalId = verticalId;
  if (wardGeoId) target.wardGeoId = wardGeoId;
  if (boothNo) target.boothNo = boothNo;
  if (positionId) target.positionId = positionId;

  if (Object.keys(target).length === 0) return null;
  return target;
}

export function isBroadcastTargetEmpty(target: BroadcastTarget): boolean {
  return !(
    target.constituencyId ||
    target.verticalId ||
    target.wardGeoId ||
    target.boothNo ||
    target.positionId
  );
}
