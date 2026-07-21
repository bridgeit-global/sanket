'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StructuredAddressFields } from '@/components/structured-address-fields';
import type { AddressType } from '@/lib/letters/address-types';
import { letterMessage } from '@/lib/letters/letter-messages';
import { filterLocaleText } from '@/lib/letters/locale-text';
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
  line3En: string;
  line3Mr: string;
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
  /** When provided, a name input is shown above the manual address lines. */
  nameLabel?: string;
  namePlaceholder?: string;
  nameValue?: string;
  onNameChange?: (value: string) => void;
  nameRequired?: boolean;
  nameError?: string;
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
  nameLabel,
  namePlaceholder,
  nameValue,
  onNameChange,
  nameRequired,
  nameError,
}: LetterAddressFieldProps) {
  const at = (key: string) => letterMessage(locale, key);
  const addressPartsRef = useRef(addressParts);
  addressPartsRef.current = addressParts;

  const filteredAddresses = addresses.filter(
    (address) => address.isActive && address.addressType === addressType,
  );
  const hasSavedAddresses = filteredAddresses.length > 0;

  // Manual entry is opt-in when saved addresses exist; otherwise show fields directly.
  const [isManualMode, setIsManualMode] = useState(false);
  const userChoseManualRef = useRef(false);
  const hadSavedAddressesRef = useRef(hasSavedAddresses);

  useEffect(() => {
    if (selectedAddressId) {
      userChoseManualRef.current = false;
      setIsManualMode(false);
      hadSavedAddressesRef.current = hasSavedAddresses;
      return;
    }

    if (!hasSavedAddresses) {
      setIsManualMode(true);
      hadSavedAddressesRef.current = false;
      return;
    }

    // Addresses loaded after an empty list — leave auto-manual unless user chose manual.
    if (!hadSavedAddressesRef.current) {
      hadSavedAddressesRef.current = true;
      if (!userChoseManualRef.current) {
        setIsManualMode(false);
      }
      return;
    }

    hadSavedAddressesRef.current = true;
    setIsManualMode(userChoseManualRef.current);
  }, [selectedAddressId, hasSavedAddresses]);

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
      userChoseManualRef.current = true;
      setIsManualMode(true);
      onSelectedAddressIdChange(null);
      return;
    }

    const selected = filteredAddresses.find((address) => address.id === nextValue);
    if (!selected) return;

    userChoseManualRef.current = false;
    setIsManualMode(false);
    onSelectedAddressIdChange(selected.id);
    onAddressPartsChange({
      line1En: selected.line1En,
      line1Mr: selected.line1Mr,
      line2En: selected.line2En,
      line2Mr: selected.line2Mr,
      line3En: selected.line3En,
      line3Mr: selected.line3Mr,
      cityEn: selected.cityEn,
      cityMr: selected.cityMr,
      stateEn: selected.stateEn,
      stateMr: selected.stateMr,
      pincode: selected.pincode,
    });
  };

  const comboboxOptions = [
    {
      value: MANUAL_VALUE,
      label: at('letterGeneration.addresses.manualEntry'),
      pinned: true,
    },
    ...filteredAddresses.map((address) => ({
      value: address.id,
      label:
        locale === 'mr' ? address.nameMr.trim() || address.name : address.name,
    })),
  ];

  const selectedAddress = selectedAddressId
    ? filteredAddresses.find((address) => address.id === selectedAddressId)
    : null;

  const showManualFields = isManualMode || !hasSavedAddresses;
  const comboboxValue = selectedAddressId ?? (isManualMode ? MANUAL_VALUE : '');

  return (
    <div className="space-y-2">
      <label className="mb-1.5 block text-sm font-medium">
        {label}
        {required ? ' *' : null}
      </label>
      {hasSavedAddresses ? (
        <Combobox
          options={comboboxOptions}
          value={comboboxValue}
          onValueChange={handleSelectChange}
          placeholder={at('letterGeneration.addresses.selectPlaceholder')}
          emptyMessage={at('letterGeneration.addresses.empty')}
        />
      ) : null}

      {selectedAddress ? (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm whitespace-pre-wrap">
          {formatAddressMaster(selectedAddress, locale)}
        </div>
      ) : showManualFields ? (
        <div className="space-y-3">
          {onNameChange ? (
            <div className="space-y-1.5">
              {nameLabel ? (
                <Label className="text-xs">
                  {nameLabel}
                  {nameRequired ? ' *' : null}
                </Label>
              ) : null}
              <Input
                value={nameValue ?? ''}
                onChange={(event) =>
                  onNameChange(filterLocaleText(event.target.value, locale))
                }
                placeholder={namePlaceholder}
                lang={locale === 'mr' ? 'mr' : 'en'}
                autoComplete="off"
                className="h-9"
                required={nameRequired}
                aria-required={nameRequired}
                aria-invalid={Boolean(nameError)}
              />
              {nameError ? (
                <p className="text-xs text-destructive">{nameError}</p>
              ) : null}
            </div>
          ) : null}
          <StructuredAddressFields
            locale={locale}
            parts={addressParts}
            onPartsChange={updateAddressParts}
            previewText={formatAddressMaster(addressParts, locale)}
            pincodeError={pincodeError}
          />
        </div>
      ) : null}
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
