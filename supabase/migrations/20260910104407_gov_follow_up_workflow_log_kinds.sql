-- Allow the full government follow-up workflow on log entries.
-- Existing kinds are kept; officer_identified and approval are added.
ALTER TABLE "public"."GovFollowUpLog"
  DROP CONSTRAINT IF EXISTS "GovFollowUpLog_kind_check";

ALTER TABLE "public"."GovFollowUpLog"
  ADD CONSTRAINT "GovFollowUpLog_kind_check"
  CHECK ("kind" IN (
    'submitted',
    'inward',
    'officer_identified',
    'follow_up',
    'file_movement',
    'query',
    'compliance',
    'approval',
    'order',
    'closed',
    'note'
  ));
