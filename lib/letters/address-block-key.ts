import { createHash } from 'node:crypto';

import type { AddressMasterAddressParts } from '@/lib/letters/format-address-master';

/** Stable dedupe key for physical AddressBlock rows (must match SQL md5 payload). */
export function addressBlockContentKey(parts: AddressMasterAddressParts): string {
  const payload = [
    parts.line1En ?? '',
    parts.line1Mr ?? '',
    parts.line2En ?? '',
    parts.line2Mr ?? '',
    parts.line3En ?? '',
    parts.line3Mr ?? '',
    parts.cityEn ?? '',
    parts.cityMr ?? '',
    parts.stateEn ?? '',
    parts.stateMr ?? '',
    parts.pincode ?? '',
  ].join('\n');
  return createHash('md5').update(payload, 'utf8').digest('hex');
}
