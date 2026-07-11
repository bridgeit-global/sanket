-- Document type master with per-type reference sequence counter

CREATE TABLE IF NOT EXISTS "DocumentTypeMaster" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  label_en text NOT NULL,
  label_mr text NOT NULL,
  last_sequence int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid NULL REFERENCES "User"(id) ON DELETE SET NULL,
  updated_by uuid NULL REFERENCES "User"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "DocumentTypeMaster_code_unique" UNIQUE (code),
  CONSTRAINT "DocumentTypeMaster_last_sequence_nonneg"
    CHECK (last_sequence >= 0)
);

CREATE INDEX IF NOT EXISTS "DocumentTypeMaster_is_active_idx"
  ON "DocumentTypeMaster"(is_active);

CREATE INDEX IF NOT EXISTS "DocumentTypeMaster_sort_order_idx"
  ON "DocumentTypeMaster"(sort_order);

INSERT INTO "DocumentTypeMaster" (code, label_en, label_mr, sort_order)
VALUES
  ('VIP', 'VIP', 'VIP', 1),
  ('Department', 'Department', 'विभाग', 2),
  ('General', 'General', 'सामान्य', 3)
ON CONFLICT (code) DO NOTHING;

-- Backfill last_sequence from existing letter + outward register refs
UPDATE "DocumentTypeMaster" dt
SET
  last_sequence = COALESCE(
    (
      SELECT MAX(seq)::int
      FROM (
        SELECT CAST(substring(l.reference_no FROM '/([0-9]+)$') AS int) AS seq
        FROM "Letter" l
        WHERE l.reference_no ~* ('^' || dt.code || '/[0-9]+$')
        UNION ALL
        SELECT CAST(substring(re.ref_no FROM '/([0-9]+)$') AS int) AS seq
        FROM "RegisterEntry" re
        WHERE re.type = 'outward'
          AND re.ref_no IS NOT NULL
          AND re.ref_no ~* ('^' || dt.code || '/[0-9]+$')
      ) s
      WHERE seq IS NOT NULL
    ),
    0
  ),
  updated_at = now();
