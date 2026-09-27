/**
 * TEST-UNIT-BARCODE-001 through TEST-UNIT-BARCODE-003
 *
 * Unit tests for numeric voter ID Code 128 barcode payload decoding.
 * Source: lib/epic/decode-voter-barcode.ts
 * Module: Voter Master & Search
 * Dependencies: None (pure numeric logic)
 */

import {
  parseVoterBarcodePayload,
  isNumericVoterBarcodePayload,
  VOTER_BARCODE_SERIAL_WIDTH,
} from '@/lib/epic/decode-voter-barcode';

describe('parseVoterBarcodePayload', () => {
  // TEST-UNIT-BARCODE-001
  it('decodes valid 8-digit payload into part number and serial number', () => {
    // 21664533 → part 216, serial 64533
    const result = parseVoterBarcodePayload('21664533');
    expect(result).toEqual({ partNo: '216', srNo: '64533' });
  });

  it('decodes a 6-digit payload (minimum length)', () => {
    // 100001 → part 1, serial 00001
    const result = parseVoterBarcodePayload('100001');
    expect(result).toEqual({ partNo: '1', srNo: '1' });
  });

  it('decodes a 10-digit payload (maximum length)', () => {
    // 5000012345 → part 50000, serial 12345
    const result = parseVoterBarcodePayload('5000012345');
    expect(result).toEqual({ partNo: '50000', srNo: '12345' });
  });

  // TEST-UNIT-BARCODE-002
  it('returns null for non-numeric payload', () => {
    expect(parseVoterBarcodePayload('ABCDEFGH')).toBeNull();
    expect(parseVoterBarcodePayload('abc12345')).toBeNull();
  });

  // TEST-UNIT-BARCODE-003
  it('returns null for too-short payload (< 6 digits)', () => {
    expect(parseVoterBarcodePayload('12345')).toBeNull();
    expect(parseVoterBarcodePayload('1')).toBeNull();
  });

  it('returns null for too-long payload (> 10 digits)', () => {
    expect(parseVoterBarcodePayload('12345678901')).toBeNull();
  });

  it('returns null when serial number would be zero', () => {
    // 100000 → part 1, serial 0 → invalid
    expect(parseVoterBarcodePayload('100000')).toBeNull();
  });

  it('returns null for empty or whitespace-only input', () => {
    expect(parseVoterBarcodePayload('')).toBeNull();
    expect(parseVoterBarcodePayload('   ')).toBeNull();
  });
});

describe('isNumericVoterBarcodePayload', () => {
  it('returns true for valid numeric barcode payload', () => {
    expect(isNumericVoterBarcodePayload('21664533')).toBe(true);
  });

  it('returns false for non-barcode payload', () => {
    expect(isNumericVoterBarcodePayload('ABC1234567')).toBe(false);
  });
});

describe('VOTER_BARCODE_SERIAL_WIDTH', () => {
  it('is 5 digits (matches ECI specification)', () => {
    expect(VOTER_BARCODE_SERIAL_WIDTH).toBe(5);
  });
});
