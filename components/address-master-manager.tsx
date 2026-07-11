'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  AddressTranslationReviewDialog,
  type AddressTranslationReviewResult,
} from '@/components/address-translation-review-dialog';
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
import { StructuredAddressFields } from '@/components/structured-address-fields';
import {
  EMPTY_ADDRESS_PARTS,
  enrichAddressPartsWithPincodeLookup,
  formatAddressMaster,
  hasRequiredAddressFields,
  localizeAddressPartsDigits,
  mergeAddressParts,
  parseFreeTextAddressForLocale,
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

const LOCALE_PART_KEYS = [
  'line1En',
  'line1Mr',
  'line2En',
  'line2Mr',
  'cityEn',
  'cityMr',
  'stateEn',
  'stateMr',
] as const;

function extractLocaleParts(
  form: AddressFormState,
  locale: LetterLocale,
): AddressMasterAddressParts {
  const parts = { ...EMPTY_ADDRESS_PARTS, pincode: form.pincode.trim() };
  for (const key of LOCALE_PART_KEYS) {
    if (locale === 'mr' ? key.endsWith('Mr') : key.endsWith('En')) {
      parts[key] = form[key].trim();
    }
  }
  return parts;
}

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

function streetLinesForLocale(
  parts: AddressMasterAddressParts,
  locale: LetterLocale,
): { line1: string; line2: string } {
  if (locale === 'mr') {
    return { line1: parts.line1Mr.trim(), line2: parts.line2Mr.trim() };
  }
  return { line1: parts.line1En.trim(), line2: parts.line2En.trim() };
}

async function translateStreetLines(
  parts: AddressMasterAddressParts,
  sourceLocale: LetterLocale,
  targetLocale: LetterLocale,
): Promise<Partial<AddressMasterAddressParts>> {
  const { line1, line2 } = streetLinesForLocale(parts, sourceLocale);
  const result: Partial<AddressMasterAddressParts> = {};

  if (line1) {
    const translated = await translateAddressText(line1, targetLocale);
    if (targetLocale === 'mr') result.line1Mr = translated;
    else result.line1En = translated;
  }

  if (line2) {
    const translated = await translateAddressText(line2, targetLocale);
    if (targetLocale === 'mr') result.line2Mr = translated;
    else result.line2En = translated;
  }

  return result;
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
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewTargetLocale, setReviewTargetLocale] = useState<LetterLocale>('mr');
  const [reviewName, setReviewName] = useState('');
  const [reviewParts, setReviewParts] = useState<AddressMasterAddressParts>(EMPTY_ADDRESS_PARTS);
  const [pendingPrimary, setPendingPrimary] = useState<{
    name: string;
    parts: AddressMasterAddressParts;
  } | null>(null);

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

  const handleSave = async () => {
    const primaryParts = extractLocaleParts(form, locale);
    const primaryName = filterLocaleText(
      (locale === 'mr' ? form.nameMr : form.name).trim(),
      locale,
    );

    if (!primaryName || !hasRequiredAddressFields(primaryParts, locale)) {
      toast.error(t('letterGeneration.addresses.validationRequired'));
      return;
    }

    const targetLocale: LetterLocale = locale === 'en' ? 'mr' : 'en';
    setIsTranslating(true);
    try {
      let translatedParts: AddressMasterAddressParts = sanitizeAddressPartsLocations(
        localizeAddressPartsDigits(
          {
            ...EMPTY_ADDRESS_PARTS,
            pincode: primaryParts.pincode,
            ...localizedStateParts(primaryParts.stateEn || primaryParts.stateMr),
            ...localizedCityParts(primaryParts.cityEn || primaryParts.cityMr),
          },
          targetLocale,
        ),
      );
      let translatedName = '';

      try {
        const streetParts = await translateStreetLines(primaryParts, locale, targetLocale);
        translatedParts = sanitizeAddressPartsLocations(
          localizeAddressPartsDigits(
            mergeAddressParts(translatedParts, streetParts),
            targetLocale,
          ),
        );
      } catch (error) {
        console.error('Failed to translate address on save', error);
        // Fallback: translate full formatted address, then parse structured fields.
        const sourceText = formatAddressMaster(primaryParts, locale);
        if (sourceText.trim()) {
          try {
            const translated = await translateAddressText(sourceText, targetLocale);
            if (translated) {
              translatedParts = sanitizeAddressPartsLocations(
                localizeAddressPartsDigits(
                  mergeAddressParts(
                    translatedParts,
                    parseFreeTextAddressForLocale(translated, targetLocale),
                  ),
                  targetLocale,
                ),
              );
            }
          } catch (fallbackError) {
            console.error('Failed to translate full address on save', fallbackError);
          }
        }
      }

      try {
        translatedName = await translateAddressText(primaryName, targetLocale);
      } catch (error) {
        console.error('Failed to translate address name on save', error);
      }

      setPendingPrimary({
        name: primaryName,
        parts: sanitizeAddressPartsLocations(mergeAddressParts(primaryParts)),
      });
      setReviewTargetLocale(targetLocale);
      setReviewName(filterLocaleText(translatedName, targetLocale));
      setReviewParts(translatedParts);
      setReviewOpen(true);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleReviewCancel = () => {
    if (isSaving) return;
    setReviewOpen(false);
    setPendingPrimary(null);
  };

  const handleReviewConfirm = async (result: AddressTranslationReviewResult) => {
    if (!pendingPrimary) return;

    setIsSaving(true);
    try {
      const primaryName = pendingPrimary.name;
      const reviewedName = filterLocaleText(result.name, reviewTargetLocale).trim();
      const reviewedParts = extractLocaleParts(
        { ...EMPTY_FORM, ...result.parts },
        reviewTargetLocale,
      );

      let nameEn = locale === 'en' ? primaryName : reviewedName;
      let nameMr = locale === 'mr' ? primaryName : reviewedName;
      if (!nameEn) nameEn = nameMr;

      const parts = sanitizeAddressPartsLocations(
        localizeAddressPartsDigits(
          mergeAddressParts(pendingPrimary.parts, reviewedParts),
          'mr',
        ),
      );

      await persistAddress({ nameEn, nameMr, parts });

      toast.success(
        editingId
          ? t('letterGeneration.addresses.updateSuccess')
          : t('letterGeneration.addresses.createSuccess'),
      );
      setReviewOpen(false);
      setPendingPrimary(null);
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
            <div className="space-y-2">
              <Label>
                {t('letterGeneration.addresses.columns.name')} *
              </Label>
              <Input
                value={locale === 'mr' ? form.nameMr : form.name}
                lang={locale === 'mr' ? 'mr' : 'en'}
                autoComplete="off"
                required
                aria-required
                onChange={(event) => {
                  const value = filterLocaleText(event.target.value, locale);
                  setForm({
                    ...form,
                    ...(locale === 'mr' ? { nameMr: value } : { name: value }),
                  });
                }}
              />
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

            <StructuredAddressFields
              locale={locale}
              parts={form}
              onPartsChange={updateAddressParts}
              previewText={formatAddressMaster(form, locale)}
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

      <AddressTranslationReviewDialog
        open={reviewOpen}
        targetLocale={reviewTargetLocale}
        initialName={reviewName}
        initialParts={reviewParts}
        isConfirming={isSaving}
        onConfirm={(result) => void handleReviewConfirm(result)}
        onCancel={handleReviewCancel}
      />

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
