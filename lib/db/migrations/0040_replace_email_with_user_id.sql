-- Replace email with user_id in User table
-- This migration adds user_id column, migrates existing email values to user_id,
-- and makes user_id the primary identifier for authentication

-- Step 1: Add user_id column (nullable initially to allow data migration)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "user_id" varchar(64);

-- Step 2: Migrate existing email values to user_id
-- Use email as the initial user_id value for existing users
UPDATE "User" SET "user_id" = "email" WHERE "user_id" IS NULL;

-- Step 3: For any users that still don't have a user_id (shouldn't happen, but safety check)
-- Generate a user_id from the id if email is somehow null
UPDATE "User" SET "user_id" = "id"::text WHERE "user_id" IS NULL;

-- Step 4: Make user_id NOT NULL and add UNIQUE constraint (idempotent)
ALTER TABLE "User" ALTER COLUMN "user_id" SET NOT NULL;
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'User_user_id_unique' 
    AND conrelid = '"User"'::regclass
  ) THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_user_id_unique" UNIQUE ("user_id");
  END IF;
END $$;

-- Step 5: Create index for better query performance
CREATE INDEX IF NOT EXISTS "idx_user_user_id" ON "User" ("user_id");

-- Note: The email column is kept for now to allow rollback if needed
-- It can be dropped in a future migration once the system is stable

