-- Widen letter status so Submit can lock a letter without treating
-- pending verification as final. Existing rows keep their current status.

ALTER TABLE "public"."Letter" DROP CONSTRAINT IF EXISTS "letter_status_check";

ALTER TABLE "public"."Letter"
  ADD CONSTRAINT "letter_status_check"
  CHECK ("status" IN ('draft', 'pending_verification', 'approved', 'submitted'));

COMMENT ON COLUMN "public"."Letter"."status" IS
  'draft: editable; pending_verification: sent to admin, still editable; approved: editable; submitted: locked (no edit or delete).';
