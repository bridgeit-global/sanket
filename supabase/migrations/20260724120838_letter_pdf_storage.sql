-- Persist letter PDFs in private Supabase Storage and track the object path on Letter.

ALTER TABLE "public"."Letter"
  ADD COLUMN IF NOT EXISTS "pdf_storage_path" text;

COMMENT ON COLUMN "public"."Letter"."pdf_storage_path" IS
  'Path of the generated PDF in the letters storage bucket (private).';

-- Private bucket for letter PDFs (may contain PII; never public).
-- Objects are reached only via service-role signed URLs minted by the app API.
INSERT INTO storage.buckets (id, name, public)
VALUES ('letters', 'letters', false)
ON CONFLICT (id) DO NOTHING;
