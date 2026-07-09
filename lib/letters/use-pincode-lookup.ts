import { useCallback, useRef } from 'react';

import {
  enrichAddressTextWithPincodeLookup,
  lookupPincode,
} from '@/lib/letters/pincode-lookup';

type PincodeLookupOptions = {
  debounceMs?: number;
  onEnriched: (enrichedText: string) => void;
};

/**
 * Debounced PIN lookup that enriches free-text addresses with district/state
 * before the trailing " - pincode" suffix.
 */
export function usePincodeLookup({ debounceMs = 400, onEnriched }: PincodeLookupOptions) {
  const timerRef = useRef<number | null>(null);
  const reqIdRef = useRef(0);

  const schedulePincodeLookup = useCallback(
    (text: string, pincode: string) => {
      const cleaned = pincode.replace(/\D/g, '');
      if (cleaned.length !== 6) return;

      reqIdRef.current += 1;
      const reqId = reqIdRef.current;

      if (timerRef.current) window.clearTimeout(timerRef.current);

      timerRef.current = window.setTimeout(async () => {
        try {
          const result = await lookupPincode(cleaned);
          if (!result || reqIdRef.current !== reqId) return;

          const enriched = enrichAddressTextWithPincodeLookup(text, cleaned, result);
          if (enriched !== text) onEnriched(enriched);
        } catch (error) {
          console.error('Failed to lookup pincode', error);
        }
      }, debounceMs);
    },
    [debounceMs, onEnriched],
  );

  return { schedulePincodeLookup };
}
