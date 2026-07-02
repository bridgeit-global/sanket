-- Letterhead image URL for letter master templates

ALTER TABLE "LetterMaster"
  ADD COLUMN IF NOT EXISTS letterhead_url text NULL;
