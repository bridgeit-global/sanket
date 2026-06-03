CREATE TABLE IF NOT EXISTS "SraCampaignVoter" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sra_voter_id" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"description" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SraCampaignVoter" ADD CONSTRAINT "SraCampaignVoter_created_by_User_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sra_campaign_voter_sra_voter_id" ON "SraCampaignVoter" ("sra_voter_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sra_campaign_voter_created_by" ON "SraCampaignVoter" ("created_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sra_campaign_voter_created_at" ON "SraCampaignVoter" ("created_at");
