'use client';

import type { CadreMemberCard } from '@/lib/hierarchy/types';
import { useTranslations } from '@/hooks/use-translations';
import { cn } from '@/lib/utils';

export function MemberWardLine({
  member,
  compact = false,
}: {
  member: CadreMemberCard;
  compact?: boolean;
}) {
  const { t } = useTranslations();
  const wardNo = member.residentialWardNo?.trim() || null;
  if (!wardNo) return null;

  return (
    <p className={cn('text-muted-foreground', compact ? 'text-[11px]' : 'text-xs')}>
      {t('hierarchyModule.wardNumber', { ward: wardNo })}
    </p>
  );
}
