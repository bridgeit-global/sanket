-- Assign each daily programme row to Sana Malik Shaikh or Nawab Malik Saheb.
-- Existing rows default to SANA so current schedules stay on her tab.

alter table public."DailyProgramme"
  add column if not exists "person" character varying(20) not null default 'SANA'::character varying;

create index if not exists idx_daily_programme_person
  on public."DailyProgramme" using btree (person);

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    where c.conname = 'dailyprogramme_person_chk'
      and c.conrelid = 'public."DailyProgramme"'::regclass
  ) then
    alter table public."DailyProgramme"
      add constraint "dailyprogramme_person_chk"
      check (
        (person)::text = any ((array['SANA'::character varying, 'NAWAB'::character varying])::text[])
      );
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from pg_constraint c
    where c.conname = 'dailyprogramme_person_chk'
      and c.conrelid = 'public."DailyProgramme"'::regclass
      and c.convalidated is false
  ) then
    alter table public."DailyProgramme" validate constraint "dailyprogramme_person_chk";
  end if;
end
$$;
