-- Letter master templates (editable HTML) and rendered letter instances

CREATE TABLE IF NOT EXISTS "LetterMaster" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  letter_type text NOT NULL,
  letter_locale text NOT NULL,
  template_html text NOT NULL,
  created_by uuid NULL REFERENCES "User"(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES "User"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "LetterMaster_type_locale_unique" UNIQUE (letter_type, letter_locale)
);

CREATE INDEX IF NOT EXISTS "LetterMaster_letter_type_idx"
  ON "LetterMaster"(letter_type);

ALTER TABLE "Letter"
  ADD COLUMN IF NOT EXISTS letter_master_id uuid NULL REFERENCES "LetterMaster"(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rendered_html text NULL;

UPDATE "Letter"
SET rendered_html = body
WHERE rendered_html IS NULL AND body IS NOT NULL;

ALTER TABLE "Letter" DROP COLUMN IF EXISTS body;

ALTER TABLE "Letter"
  ALTER COLUMN rendered_html SET NOT NULL;

CREATE INDEX IF NOT EXISTS "Letter_letter_master_id_idx"
  ON "Letter"(letter_master_id);
