import { randomInt } from 'node:crypto';

/** Uppercase letters and digits, without 0/O and 1/I so the code is easy to read aloud. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SUFFIX_LENGTH = 4;

/** Registration number is exactly `YUVAAZ-` plus 4 random characters. */
export function generateJobFairRegistrationNo(): string {
  let suffix = '';
  for (let i = 0; i < SUFFIX_LENGTH; i += 1) {
    suffix += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `YUVAAZ-${suffix}`;
}
