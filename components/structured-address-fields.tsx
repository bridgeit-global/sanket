'use client';

import { useEffect } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AddressMasterAddressParts } from '@/lib/letters/format-address-master';
import { letterMessage } from '@/lib/letters/letter-messages';
import {
  DEFAULT_CITY,
  DEFAULT_STATE,
  localizedCityParts,
  localizedStateParts,
} from '@/lib/letters/indian-locations';
import { filterLocaleText } from '@/lib/letters/locale-text';
import { toLocaleDigits, toWesternDigits } from '@/lib/locale-digits';
import type { LetterLocale } from '@/lib/letters/templates';

const LINE_FIELDS = [
  { key: 'line1', en: 'line1En', mr: 'line1Mr' },
  { key: 'line2', en: 'line2En', mr: 'line2Mr' },
  { key: 'line3', en: 'line3En', mr: 'line3Mr' },
] as const;

function localeKey(
  field: 'line1' | 'line2' | 'line3',
  locale: LetterLocale,
): keyof AddressMasterAddressParts {
  if (field === 'line1') return locale === 'mr' ? 'line1Mr' : 'line1En';
  if (field === 'line2') return locale === 'mr' ? 'line2Mr' : 'line2En';
  return locale === 'mr' ? 'line3Mr' : 'line3En';
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
  const at = (key: string) => letterMessage(locale, key);

  const hasStoredState = Boolean(parts.stateEn.trim() || parts.stateMr.trim());
  const hasStoredCity = Boolean(parts.cityEn.trim() || parts.cityMr.trim());

  // Keep Maharashtra/Mumbai defaults in form state so validation passes.
  useEffect(() => {
    if (hasStoredState && hasStoredCity) return;
    const patch: Partial<AddressMasterAddressParts> = {};
    if (!hasStoredState) Object.assign(patch, localizedStateParts(DEFAULT_STATE));
    if (!hasStoredCity) Object.assign(patch, localizedCityParts(DEFAULT_CITY));
    onPartsChange(patch);
    // Only re-run when stored location presence changes; callers often pass inline onPartsChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync defaults when empty
  }, [hasStoredState, hasStoredCity]);

  const emitChange = (patch: Partial<AddressMasterAddressParts>) => {
    onPartsChange(withLocationDefaults(parts, patch));
  };

  return (
    <div className="space-y-3 rounded-md border p-3 sm:p-4">
      <p className="text-sm font-medium">{at('letterGeneration.addresses.structuredFields')}</p>

      <div className="space-y-3">
        {LINE_FIELDS.map((field) => {
          const fieldKey = localeKey(field.key, locale);
          const required = field.key === 'line1';
          return (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-xs">
                {at(`letterGeneration.addresses.fields.${field.key}`)}
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

      <div className="space-y-1.5 sm:max-w-xs">
        <Label className="text-xs">
          {at('letterGeneration.addresses.fields.pincode')} *
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

      {previewText !== undefined ? (
        <div className="text-xs text-muted-foreground">
          {locale === 'en'
            ? at('letterGeneration.addresses.columns.english')
            : at('letterGeneration.addresses.columns.marathi')}
          : {previewText}
        </div>
      ) : null}
    </div>
  );
}
