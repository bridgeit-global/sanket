-- Link MLA projects to the same CadreGeographicUnit hierarchy used by cadre posts.
ALTER TABLE "MlaProject"
  ADD COLUMN IF NOT EXISTS "ward_geo_id" uuid REFERENCES "CadreGeographicUnit"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "booth_no" varchar(10);

CREATE INDEX IF NOT EXISTS "idx_mla_project_ward_geo_id" ON "MlaProject" ("ward_geo_id");
