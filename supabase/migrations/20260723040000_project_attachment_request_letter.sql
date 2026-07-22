-- Allow project document uploads of kind "request_letter".
ALTER TABLE "public"."ProjectAttachment"
  DROP CONSTRAINT IF EXISTS "ProjectAttachment_document_kind_check";

ALTER TABLE "public"."ProjectAttachment"
  ADD CONSTRAINT "ProjectAttachment_document_kind_check"
  CHECK ("document_kind" IN (
    'approval_pdf',
    'sanction_letter',
    'noc',
    'supporting',
    'request_letter'
  ));
