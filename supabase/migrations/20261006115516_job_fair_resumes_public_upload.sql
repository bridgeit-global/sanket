-- Public YUVAAZ visitors upload resumes without a signed-in user.
-- Upsert needs INSERT, SELECT, and UPDATE. The bucket stays limited to 5 MB.

UPDATE storage.buckets
SET public = true
WHERE id = 'job-fair-resumes';

CREATE POLICY "job_fair_resumes_public_select"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'job-fair-resumes');

CREATE POLICY "job_fair_resumes_public_insert"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'job-fair-resumes');

CREATE POLICY "job_fair_resumes_public_update"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'job-fair-resumes')
WITH CHECK (bucket_id = 'job-fair-resumes');
