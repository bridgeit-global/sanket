-- Allow multiple letter templates per letter_type + letter_locale.
ALTER TABLE "LetterMaster"
  DROP CONSTRAINT IF EXISTS "LetterMaster_type_locale_unique";

CREATE INDEX IF NOT EXISTS "LetterMaster_type_locale_idx"
  ON "LetterMaster"(letter_type, letter_locale);
