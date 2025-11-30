-- Add address and pincode columns to Voter table
ALTER TABLE "Voter" ADD COLUMN "address" text;
ALTER TABLE "Voter" ADD COLUMN "pincode" varchar(10);
