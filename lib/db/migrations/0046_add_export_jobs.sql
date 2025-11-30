-- Export Jobs Table for tracking long-running export tasks
CREATE TABLE IF NOT EXISTS "ExportJob" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "type" varchar(50) NOT NULL, -- 'voters', 'visitors', 'register', etc.
  "format" varchar(10) NOT NULL, -- 'pdf', 'excel', 'csv'
  "status" varchar(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  "progress" integer NOT NULL DEFAULT 0, -- 0-100
  "total_records" integer DEFAULT 0,
  "processed_records" integer DEFAULT 0,
  "file_url" text, -- URL to the generated file (Vercel Blob)
  "file_name" varchar(255),
  "file_size_kb" integer,
  "filters" jsonb, -- Store filter parameters used for the export
  "error_message" text,
  "created_by" uuid NOT NULL REFERENCES "User"("id"),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "completed_at" timestamp
);

-- Index for querying user's export jobs
CREATE INDEX IF NOT EXISTS "export_job_created_by_idx" ON "ExportJob"("created_by");
CREATE INDEX IF NOT EXISTS "export_job_status_idx" ON "ExportJob"("status");
