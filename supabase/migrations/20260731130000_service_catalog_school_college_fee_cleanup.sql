-- Rename school letter services to School / College; remove fee concession catalog rows.

update public."ServiceCatalog"
set
  name = 'School / College New Admission',
  updated_at = now()
where name = 'School New Admission';

update public."ServiceCatalog"
set
  name = 'School / College Transfer Admission',
  updated_at = now()
where name = 'School Transfer Admission';

delete from public."ServiceCatalog"
where name in (
  'Fee Concession Recommendation',
  'Fees Concession'
);
