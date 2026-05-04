-- Link optional daily programme to beneficiary service (on delete: set null on programme)
alter table public."BeneficiaryService"
  add column if not exists "programme_id" uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    where c.conname = 'BeneficiaryService_programme_id_DailyProgramme_id_fk'
      and c.conrelid = 'public."BeneficiaryService"'::regclass
  ) then
    alter table public."BeneficiaryService"
      add constraint "BeneficiaryService_programme_id_DailyProgramme_id_fk"
      foreign key ("programme_id") references public."DailyProgramme"(id) on delete set null;
  end if;
end
$$;

create index if not exists "BeneficiaryService_programme_id_idx"
  on public."BeneficiaryService" using btree ("programme_id");
