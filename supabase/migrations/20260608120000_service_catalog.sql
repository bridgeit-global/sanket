create table if not exists public."ServiceCatalog" (
  id uuid primary key default gen_random_uuid() not null,
  name varchar(255) not null,
  sort_order integer default 0 not null,
  is_active boolean default true not null,
  created_at timestamp default now() not null,
  updated_at timestamp default now() not null,
  constraint "ServiceCatalog_name_unique" unique (name)
);

insert into public."ServiceCatalog" (name, sort_order) values
  ('SIR Mapping', 1),
  ('PAN Card', 2),
  ('Residential Structural Repairs', 3),
  ('Residential Lift Repairs', 4),
  ('Residential Water Leakage MMRDA', 5),
  ('Residential Water Leakage BMC', 6),
  ('SRA', 7),
  ('MHADA', 8),
  ('MMRDA', 9),
  ('SRA: biometric verification', 10),
  ('SRA: rent', 11),
  ('SRA: eligibility', 12),
  ('SRA: tenement allotment', 13),
  ('SRA: rehabilitation', 14),
  ('SRA: other', 15),
  ('Aadhar Card', 16),
  ('Ration Card', 17),
  ('Income Certificate', 18),
  ('Domicile Certificate', 19),
  ('Marriage Donation', 20),
  ('Festival Donation', 21),
  ('Education Donation', 22),
  ('Medical Aid', 23),
  ('Police Case', 24),
  ('Domestic Violence', 25)
on conflict (name) do nothing;
