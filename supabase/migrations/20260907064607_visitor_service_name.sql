-- Optional visit-level service name (print token + lineup), distinct from VisitorService rows.

ALTER TABLE public."Visitor"
  ADD COLUMN IF NOT EXISTS service_name text;
