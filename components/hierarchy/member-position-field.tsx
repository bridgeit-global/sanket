'use client';

import type { MouseEvent } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/hooks/use-translations';
import { cn } from '@/lib/utils';
import { MissingFieldRow } from './missing-field-row';

interface MemberPositionFieldProps {
  label: string;
  missing?: boolean;
  canEdit?: boolean;
  onEdit?: () => void;
  /** Larger title used on full member cards. */
  prominent?: boolean;
}

export function MemberPositionField({
  label,
  missing = false,
  canEdit,
  onEdit,
  prominent = false,
}: MemberPositionFieldProps) {
  const { t } = useTranslations();

  const edit = (event: MouseEvent) => {
    event.stopPropagation();
    onEdit?.();
  };

  if (missing) {
    return (
      <MissingFieldRow
        label={t('hierarchyModule.positionMissing')}
        actionLabel={canEdit && onEdit ? t('hierarchyModule.addPosition') : undefined}
        onAction={canEdit && onEdit ? edit : undefined}
      />
    );
  }

  return (
    <div className="flex items-start justify-between gap-2">
      <p
        className={cn(
          'min-w-0',
          prominent
            ? 'text-sm font-semibold text-foreground'
            : 'text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase',
        )}
      >
        {label}
      </p>
      {canEdit && onEdit ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-6 shrink-0 gap-1 px-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground',
          )}
          onClick={edit}
        >
          <Pencil className="size-3" aria-hidden />
          {t('hierarchyModule.updatePosition')}
        </Button>
      ) : null}
    </div>
  );
}
