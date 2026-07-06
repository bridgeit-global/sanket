-- Cadre WhatsApp: member contact numbers + outbound message queue for an external worker.

CREATE TABLE IF NOT EXISTS "CadreMemberWhatsApp" (
  "member_id" uuid PRIMARY KEY REFERENCES "CadreMember"("id") ON DELETE CASCADE,
  "whatsapp_phone" varchar(20) NOT NULL,
  "updated_by" uuid REFERENCES "User"("id") ON DELETE SET NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_cadre_member_whatsapp_phone"
  ON "CadreMemberWhatsApp" ("whatsapp_phone");

CREATE TABLE IF NOT EXISTS "CadreWhatsAppMessage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "member_id" uuid REFERENCES "CadreMember"("id") ON DELETE SET NULL,
  "whatsapp_phone" varchar(20) NOT NULL,
  "message" text NOT NULL,
  "image_urls" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "status" varchar(20) NOT NULL DEFAULT 'pending',
  "error_message" text,
  "created_by" uuid REFERENCES "User"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "processed_at" timestamp
);

CREATE INDEX IF NOT EXISTS "idx_cadre_whatsapp_message_status"
  ON "CadreWhatsAppMessage" ("status");

CREATE INDEX IF NOT EXISTS "idx_cadre_whatsapp_message_created_at"
  ON "CadreWhatsAppMessage" ("created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_cadre_whatsapp_message_member_id"
  ON "CadreWhatsAppMessage" ("member_id");
