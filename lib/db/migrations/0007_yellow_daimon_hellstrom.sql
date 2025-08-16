CREATE TABLE IF NOT EXISTS "voters" (
  "id" text NOT NULL,
  "part_no" integer NOT NULL,
  "serial_no" integer NOT NULL,
  "name" text NOT NULL,
  "gender" text NOT NULL,
  "age" integer NOT NULL,
  "family" text,
  "phoneNumber" text,
  "email" text,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT voters_pkey PRIMARY KEY ("id")
); 