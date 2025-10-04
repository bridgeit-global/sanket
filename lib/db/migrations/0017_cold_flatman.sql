ALTER TABLE "BeneficiaryService" ADD COLUMN "token" varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE "BeneficiaryService" ADD CONSTRAINT "BeneficiaryService_token_unique" UNIQUE("token");