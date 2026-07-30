-- Append-only activity history for beneficiary services (notes, status, assignment, attachments).
CREATE TABLE IF NOT EXISTS "public"."BeneficiaryServiceHistory" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "service_id" uuid NOT NULL,
  "action" character varying(50) NOT NULL,
  "old_value" text,
  "new_value" text,
  "performed_by" uuid NOT NULL,
  "notes" text,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT "BeneficiaryServiceHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BeneficiaryServiceHistory_action_check"
    CHECK ("action" IN (
      'created',
      'status_changed',
      'priority_changed',
      'note_added',
      'escalated',
      'assigned',
      'attachment_added'
    )),
  CONSTRAINT "BeneficiaryServiceHistory_service_id_fkey"
    FOREIGN KEY ("service_id")
    REFERENCES "public"."BeneficiaryService"("id")
    ON DELETE CASCADE,
  CONSTRAINT "BeneficiaryServiceHistory_performed_by_fkey"
    FOREIGN KEY ("performed_by")
    REFERENCES "public"."User"("id")
);

CREATE INDEX IF NOT EXISTS "idx_beneficiary_service_history_service_id_created_at"
  ON "public"."BeneficiaryServiceHistory" ("service_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_beneficiary_service_history_created_at"
  ON "public"."BeneficiaryServiceHistory" ("created_at");
