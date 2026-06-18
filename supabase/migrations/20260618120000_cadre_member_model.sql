-- Member-centric cadre model: a member is a person who can hold multiple
-- verticals and multiple posts. Replaces the single-assignment CadreNode.

CREATE TABLE IF NOT EXISTS "CadreMember" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "constituency_id" varchar(50),
  "person_name" varchar(255),
  "person_phone" varchar(20),
  "person_email" varchar(255),
  "photo_url" text,
  "user_id" uuid REFERENCES "User"("id") ON DELETE SET NULL,
  "epic_number" varchar(20),
  "notes" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "appointed_at" timestamp,
  "term_ends_at" timestamp,
  "created_by" uuid REFERENCES "User"("id") ON DELETE SET NULL,
  "updated_by" uuid REFERENCES "User"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "CadreMemberVertical" (
  "member_id" uuid NOT NULL REFERENCES "CadreMember"("id") ON DELETE CASCADE,
  "vertical_id" uuid NOT NULL REFERENCES "CadreVertical"("id") ON DELETE CASCADE,
  "is_primary" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("member_id", "vertical_id")
);

CREATE TABLE IF NOT EXISTS "CadreMemberPost" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "member_id" uuid NOT NULL REFERENCES "CadreMember"("id") ON DELETE CASCADE,
  "position_id" uuid NOT NULL REFERENCES "CadrePosition"("id") ON DELETE RESTRICT,
  "taluka_id" uuid REFERENCES "CadreGeographicUnit"("id") ON DELETE SET NULL,
  "ward_geo_id" uuid REFERENCES "CadreGeographicUnit"("id") ON DELETE SET NULL,
  "election_id" varchar(50) REFERENCES "ElectionMaster"("election_id") ON DELETE SET NULL,
  "booth_no" varchar(10),
  "label" varchar(255),
  "is_primary" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_cadre_member_constituency" ON "CadreMember" ("constituency_id");

CREATE INDEX IF NOT EXISTS "idx_cadre_member_user_id" ON "CadreMember" ("user_id");

CREATE INDEX IF NOT EXISTS "idx_cadre_member_epic_number" ON "CadreMember" ("epic_number");

CREATE INDEX IF NOT EXISTS "idx_cadre_member_vertical_vertical_id" ON "CadreMemberVertical" ("vertical_id");

CREATE INDEX IF NOT EXISTS "idx_cadre_member_post_member_id" ON "CadreMemberPost" ("member_id");

CREATE INDEX IF NOT EXISTS "idx_cadre_member_post_position_id" ON "CadreMemberPost" ("position_id");

CREATE INDEX IF NOT EXISTS "idx_cadre_member_post_ward_geo_id" ON "CadreMemberPost" ("ward_geo_id");
-- Backfill existing non-vacant CadreNode rows into the member model (reusing ids).
INSERT INTO "CadreMember" (
  "id", "constituency_id", "person_name", "person_phone", "person_email",
  "photo_url", "user_id", "epic_number", "notes", "is_active",
  "appointed_at", "term_ends_at", "created_by", "updated_by", "created_at", "updated_at"
)
SELECT
  n."id", n."constituency_id", n."person_name", n."person_phone", n."person_email",
  n."photo_url", n."user_id", n."epic_number", n."notes", n."is_active",
  n."appointed_at", n."term_ends_at", n."created_by", n."updated_by", n."created_at", n."updated_at"
FROM "CadreNode" n
WHERE n."is_vacant" = false AND n."is_active" = true
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "CadreMemberVertical" ("member_id", "vertical_id", "is_primary")
SELECT n."id", n."vertical_id", true
FROM "CadreNode" n
JOIN "CadreMember" m ON m."id" = n."id"
ON CONFLICT ("member_id", "vertical_id") DO NOTHING;

INSERT INTO "CadreMemberPost" (
  "member_id", "position_id", "taluka_id", "ward_geo_id", "election_id",
  "booth_no", "is_primary", "sort_order"
)
SELECT n."id", n."position_id", n."taluka_id", n."ward_geo_id", n."election_id",
  n."booth_no", true, 0
FROM "CadreNode" n
JOIN "CadreMember" m ON m."id" = n."id";
DROP TABLE IF EXISTS "CadreNode" CASCADE;
