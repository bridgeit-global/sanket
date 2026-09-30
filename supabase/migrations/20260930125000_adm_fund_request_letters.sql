-- Request letters pending for funds: PDF in private letters bucket, status, optional ADM fund link.

CREATE TABLE IF NOT EXISTS "public"."AdmFundRequestLetter" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "letter_date" date NOT NULL,
  "title" text NOT NULL,
  "status" character varying(30) NOT NULL DEFAULT 'pending',
  "fund_record_id" uuid,
  "file_name" character varying(255) NOT NULL,
  "file_size_kb" integer NOT NULL DEFAULT 0,
  "storage_path" text NOT NULL,
  "uploaded_by" uuid NOT NULL,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT "AdmFundRequestLetter_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdmFundRequestLetter_status_check"
    CHECK ("status" IN ('pending', 'linked', 'sanctioned', 'rejected')),
  CONSTRAINT "AdmFundRequestLetter_fund_record_id_fkey"
    FOREIGN KEY ("fund_record_id")
    REFERENCES "public"."AdmFundRecord"("id")
    ON DELETE SET NULL,
  CONSTRAINT "AdmFundRequestLetter_uploaded_by_fkey"
    FOREIGN KEY ("uploaded_by")
    REFERENCES "public"."User"("id")
);

CREATE INDEX IF NOT EXISTS "idx_adm_fund_request_letter_letter_date"
  ON "public"."AdmFundRequestLetter" ("letter_date" DESC);

CREATE INDEX IF NOT EXISTS "idx_adm_fund_request_letter_status"
  ON "public"."AdmFundRequestLetter" ("status");

CREATE INDEX IF NOT EXISTS "idx_adm_fund_request_letter_fund_record_id"
  ON "public"."AdmFundRequestLetter" ("fund_record_id");

-- Clearing the fund (including ON DELETE SET NULL) drops a status that requires a link.
CREATE OR REPLACE FUNCTION "public"."adm_fund_request_letter_clear_fund"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.fund_record_id IS NULL
     AND OLD.fund_record_id IS NOT NULL
     AND NEW.status IN ('linked', 'sanctioned') THEN
    NEW.status := 'pending';
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "adm_fund_request_letter_clear_fund"
  ON "public"."AdmFundRequestLetter";

CREATE TRIGGER "adm_fund_request_letter_clear_fund"
  BEFORE UPDATE OF "fund_record_id" ON "public"."AdmFundRequestLetter"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."adm_fund_request_letter_clear_fund"();

ALTER TABLE "public"."AdmFundRequestLetter" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE "public"."AdmFundRequestLetter" TO "service_role";

COMMENT ON TABLE "public"."AdmFundRequestLetter" IS
  'Request letters pending for funds. PDF lives in the private letters bucket (storage_path).';
