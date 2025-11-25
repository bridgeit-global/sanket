-- Make email column nullable since we're using user_id as the primary identifier
-- This allows new users to be created without an email address

ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

