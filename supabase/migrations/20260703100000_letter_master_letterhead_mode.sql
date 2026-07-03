-- Letterhead display size: half (compact) or full (page width)

ALTER TABLE "LetterMaster"
  ADD COLUMN IF NOT EXISTS letterhead_mode text NOT NULL DEFAULT 'full';

ALTER TABLE "LetterMaster"
  DROP CONSTRAINT IF EXISTS "LetterMaster_letterhead_mode_check";

ALTER TABLE "LetterMaster"
  ADD CONSTRAINT "LetterMaster_letterhead_mode_check"
    CHECK (letterhead_mode IN ('half', 'full'));
