import {
  EPIC_NUMBER_PATTERN,
  assertOptionalEpicNumber,
  isCompleteEpicNumber,
  sanitizeEpicInput,
} from '@/lib/epic/normalize-epic';

describe('sanitizeEpicInput', () => {
  it('keeps a complete EPIC and uppercases it', () => {
    expect(sanitizeEpicInput('abc1234567')).toBe('ABC1234567');
    expect(EPIC_NUMBER_PATTERN.test(sanitizeEpicInput('abc1234567'))).toBe(true);
  });

  it('drops characters that break 3 letters then 7 digits', () => {
    expect(sanitizeEpicInput('ab1c1234567')).toBe('ABC1234567');
    expect(sanitizeEpicInput('ABC123456789')).toBe('ABC1234567');
  });

  it('allows a partial value while typing', () => {
    expect(sanitizeEpicInput('ab')).toBe('AB');
    expect(isCompleteEpicNumber('AB')).toBe(false);
  });
});

describe('assertOptionalEpicNumber', () => {
  it('accepts empty and a complete EPIC', () => {
    expect(assertOptionalEpicNumber(null)).toBeNull();
    expect(assertOptionalEpicNumber('  ')).toBeNull();
    expect(assertOptionalEpicNumber('nct2893600')).toBe('NCT2893600');
  });

  it('rejects a partial EPIC', () => {
    expect(() => assertOptionalEpicNumber('ABC12')).toThrow(/valid EPIC number/);
  });
});
