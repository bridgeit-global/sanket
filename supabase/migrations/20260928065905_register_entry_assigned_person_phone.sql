-- Optional assignee name and phone on inward/outward register entries.
ALTER TABLE public."RegisterEntry"
  ADD COLUMN IF NOT EXISTS assigned_person character varying(255);

ALTER TABLE public."RegisterEntry"
  ADD COLUMN IF NOT EXISTS assigned_phone character varying(20);
