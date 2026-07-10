'use client';

import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from '@/hooks/use-translations';
import type { AddressMasterAddressParts } from '@/lib/letters/format-address-master';
import {
  getCitiesForState,
  INDIAN_STATES,
  isCityInState,
  normalizeCityName,
  normalizeStateName,
} from '@/lib/letters/indian-locations';
import { toLocaleDigits, toWesternDigits } from '@/lib/locale-digits';
import type { LetterLocale } from '@/lib/letters/templates';

const LINE_FIELDS = [
  { key: 'line1', en: 'line1En', mr: 'line1Mr' },
  { key: 'line2', en: 'line2En', mr: 'line2Mr' },
] as const;

function localeKey(
  field: 'line1' | 'line2' | 'city' | 'state',
  locale: LetterLocale,
): keyof AddressMasterAddressParts {
  if (field === 'line1') return locale === 'mr' ? 'line1Mr' : 'line1En';
  if (field === 'line2') return locale === 'mr' ? 'line2Mr' : 'line2En';
  if (field === 'city') return locale === 'mr' ? 'cityMr' : 'cityEn';
  return locale === 'mr' ? 'stateMr' : 'stateEn';
}

type StructuredAddressFieldsProps = {
  locale: LetterLocale;
  parts: AddressMasterAddressParts;
  onPartsChange: (patch: Partial<AddressMasterAddressParts>) => void;
  previewText?: string;
  pincodeError?: string;
};

export function StructuredAddressFields({
  locale,
  parts,
  onPartsChange,
  previewText,
  pincodeError,
}: StructuredAddressFieldsProps) {
  const { t } = useTranslations();

  const stateKey = localeKey('state', locale);
  const cityKey = localeKey('city', locale);
  const rawState = parts[stateKey];
  const rawCity = parts[cityKey];
  const normalizedState = normalizeStateName(rawState);
  const normalizedCity = normalizeCityName(rawCity);

  const stateOptions = [
    ...INDIAN_STATES.map((state) => ({ value: state, label: state })),
    ...(normalizedState &&
    !INDIAN_STATES.some((state) => state.toLowerCase() === normalizedState.toLowerCase())
      ? [{ value: normalizedState, label: normalizedState }]
      : []),
  ];

  const cities = getCitiesForState(normalizedState);
  const cityOptions = [
    ...cities.map((city) => ({ value: city, label: city })),
    ...(normalizedCity &&
    !cities.some((city) => city.toLowerCase() === normalizedCity.toLowerCase())
      ? [{ value: normalizedCity, label: normalizedCity }]
      : []),
  ];

  const selectedState =
    stateOptions.find((opt) => opt.value.toLowerCase() === normalizedState.toLowerCase())
      ?.value ?? '';

  const selectedCity =
    cityOptions.find((opt) => opt.value.toLowerCase() === normalizedCity.toLowerCase())
      ?.value ?? '';

  const handleStateChange = (nextState: string) => {
    const patch: Partial<AddressMasterAddressParts> = { [stateKey]: nextState };
    if (normalizedCity && !isCityInState(normalizedCity, nextState)) {
      patch[cityKey] = '';
    }
    onPartsChange(patch);
  };

  return (
    <div className="space-y-3 rounded-md border p-3 sm:p-4">
      <p className="text-sm font-medium">{t('letterGeneration.addresses.structuredFields')}</p>

      <div className="space-y-3">
        {LINE_FIELDS.map((field) => {
          const fieldKey = localeKey(field.key, locale);
          return (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-xs">{t(`letterGeneration.addresses.fields.${field.key}`)}</Label>
              <Input
                value={parts[fieldKey]}
                onChange={(event) => onPartsChange({ [fieldKey]: event.target.value })}
                className="h-9"
              />
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs">{t('letterGeneration.addresses.fields.state')}</Label>
          <Combobox
            options={stateOptions}
            value={selectedState || undefined}
            onValueChange={handleStateChange}
            placeholder={t('letterGeneration.addresses.selectState')}
            emptyMessage={t('letterGeneration.addresses.empty')}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">{t('letterGeneration.addresses.fields.city')}</Label>
          <Combobox
            options={cityOptions}
            value={selectedCity || undefined}
            onValueChange={(nextCity) => onPartsChange({ [cityKey]: nextCity })}
            placeholder={t('letterGeneration.addresses.selectCity')}
            emptyMessage={t('letterGeneration.addresses.empty')}
            disabled={!selectedState}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">{t('letterGeneration.addresses.fields.pincode')}</Label>
          <Input
            value={toLocaleDigits(parts.pincode, locale)}
            onChange={(event) => {
              const cleaned = toWesternDigits(event.target.value).replace(/\D/g, '').slice(0, 6);
              onPartsChange({ pincode: cleaned });
            }}
            inputMode="numeric"
            maxLength={6}
            className="h-9"
            aria-invalid={Boolean(pincodeError)}
          />
          {pincodeError ? (
            <p className="text-xs text-destructive">{pincodeError}</p>
          ) : null}
        </div>
      </div>

      {previewText !== undefined ? (
        <div className="text-xs text-muted-foreground">
          {locale === 'en'
            ? t('letterGeneration.addresses.columns.english')
            : t('letterGeneration.addresses.columns.marathi')}
          : {previewText}
        </div>
      ) : null}
    </div>
  );
}
