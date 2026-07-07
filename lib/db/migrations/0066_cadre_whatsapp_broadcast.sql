-- Cadre WhatsApp broadcasts: bulk hierarchy-targeted message groups.

CREATE TABLE IF NOT EXISTS "CadreWhatsAppBroadcast" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "message" text NOT NULL,
  "image_urls" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "target" jsonb NOT NULL,
  "target_label" text NOT NULL,
  "recipient_count" integer NOT NULL DEFAULT 0,
  "skipped_no_whatsapp" integer NOT NULL DEFAULT 0,
  "created_by" uuid REFERENCES "User"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cadre_whatsapp_broadcast_created_at"
  ON "CadreWhatsAppBroadcast" ("created_at" DESC);
--> statement-breakpoint
ALTER TABLE "CadreWhatsAppMessage"
  ADD COLUMN IF NOT EXISTS "broadcast_id" uuid REFERENCES "CadreWhatsAppBroadcast"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cadre_whatsapp_message_broadcast_id"
  ON "CadreWhatsAppMessage" ("broadcast_id");
