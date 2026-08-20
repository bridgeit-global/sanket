-- Public app uploads bucket (replaces Vercel Blob for register, projects, ADM, etc.).
-- Uploads go through the service-role server client; public=true enables direct CDN/read URLs
-- so existing UI that uses fileUrl / letterhead <img src> keeps working.
-- Private buckets `letters` and `sir-profiles` are unchanged.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('app-uploads', 'app-uploads', true, 209715200)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;
