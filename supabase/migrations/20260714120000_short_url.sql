-- Generic short-URL table: maps a short random code to either a private
-- Supabase Storage object (signed on demand) or a plain external URL, with an
-- optional expiry. First used by the SIR module to share the voter-profile PDF
-- over WhatsApp as a compact link instead of a manual file attachment.
CREATE TABLE IF NOT EXISTS "public"."ShortUrl" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "code" character varying(32) NOT NULL,
  "target_url" text,
  "storage_bucket" character varying(100),
  "storage_path" text,
  "created_by" uuid,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "ShortUrl_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ShortUrl_code_key" UNIQUE ("code"),
  CONSTRAINT "ShortUrl_created_by_fkey" FOREIGN KEY ("created_by")
    REFERENCES "public"."User"("id") ON DELETE SET NULL,
  -- Must resolve to either a storage object or a plain URL.
  CONSTRAINT "ShortUrl_target_check"
    CHECK ("target_url" IS NOT NULL OR "storage_path" IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS "idx_short_url_expires_at"
  ON "public"."ShortUrl" ("expires_at");

-- Private bucket for SIR voter-profile PDFs (contains PII; never public).
-- Objects are reached only via short-lived signed URLs minted at redirect time.
INSERT INTO storage.buckets (id, name, public)
VALUES ('sir-profiles', 'sir-profiles', false)
ON CONFLICT (id) DO NOTHING;
