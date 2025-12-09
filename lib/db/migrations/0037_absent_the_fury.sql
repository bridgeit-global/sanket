-- Add aadhar_number column to Visitor table
ALTER TABLE "Visitor" ADD COLUMN IF NOT EXISTS "aadhar_number" varchar(12) NOT NULL;
--> statement-breakpoint
-- Create index for aadhar number for better query performance
CREATE INDEX IF NOT EXISTS "idx_visitor_aadhar_number" ON "Visitor" ("aadhar_number");

