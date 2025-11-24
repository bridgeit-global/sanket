-- Fix UserModulePermissions table if it was created with wrong column name
-- This migration handles the case where the table might have been created with "user_id" instead of "userId"

DO $$ 
BEGIN
  -- Check if column "user_id" exists and "userId" doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'UserModulePermissions' 
    AND column_name = 'user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'UserModulePermissions' 
    AND column_name = 'userId'
  ) THEN
    -- Rename the column to match the schema
    ALTER TABLE "UserModulePermissions" RENAME COLUMN "user_id" TO "userId";
    
    -- Drop old constraint if it exists
    ALTER TABLE "UserModulePermissions" DROP CONSTRAINT IF EXISTS "UserModulePermissions_user_id_User_id_fk";
    
    -- Add correct constraint
    ALTER TABLE "UserModulePermissions" 
    ADD CONSTRAINT "UserModulePermissions_userId_User_id_fk" 
    FOREIGN KEY ("userId") 
    REFERENCES "public"."User"("id") 
    ON DELETE cascade 
    ON UPDATE no action;
    
    -- Recreate indexes with correct column name
    DROP INDEX IF EXISTS "idx_user_module_permissions_user_id";
    DROP INDEX IF EXISTS "idx_user_module_permissions_user_module";
    
    CREATE INDEX IF NOT EXISTS "idx_user_module_permissions_user_id" ON "UserModulePermissions" ("userId");
    CREATE INDEX IF NOT EXISTS "idx_user_module_permissions_user_module" ON "UserModulePermissions" ("userId", "module_key");
  END IF;
END $$;

