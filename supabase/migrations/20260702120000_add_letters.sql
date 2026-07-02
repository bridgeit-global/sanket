-- Letters saved from Letter Generation module

CREATE TABLE IF NOT EXISTS "Letter" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_type text NOT NULL,
  letter_locale text NOT NULL,
  reference_no text NULL,
  title text NOT NULL,
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  body text NOT NULL,
  created_by uuid NULL REFERENCES "User"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "Letter_created_at_idx" ON "Letter"(created_at DESC);
CREATE INDEX IF NOT EXISTS "Letter_letter_type_idx" ON "Letter"(letter_type);
CREATE INDEX IF NOT EXISTS "Letter_reference_no_idx" ON "Letter"(reference_no);

