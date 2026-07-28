-- Track when a saved letter was printed so reprints can be confirmed.
ALTER TABLE "public"."Letter"
  ADD COLUMN IF NOT EXISTS "printed_at" timestamptz;

COMMENT ON COLUMN "public"."Letter"."printed_at" IS
  'Timestamp of the last successful print. Null means never printed.';

CREATE INDEX IF NOT EXISTS "idx_letter_beneficiary_service_printed_at"
  ON "public"."Letter" ("beneficiary_service_id", "printed_at")
  WHERE "printed_at" IS NOT NULL;
