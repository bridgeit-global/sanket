-- PartNo removal: booth/part numbers come from BoothMaster per election_id
ALTER TABLE "CommunityServiceArea" RENAME COLUMN "part_no" TO "booth_no";
--> statement-breakpoint
ALTER TABLE "CommunityServiceArea" ADD COLUMN IF NOT EXISTS "election_id" varchar(50);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "CommunityServiceArea" ADD CONSTRAINT "CommunityServiceArea_election_id_ElectionMaster_election_id_fk"
    FOREIGN KEY ("election_id") REFERENCES "ElectionMaster"("election_id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DROP TABLE IF EXISTS "PartNo" CASCADE;
--> statement-breakpoint

-- Cadre hierarchy config tables
CREATE TABLE IF NOT EXISTS "CadreVerticalCategory" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL UNIQUE,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "CadreVertical" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "category_id" uuid NOT NULL REFERENCES "CadreVerticalCategory"("id") ON DELETE RESTRICT,
  "name" varchar(255) NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "CadrePositionLevel" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" varchar(50) NOT NULL UNIQUE,
  "name" varchar(255) NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "CadrePosition" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "level_id" uuid NOT NULL REFERENCES "CadrePositionLevel"("id") ON DELETE RESTRICT,
  "name" varchar(255) NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "CadreGeographicUnit" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "type" varchar(50) NOT NULL,
  "name" varchar(255) NOT NULL,
  "parent_id" uuid REFERENCES "CadreGeographicUnit"("id") ON DELETE SET NULL,
  "ac_no" varchar(10),
  "sort_order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "CadreNode" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "parent_id" uuid REFERENCES "CadreNode"("id") ON DELETE SET NULL,
  "vertical_id" uuid NOT NULL REFERENCES "CadreVertical"("id") ON DELETE CASCADE,
  "position_id" uuid NOT NULL REFERENCES "CadrePosition"("id") ON DELETE RESTRICT,
  "constituency_id" varchar(50),
  "division_id" uuid REFERENCES "CadreGeographicUnit"("id") ON DELETE SET NULL,
  "district_id" uuid REFERENCES "CadreGeographicUnit"("id") ON DELETE SET NULL,
  "taluka_id" uuid REFERENCES "CadreGeographicUnit"("id") ON DELETE SET NULL,
  "ward_geo_id" uuid REFERENCES "CadreGeographicUnit"("id") ON DELETE SET NULL,
  "election_id" varchar(50) REFERENCES "ElectionMaster"("election_id") ON DELETE SET NULL,
  "booth_no" varchar(10),
  "person_name" varchar(255),
  "person_phone" varchar(20),
  "person_email" varchar(255),
  "photo_url" text,
  "user_id" uuid REFERENCES "User"("id") ON DELETE SET NULL,
  "epic_number" varchar(20) REFERENCES "VoterMaster"("epic_number") ON DELETE SET NULL,
  "notes" text,
  "is_vacant" boolean DEFAULT false NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "appointed_at" timestamp,
  "term_ends_at" timestamp,
  "created_by" uuid REFERENCES "User"("id") ON DELETE SET NULL,
  "updated_by" uuid REFERENCES "User"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cadre_node_vertical_constituency" ON "CadreNode" ("vertical_id", "constituency_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cadre_node_parent_id" ON "CadreNode" ("parent_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cadre_node_position_id" ON "CadreNode" ("position_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cadre_node_user_id" ON "CadreNode" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cadre_node_epic_number" ON "CadreNode" ("epic_number");
--> statement-breakpoint

-- Seed vertical categories
INSERT INTO "CadreVerticalCategory" ("name", "sort_order") VALUES
  ('Political / Organizational Wings', 1),
  ('Social & Community Cells', 2),
  ('Professional Cells', 3),
  ('Labour & Employee Cells', 4),
  ('Sector-Specific Cells', 5)
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint

-- Seed verticals (31 listed + Main Organization)
INSERT INTO "CadreVertical" ("category_id", "name", "sort_order")
SELECT c.id, v.name, v.sort_order FROM (VALUES
  ('Political / Organizational Wings', 'Youth Wing', 1),
  ('Political / Organizational Wings', 'Student Wing', 2),
  ('Political / Organizational Wings', 'Service Force Department', 3),
  ('Political / Organizational Wings', 'Programme & Implementation Department', 4),
  ('Political / Organizational Wings', 'Social Media Department', 5),
  ('Political / Organizational Wings', 'Speaker Training Department', 6),
  ('Social & Community Cells', 'OBC Cell', 7),
  ('Social & Community Cells', 'Minority Department', 8),
  ('Social & Community Cells', 'Social Justice Department', 9),
  ('Social & Community Cells', 'Senior Citizens Association', 10),
  ('Social & Community Cells', 'Disability Cell', 11),
  ('Social & Community Cells', 'Safai Kamgar Cell', 12),
  ('Social & Community Cells', 'Public Libraries Cell', 13),
  ('Social & Community Cells', 'Hindi Speaking Cell', 14),
  ('Professional Cells', 'Doctors Cell', 15),
  ('Professional Cells', 'Engineers Cell', 16),
  ('Professional Cells', 'Medical Aid Cell', 17),
  ('Professional Cells', 'Industries & Commerce Cell', 18),
  ('Professional Cells', 'Graduate Department', 19),
  ('Labour & Employee Cells', 'Organized Labour Cell', 20),
  ('Labour & Employee Cells', 'Unorganized Workers Cell', 21),
  ('Labour & Employee Cells', 'Municipal Employees Association Cell', 22),
  ('Labour & Employee Cells', 'Nagar Parishad / Nagar Panchayat Employees Cell', 23),
  ('Labour & Employee Cells', 'Ex-Servicemen Cell', 24),
  ('Labour & Employee Cells', 'Motor Owners Workers Transport Association Cell', 25),
  ('Sector-Specific Cells', 'Kisan Cell', 26),
  ('Sector-Specific Cells', 'Fishermen Cell', 27),
  ('Sector-Specific Cells', 'Cooperative Cell', 28),
  ('Sector-Specific Cells', 'Employment & Self-Employment Department', 29),
  ('Sector-Specific Cells', 'Fort Conservation Cell', 30),
  ('Sector-Specific Cells', 'Cultural Department', 31),
  ('Political / Organizational Wings', 'Main Organization', 0)
) AS v(cat, name, sort_order)
JOIN "CadreVerticalCategory" c ON c.name = v.cat
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- Seed position levels
INSERT INTO "CadrePositionLevel" ("key", "name", "sort_order") VALUES
  ('state', 'State Level', 1),
  ('regional', 'Regional / Divisional Level', 2),
  ('district', 'District Level', 3),
  ('assembly', 'Assembly Constituency Level', 4),
  ('taluka', 'Taluka / City Level', 5),
  ('ward', 'Ward / Circle Level', 6),
  ('booth', 'Booth Level', 7)
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint

-- Seed positions (46 titles)
INSERT INTO "CadrePosition" ("level_id", "name", "sort_order")
SELECT l.id, p.name, p.sort_order FROM (VALUES
  ('state', 'State President / State Head / State Chief', 1),
  ('state', 'Working President', 2),
  ('state', 'Executive President', 3),
  ('state', 'Vice President (Senior)', 4),
  ('state', 'Vice President', 5),
  ('state', 'Chief General Secretary', 6),
  ('state', 'General Secretary', 7),
  ('state', 'Secretary', 8),
  ('state', 'Joint Secretary', 9),
  ('state', 'Chief Organizer', 10),
  ('state', 'Organizer', 11),
  ('state', 'Coordinator', 12),
  ('state', 'State Executive Member', 13),
  ('regional', 'Divisional President', 14),
  ('regional', 'Divisional Working President', 15),
  ('regional', 'Divisional General Secretary', 16),
  ('district', 'District President', 17),
  ('district', 'District Working President', 18),
  ('district', 'District Vice President', 19),
  ('district', 'District General Secretary', 20),
  ('district', 'District Secretary', 21),
  ('district', 'District Organizer', 22),
  ('district', 'District Executive Member', 23),
  ('assembly', 'Assembly Constituency President', 24),
  ('assembly', 'Assembly Working President', 25),
  ('assembly', 'Assembly Vice President', 26),
  ('assembly', 'Assembly General Secretary', 27),
  ('assembly', 'Assembly Secretary', 28),
  ('assembly', 'Assembly Organizer', 29),
  ('taluka', 'Taluka / City President', 30),
  ('taluka', 'Taluka / City Working President', 31),
  ('taluka', 'Taluka / City Vice President', 32),
  ('taluka', 'Taluka / City General Secretary', 33),
  ('taluka', 'Taluka / City Secretary', 34),
  ('taluka', 'Taluka / City Organizer', 35),
  ('ward', 'Ward President', 36),
  ('ward', 'Ward Working President', 37),
  ('ward', 'Ward Vice President', 38),
  ('ward', 'Ward General Secretary', 39),
  ('ward', 'Ward Secretary', 40),
  ('ward', 'Ward Organizer', 41),
  ('booth', 'Booth President', 42),
  ('booth', 'Booth Vice President', 43),
  ('booth', 'Booth Secretary', 44),
  ('booth', 'Booth Coordinator', 45),
  ('booth', 'Booth Committee Member', 46)
) AS p(level_key, name, sort_order)
JOIN "CadrePositionLevel" l ON l.key = p.level_key
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- Seed divisions
INSERT INTO "CadreGeographicUnit" ("type", "name", "sort_order") VALUES
  ('division', 'Konkan', 1),
  ('division', 'Pune', 2),
  ('division', 'Nashik', 3),
  ('division', 'Nagpur', 4),
  ('division', 'Amravati', 5),
  ('division', 'Chhatrapati Sambhajinagar', 6)
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- Grant hierarchy module to admin role
INSERT INTO "RoleModulePermissions" ("role_id", "module_key", "has_access", "created_at", "updated_at")
SELECT r.id, 'hierarchy', true, now(), now()
FROM "Role" r WHERE r.name = 'admin'
ON CONFLICT ("role_id", "module_key") DO UPDATE SET "has_access" = true, "updated_at" = now();
