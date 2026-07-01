-- Increase RegisterEntry text column limits for inward/outward project entries
alter table public."RegisterEntry"
  alter column "from_to" type character varying(500);

alter table public."RegisterEntry"
  alter column "subject" type character varying(1000);

alter table public."RegisterEntry"
  alter column "mode" type character varying(255);

alter table public."RegisterEntry"
  alter column "ref_no" type character varying(255);
