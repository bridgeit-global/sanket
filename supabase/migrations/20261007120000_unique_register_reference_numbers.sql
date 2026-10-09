-- Prevent duplicate reference numbers within each register and document type.
-- Empty references remain allowed, and inward/outward references are scoped
-- independently because they belong to separate registers. A NULL document type
-- is treated as one shared group using COALESCE.

DROP INDEX IF EXISTS register_entry_inward_ref_unique;
DROP INDEX IF EXISTS register_entry_outward_ref_unique;

CREATE UNIQUE INDEX IF NOT EXISTS register_entry_inward_ref_unique
  ON "RegisterEntry" (coalesce(document_type, ''), lower(trim(ref_no)))
  WHERE type = 'inward' AND ref_no IS NOT NULL AND trim(ref_no) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS register_entry_outward_ref_unique
  ON "RegisterEntry" (coalesce(document_type, ''), lower(trim(ref_no)))
  WHERE type = 'outward' AND ref_no IS NOT NULL AND trim(ref_no) <> '';
