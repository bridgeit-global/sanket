-- Custom letter types (beyond built-in LETTER_TYPES). Built-ins stay in code.
CREATE TABLE IF NOT EXISTS "LetterTypeMaster" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  label_en text NOT NULL,
  label_mr text NOT NULL,
  form_base text NOT NULL DEFAULT 'general',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid NULL REFERENCES "User"(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES "User"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "LetterTypeMaster_code_unique" UNIQUE (code),
  CONSTRAINT "LetterTypeMaster_code_format"
    CHECK (code ~ '^[a-z][a-z0-9-]{1,62}$')
);

CREATE INDEX IF NOT EXISTS "LetterTypeMaster_is_active_idx"
  ON "LetterTypeMaster"(is_active);

CREATE INDEX IF NOT EXISTS "LetterTypeMaster_sort_order_idx"
  ON "LetterTypeMaster"(sort_order);
