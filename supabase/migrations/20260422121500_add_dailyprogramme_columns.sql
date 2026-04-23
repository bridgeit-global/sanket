alter table public."DailyProgramme"
  add column if not exists "end_date" date;

alter table public."DailyProgramme"
  add column if not exists "programme_type" character varying(30) not null default 'CONSTITUENCY'::character varying;

alter table public."DailyProgramme"
  add column if not exists "sort_order" integer not null default 1;

alter table public."DailyProgramme"
  add column if not exists "start_date" date;

create index if not exists idx_daily_programme_end_date
  on public."DailyProgramme" using btree (end_date);

create index if not exists idx_daily_programme_programme_type
  on public."DailyProgramme" using btree (programme_type);

create index if not exists idx_daily_programme_sort_order
  on public."DailyProgramme" using btree (sort_order);

create index if not exists idx_daily_programme_start_date
  on public."DailyProgramme" using btree (start_date);

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    where c.conname = 'dailyprogramme_programme_type_chk'
      and c.conrelid = 'public."DailyProgramme"'::regclass
  ) then
    alter table public."DailyProgramme"
      add constraint "dailyprogramme_programme_type_chk"
      check (
        (programme_type)::text = any ((array['CONSTITUENCY'::character varying, 'OUTSIDE_CONSTITUENCY'::character varying])::text[])
      );
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from pg_constraint c
    where c.conname = 'dailyprogramme_programme_type_chk'
      and c.conrelid = 'public."DailyProgramme"'::regclass
      and c.convalidated is false
  ) then
    alter table public."DailyProgramme" validate constraint "dailyprogramme_programme_type_chk";
  end if;
end
$$;

