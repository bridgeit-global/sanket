-- Existing databases already ran yuvaaz-company.sql. Allow Shortlist as an interview result.
-- Fresh databases get this check from yuvaaz-company.sql; this statement is safe to repeat.

ALTER TABLE "public"."JobFairCompanyVisit"
  DROP CONSTRAINT IF EXISTS "JobFairCompanyVisit_interview_result_check";

ALTER TABLE "public"."JobFairCompanyVisit"
  ADD CONSTRAINT "JobFairCompanyVisit_interview_result_check"
    CHECK ("interview_result" IS NULL OR "interview_result" IN ('selected', 'not_selected', 'shortlisted'));
