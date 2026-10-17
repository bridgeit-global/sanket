-- Add remark column to RegisterEntry for status remarks (e.g. Dispatching, Cancelled, Removed, or custom)
ALTER TABLE public."RegisterEntry"
  ADD COLUMN IF NOT EXISTS remark character varying(500);
