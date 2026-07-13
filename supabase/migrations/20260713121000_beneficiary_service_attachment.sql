-- Attachments (documents / images) for beneficiary services.
CREATE TABLE IF NOT EXISTS "public"."BeneficiaryServiceAttachment" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "service_id" uuid NOT NULL,
  "file_name" character varying(255) NOT NULL,
  "file_size_kb" integer NOT NULL DEFAULT 0,
  "file_url" text,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT "BeneficiaryServiceAttachment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BeneficiaryServiceAttachment_service_id_fkey" FOREIGN KEY ("service_id")
    REFERENCES "public"."BeneficiaryService"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_beneficiary_service_attachment_service_id"
  ON "public"."BeneficiaryServiceAttachment" ("service_id");
