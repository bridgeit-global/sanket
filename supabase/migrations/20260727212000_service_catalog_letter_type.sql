-- Link ServiceCatalog rows to a letter type used when opening Letter Generation.
alter table public."ServiceCatalog"
  add column if not exists letter_type text null;

comment on column public."ServiceCatalog".letter_type is
  'Optional letter type code (built-in or LetterTypeMaster) used when generating letters for this service.';

create index if not exists "ServiceCatalog_letter_type_idx"
  on public."ServiceCatalog" (letter_type)
  where letter_type is not null;

-- Best-effort backfill from known catalog names.
update public."ServiceCatalog"
set letter_type = case
  when lower(name) like '%fee%concession%' then 'fees'
  when lower(name) like '%school admission%'
    or lower(name) like '%college admission%' then 'school-admission'
  when lower(name) like '%school leaving%'
    or lower(name) like '%college leaving%' then 'school-transfer'
  when lower(name) like '%ration%' then 'ration-new'
  when lower(name) like '%income%certificate%'
    or lower(name) = 'income certificate' then 'income'
  when lower(name) like '%domicile%' then 'domicile'
  when lower(name) like '%request letter%'
    or lower(name) like '%handover letter%' then 'general'
  else letter_type
end
where letter_type is null;
