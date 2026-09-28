-- Seed Ward 144, Booth 53 BLA Agents
-- Agent 1: Nazir Dagadu Mulani (Voter ID: NCT2893600)
-- Agent 2: Sanjiva Krushnarao Kulkarni (Voter ID: NCT0092491)

DO $$
DECLARE
  v_ward_id uuid;
  v_booth_id uuid;
  v_vertical_id uuid;
  v_level_id uuid;
  v_position_id uuid := '30a9266d-6c3a-4d76-9a9f-0f6763c8c644'::uuid;
  v_member_1_id uuid := '7c5d5b41-b765-4a74-8961-2c18659b0e64'::uuid;
  v_member_2_id uuid := 'addc5a1d-4385-4786-a8a9-3cf3813cad2d'::uuid;
  v_post_1_id uuid := '6e603cd6-7e03-4644-9536-f1a063721660'::uuid;
  v_post_2_id uuid := 'a436c3c5-9898-4bee-9d5d-239c6cd4d5a5'::uuid;
BEGIN
  -- 1) Ensure Ward 144 geographic unit exists
  SELECT id INTO v_ward_id
  FROM "CadreGeographicUnit"
  WHERE "name" = 'Ward 144' AND "type" = 'ward'
  LIMIT 1;

  IF v_ward_id IS NULL THEN
    INSERT INTO "CadreGeographicUnit" ("type", "name", "ac_no", "sort_order")
    VALUES ('ward', 'Ward 144', '172', 144)
    RETURNING id INTO v_ward_id;
  END IF;

  -- 2) Ensure Booth 53 geographic unit exists under Ward 144
  SELECT id INTO v_booth_id
  FROM "CadreGeographicUnit"
  WHERE "type" = 'booth' AND "parent_id" = v_ward_id AND ("name" = 'Booth 53' OR "name" LIKE '%53%')
  LIMIT 1;

  IF v_booth_id IS NULL THEN
    INSERT INTO "CadreGeographicUnit" ("type", "name", "parent_id", "ac_no", "sort_order")
    VALUES ('booth', 'Booth 53', v_ward_id, '172', 53)
    RETURNING id INTO v_booth_id;
  END IF;

  -- 3) Ensure BLA Position Level exists
  SELECT id INTO v_level_id
  FROM "CadrePositionLevel"
  WHERE "key" = 'booth_bla'
  LIMIT 1;

  IF v_level_id IS NULL THEN
    INSERT INTO "CadrePositionLevel" ("key", "name", "sort_order")
    VALUES ('booth_bla', 'BLA', 6)
    RETURNING id INTO v_level_id;
  END IF;

  -- 4) Ensure BLA Position exists with specified ID
  IF NOT EXISTS (SELECT 1 FROM "CadrePosition" WHERE "id" = v_position_id) THEN
    -- If a BLA position already exists with a different ID, delete or update it, or insert with this ID
    DELETE FROM "CadrePosition" WHERE "level_id" = v_level_id AND "name" = 'BLA (Booth Level Agent)';
    INSERT INTO "CadrePosition" ("id", "level_id", "name", "sort_order", "is_active")
    VALUES (v_position_id, v_level_id, 'BLA (Booth Level Agent)', 1, true);
  END IF;

  -- 5) Ensure Basic vertical exists
  SELECT id INTO v_vertical_id
  FROM "CadreVertical"
  WHERE "name" = 'Basic'
  LIMIT 1;

  IF v_vertical_id IS NULL THEN
    SELECT id INTO v_vertical_id
    FROM "CadreVertical"
    ORDER BY "sort_order" ASC
    LIMIT 1;
  END IF;

  IF v_vertical_id IS NOT NULL THEN
    UPDATE "CadreVertical"
    SET "max_geo_level" = 'booth'
    WHERE "id" = v_vertical_id;
  END IF;

  -- 6) Upsert VoterMaster records if table exists
  BEGIN
    INSERT INTO "VoterMaster" ("epic_number", "full_name")
    VALUES
      ('NCT2893600', 'Nazir Dagadu Mulani'),
      ('NCT0092491', 'Sanjiva Krushnarao Kulkarni')
    ON CONFLICT ("epic_number") DO UPDATE SET "full_name" = EXCLUDED.full_name;
  EXCEPTION WHEN undefined_table THEN
    -- VoterMaster table does not exist in this environment, ignore
    NULL;
  END;

  -- 7) Upsert CadreMember Agent 1
  INSERT INTO "CadreMember" ("id", "person_name", "epic_number", "constituency_id", "is_active")
  VALUES (v_member_1_id, 'Nazir Dagadu Mulani', 'NCT2893600', '172', true)
  ON CONFLICT ("id") DO UPDATE
  SET "person_name" = EXCLUDED.person_name,
      "epic_number" = EXCLUDED.epic_number,
      "is_active" = true;

  -- 8) Upsert CadreMember Agent 2
  INSERT INTO "CadreMember" ("id", "person_name", "epic_number", "constituency_id", "is_active")
  VALUES (v_member_2_id, 'Sanjiva Krushnarao Kulkarni', 'NCT0092491', '172', true)
  ON CONFLICT ("id") DO UPDATE
  SET "person_name" = EXCLUDED.person_name,
      "epic_number" = EXCLUDED.epic_number,
      "is_active" = true;

  -- 9) Link CadreMemberVertical if vertical exists
  IF v_vertical_id IS NOT NULL THEN
    INSERT INTO "CadreMemberVertical" ("member_id", "vertical_id", "is_primary")
    VALUES
      (v_member_1_id, v_vertical_id, true),
      (v_member_2_id, v_vertical_id, true)
    ON CONFLICT ("member_id", "vertical_id") DO UPDATE SET "is_primary" = true;

    -- 10) Upsert CadreMemberPost for Agent 1
    INSERT INTO "CadreMemberPost" (
      "id",
      "member_id",
      "position_id",
      "vertical_id",
      "ward_geo_id",
      "booth_no",
      "is_primary",
      "sort_order"
    )
    VALUES (
      v_post_1_id,
      v_member_1_id,
      v_position_id,
      v_vertical_id,
      v_ward_id,
      '53',
      true,
      1
    )
    ON CONFLICT ("id") DO UPDATE
    SET "member_id" = EXCLUDED.member_id,
        "position_id" = EXCLUDED.position_id,
        "vertical_id" = EXCLUDED.vertical_id,
        "ward_geo_id" = EXCLUDED.ward_geo_id,
        "booth_no" = EXCLUDED.booth_no,
        "sort_order" = EXCLUDED.sort_order;

    -- 11) Upsert CadreMemberPost for Agent 2
    INSERT INTO "CadreMemberPost" (
      "id",
      "member_id",
      "position_id",
      "vertical_id",
      "ward_geo_id",
      "booth_no",
      "is_primary",
      "sort_order"
    )
    VALUES (
      v_post_2_id,
      v_member_2_id,
      v_position_id,
      v_vertical_id,
      v_ward_id,
      '53',
      true,
      2
    )
    ON CONFLICT ("id") DO UPDATE
    SET "member_id" = EXCLUDED.member_id,
        "position_id" = EXCLUDED.position_id,
        "vertical_id" = EXCLUDED.vertical_id,
        "ward_geo_id" = EXCLUDED.ward_geo_id,
        "booth_no" = EXCLUDED.booth_no,
        "sort_order" = EXCLUDED.sort_order;
  END IF;
END $$;
