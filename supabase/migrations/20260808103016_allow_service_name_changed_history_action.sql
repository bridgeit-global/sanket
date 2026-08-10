-- Allow logging service name changes on beneficiary service history.
ALTER TABLE "public"."BeneficiaryServiceHistory"
  DROP CONSTRAINT IF EXISTS "BeneficiaryServiceHistory_action_check";

ALTER TABLE "public"."BeneficiaryServiceHistory"
  ADD CONSTRAINT "BeneficiaryServiceHistory_action_check"
  CHECK ("action" IN (
    'created',
    'status_changed',
    'priority_changed',
    'note_added',
    'escalated',
    'assigned',
    'attachment_added',
    'service_name_changed'
  ));
