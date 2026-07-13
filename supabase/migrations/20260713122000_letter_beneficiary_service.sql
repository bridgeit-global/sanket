-- Link generated letters back to the beneficiary service they were created from.
ALTER TABLE "public"."Letter"
  ADD COLUMN IF NOT EXISTS "beneficiary_service_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Letter_beneficiary_service_id_fkey'
  ) THEN
    ALTER TABLE "public"."Letter"
      ADD CONSTRAINT "Letter_beneficiary_service_id_fkey"
      FOREIGN KEY ("beneficiary_service_id")
      REFERENCES "public"."BeneficiaryService"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_letter_beneficiary_service_id"
  ON "public"."Letter" ("beneficiary_service_id");
