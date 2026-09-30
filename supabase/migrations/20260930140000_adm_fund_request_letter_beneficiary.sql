-- Link request letters pending for funds to the beneficiary service they came from.

ALTER TABLE "public"."AdmFundRequestLetter"
  ADD COLUMN IF NOT EXISTS "beneficiary_service_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'AdmFundRequestLetter_beneficiary_service_id_fkey'
  ) THEN
    ALTER TABLE "public"."AdmFundRequestLetter"
      ADD CONSTRAINT "AdmFundRequestLetter_beneficiary_service_id_fkey"
      FOREIGN KEY ("beneficiary_service_id")
      REFERENCES "public"."BeneficiaryService"("id")
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_adm_fund_request_letter_beneficiary_service_id"
  ON "public"."AdmFundRequestLetter" ("beneficiary_service_id");
