'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Languages, Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTranslations } from '@/hooks/use-translations';
import { ADDRESS_TYPES, type AddressType } from '@/lib/letters/address-types';
import type { AddressMasterRow } from '@/components/letter-address-field';
import { BilingualAddressFields } from '@/components/bilingual-address-fields';
import {
  EMPTY_ADDRESS_PARTS,
  enrichAddressPartsWithPincodeLookup,
  formatAddressMaster,
  hasRequiredAddressFields,
  localizeAddressPartsDigits,
  mergeAddressParts,
  sanitizeAddressPartsLocations,
  type AddressMasterAddressParts,
} from '@/lib/letters/format-address-master';
import { filterLocaleText } from '@/lib/letters/locale-text';
import {
  defaultLocationParts,
  getCityLabel,
  getStateLabel,
  localizedCityParts,
  localizedStateParts,
} from '@/lib/letters/indian-locations';
import { usePincodeLookup } from '@/lib/letters/use-pincode-lookup';
import type { PincodeLookupResult } from '@/lib/letters/pincode-lookup';
import { toLocaleDigits, toWesternDigits } from '@/lib/locale-digits';
import type { LetterLocale } from '@/lib/letters/templates';

type AddressFormState = {
  name: string;
  nameMr: string;
  addressType: AddressType;
  isActive: boolean;
  sortOrder: string;
} & AddressMasterAddressParts;

const EMPTY_FORM: AddressFormState = {
  name: '',
  nameMr: '',
  addressType: 'general',
  ...EMPTY_ADDRESS_PARTS,
  ...defaultLocationParts(),
  isActive: true,
  sortOrder: '0',
};

async function translateAddressText(
  text: string,
  targetLocale: LetterLocale,
): Promise<string> {
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, targetLocale }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to translate');
  return String(json?.translated ?? '').trim();
}

type AddressMasterManagerProps = {
  addresses: AddressMasterRow[];
  loading: boolean;
  onRefresh: () => Promise<void>;
};

export function AddressMasterManager({
  addresses,
  loading,
  onRefresh,
}: AddressMasterManagerProps) {
  const { t, locale } = useTranslations();
  const [formCardOpen, setFormCardOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sortedAddresses = useMemo(
    () =>
      [...addresses].sort(
        (a, b) =>
          a.sortOrder - b.sortOrder ||
          a.name.localeCompare(b.name),
      ),
    [addresses],
  );

  useEffect(() => {
    if (editingId) setFormCardOpen(true);
  }, [editingId]);

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormCardOpen(false);
  };

  const openEditForm = (address: AddressMasterRow) => {
    setEditingId(address.id);
    setForm({
      name: address.name,
      nameMr: address.nameMr,
      addressType: address.addressType,
      line1En: address.line1En,
      line1Mr: address.line1Mr,
      line2En: address.line2En,
      line2Mr: address.line2Mr,
      line3En: address.line3En,
      line3Mr: address.line3Mr,
      cityEn: address.cityEn,
      cityMr: address.cityMr,
      stateEn: address.stateEn,
      stateMr: address.stateMr,
      pincode: address.pincode,
      isActive: address.isActive,
      sortOrder: String(address.sortOrder),
    });

    const formElement = document.getElementById('address-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const applyPincodeLookup = useCallback((lookup: PincodeLookupResult) => {
    setForm((prev) => {
      if (locale === 'mr') {
        return {
          ...prev,
          cityMr: prev.cityMr.trim() || getCityLabel(lookup.city, 'mr'),
          cityEn: prev.cityEn.trim() || lookup.city,
          stateMr: prev.stateMr.trim() || getStateLabel(lookup.state, 'mr'),
          stateEn: prev.stateEn.trim() || lookup.state,
        };
      }
      return {
        ...prev,
        ...enrichAddressPartsWithPincodeLookup(prev, lookup),
        cityMr: prev.cityMr.trim() || getCityLabel(lookup.city, 'mr'),
        stateMr: prev.stateMr.trim() || getStateLabel(lookup.state, 'mr'),
      };
    });
  }, [locale]);

  const { schedulePincodeLookup } = usePincodeLookup({
    onEnriched: () => {},
    onResolved: applyPincodeLookup,
  });

  const updateAddressParts = (patch: Partial<AddressMasterAddressParts>) => {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      if (patch.pincode !== undefined && patch.pincode.length === 6) {
        schedulePincodeLookup(formatAddressMaster(next, locale), patch.pincode);
      }
      return next;
    });
  };

  const persistAddress = async ({
    nameEn,
    nameMr,
    parts,
  }: {
    nameEn: string;
    nameMr: string;
    parts: AddressMasterAddressParts;
  }) => {
    const payload = {
      name: nameEn || nameMr,
      nameMr,
      addressType: form.addressType,
      ...parts,
      isActive: form.isActive,
      sortOrder: Number(toWesternDigits(form.sortOrder)) || 0,
    };

    const res = editingId
      ? await fetch(`/api/addresses/${encodeURIComponent(editingId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch('/api/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Failed to save address');
  };

  /** Translate `text` into `target`, applying locale text/digit rules. */
  const translateInto = async (
    text: string,
    target: LetterLocale,
  ): Promise<string> => {
    const source = text.trim();
    if (!source) return '';
    const translated = filterLocaleText(await translateAddressText(source, target), target);
    return target === 'mr' ? toLocaleDigits(translated, 'mr') : translated;
  };

  /** Fill any empty language column from its filled counterpart. */
  const handleAutoTranslate = async () => {
    setIsTranslating(true);
    try {
      const patch: Partial<AddressFormState> = {};

      const nameEn = form.name.trim();
      const nameMr = form.nameMr.trim();
      if (nameEn && !nameMr) patch.nameMr = await translateInto(nameEn, 'mr');
      else if (nameMr && !nameEn) patch.name = await translateInto(nameMr, 'en');

      const linePairs = [
        ['line1En', 'line1Mr'],
        ['line2En', 'line2Mr'],
        ['line3En', 'line3Mr'],
      ] as const;
      for (const [enKey, mrKey] of linePairs) {
        const enVal = form[enKey].trim();
        const mrVal = form[mrKey].trim();
        if (enVal && !mrVal) patch[mrKey] = await translateInto(enVal, 'mr');
        else if (mrVal && !enVal) patch[enKey] = await translateInto(mrVal, 'en');
      }

      if (Object.keys(patch).length === 0) {
        toast.info(t('letterGeneration.addresses.nothingToTranslate'));
        return;
      }
      setForm((prev) => ({ ...prev, ...patch }));
    } catch (error) {
      console.error('Failed to auto-translate address', error);
      toast.error(t('letterGeneration.addresses.translateError'));
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSave = async () => {
    const nameEnInput = filterLocaleText(form.name.trim(), 'en');
    const nameMrInput = filterLocaleText(form.nameMr.trim(), 'mr');

    const rawParts: AddressMasterAddressParts = {
      line1En: form.line1En.trim(),
      line1Mr: form.line1Mr.trim(),
      line2En: form.line2En.trim(),
      line2Mr: form.line2Mr.trim(),
      line3En: form.line3En.trim(),
      line3Mr: form.line3Mr.trim(),
      cityEn: form.cityEn.trim(),
      cityMr: form.cityMr.trim(),
      stateEn: form.stateEn.trim(),
      stateMr: form.stateMr.trim(),
      pincode: form.pincode.trim(),
    };

    const hasName = Boolean(nameEnInput || nameMrInput);
    const hasEn = hasRequiredAddressFields(rawParts, 'en');
    const hasMr = hasRequiredAddressFields(rawParts, 'mr');
    if (!hasName || (!hasEn && !hasMr)) {
      toast.error(t('letterGeneration.addresses.validationRequired'));
      return;
    }

    setIsSaving(true);
    try {
      const parts = { ...rawParts };

      // Auto-fill the missing language for each street line directly on save.
      const linePairs = [
        ['line1En', 'line1Mr'],
        ['line2En', 'line2Mr'],
        ['line3En', 'line3Mr'],
      ] as const;
      for (const [enKey, mrKey] of linePairs) {
        try {
          if (parts[enKey] && !parts[mrKey]) parts[mrKey] = await translateInto(parts[enKey], 'mr');
          else if (parts[mrKey] && !parts[enKey]) parts[enKey] = await translateInto(parts[mrKey], 'en');
        } catch (error) {
          console.error(`Failed to translate ${enKey}/${mrKey} on save`, error);
        }
      }

      // Keep city/state in sync across both locales.
      if (parts.stateEn || parts.stateMr) {
        Object.assign(parts, localizedStateParts(parts.stateEn || parts.stateMr));
      }
      if (parts.cityEn || parts.cityMr) {
        Object.assign(parts, localizedCityParts(parts.cityEn || parts.cityMr));
      }

      let nameEn = nameEnInput;
      let nameMr = nameMrInput;
      try {
        if (nameEn && !nameMr) nameMr = await translateInto(nameEn, 'mr');
        else if (nameMr && !nameEn) nameEn = await translateInto(nameMr, 'en');
      } catch (error) {
        console.error('Failed to translate address name on save', error);
      }
      if (!nameEn) nameEn = nameMr;
      if (!nameMr) nameMr = nameEn;

      const finalParts = sanitizeAddressPartsLocations(
        localizeAddressPartsDigits(mergeAddressParts(parts), 'mr'),
      );

      await persistAddress({ nameEn, nameMr, parts: finalParts });

      toast.success(
        editingId
          ? t('letterGeneration.addresses.updateSuccess')
          : t('letterGeneration.addresses.createSuccess'),
      );
      handleCancelEdit();
      await onRefresh();
    } catch (error) {
      console.error('Failed to save address', error);
      toast.error(
        editingId
          ? t('letterGeneration.addresses.updateError')
          : t('letterGeneration.addresses.createError'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/addresses/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to delete address');
      toast.success(t('letterGeneration.addresses.deleteSuccess'));
      if (editingId === id) {
        handleCancelEdit();
      }
      await onRefresh();
    } catch (error) {
      console.error('Failed to delete address', error);
      toast.error(t('letterGeneration.addresses.deleteError'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Card id="address-form">
        <CardHeader
          className="cursor-pointer select-none p-4 transition-colors hover:bg-muted/50 sm:p-6 rounded-t-lg"
          onClick={() => {
            setFormCardOpen((open) => {
              const next = !open;
              if (next && !editingId) {
                setForm(EMPTY_FORM);
              }
              return next;
            });
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setFormCardOpen((open) => {
                const next = !open;
                if (next && !editingId) {
                  setForm(EMPTY_FORM);
                }
                return next;
              });
            }
          }}
          role="button"
          tabIndex={0}
          aria-expanded={formCardOpen}
          aria-controls="address-form-content"
          id="address-form-header"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-lg">
                {editingId
                  ? t('letterGeneration.addresses.editTitle')
                  : t('letterGeneration.addresses.addTitle')}
              </CardTitle>
              <CardDescription>
                {t('letterGeneration.addresses.formDescription')}
              </CardDescription>
            </div>
            {formCardOpen ? (
              <ChevronUp className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden />
            ) : (
              <ChevronDown className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden />
            )}
          </div>
        </CardHeader>

        {formCardOpen ? (
          <CardContent
            id="address-form-content"
            aria-labelledby="address-form-header"
            className="space-y-4 p-4 sm:p-6"
          >
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleAutoTranslate()}
                disabled={isSaving || isTranslating}
              >
                {isTranslating ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Languages className="mr-2 size-4" />
                )}
                {t('letterGeneration.addresses.autoTranslate')}
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label>
                {t('letterGeneration.addresses.columns.name')} *
              </Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={form.name}
                  lang="en"
                  autoComplete="off"
                  required
                  aria-required
                  aria-label={`${t('letterGeneration.addresses.columns.name')} (${t('letterGeneration.addresses.english')})`}
                  placeholder={t('letterGeneration.addresses.english')}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      name: filterLocaleText(event.target.value, 'en'),
                    })
                  }
                />
                <Input
                  value={form.nameMr}
                  lang="mr"
                  autoComplete="off"
                  aria-label={`${t('letterGeneration.addresses.columns.name')} (${t('letterGeneration.addresses.marathi')})`}
                  placeholder={t('letterGeneration.addresses.marathi')}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      nameMr: filterLocaleText(event.target.value, 'mr'),
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('letterGeneration.addresses.columns.type')}</Label>
              <Select
                value={form.addressType}
                onValueChange={(value: AddressType) =>
                  setForm({ ...form, addressType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADDRESS_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`letterGeneration.addresses.types.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <BilingualAddressFields
              parts={form}
              onPartsChange={updateAddressParts}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('letterGeneration.addresses.columns.sortOrder')}</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={toLocaleDigits(form.sortOrder, locale)}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      sortOrder: toWesternDigits(event.target.value).replace(/\D/g, ''),
                    })
                  }
                />
              </div>
              <div className="flex items-end gap-2 pb-2">
                <Checkbox
                  id="address-active"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm({ ...form, isActive: event.target.checked })
                  }
                />
                <Label htmlFor="address-active">
                  {t('letterGeneration.addresses.columns.active')}
                </Label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCancelEdit}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={() => void handleSave()}
                disabled={isSaving || isTranslating}
              >
                {isSaving || isTranslating ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                {editingId
                  ? t('letterGeneration.addresses.save')
                  : t('letterGeneration.addresses.create')}
              </Button>
            </div>
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">
              {t('letterGeneration.addresses.title')}
            </CardTitle>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => void onRefresh()}
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {t('letterGeneration.savedLetters.refresh')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {sortedAddresses.length === 0 ? (
            <div className="py-6 text-sm text-muted-foreground">
              {t('letterGeneration.addresses.empty')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('letterGeneration.addresses.columns.nameEn')}</TableHead>
                    <TableHead>{t('letterGeneration.addresses.columns.nameMr')}</TableHead>
                    <TableHead>{t('letterGeneration.addresses.columns.type')}</TableHead>
                    <TableHead>{t('letterGeneration.addresses.columns.english')}</TableHead>
                    <TableHead>{t('letterGeneration.addresses.columns.marathi')}</TableHead>
                    <TableHead>{t('letterGeneration.addresses.columns.active')}</TableHead>
                    <TableHead className="text-right">
                      {t('letterGeneration.savedLetters.columns.actions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAddresses.map((address) => (
                    <TableRow key={address.id}>
                      <TableCell className="font-medium">{address.name}</TableCell>
                      <TableCell className="font-medium" lang="mr">
                        {address.nameMr.trim() || '—'}
                      </TableCell>
                      <TableCell>
                        {t(`letterGeneration.addresses.types.${address.addressType}`)}
                      </TableCell>
                      <TableCell className="max-w-[220px] whitespace-pre-wrap text-sm">
                        {formatAddressMaster(address, 'en')}
                      </TableCell>
                      <TableCell className="max-w-[220px] whitespace-pre-wrap text-sm">
                        {formatAddressMaster(address, 'mr')}
                      </TableCell>
                      <TableCell>
                        {address.isActive
                          ? t('letterGeneration.addresses.activeYes')
                          : t('letterGeneration.addresses.activeNo')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => openEditForm(address)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => void handleDelete(address.id)}
                            disabled={deletingId === address.id}
                          >
                            {deletingId === address.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
