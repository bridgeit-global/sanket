-- Add ward civic complaint letter types to ServiceCatalog (letter_type = ward).
insert into public."ServiceCatalog" (name, category, sort_order, letter_type, is_active)
values
  ('Ward – Garbage Removal', 'BMC & Civic Amenities', 91, 'ward', true),
  ('Ward – Drain / Gutter Cleaning', 'BMC & Civic Amenities', 92, 'ward', true),
  ('Ward – Tree Branch Trimming', 'BMC & Civic Amenities', 93, 'ward', true),
  ('Ward – Dead / Hazardous Tree Removal', 'BMC & Civic Amenities', 94, 'ward', true),
  ('Ward – Hazardous Tree Inspection', 'BMC & Civic Amenities', 95, 'ward', true),
  ('Ward – Contaminated Water Supply', 'BMC & Civic Amenities', 96, 'ward', true),
  ('Ward – Low Water Pressure', 'BMC & Civic Amenities', 97, 'ward', true),
  ('Ward – No Water Supply', 'BMC & Civic Amenities', 98, 'ward', true),
  ('Ward – Tanker Water Supply', 'BMC & Civic Amenities', 99, 'ward', true),
  ('Ward – Road Repair', 'BMC & Civic Amenities', 100, 'ward', true),
  ('Ward – Footpath Repair', 'BMC & Civic Amenities', 101, 'ward', true),
  ('Ward – Street Light Repair', 'BMC & Civic Amenities', 102, 'ward', true),
  ('Ward – Speed Breaker Installation', 'BMC & Civic Amenities', 103, 'ward', true)
on conflict (name) do update
set
  category = excluded.category,
  sort_order = excluded.sort_order,
  letter_type = excluded.letter_type,
  is_active = true,
  updated_at = now();
