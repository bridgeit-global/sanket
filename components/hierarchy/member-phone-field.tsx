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
import { getMemberPhone } from '@/lib/hierarchy/geo-attribution';
import type { CadreMemberCard } from '@/lib/hierarchy/types';
import { isValidIndianMobile, normalizeIndianMobileDigits } from '@/lib/indian-mobile';
import { cn } from '@/lib/utils';
import { ContactWithCall } from './contact-with-call';
import { MissingFieldRow } from './missing-field-row';

interface MemberPhoneFieldProps {
  member: CadreMemberCard;
  canEdit?: boolean;
  onUpdated?: () => void;
  compact?: boolean;
}

export function MemberPhoneField({
  member,
  canEdit,
  onUpdated,
  compact = false,
}: MemberPhoneFieldProps) {
  const { t } = useTranslations();
  const phone = getMemberPhone(member)?.trim() || null;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(phone ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const openEditor = (event: MouseEvent) => {
    event.stopPropagation();
    setDraft(phone ?? '');
    setError(null);
    setOpen(true);
  };

  const savePhone = async (nextPhone: string | null) => {
    const trimmed = nextPhone?.trim() || null;
    let stored: string | null = null;
    if (trimmed) {
      stored = normalizeIndianMobileDigits(trimmed);
      if (!isValidIndianMobile(stored)) {
        setError(t('hierarchyModule.phoneInvalid'));
        return;
      }
    }
    if (stored === (phone || null)) {
      setOpen(false);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/hierarchy/members/${member.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personPhone: stored }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t('hierarchyModule.phoneUpdateFailed'));
      toast.success(
        stored ? t('hierarchyModule.phoneUpdated') : t('hierarchyModule.phoneCleared'),
      );
      setOpen(false);
      onUpdated?.();
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : t('hierarchyModule.phoneUpdateFailed'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {phone ? (
        <div
          className={cn(
            'flex min-w-0 items-center gap-2',
            !compact && 'mt-3',
          )}
        >
          <ContactWithCall phone={phone} compact={compact} className="min-w-0 flex-1" />
          {canEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                'h-7 shrink-0 gap-1 px-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground',
                compact && 'h-6',
              )}
              onClick={openEditor}
            >
              <Pencil className="size-3" aria-hidden />
              {t('hierarchyModule.updatePhone')}
            </Button>
          ) : null}
        </div>
      ) : (
        <MissingFieldRow
          label={t('hierarchyModule.phoneMissing')}
          actionLabel={canEdit ? t('hierarchyModule.addPhone') : undefined}
          onAction={canEdit ? openEditor : undefined}
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="w-[calc(100%-2rem)] max-w-md"
          onClick={(event) => event.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>{t('hierarchyModule.editPhoneTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor={`phone-${member.id}`} className="text-xs">
                {t('hierarchyModule.phoneLabel')}
              </Label>
              <Input
                id={`phone-${member.id}`}
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder={t('hierarchyModule.phonePlaceholder')}
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setError(null);
                }}
                disabled={saving}
                aria-invalid={Boolean(error)}
                className={cn('h-10 w-full', error && 'border-red-500 focus-visible:ring-red-500')}
              />
              {error ? <p className="text-xs text-red-500">{error}</p> : null}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              {phone ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={saving}
                  onClick={() => void savePhone(null)}
                >
                  {t('hierarchyModule.clearPhone')}
                </Button>
              ) : null}
              <Button
                type="button"
                className="w-full sm:w-auto"
                disabled={saving || !draft.trim()}
                onClick={() => void savePhone(draft)}
              >
                {saving ? t('hierarchyModule.savingPhone') : t('hierarchyModule.savePhone')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
