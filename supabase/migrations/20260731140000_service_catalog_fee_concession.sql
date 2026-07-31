-- Re-add Fee Concession Recommendation to ServiceCatalog.
insert into public."ServiceCatalog" (name, category, sort_order, letter_type, is_active)
values (
  'Fee Concession Recommendation',
  'Education & Student Services',
  104,
  'fees',
  true
)
on conflict (name) do update
set
  category = excluded.category,
  sort_order = excluded.sort_order,
  letter_type = excluded.letter_type,
  is_active = true,
  updated_at = now();
