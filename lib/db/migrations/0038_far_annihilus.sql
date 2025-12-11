ALTER TABLE "RegisterEntry" ADD COLUMN "document_type" varchar DEFAULT 'General' NOT NULL;

-- Update existing records to have 'General' as default (already set by DEFAULT clause, but ensuring consistency)
UPDATE "RegisterEntry" SET "document_type" = 'General' WHERE "document_type" IS NULL;
