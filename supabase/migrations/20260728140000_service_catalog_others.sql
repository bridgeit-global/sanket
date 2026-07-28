-- Add catch-all "Others" service for operator beneficiary service selection.
insert into public."ServiceCatalog" (name, category, sort_order, is_active)
values (
  'Others',
  'Letters, Meetings & General Requests',
  90,
  true
)
on conflict (name) do update
set
  category = excluded.category,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();
