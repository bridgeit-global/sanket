-- Remove role column from User table
-- This migration removes the role enum column in favor of roleId-based role management
-- All users should have a roleId assigned before running this migration

-- First, ensure all users without a roleId get assigned to the 'regular' role
-- This is a safety measure in case any users don't have a roleId
DO $$
DECLARE
  regular_role_id uuid;
BEGIN
  -- Get the regular role ID
  SELECT "id" INTO regular_role_id FROM "Role" WHERE "name" = 'regular' LIMIT 1;
  
  -- If regular role exists, assign it to users without a roleId
  IF regular_role_id IS NOT NULL THEN
    UPDATE "User"
    SET "role_id" = regular_role_id
    WHERE "role_id" IS NULL;
  END IF;
END $$;

-- Drop the role column from User table
ALTER TABLE "User" DROP COLUMN IF EXISTS "role";

