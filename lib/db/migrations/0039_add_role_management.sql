-- Add Role Management System
-- This migration creates Role and RoleModulePermissions tables, adds roleId to User table,
-- creates default roles with module permissions, and migrates existing users

-- Create Role table
CREATE TABLE IF NOT EXISTS "Role" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(100) NOT NULL UNIQUE,
  "description" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create RoleModulePermissions table
CREATE TABLE IF NOT EXISTS "RoleModulePermissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "role_id" uuid NOT NULL REFERENCES "Role"("id") ON DELETE CASCADE,
  "module_key" varchar(50) NOT NULL,
  "has_access" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  UNIQUE("role_id", "module_key")
);

-- Add roleId column to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role_id" uuid REFERENCES "Role"("id") ON DELETE RESTRICT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_role_module_permissions_role_id" ON "RoleModulePermissions" ("role_id");
CREATE INDEX IF NOT EXISTS "idx_role_module_permissions_module_key" ON "RoleModulePermissions" ("module_key");
CREATE INDEX IF NOT EXISTS "idx_user_role_id" ON "User" ("role_id");

-- Create default roles with their module permissions
DO $$
DECLARE
  admin_role_id uuid;
  operator_role_id uuid;
  back_office_role_id uuid;
  regular_role_id uuid;
BEGIN
  -- Create Admin role
  INSERT INTO "Role" ("name", "description", "created_at", "updated_at")
  VALUES ('admin', 'Full system access with all modules', now(), now())
  ON CONFLICT ("name") DO UPDATE SET "description" = EXCLUDED."description"
  RETURNING "id" INTO admin_role_id;
  
  -- Get admin role ID if it already exists
  IF admin_role_id IS NULL THEN
    SELECT "id" INTO admin_role_id FROM "Role" WHERE "name" = 'admin';
  END IF;

  -- Create Operator role
  INSERT INTO "Role" ("name", "description", "created_at", "updated_at")
  VALUES ('operator', 'Operational access to voter management and office modules', now(), now())
  ON CONFLICT ("name") DO UPDATE SET "description" = EXCLUDED."description"
  RETURNING "id" INTO operator_role_id;
  
  IF operator_role_id IS NULL THEN
    SELECT "id" INTO operator_role_id FROM "Role" WHERE "name" = 'operator';
  END IF;

  -- Create Back-office role
  INSERT INTO "Role" ("name", "description", "created_at", "updated_at")
  VALUES ('back-office', 'Back office access for profile updates and office modules', now(), now())
  ON CONFLICT ("name") DO UPDATE SET "description" = EXCLUDED."description"
  RETURNING "id" INTO back_office_role_id;
  
  IF back_office_role_id IS NULL THEN
    SELECT "id" INTO back_office_role_id FROM "Role" WHERE "name" = 'back-office';
  END IF;

  -- Create Regular role
  INSERT INTO "Role" ("name", "description", "created_at", "updated_at")
  VALUES ('regular', 'Basic user with limited access', now(), now())
  ON CONFLICT ("name") DO UPDATE SET "description" = EXCLUDED."description"
  RETURNING "id" INTO regular_role_id;
  
  IF regular_role_id IS NULL THEN
    SELECT "id" INTO regular_role_id FROM "Role" WHERE "name" = 'regular';
  END IF;

  -- Admin role permissions (all modules except those with no default roles)
  INSERT INTO "RoleModulePermissions" ("role_id", "module_key", "has_access", "created_at", "updated_at")
  VALUES 
    (admin_role_id, 'user-management', true, now(), now()),
    (admin_role_id, 'profile', true, now(), now()),
    (admin_role_id, 'chat', true, now(), now()),
    (admin_role_id, 'operator', true, now(), now()),
    (admin_role_id, 'back-office', true, now(), now()),
    (admin_role_id, 'dashboard', true, now(), now()),
    (admin_role_id, 'daily-programme', true, now(), now()),
    (admin_role_id, 'inward', true, now(), now()),
    (admin_role_id, 'outward', true, now(), now()),
    (admin_role_id, 'projects', true, now(), now())
  ON CONFLICT ("role_id", "module_key") DO UPDATE SET "has_access" = EXCLUDED."has_access";

  -- Operator role permissions
  INSERT INTO "RoleModulePermissions" ("role_id", "module_key", "has_access", "created_at", "updated_at")
  VALUES 
    (operator_role_id, 'profile', true, now(), now()),
    (operator_role_id, 'operator', true, now(), now()),
    (operator_role_id, 'dashboard', true, now(), now()),
    (operator_role_id, 'daily-programme', true, now(), now())
  ON CONFLICT ("role_id", "module_key") DO UPDATE SET "has_access" = EXCLUDED."has_access";

  -- Back-office role permissions
  INSERT INTO "RoleModulePermissions" ("role_id", "module_key", "has_access", "created_at", "updated_at")
  VALUES 
    (back_office_role_id, 'profile', true, now(), now()),
    (back_office_role_id, 'operator', true, now(), now()),
    (back_office_role_id, 'back-office', true, now(), now()),
    (back_office_role_id, 'dashboard', true, now(), now()),
    (back_office_role_id, 'daily-programme', true, now(), now())
  ON CONFLICT ("role_id", "module_key") DO UPDATE SET "has_access" = EXCLUDED."has_access";

  -- Regular role permissions (only profile)
  INSERT INTO "RoleModulePermissions" ("role_id", "module_key", "has_access", "created_at", "updated_at")
  VALUES 
    (regular_role_id, 'profile', true, now(), now())
  ON CONFLICT ("role_id", "module_key") DO UPDATE SET "has_access" = EXCLUDED."has_access";

  -- Migrate existing users to roles based on their current role enum value
  UPDATE "User" SET "role_id" = admin_role_id WHERE "role" = 'admin' AND "role_id" IS NULL;
  UPDATE "User" SET "role_id" = operator_role_id WHERE "role" = 'operator' AND "role_id" IS NULL;
  UPDATE "User" SET "role_id" = back_office_role_id WHERE "role" = 'back-office' AND "role_id" IS NULL;
  UPDATE "User" SET "role_id" = regular_role_id WHERE "role" = 'regular' AND "role_id" IS NULL;
  
  -- Set default role for any users without a role assigned
  UPDATE "User" SET "role_id" = regular_role_id WHERE "role_id" IS NULL;
END $$;

