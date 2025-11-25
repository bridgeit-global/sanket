-- Create Visitor table for visitor management
CREATE TABLE IF NOT EXISTS "Visitor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"contact_number" varchar(20) NOT NULL,
	"purpose" text NOT NULL,
	"programme_event_id" uuid,
	"visit_date" timestamp NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "Visitor" ADD CONSTRAINT "Visitor_programme_event_id_DailyProgramme_id_fk" FOREIGN KEY ("programme_event_id") REFERENCES "public"."DailyProgramme"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Visitor" ADD CONSTRAINT "Visitor_created_by_User_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_visitor_visit_date" ON "Visitor" ("visit_date");
CREATE INDEX IF NOT EXISTS "idx_visitor_created_by" ON "Visitor" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_visitor_programme_event_id" ON "Visitor" ("programme_event_id");
CREATE INDEX IF NOT EXISTS "idx_visitor_contact_number" ON "Visitor" ("contact_number");

