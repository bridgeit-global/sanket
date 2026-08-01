-- Allow inward register entries without a document type

ALTER TABLE "RegisterEntry"
  ALTER COLUMN document_type DROP NOT NULL,
  ALTER COLUMN document_type DROP DEFAULT;
