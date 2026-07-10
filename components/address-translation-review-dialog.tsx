'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { StructuredAddressFields } from '@/components/structured-address-fields';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from '@/hooks/use-translations';
import {
  EMPTY_ADDRESS_PARTS,
  formatAddressMaster,
  hasRequiredAddressFields,
  type AddressMasterAddressParts,
} from '@/lib/letters/format-address-master';
import { filterLocaleText } from '@/lib/letters/locale-text';
import type { LetterLocale } from '@/lib/letters/templates';

export type AddressTranslationReviewResult = {
  name: string;
  parts: AddressMasterAddressParts;
};

type AddressTranslationReviewDialogProps = {
  open: boolean;
  targetLocale: LetterLocale;
  initialName: string;
  initialParts: AddressMasterAddressParts;
  isConfirming?: boolean;
  onConfirm: (result: AddressTranslationReviewResult) => void;
  onCancel: () => void;
};

export function AddressTranslationReviewDialog({
  open,
  targetLocale,
  initialName,
  initialParts,
  isConfirming = false,
  onConfirm,
  onCancel,
}: AddressTranslationReviewDialogProps) {
  const { t } = useTranslations();
  const [name, setName] = useState(initialName);
  const [parts, setParts] = useState<AddressMasterAddressParts>(initialParts);

  useEffect(() => {
    if (!open) return;
    setName(filterLocaleText(initialName, targetLocale));
    setParts({
      ...EMPTY_ADDRESS_PARTS,
      ...initialParts,
      pincode: initialParts.pincode,
    });
  }, [open, initialName, initialParts, targetLocale]);

  const nameKey = targetLocale === 'mr' ? 'nameMr' : 'name';

  const handleConfirm = () => {
    const trimmedName = name.trim();
    const nextParts = { ...parts, pincode: parts.pincode.trim() };
    if (!trimmedName || !hasRequiredAddressFields(nextParts, targetLocale)) {
      toast.error(t('letterGeneration.addresses.validationRequired'));
      return;
    }
    onConfirm({ name: trimmedName, parts: nextParts });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isConfirming) onCancel();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {targetLocale === 'mr'
              ? t('letterGeneration.addresses.reviewMarathiTitle')
              : t('letterGeneration.addresses.reviewEnglishTitle')}
          </DialogTitle>
          <DialogDescription>
            {targetLocale === 'mr'
              ? t('letterGeneration.addresses.reviewMarathiDescription')
              : t('letterGeneration.addresses.reviewEnglishDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>
              {t('letterGeneration.addresses.columns.name')} *
            </Label>
            <Input
              value={name}
              onChange={(event) =>
                setName(filterLocaleText(event.target.value, targetLocale))
              }
              lang={targetLocale === 'mr' ? 'mr' : 'en'}
              inputMode="text"
              autoComplete="off"
              required
              aria-required
              data-locale={nameKey}
            />
          </div>

          <StructuredAddressFields
            locale={targetLocale}
            parts={parts}
            onPartsChange={(patch) => setParts((prev) => ({ ...prev, ...patch }))}
            previewText={formatAddressMaster(parts, targetLocale)}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isConfirming}>
            {t('common.cancel')}
          </Button>
          <Button type="button" disabled={isConfirming} onClick={handleConfirm}>
            {isConfirming ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {t('letterGeneration.addresses.confirmTranslation')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
