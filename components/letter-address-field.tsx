'use client';

import { useCallback } from 'react';

import { Combobox } from '@/components/ui/combobox';
import { StructuredAddressFields } from '@/components/structured-address-fields';
import { useTranslations } from '@/hooks/use-translations';
import type { AddressType } from '@/lib/letters/address-types';
import {
  EMPTY_ADDRESS_PARTS,
  enrichAddressPartsWithPincodeLookup,
  formatAddressMaster,
  type AddressMasterAddressParts,
} from '@/lib/letters/format-address-master';
import type { PincodeLookupResult } from '@/lib/letters/pincode-lookup';
import { usePincodeLookup } from '@/lib/letters/use-pincode-lookup';
import { toWesternDigits } from '@/lib/locale-digits';
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

  const filteredAddresses = addresses.filter(
    (address) => address.isActive && address.addressType === addressType,
  );

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

  const { schedulePincodeLookup } = usePincodeLookup({
    onEnriched: () => {},
    onResolved: applyPincodeLookup,
  });

  const updateAddressParts = (patch: Partial<AddressMasterAddressParts>) => {
    const nextPatch =
      patch.pincode !== undefined
        ? {
            ...patch,
            pincode: toWesternDigits(patch.pincode).replace(/\D/g, '').slice(0, 6),
          }
        : patch;
    const next = { ...addressParts, ...nextPatch };
    onAddressPartsChange(next);

    if (nextPatch.pincode !== undefined && nextPatch.pincode.length === 6) {
      schedulePincodeLookup(formatAddressMaster(next, locale), nextPatch.pincode);
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
        <StructuredAddressFields
          locale={locale}
          parts={addressParts}
          onPartsChange={updateAddressParts}
          previewText={formatAddressMaster(addressParts, locale)}
          pincodeError={pincodeError}
        />
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
