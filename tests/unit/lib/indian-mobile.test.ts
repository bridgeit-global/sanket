/**
 * TEST-UNIT-MOBILE-001 through TEST-UNIT-MOBILE-008
 *
 * Unit tests for Indian mobile number normalization and validation.
 * Source: lib/indian-mobile.ts
 * Module: Common (Cross-cutting)
 * Dependencies: None (pure regex logic)
 */

import {
  normalizeIndianMobileDigits,
  isValidIndianMobile,
  toWhatsAppChatUrl,
} from '@/lib/indian-mobile';

describe('normalizeIndianMobileDigits', () => {
  // TEST-UNIT-MOBILE-001
  it('strips +91 country code prefix from 12-digit input', () => {
    expect(normalizeIndianMobileDigits('+919876543210')).toBe('9876543210');
  });

  // TEST-UNIT-MOBILE-002
  it('strips leading 0 trunk prefix from 11-digit input', () => {
    expect(normalizeIndianMobileDigits('09876543210')).toBe('9876543210');
  });

  // TEST-UNIT-MOBILE-003
  it('passes through clean 10-digit number unchanged', () => {
    expect(normalizeIndianMobileDigits('9876543210')).toBe('9876543210');
  });

  // TEST-UNIT-MOBILE-004
  it('strips spaces, dashes, and non-digit characters', () => {
    expect(normalizeIndianMobileDigits('+91 98765-43210')).toBe('9876543210');
    expect(normalizeIndianMobileDigits('(91) 98765 43210')).toBe('9876543210');
    expect(normalizeIndianMobileDigits('  987-654-3210  ')).toBe('9876543210');
  });
});

describe('isValidIndianMobile', () => {
  // TEST-UNIT-MOBILE-005
  it('rejects 9-digit input as too short', () => {
    expect(isValidIndianMobile('987654321')).toBe(false);
  });

  // TEST-UNIT-MOBILE-006
  it('rejects numbers starting with digit < 6', () => {
    expect(isValidIndianMobile('5876543210')).toBe(false);
    expect(isValidIndianMobile('4876543210')).toBe(false);
    expect(isValidIndianMobile('1234567890')).toBe(false);
    expect(isValidIndianMobile('0987654321')).toBe(false); // normalizes to 9876543210 — wait, 10 digits starting with 0: 0987654321 is 10 digits, not 11
  });

  // TEST-UNIT-MOBILE-007
  it('accepts all valid starting digits (6, 7, 8, 9)', () => {
    expect(isValidIndianMobile('6000000000')).toBe(true);
    expect(isValidIndianMobile('7000000000')).toBe(true);
    expect(isValidIndianMobile('8000000000')).toBe(true);
    expect(isValidIndianMobile('9000000000')).toBe(true);
  });
});

describe('toWhatsAppChatUrl', () => {
  // TEST-UNIT-MOBILE-008
  it('generates correct wa.me URL for valid Indian number', () => {
    expect(toWhatsAppChatUrl('9876543210')).toBe(
      'https://wa.me/919876543210',
    );
  });

  it('generates URL with encoded message parameter', () => {
    expect(toWhatsAppChatUrl('9876543210', 'Hello World')).toBe(
      'https://wa.me/919876543210?text=Hello%20World',
    );
  });

  it('returns null for invalid number', () => {
    expect(toWhatsAppChatUrl('123')).toBeNull();
  });

  it('handles +91 prefixed input correctly', () => {
    expect(toWhatsAppChatUrl('+919876543210')).toBe(
      'https://wa.me/919876543210',
    );
  });
});
