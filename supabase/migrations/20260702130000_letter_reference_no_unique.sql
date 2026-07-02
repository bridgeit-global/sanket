-- Reference no is mandatory and unique across saved letters

UPDATE "Letter"
SET reference_no = 'MIGRATION-' || id::text
WHERE reference_no IS NULL OR btrim(reference_no) = '';

ALTER TABLE "Letter"
  ALTER COLUMN reference_no SET NOT NULL;

DROP INDEX IF EXISTS "Letter_reference_no_idx";

CREATE UNIQUE INDEX IF NOT EXISTS "Letter_reference_no_unique_idx"
  ON "Letter"(reference_no);
