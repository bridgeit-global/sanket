CREATE TABLE IF NOT EXISTS "TaskHistory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"old_value" text,
	"new_value" text,
	"performed_by" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "BeneficiaryService" DROP CONSTRAINT "BeneficiaryService_token_unique";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "TaskHistory" ADD CONSTRAINT "TaskHistory_task_id_VoterTask_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."VoterTask"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "TaskHistory" ADD CONSTRAINT "TaskHistory_performed_by_User_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
