'use client';

import { useCallback, useEffect, useState } from 'react';

import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from '@/hooks/use-translations';
import type { AddressType } from '@/lib/letters/address-types';
import {
  EMPTY_ADDRESS_PARTS,
  enrichAddressPartsWithPincodeLookup,
  formatAddressMaster,
  mergeAddressParts,
  parseFreeTextAddressForLocale,
  type AddressMasterAddressParts,
} from '@/lib/letters/format-address-master';
import type { PincodeLookupResult } from '@/lib/letters/pincode-lookup';
import { usePincodeLookup } from '@/lib/letters/use-pincode-lookup';
import { toLocaleDigits, toWesternDigits } from '@/lib/locale-digits';
import type { LetterLocale } from '@/lib/letters/templates';

export type AddressMasterRow = {
  id: string;
  name: string;
  addressType: AddressType;
  line1En: string;
  line1Mr: string;
  line2En: string;
  line2Mr: string;
  cityEn: string;
  cityMr: string;
  stateEn: string;
  stateMr: string;
  pincode: string;
  isActive: boolean;
  sortOrder: number;
};

const MANUAL_VALUE = '__manual__';

const STRUCTURED_FIELDS = [
  { key: 'line1', en: 'line1En', mr: 'line1Mr' },
  { key: 'line2', en: 'line2En', mr: 'line2Mr' },
  { key: 'city', en: 'cityEn', mr: 'cityMr' },
  { key: 'state', en: 'stateEn', mr: 'stateMr' },
] as const;

function localeFieldKey(
  field: (typeof STRUCTURED_FIELDS)[number],
  locale: LetterLocale,
): keyof AddressMasterAddressParts {
  return locale === 'mr' ? field.mr : field.en;
}

type LetterAddressFieldProps = {
  label: string;
  addressType: AddressType;
  locale: LetterLocale;
  selectedAddressId: string | null;
  addresses: AddressMasterRow[];
  addressParts: AddressMasterAddressParts;
  onAddressPartsChange: (parts: AddressMasterAddressParts) => void;
  onSelectedAddressIdChange: (id: string | null) => void;
  pincodeError?: string;
};

export function LetterAddressField({
  label,
  addressType,
  locale,
  selectedAddressId,
  addresses,
  addressParts,
  onAddressPartsChange,
  onSelectedAddressIdChange,
  pincodeError,
}: LetterAddressFieldProps) {
  const { t } = useTranslations();
  const [freeTextAddress, setFreeTextAddress] = useState(() =>
    formatAddressMaster(addressParts, locale),
  );

  const filteredAddresses = addresses.filter(
    (address) => address.isActive && address.addressType === addressType,
  );

  const isManual = !selectedAddressId;

  useEffect(() => {
    if (!isManual) return;
    setFreeTextAddress(formatAddressMaster(addressParts, locale));
  }, [addressParts, isManual, locale]);

  const applyPincodeLookup = useCallback(
    (lookup: PincodeLookupResult) => {
      if (locale === 'mr') {
        onAddressPartsChange({
          ...addressParts,
          cityMr: addressParts.cityMr.trim() || lookup.city,
          stateMr: addressParts.stateMr.trim() || lookup.state,
        });
        return;
      }
      onAddressPartsChange(enrichAddressPartsWithPincodeLookup(addressParts, lookup));
    },
    [addressParts, locale, onAddressPartsChange],
  );

  const applyEnrichedAddress = useCallback(
    (enrichedText: string) => {
      const primary = parseFreeTextAddressForLocale(enrichedText, locale);
      onAddressPartsChange(mergeAddressParts(addressParts, primary));
      setFreeTextAddress(enrichedText);
    },
    [addressParts, locale, onAddressPartsChange],
  );

  const { schedulePincodeLookup } = usePincodeLookup({
    onEnriched: applyEnrichedAddress,
    onResolved: applyPincodeLookup,
  });

  const updateParts = (next: AddressMasterAddressParts) => {
    onAddressPartsChange(next);
    if (isManual) {
      setFreeTextAddress(formatAddressMaster(next, locale));
    }
  };

  const updateStructuredField = (
    field: keyof AddressMasterAddressParts,
    value: string,
  ) => {
    const normalizedValue =
      field === 'pincode' ? toWesternDigits(value).replace(/\D/g, '') : value;
    const next = { ...addressParts, [field]: normalizedValue };
    updateParts(next);

    if (field === 'pincode') {
      const cleaned = normalizedValue;
      if (cleaned.length === 6) {
        schedulePincodeLookup(formatAddressMaster(next, locale), cleaned);
      }
    }
  };

  const updateFreeTextAddress = (value: string) => {
    const primary = parseFreeTextAddressForLocale(value, locale);
    const next = mergeAddressParts(addressParts, primary);
    setFreeTextAddress(value);
    onAddressPartsChange(next);
    if (primary.pincode) {
      schedulePincodeLookup(value, primary.pincode);
    }
  };

  const handleSelectChange = (nextValue: string) => {
    if (nextValue === MANUAL_VALUE) {
      onSelectedAddressIdChange(null);
      return;
    }

    const selected = filteredAddresses.find((address) => address.id === nextValue);
    if (!selected) return;

    onSelectedAddressIdChange(selected.id);
    onAddressPartsChange({
      line1En: selected.line1En,
      line1Mr: selected.line1Mr,
      line2En: selected.line2En,
      line2Mr: selected.line2Mr,
      cityEn: selected.cityEn,
      cityMr: selected.cityMr,
      stateEn: selected.stateEn,
      stateMr: selected.stateMr,
      pincode: selected.pincode,
    });
  };

  const comboboxOptions = [
    { value: MANUAL_VALUE, label: t('letterGeneration.addresses.manualEntry') },
    ...filteredAddresses.map((address) => ({ value: address.id, label: address.name })),
  ];

  const selectedAddress = selectedAddressId
    ? filteredAddresses.find((address) => address.id === selectedAddressId)
    : null;

  return (
    <div className="space-y-2">
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      {filteredAddresses.length > 0 ? (
        <Combobox
          options={comboboxOptions}
          value={selectedAddressId ?? MANUAL_VALUE}
          onValueChange={handleSelectChange}
          placeholder={t('letterGeneration.addresses.selectPlaceholder')}
          emptyMessage={t('letterGeneration.addresses.empty')}
        />
      ) : null}

      {selectedAddress ? (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm whitespace-pre-wrap">
          {formatAddressMaster(selectedAddress, locale)}
        </div>
      ) : (
        <div className="space-y-3 rounded-md border p-4">
          <div className="space-y-2">
            <Label>{t('letterGeneration.addresses.pasteAddress')}</Label>
            <Textarea
              value={freeTextAddress}
              onChange={(event) => updateFreeTextAddress(event.target.value)}
              placeholder={t('letterGeneration.addresses.pasteAddressPlaceholder')}
              className="min-h-[80px]"
            />
          </div>

          <p className="text-sm font-medium">{t('letterGeneration.addresses.structuredFields')}</p>
          {STRUCTURED_FIELDS.map((field) => {
            const fieldKey = localeFieldKey(field, locale);
            return (
              <div key={field.key} className="space-y-2">
                <Label>{t(`letterGeneration.addresses.fields.${field.key}`)}</Label>
                <Input
                  value={addressParts[fieldKey]}
                  onChange={(event) => updateStructuredField(fieldKey, event.target.value)}
                />
              </div>
            );
          })}
          <div className="space-y-2 sm:max-w-xs">
            <Label>{t('letterGeneration.addresses.fields.pincode')}</Label>
            <Input
              value={toLocaleDigits(addressParts.pincode, locale)}
              onChange={(event) =>
                updateStructuredField('pincode', toWesternDigits(event.target.value))
              }
              inputMode="numeric"
              aria-invalid={Boolean(pincodeError)}
            />
            {pincodeError ? (
              <p className="text-xs text-destructive">{pincodeError}</p>
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground">
            {locale === 'en'
              ? t('letterGeneration.addresses.columns.english')
              : t('letterGeneration.addresses.columns.marathi')}
            : {formatAddressMaster(addressParts, locale)}
          </div>
        </div>
      )}
    </div>
  );
}

export function findDefaultAddress(
  addresses: AddressMasterRow[],
  addressType: AddressType,
): AddressMasterRow | null {
  return (
    addresses
      .filter((address) => address.isActive && address.addressType === addressType)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))[0] ?? null
  );
}

export function createEmptyAddressParts(): AddressMasterAddressParts {
  return { ...EMPTY_ADDRESS_PARTS };
}
