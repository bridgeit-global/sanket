ALTER TABLE "SraCampaignVoter" ADD COLUMN IF NOT EXISTS "token" varchar(20);
--> statement-breakpoint
WITH numbered AS (
  SELECT
    id,
    to_char("created_at" AT TIME ZONE 'UTC', 'DDMMYY') || '-' || lpad(
      row_number() OVER (ORDER BY "created_at", "id")::text,
      4,
      '0'
    ) AS new_token
  FROM "SraCampaignVoter"
  WHERE "token" IS NULL
)
UPDATE "SraCampaignVoter" AS v
SET "token" = n.new_token
FROM numbered AS n
WHERE v.id = n.id;
--> statement-breakpoint
ALTER TABLE "SraCampaignVoter" ALTER COLUMN "token" SET NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sra_campaign_voter_token" ON "SraCampaignVoter" ("token");
