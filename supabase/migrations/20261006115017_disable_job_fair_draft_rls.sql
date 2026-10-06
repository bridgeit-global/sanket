-- Public YUVAAZ registration writes these tables without a signed-in user.
-- RLS was enabled with no policies, so those inserts were rejected.

ALTER TABLE "public"."JobFairRegistrationDraft" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."JobFairRegistration" DISABLE ROW LEVEL SECURITY;
