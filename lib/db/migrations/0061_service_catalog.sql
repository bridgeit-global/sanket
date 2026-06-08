CREATE TABLE IF NOT EXISTS "ServiceCatalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ServiceCatalog_name_unique" UNIQUE("name")
);
--> statement-breakpoint
INSERT INTO "ServiceCatalog" ("name", "sort_order") VALUES
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
	('Aadhaar Card', 16),
	('Ration Card', 17),
	('Income Certificate', 18),
	('Domicile Certificate', 19),
	('Marriage Donation', 20),
	('Festival Donation', 21),
	('Education Donation', 22),
	('Medical Aid', 23),
	('Police Case', 24),
	('Domestic Violence', 25)
ON CONFLICT ("name") DO NOTHING;
