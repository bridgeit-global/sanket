-- In-app notification inbox (paired with web push payloads).
CREATE TABLE IF NOT EXISTS "public"."AppNotification" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL DEFAULT '',
  "url" text NOT NULL DEFAULT '/',
  "tag" text,
  "read_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "AppNotification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AppNotification_user_id_User_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_app_notification_user_created"
  ON "public"."AppNotification" ("user_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_app_notification_user_unread"
  ON "public"."AppNotification" ("user_id")
  WHERE "read_at" IS NULL;

GRANT ALL ON TABLE "public"."AppNotification" TO "anon", "authenticated", "service_role";
