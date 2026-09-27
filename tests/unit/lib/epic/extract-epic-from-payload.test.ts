/**
 * TEST-UNIT-EPIC-001 through TEST-UNIT-EPIC-005
 *
 * Unit tests for EPIC voter ID extraction from barcode/QR payloads.
 * Source: lib/epic/extract-epic-from-payload.ts
 * Module: Voter Master & Search
 * Dependencies: None (pure regex/string logic)
 */

import { extractEpicFromPayload } from '@/lib/epic/extract-epic-from-payload';

describe('extractEpicFromPayload', () => {
  // TEST-UNIT-EPIC-001
  it('extracts exact 3-letter + 7-digit EPIC format', () => {
    expect(extractEpicFromPayload('ABC1234567')).toBe('ABC1234567');
  });

  // TEST-UNIT-EPIC-002
  it('normalizes lowercase to uppercase', () => {
    expect(extractEpicFromPayload('abc1234567')).toBe('ABC1234567');
  });

  // TEST-UNIT-EPIC-003
  it('extracts EPIC embedded in a longer descriptive string', () => {
    expect(extractEpicFromPayload('Name: ABC1234567 Ward: 172')).toBe(
      'ABC1234567',
    );
  });

  // TEST-UNIT-EPIC-004
  it('extracts EPIC with hint prefix (EPIC:)', () => {
    expect(extractEpicFromPayload('EPIC:XYZ9876543')).toBe('XYZ9876543');
    expect(extractEpicFromPayload('VOTER ID: MNO5551234')).toBe('MNO5551234');
  });

  // TEST-UNIT-EPIC-005
  it('returns null for empty or null-ish input', () => {
    expect(extractEpicFromPayload('')).toBeNull();
    expect(extractEpicFromPayload('   ')).toBeNull();
  });

  it('falls back to loose 10-character alphanumeric match', () => {
    // Not strict 3+7 format but 10 alphanumeric chars
    expect(extractEpicFromPayload('AB12345678')).toBe('AB12345678');
  });

  it('returns null when no 10-char token can be found', () => {
    expect(extractEpicFromPayload('short')).toBeNull();
    expect(extractEpicFromPayload('12345')).toBeNull();
  });
});
