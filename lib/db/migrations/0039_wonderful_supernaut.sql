CREATE TABLE IF NOT EXISTS "PhoneUpdateHistory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"epic_number" varchar(20) NOT NULL,
	"old_mobile_no_primary" varchar(15),
	"new_mobile_no_primary" varchar(15),
	"old_mobile_no_secondary" varchar(15),
	"new_mobile_no_secondary" varchar(15),
	"updated_by" uuid NOT NULL,
	"source_module" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "PhoneUpdateHistory" ADD CONSTRAINT "PhoneUpdateHistory_epic_number_Voter_epic_number_fk" FOREIGN KEY ("epic_number") REFERENCES "public"."Voter"("epic_number") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "PhoneUpdateHistory" ADD CONSTRAINT "PhoneUpdateHistory_updated_by_User_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;


-- Indexes for querying phone update history
CREATE INDEX IF NOT EXISTS "phone_update_history_epic_number_idx" ON "PhoneUpdateHistory"("epic_number");
CREATE INDEX IF NOT EXISTS "phone_update_history_updated_by_idx" ON "PhoneUpdateHistory"("updated_by");
CREATE INDEX IF NOT EXISTS "phone_update_history_source_module_idx" ON "PhoneUpdateHistory"("source_module");
CREATE INDEX IF NOT EXISTS "phone_update_history_created_at_idx" ON "PhoneUpdateHistory"("created_at");

