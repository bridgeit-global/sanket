CREATE TABLE IF NOT EXISTS "voters" (
	"id" text PRIMARY KEY NOT NULL,
	"part_no" integer NOT NULL,
	"serial_no" integer NOT NULL,
	"name" text NOT NULL,
	"gender" text NOT NULL,
	"age" integer NOT NULL,
	"family" text,
	"last_name" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
