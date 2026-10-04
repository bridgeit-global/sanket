-- Documents attached directly to a government follow-up matter.
CREATE TABLE IF NOT EXISTS "public"."GovFollowUpAttachment" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "matter_id" uuid NOT NULL,
  "file_name" character varying(255) NOT NULL,
  "file_size_kb" integer NOT NULL DEFAULT 0,
  "file_url" text,
  "created_by" uuid,
  "created_at" timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT "GovFollowUpAttachment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GovFollowUpAttachment_matter_id_fkey"
    FOREIGN KEY ("matter_id")
    REFERENCES "public"."GovFollowUpMatter"("id") ON DELETE CASCADE,
  CONSTRAINT "GovFollowUpAttachment_created_by_fkey"
    FOREIGN KEY ("created_by")
    REFERENCES "public"."User"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_gov_follow_up_attachment_matter_id"
  ON "public"."GovFollowUpAttachment" ("matter_id");
