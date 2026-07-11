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

function resolveState(parts: AddressMasterAddressParts): string {
  return normalizeStateName(parts.stateEn || parts.stateMr);
}

function resolveCity(parts: AddressMasterAddressParts): string {
  return normalizeCityName(parts.cityEn || parts.cityMr);
}

/** Ensure Maharashtra / Mumbai are present when location fields are still empty. */
function withLocationDefaults(
  parts: AddressMasterAddressParts,
  patch: Partial<AddressMasterAddressParts>,
): Partial<AddressMasterAddressParts> {
  const next = { ...parts, ...patch };
  const hasState = Boolean(next.stateEn.trim() || next.stateMr.trim());
  const hasCity = Boolean(next.cityEn.trim() || next.cityMr.trim());

  if (!hasState) {
    Object.assign(patch, localizedStateParts(DEFAULT_STATE));
  }
  if (!hasCity) {
    Object.assign(patch, localizedCityParts(DEFAULT_CITY));
  }
  return patch;
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

  const hasStoredState = Boolean(parts.stateEn.trim() || parts.stateMr.trim());
  const hasStoredCity = Boolean(parts.cityEn.trim() || parts.cityMr.trim());

  // Keep displayed Maharashtra/Mumbai defaults in form state so validation passes.
  useEffect(() => {
    if (hasStoredState && hasStoredCity) return;
    const patch: Partial<AddressMasterAddressParts> = {};
    if (!hasStoredState) Object.assign(patch, localizedStateParts(DEFAULT_STATE));
    if (!hasStoredCity) Object.assign(patch, localizedCityParts(DEFAULT_CITY));
    onPartsChange(patch);
    // Only re-run when stored location presence changes; callers often pass inline onPartsChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync defaults when empty
  }, [hasStoredState, hasStoredCity]);

  const normalizedState = resolveState(parts) || DEFAULT_STATE;
  const normalizedCity =
    resolveCity(parts) || (!hasStoredState ? DEFAULT_CITY : '');

  const stateOptions = [
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
  const cityOptions = [
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

  const selectedState = getStateLabel(normalizedState, locale);
  const selectedCity = normalizedCity ? getCityLabel(normalizedCity, locale) : '';

  const emitChange = (patch: Partial<AddressMasterAddressParts>) => {
    onPartsChange(withLocationDefaults(parts, patch));
  };

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
      <p className="text-sm font-medium">{t('letterGeneration.addresses.structuredFields')}</p>

      <div className="space-y-3">
        {LINE_FIELDS.map((field) => {
          const fieldKey = localeKey(field.key, locale);
          const required = field.key !== 'line2';
          return (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-xs">
                {t(`letterGeneration.addresses.fields.${field.key}`)}
                {required ? ' *' : null}
              </Label>
              <Input
                value={parts[fieldKey]}
                onChange={(event) =>
                  emitChange({
                    [fieldKey]: filterLocaleText(event.target.value, locale),
                  })
                }
                lang={locale === 'mr' ? 'mr' : 'en'}
                autoComplete="off"
                className="h-9"
                required={required}
                aria-required={required}
              />
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs">
            {t('letterGeneration.addresses.fields.state')} *
          </Label>
          <Combobox
            options={stateOptions}
            value={selectedState || undefined}
            onValueChange={handleStateChange}
            placeholder={t('letterGeneration.addresses.selectState')}
            emptyMessage={t('letterGeneration.addresses.empty')}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">
            {t('letterGeneration.addresses.fields.city')} *
          </Label>
          <Combobox
            options={cityOptions}
            value={selectedCity || undefined}
            onValueChange={handleCityChange}
            placeholder={t('letterGeneration.addresses.selectCity')}
            emptyMessage={t('letterGeneration.addresses.empty')}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">
            {t('letterGeneration.addresses.fields.pincode')} *
          </Label>
          <Input
            value={toLocaleDigits(parts.pincode, locale)}
            onChange={(event) => {
              const cleaned = toWesternDigits(event.target.value).replace(/\D/g, '').slice(0, 6);
              emitChange({ pincode: cleaned });
            }}
            inputMode="numeric"
            maxLength={6}
            lang={locale === 'mr' ? 'mr' : 'en'}
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
