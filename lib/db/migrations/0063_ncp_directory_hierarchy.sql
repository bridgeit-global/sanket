-- Reset cadre hierarchy config to NCP AC 172 directory structure (no CadreNode data)

DELETE FROM "CadreNode";
--> statement-breakpoint
DELETE FROM "CadrePosition";
--> statement-breakpoint
DELETE FROM "CadreVertical";
--> statement-breakpoint
DELETE FROM "CadreVerticalCategory";
--> statement-breakpoint
DELETE FROM "CadreGeographicUnit";
--> statement-breakpoint
DELETE FROM "CadrePositionLevel";
--> statement-breakpoint

INSERT INTO "CadrePositionLevel" ("key", "name", "sort_order") VALUES
  ('taluka', 'Taluka Adhyaksh', 1),
  ('ward', 'Ward Adhyaksh', 2),
  ('booth', 'Booth Adhyaksh', 3),
  ('booth_committee', 'Booth Committee Member', 4),
  ('ward_committee', 'Ward Committee Member', 5);
--> statement-breakpoint

INSERT INTO "CadreVerticalCategory" ("name", "sort_order") VALUES
  ('NCP Directory', 1);
--> statement-breakpoint

INSERT INTO "CadreVertical" ("category_id", "name", "sort_order")
SELECT c.id, v.name, v.sort_order FROM (VALUES
  ('Basic', 1),
  ('Mahila', 2),
  ('Yuvak', 3),
  ('Yuvti', 4),
  ('Students', 5),
  ('Minority', 6),
  ('Hindi Bhashi Vibhag', 7),
  ('Samajik Nyay Vibhag', 8),
  ('Social Vibhag', 9),
  ('Sevadal', 10),
  ('Sahkar', 11),
  ('Macchimar', 12),
  ('OBC', 13),
  ('Hindi Bhashi Mahila', 14),
  ('Legal Sale', 15)
) AS v(name, sort_order)
JOIN "CadreVerticalCategory" c ON c.name = 'NCP Directory';
--> statement-breakpoint

INSERT INTO "CadrePosition" ("level_id", "name", "sort_order")
SELECT l.id, p.name, p.sort_order FROM (VALUES
  ('taluka', 'Taluka Adhyaksh', 1),
  ('ward', 'Ward Adhyaksh', 2),
  ('booth', 'Booth Adhyaksh', 3),
  ('booth_committee', 'Booth Committee Member', 4),
  ('ward_committee', 'Ward Committee Member', 5)
) AS p(level_key, name, sort_order)
JOIN "CadrePositionLevel" l ON l.key = p.level_key;
--> statement-breakpoint

INSERT INTO "CadreGeographicUnit" ("type", "name", "ac_no", "sort_order") VALUES
  ('ward', 'Ward 140', '172', 140),
  ('ward', 'Ward 141', '172', 141),
  ('ward', 'Ward 143', '172', 143),
  ('ward', 'Ward 144', '172', 144),
  ('ward', 'Ward 145', '172', 145),
  ('ward', 'Ward 146', '172', 146),
  ('ward', 'Ward 147', '172', 147),
  ('ward', 'Ward 148', '172', 148),
  ('ward', 'Ward 144 BARC', '172', 1441),
  ('ward', 'Ward 146 BARC', '172', 1461);
