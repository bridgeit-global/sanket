-- Add letter-generation services missing from ServiceCatalog
-- (school/college + ration variants). Income & Domicile already exist.
insert into public."ServiceCatalog" (name, category, sort_order, letter_type, is_active)
values
  (
    'School / College New Admission',
    'Education & Student Services',
    105,
    'school-admission',
    true
  ),
  (
    'School / College Transfer Admission',
    'Education & Student Services',
    106,
    'school-transfer',
    true
  ),
  (
    'Ration Card - New',
    'Identity, Cards & Certificates',
    107,
    'ration-new',
    true
  ),
  (
    'Ration Card - Name Addition',
    'Identity, Cards & Certificates',
    108,
    'ration-add-members',
    true
  ),
  (
    'Ration Card - Name Deletion',
    'Identity, Cards & Certificates',
    109,
    'ration-delete-members',
    true
  ),
  (
    'Ration Card - Transfer',
    'Identity, Cards & Certificates',
    110,
    'ration-transfer',
    true
  )
on conflict (name) do update
set
  category = excluded.category,
  sort_order = excluded.sort_order,
  letter_type = excluded.letter_type,
  is_active = true,
  updated_at = now();
