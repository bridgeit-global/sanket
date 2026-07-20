-- Add main service category for ADM beneficiary service master list
alter table public."ServiceCatalog"
  add column if not exists category varchar(255);

create index if not exists "ServiceCatalog_category_sort_order_idx"
  on public."ServiceCatalog" (category, sort_order);
