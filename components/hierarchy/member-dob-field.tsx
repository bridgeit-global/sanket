'use client';

import { useState, type MouseEvent } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/toast';
import { useTranslations } from '@/hooks/use-translations';
import { getMemberDob, getMemberVoterAge } from '@/lib/hierarchy/geo-attribution';
import type { CadreMemberCard } from '@/lib/hierarchy/types';
import { formatDisplayDateIST, getTodayDateStringIST } from '@/lib/ist-date';
import { cn } from '@/lib/utils';
import { MissingFieldRow } from './missing-field-row';

interface MemberDobFieldProps {
  member: CadreMemberCard;
  canEdit?: boolean;
  onUpdated?: () => void;
  compact?: boolean;
}

export function MemberDobField({
  member,
  canEdit,
  onUpdated,
  compact = false,
}: MemberDobFieldProps) {
  const { t } = useTranslations();
  const dob = getMemberDob(member);
  const voterAge = getMemberVoterAge(member);
  const hasVoter = Boolean(member.epicNumber?.trim());
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(dob ?? '');
  const [saving, setSaving] = useState(false);

  const openEditor = (event: MouseEvent) => {
    event.stopPropagation();
    setDraft(dob ?? '');
    setOpen(true);
  };

  const saveDob = async (nextDob: string | null) => {
    const trimmed = nextDob?.trim() || null;
    if (trimmed === (dob || null)) {
      setOpen(false);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/hierarchy/members/${member.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dob: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t('hierarchyModule.dobUpdateFailed'));
      toast.success(
        trimmed ? t('hierarchyModule.dobUpdated') : t('hierarchyModule.dobCleared'),
      );
      setOpen(false);
      onUpdated?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('hierarchyModule.dobUpdateFailed'),
      );
    } finally {
      setSaving(false);
    }
  };

  if (!hasVoter) return null;

  return (
    <>
      {dob ? (
        <div
          className={cn(
            'flex flex-wrap items-center gap-1.5 text-muted-foreground',
            compact ? 'text-[11px]' : 'mt-2 text-xs',
          )}
        >
          <span className="truncate">
            {t('hierarchyModule.dobLabel')}: {formatDisplayDateIST(dob)}
          </span>
          {canEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                'h-6 gap-1 px-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground',
                compact && 'h-5',
              )}
              onClick={openEditor}
            >
              <Pencil className="size-3" aria-hidden />
              {t('hierarchyModule.updateDob')}
            </Button>
          ) : null}
        </div>
      ) : (
        <div className={cn('flex flex-col gap-1', !compact && 'mt-2')}>
          <MissingFieldRow
            label={t('hierarchyModule.dobMissing')}
            actionLabel={canEdit ? t('hierarchyModule.addDob') : undefined}
            onAction={canEdit ? openEditor : undefined}
          />
          {voterAge != null ? (
            <span
              className={cn(
                'truncate text-muted-foreground',
                compact ? 'text-[11px]' : 'text-xs',
              )}
            >
              {t('hierarchyModule.voterRollAge', { age: voterAge })}
            </span>
          ) : null}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{t('hierarchyModule.editDobTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor={`dob-${member.id}`} className="text-xs">
                {t('hierarchyModule.dobLabel')}
              </Label>
              <Input
                id={`dob-${member.id}`}
                type="date"
                value={draft}
                max={getTodayDateStringIST()}
                min="1900-01-01"
                onChange={(e) => setDraft(e.target.value)}
                disabled={saving}
                className="h-10 w-full"
              />
              <p className="text-xs text-muted-foreground">
                {t('hierarchyModule.dobOnVoter')}
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              {dob ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={saving}
                  onClick={() => void saveDob(null)}
                >
                  {t('hierarchyModule.clearDob')}
                </Button>
              ) : null}
              <Button
                type="button"
                className="w-full sm:w-auto"
                disabled={saving || !draft.trim()}
                onClick={() => void saveDob(draft)}
              >
                {saving ? t('hierarchyModule.savingDob') : t('hierarchyModule.saveDob')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
