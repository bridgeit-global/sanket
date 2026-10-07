ALTER TABLE "public"."JobFairRegistration"
  ADD COLUMN IF NOT EXISTS "whatsapp_verified_at" timestamp with time zone;

ALTER TABLE "public"."JobFairRegistrationDraft"
  ADD COLUMN IF NOT EXISTS "whatsapp_verified_at" timestamp with time zone;
