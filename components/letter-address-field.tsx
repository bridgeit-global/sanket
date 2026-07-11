'use client';

import { useCallback, useRef } from 'react';

import { Combobox } from '@/components/ui/combobox';
import { StructuredAddressFields } from '@/components/structured-address-fields';
import type { AddressType } from '@/lib/letters/address-types';
import { letterMessage } from '@/lib/letters/letter-messages';
import {
  EMPTY_ADDRESS_PARTS,
  enrichAddressPartsWithPincodeLookup,
  formatAddressMaster,
  type AddressMasterAddressParts,
} from '@/lib/letters/format-address-master';
import { getCityLabel, getStateLabel } from '@/lib/letters/indian-locations';
import type { PincodeLookupResult } from '@/lib/letters/pincode-lookup';
import { usePincodeLookup } from '@/lib/letters/use-pincode-lookup';
import type { LetterLocale } from '@/lib/letters/templates';

export type AddressMasterRow = {
  id: string;
  name: string;
  nameMr: string;
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
  required?: boolean;
  error?: string;
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
  required,
  error,
}: LetterAddressFieldProps) {
  const at = (key: string) => letterMessage(locale, key);
  const addressPartsRef = useRef(addressParts);
  addressPartsRef.current = addressParts;

  const filteredAddresses = addresses.filter(
    (address) => address.isActive && address.addressType === addressType,
  );

  const applyPincodeLookup = useCallback(
    (lookup: PincodeLookupResult) => {
      const current = addressPartsRef.current;
      if (locale === 'mr') {
        onAddressPartsChange({
          ...current,
          cityMr: current.cityMr.trim() || getCityLabel(lookup.city, 'mr'),
          cityEn: current.cityEn.trim() || lookup.city,
          stateMr: current.stateMr.trim() || getStateLabel(lookup.state, 'mr'),
          stateEn: current.stateEn.trim() || lookup.state,
        });
        return;
      }
      onAddressPartsChange({
        ...enrichAddressPartsWithPincodeLookup(current, lookup),
        cityMr: current.cityMr.trim() || getCityLabel(lookup.city, 'mr'),
        stateMr: current.stateMr.trim() || getStateLabel(lookup.state, 'mr'),
      });
    },
    [locale, onAddressPartsChange],
  );

  const { schedulePincodeLookup } = usePincodeLookup({
    onEnriched: () => {},
    onResolved: applyPincodeLookup,
  });

  const updateAddressParts = (patch: Partial<AddressMasterAddressParts>) => {
    const next = { ...addressPartsRef.current, ...patch };
    addressPartsRef.current = next;
    onAddressPartsChange(next);

    if (patch.pincode !== undefined && patch.pincode.length === 6) {
      schedulePincodeLookup(formatAddressMaster(next, locale), patch.pincode);
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
    { value: MANUAL_VALUE, label: at('letterGeneration.addresses.manualEntry') },
    ...filteredAddresses.map((address) => ({
      value: address.id,
      label:
        locale === 'mr' ? address.nameMr.trim() || address.name : address.name,
    })),
  ];

  const selectedAddress = selectedAddressId
    ? filteredAddresses.find((address) => address.id === selectedAddressId)
    : null;

  return (
    <div className="space-y-2">
      <label className="mb-1.5 block text-sm font-medium">
        {label}
        {required ? ' *' : null}
      </label>
      {filteredAddresses.length > 0 ? (
        <Combobox
          options={comboboxOptions}
          value={selectedAddressId ?? MANUAL_VALUE}
          onValueChange={handleSelectChange}
          placeholder={at('letterGeneration.addresses.selectPlaceholder')}
          emptyMessage={at('letterGeneration.addresses.empty')}
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
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
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
