'use client';

import { useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { CheckCircle2, Link2, Pencil, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { VoterPickerCombobox } from './voter-picker-combobox';
import type { CadreMemberCard } from '@/lib/hierarchy/types';
import { cn } from '@/lib/utils';

interface MemberVoterIdFieldProps {
  member: CadreMemberCard;
  canEdit?: boolean;
  onUpdated?: () => void;
  compact?: boolean;
}

export function MemberVoterIdField({
  member,
  canEdit,
  onUpdated,
  compact = false,
}: MemberVoterIdFieldProps) {
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);
  const [epicDraft, setEpicDraft] = useState(member.epicNumber ?? '');
  const [saving, setSaving] = useState(false);
  const hasVoterId = Boolean(member.epicNumber?.trim());

  const openEditor = (e: MouseEvent) => {
    e.stopPropagation();
    setEpicDraft(member.epicNumber ?? '');
    setOpen(true);
  };

  const saveEpic = async (nextEpic: string | null) => {
    const trimmed = nextEpic?.trim() || null;
    if (trimmed === (member.epicNumber?.trim() || null)) {
      setOpen(false);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/hierarchy/members/${member.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epicNumber: trimmed,
          personName: member.personName,
          personPhone: member.personPhone,
          personEmail: member.personEmail,
          userId: member.userId,
          photoUrl: member.photoUrl,
          notes: member.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to update voter ID');
      toast.success(
        trimmed
          ? t('hierarchyModule.voterIdUpdated')
          : t('hierarchyModule.voterIdCleared'),
      );
      setOpen(false);
      onUpdated?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('hierarchyModule.voterIdUpdateFailed'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          'flex flex-wrap items-center gap-1.5',
          compact ? 'text-[11px]' : 'mt-2 text-xs',
        )}
      >
        {hasVoterId ? (
          <Badge
            variant="secondary"
            className="gap-1 border-none bg-emerald-100 px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          >
            <CheckCircle2 className="size-3" aria-hidden />
            {t('hierarchyModule.voterIdLinked')}
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className="gap-1 border-none bg-amber-100 px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-950 dark:text-amber-200"
          >
            <AlertCircle className="size-3" aria-hidden />
            {t('hierarchyModule.voterIdMissing')}
          </Badge>
        )}

        {hasVoterId ? (
          <span className="inline-flex min-w-0 items-center gap-1 text-muted-foreground">
            <Link2 className="size-3 shrink-0" aria-hidden />
            {member.linkedVoter ? (
              <Link
                href={`/modules/voter/${member.linkedVoter.epicNumber}`}
                className="truncate hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {member.epicNumber}
              </Link>
            ) : (
              <span className="truncate">{member.epicNumber}</span>
            )}
          </span>
        ) : null}

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
            {hasVoterId
              ? t('hierarchyModule.updateVoterId')
              : t('hierarchyModule.addVoterId')}
          </Button>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>{t('hierarchyModule.editVoterIdTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor={`voter-id-${member.id}`} className="text-xs">
                {t('hierarchyModule.voterIdEpicLabel')}
              </Label>
              <Input
                id={`voter-id-${member.id}`}
                placeholder={t('hierarchyModule.voterIdEpicPlaceholder')}
                value={epicDraft}
                onChange={(e) => setEpicDraft(e.target.value.toUpperCase())}
                disabled={saving}
                className="h-9 uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t('hierarchyModule.searchVoterLabel')}</Label>
              <VoterPickerCombobox
                value={epicDraft || null}
                disabled={saving}
                onSelect={(voter) => {
                  setEpicDraft(voter?.epicNumber ?? '');
                }}
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              {hasVoterId ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => void saveEpic(null)}
                >
                  {t('hierarchyModule.clearVoterId')}
                </Button>
              ) : null}
              <Button
                type="button"
                disabled={saving || !epicDraft.trim()}
                onClick={() => void saveEpic(epicDraft)}
              >
                {saving
                  ? t('hierarchyModule.savingVoterId')
                  : t('hierarchyModule.saveVoterId')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
