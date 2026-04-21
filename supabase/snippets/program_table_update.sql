-- Rename existing date column to start_date
alter table public."DailyProgramme" rename column date to start_date;


-- Add start_date for multiple date range support
alter table public."DailyProgramme" add column if not exists start_date date null;

-- Add end_date for multiple date range support
alter table public."DailyProgramme" add column if not exists end_date date null;

-- Add constituency / outside constituency filter column
alter table public."DailyProgramme" add column if not exists programme_type varchar(30) not null default 'CONSTITUENCY';

-- Add sort order for same-time programme reordering
alter table public."DailyProgramme" add column if not exists sort_order integer not null default 1;

-- Optional check constraint for allowed values
alter table public."DailyProgramme"
add constraint dailyprogramme_programme_type_chk
check (programme_type in ('CONSTITUENCY', 'OUTSIDE_CONSTITUENCY'));

-- Create indexes
create index if not exists idx_daily_programme_start_date
on public."DailyProgramme"(start_date);

create index if not exists idx_daily_programme_end_date
on public."DailyProgramme"(end_date);

create index if not exists idx_daily_programme_programme_type
on public."DailyProgramme"(programme_type);

create index if not exists idx_daily_programme_sort_order
on public."DailyProgramme"(sort_order);