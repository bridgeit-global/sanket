'use client';

import { Combobox } from '@/components/ui/combobox';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from '@/hooks/use-translations';
import { formatAddressMaster } from '@/lib/letters/format-address-master';
import type { AddressType } from '@/lib/letters/address-types';
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
  value: string;
  selectedAddressId: string | null;
  addresses: AddressMasterRow[];
  onValueChange: (value: string) => void;
  onSelectedAddressIdChange: (id: string | null) => void;
  rows?: number;
};

export function LetterAddressField({
  label,
  addressType,
  locale,
  value,
  selectedAddressId,
  addresses,
  onValueChange,
  onSelectedAddressIdChange,
  rows = 2,
}: LetterAddressFieldProps) {
  const { t } = useTranslations();
  const filteredAddresses = addresses.filter(
    (address) => address.isActive && address.addressType === addressType,
  );

  const handleSelectChange = (nextValue: string) => {
    if (nextValue === MANUAL_VALUE) {
      onSelectedAddressIdChange(null);
      return;
    }

    const selected = filteredAddresses.find((address) => address.id === nextValue);
    if (!selected) return;

    onSelectedAddressIdChange(selected.id);
    onValueChange(formatAddressMaster(selected, locale));
  };

  const comboboxOptions = [
    { value: MANUAL_VALUE, label: t('letterGeneration.addresses.manualEntry') },
    ...filteredAddresses.map((address) => ({ value: address.id, label: address.name })),
  ];

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
      <Textarea
        value={value}
        onChange={(event) => {
          onSelectedAddressIdChange(null);
          onValueChange(event.target.value);
        }}
        rows={rows}
      />
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
