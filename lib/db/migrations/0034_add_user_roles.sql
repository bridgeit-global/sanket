-- Add role column to User table (idempotent)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" varchar DEFAULT 'regular' NOT NULL;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;

-- Create index on role for better query performance (idempotent)
CREATE INDEX IF NOT EXISTS "idx_user_role" ON "User" ("role");

-- Note: RLS policies removed - using Vercel Postgres, not Supabase
-- Authorization is handled at the application level
