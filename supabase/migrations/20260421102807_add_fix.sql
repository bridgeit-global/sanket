alter table "public"."DailyProgramme" add column "end_date" date;

alter table "public"."DailyProgramme" add column "programme_type" character varying(30) not null default 'CONSTITUENCY'::character varying;

alter table "public"."DailyProgramme" add column "sort_order" integer not null default 1;

alter table "public"."DailyProgramme" add column "start_date" date;

CREATE INDEX idx_daily_programme_end_date ON public."DailyProgramme" USING btree (end_date);

CREATE INDEX idx_daily_programme_programme_type ON public."DailyProgramme" USING btree (programme_type);

CREATE INDEX idx_daily_programme_sort_order ON public."DailyProgramme" USING btree (sort_order);

CREATE INDEX idx_daily_programme_start_date ON public."DailyProgramme" USING btree (start_date);

alter table "public"."DailyProgramme" add constraint "dailyprogramme_programme_type_chk" CHECK (((programme_type)::text = ANY ((ARRAY['CONSTITUENCY'::character varying, 'OUTSIDE_CONSTITUENCY'::character varying])::text[]))) not valid;

alter table "public"."DailyProgramme" validate constraint "dailyprogramme_programme_type_chk";


