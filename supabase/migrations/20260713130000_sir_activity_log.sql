-- Activity log for the SIR module: records voter searches (profile opens) and
-- profile PDF downloads/shares, so per-user daily/weekly usage can be reported.
CREATE TABLE IF NOT EXISTS "public"."SirActivityLog" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "epic_number" character varying(50) NOT NULL,
  "action" character varying(20) NOT NULL,
  "performed_by" uuid NOT NULL,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT "SirActivityLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SirActivityLog_action_check"
    CHECK ("action" IN ('search', 'download', 'share')),
  CONSTRAINT "SirActivityLog_performed_by_fkey" FOREIGN KEY ("performed_by")
    REFERENCES "public"."User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_sir_activity_log_performed_by_created_at"
  ON "public"."SirActivityLog" ("performed_by", "created_at");

CREATE INDEX IF NOT EXISTS "idx_sir_activity_log_created_at"
  ON "public"."SirActivityLog" ("created_at");
