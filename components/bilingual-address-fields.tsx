'use client';

import { useEffect } from 'react';

import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from '@/hooks/use-translations';
import type { AddressMasterAddressParts } from '@/lib/letters/format-address-master';
import {
  DEFAULT_CITY,
  DEFAULT_STATE,
  getCitiesForState,
  getCityLabel,
  getStateLabel,
  INDIAN_STATES,
  isCityInState,
  localizedCityParts,
  localizedStateParts,
  normalizeCityName,
  normalizeStateName,
} from '@/lib/letters/indian-locations';
import { filterLocaleText } from '@/lib/letters/locale-text';
import { toWesternDigits } from '@/lib/locale-digits';

const LINE_FIELDS = [
  { key: 'line1', en: 'line1En', mr: 'line1Mr', required: true },
  { key: 'line2', en: 'line2En', mr: 'line2Mr', required: false },
  { key: 'line3', en: 'line3En', mr: 'line3Mr', required: false },
] as const;

function resolveState(parts: AddressMasterAddressParts): string {
  return normalizeStateName(parts.stateEn || parts.stateMr);
}

function resolveCity(parts: AddressMasterAddressParts): string {
  return normalizeCityName(parts.cityEn || parts.cityMr);
}

type BilingualAddressFieldsProps = {
  parts: AddressMasterAddressParts;
  onPartsChange: (patch: Partial<AddressMasterAddressParts>) => void;
  pincodeError?: string;
};

/**
 * Renders the structured address fields with English and Marathi side by side.
 * City/State are picked once (in either language) and kept in sync across both
 * locales; the pincode is shared.
 */
export function BilingualAddressFields({
  parts,
  onPartsChange,
  pincodeError,
}: BilingualAddressFieldsProps) {
  const { t } = useTranslations();

  const hasStoredState = Boolean(parts.stateEn.trim() || parts.stateMr.trim());
  const hasStoredCity = Boolean(parts.cityEn.trim() || parts.cityMr.trim());

  useEffect(() => {
    if (hasStoredState && hasStoredCity) return;
    const patch: Partial<AddressMasterAddressParts> = {};
    if (!hasStoredState) Object.assign(patch, localizedStateParts(DEFAULT_STATE));
    if (!hasStoredCity) Object.assign(patch, localizedCityParts(DEFAULT_CITY));
    onPartsChange(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync defaults when empty
  }, [hasStoredState, hasStoredCity]);

  const normalizedState = resolveState(parts) || DEFAULT_STATE;
  const normalizedCity =
    resolveCity(parts) || (!hasStoredState ? DEFAULT_CITY : '');

  const buildStateOptions = (locale: 'en' | 'mr') => [
    ...INDIAN_STATES.map((state) => ({
      value: getStateLabel(state, locale),
      label: getStateLabel(state, locale),
    })),
    ...(hasStoredState &&
    !INDIAN_STATES.some((state) => state.toLowerCase() === normalizedState.toLowerCase())
      ? [
          {
            value: getStateLabel(normalizedState, locale),
            label: getStateLabel(normalizedState, locale),
          },
        ]
      : []),
  ];

  const cities = getCitiesForState(normalizedState);
  const buildCityOptions = (locale: 'en' | 'mr') => [
    ...cities.map((city) => ({
      value: getCityLabel(city, locale),
      label: getCityLabel(city, locale),
    })),
    ...(hasStoredCity &&
    normalizedCity &&
    !cities.some((city) => city.toLowerCase() === normalizedCity.toLowerCase())
      ? [
          {
            value: getCityLabel(normalizedCity, locale),
            label: getCityLabel(normalizedCity, locale),
          },
        ]
      : []),
  ];

  const handleStateChange = (nextState: string) => {
    const stateParts = localizedStateParts(nextState);
    const patch: Partial<AddressMasterAddressParts> = { ...stateParts };
    const currentCity = resolveCity(parts);
    if (currentCity && !isCityInState(currentCity, stateParts.stateEn)) {
      if (stateParts.stateEn === DEFAULT_STATE) {
        Object.assign(patch, localizedCityParts(DEFAULT_CITY));
      } else {
        patch.cityEn = '';
        patch.cityMr = '';
      }
    } else if (!currentCity && stateParts.stateEn === DEFAULT_STATE) {
      Object.assign(patch, localizedCityParts(DEFAULT_CITY));
    }
    onPartsChange(patch);
  };

  const handleCityChange = (nextCity: string) => {
    onPartsChange({
      ...(!hasStoredState ? localizedStateParts(DEFAULT_STATE) : {}),
      ...localizedCityParts(nextCity),
    });
  };

  return (
    <div className="space-y-3 rounded-md border p-3 sm:p-4">
      <div className="hidden gap-3 sm:grid sm:grid-cols-2">
        <p className="text-xs font-medium text-muted-foreground">
          {t('letterGeneration.addresses.english')}
        </p>
        <p className="text-xs font-medium text-muted-foreground">
          {t('letterGeneration.addresses.marathi')}
        </p>
      </div>

      <div className="space-y-3">
        {LINE_FIELDS.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-xs">
              {t(`letterGeneration.addresses.fields.${field.key}`)}
              {field.required ? ' *' : null}
            </Label>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={parts[field.en]}
                onChange={(event) =>
                  onPartsChange({
                    [field.en]: filterLocaleText(event.target.value, 'en'),
                  })
                }
                lang="en"
                autoComplete="off"
                className="h-9"
                required={field.required}
                aria-required={field.required}
                aria-label={`${t(`letterGeneration.addresses.fields.${field.key}`)} (${t('letterGeneration.addresses.english')})`}
              />
              <Input
                value={parts[field.mr]}
                onChange={(event) =>
                  onPartsChange({
                    [field.mr]: filterLocaleText(event.target.value, 'mr'),
                  })
                }
                lang="mr"
                autoComplete="off"
                className="h-9"
                aria-label={`${t(`letterGeneration.addresses.fields.${field.key}`)} (${t('letterGeneration.addresses.marathi')})`}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">
          {t('letterGeneration.addresses.fields.state')} *
        </Label>
        <div className="grid gap-2 sm:grid-cols-2">
          <Combobox
            options={buildStateOptions('en')}
            value={getStateLabel(normalizedState, 'en') || undefined}
            onValueChange={handleStateChange}
            placeholder={t('letterGeneration.addresses.selectState')}
            emptyMessage={t('letterGeneration.addresses.empty')}
          />
          <Combobox
            options={buildStateOptions('mr')}
            value={getStateLabel(normalizedState, 'mr') || undefined}
            onValueChange={handleStateChange}
            placeholder={t('letterGeneration.addresses.selectState')}
            emptyMessage={t('letterGeneration.addresses.empty')}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">
          {t('letterGeneration.addresses.fields.city')} *
        </Label>
        <div className="grid gap-2 sm:grid-cols-2">
          <Combobox
            options={buildCityOptions('en')}
            value={normalizedCity ? getCityLabel(normalizedCity, 'en') : undefined}
            onValueChange={handleCityChange}
            placeholder={t('letterGeneration.addresses.selectCity')}
            emptyMessage={t('letterGeneration.addresses.empty')}
          />
          <Combobox
            options={buildCityOptions('mr')}
            value={normalizedCity ? getCityLabel(normalizedCity, 'mr') : undefined}
            onValueChange={handleCityChange}
            placeholder={t('letterGeneration.addresses.selectCity')}
            emptyMessage={t('letterGeneration.addresses.empty')}
          />
        </div>
      </div>

      <div className="space-y-1.5 sm:max-w-[calc(50%-0.25rem)]">
        <Label className="text-xs">
          {t('letterGeneration.addresses.fields.pincode')} *
        </Label>
        <Input
          value={parts.pincode}
          onChange={(event) => {
            const cleaned = toWesternDigits(event.target.value).replace(/\D/g, '').slice(0, 6);
            onPartsChange({ pincode: cleaned });
          }}
          inputMode="numeric"
          maxLength={6}
          className="h-9"
          required
          aria-required
          aria-invalid={Boolean(pincodeError)}
        />
        {pincodeError ? (
          <p className="text-xs text-destructive">{pincodeError}</p>
        ) : null}
      </div>
    </div>
  );
}
