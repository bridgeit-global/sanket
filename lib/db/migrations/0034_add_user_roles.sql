-- Add role column to User table (idempotent)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" varchar DEFAULT 'regular' NOT NULL;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;

-- Create index on role for better query performance (idempotent)
CREATE INDEX IF NOT EXISTS "idx_user_role" ON "User" ("role");

-- Enable Row Level Security on User table
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for User table (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'User' AND policyname = 'Users can view their own profile'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can view their own profile" ON "User"
        FOR SELECT USING (auth.uid()::text = id::text);
    $$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'User' AND policyname = 'Users can update their own profile'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can update their own profile" ON "User"
        FOR UPDATE USING (auth.uid()::text = id::text);
    $$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'User' AND policyname = 'Admins can view all users'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Admins can view all users" ON "User"
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM "User" u 
            WHERE u.id::text = auth.uid()::text 
              AND u.role = 'admin'
          )
        );
    $$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'User' AND policyname = 'Admins can update all users'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Admins can update all users" ON "User"
        FOR UPDATE USING (
          EXISTS (
            SELECT 1 FROM "User" u 
            WHERE u.id::text = auth.uid()::text 
              AND u.role = 'admin'
          )
        );
    $$;
  END IF;
END $$;

-- Enable RLS on Voters table
ALTER TABLE "Voter" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for Voters table (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Voter' AND policyname = 'Admins can view all voters'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Admins can view all voters" ON "Voter"
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM "User" u 
            WHERE u.id::text = auth.uid()::text 
              AND u.role = 'admin'
          )
        );
    $$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Voter' AND policyname = 'Operators can view all voters'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Operators can view all voters" ON "Voter"
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM "User" u 
            WHERE u.id::text = auth.uid()::text 
              AND u.role = 'operator'
          )
        );
    $$;
  END IF;
END $$;

-- Back-office users have same read and update capabilities as operators
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Voter' AND policyname = 'Back-office can view all voters'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Back-office can view all voters" ON "Voter"
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM "User" u 
            WHERE u.id::text = auth.uid()::text 
              AND u.role = 'back-office'
          )
        );
    $$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Voter' AND policyname = 'Operators can update voter mobile numbers'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Operators can update voter mobile numbers" ON "Voter"
        FOR UPDATE USING (
          EXISTS (
            SELECT 1 FROM "User" u 
            WHERE u.id::text = auth.uid()::text 
              AND u.role = 'operator'
          )
        );
    $$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Voter' AND policyname = 'Back-office can update voter mobile numbers'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Back-office can update voter mobile numbers" ON "Voter"
        FOR UPDATE USING (
          EXISTS (
            SELECT 1 FROM "User" u 
            WHERE u.id::text = auth.uid()::text 
              AND u.role = 'back-office'
          )
        );
    $$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Voter' AND policyname = 'Admins can update all voter data'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Admins can update all voter data" ON "Voter"
        FOR UPDATE USING (
          EXISTS (
            SELECT 1 FROM "User" u 
            WHERE u.id::text = auth.uid()::text 
              AND u.role = 'admin'
          )
        );
    $$;
  END IF;
END $$;

-- Enable RLS on Chat table
ALTER TABLE "Chat" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for Chat table (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Chat' AND policyname = 'Users can view their own chats'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can view their own chats" ON "Chat"
        FOR SELECT USING (auth.uid()::text = "userId"::text);
    $$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Chat' AND policyname = 'Users can create their own chats'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can create their own chats" ON "Chat"
        FOR INSERT WITH CHECK (auth.uid()::text = "userId"::text);
    $$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Chat' AND policyname = 'Users can update their own chats'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can update their own chats" ON "Chat"
        FOR UPDATE USING (auth.uid()::text = "userId"::text);
    $$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Chat' AND policyname = 'Users can delete their own chats'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can delete their own chats" ON "Chat"
        FOR DELETE USING (auth.uid()::text = "userId"::text);
    $$;
  END IF;
END $$;

-- Enable RLS on Message table
ALTER TABLE "Message_v2" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for Message table (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Message_v2' AND policyname = 'Users can view messages from their chats'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can view messages from their chats" ON "Message_v2"
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM "Chat" c 
            WHERE c.id = "chatId" 
              AND c."userId"::text = auth.uid()::text
          )
        );
    $$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Message_v2' AND policyname = 'Users can create messages in their chats'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can create messages in their chats" ON "Message_v2"
        FOR INSERT WITH CHECK (
          EXISTS (
            SELECT 1 FROM "Chat" c 
            WHERE c.id = "chatId" 
              AND c."userId"::text = auth.uid()::text
          )
        );
    $$;
  END IF;
END $$;

-- Enable RLS on Vote table
ALTER TABLE "Vote_v2" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for Vote table (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Vote_v2' AND policyname = 'Users can vote on messages from their chats'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can vote on messages from their chats" ON "Vote_v2"
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM "Chat" c 
            WHERE c.id = "chatId" 
              AND c."userId"::text = auth.uid()::text
          )
        );
    $$;
  END IF;
END $$;

-- Enable RLS on Document table
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for Document table (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Document' AND policyname = 'Users can view their own documents'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can view their own documents" ON "Document"
        FOR SELECT USING (auth.uid()::text = "userId"::text);
    $$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Document' AND policyname = 'Users can create their own documents'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can create their own documents" ON "Document"
        FOR INSERT WITH CHECK (auth.uid()::text = "userId"::text);
    $$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Document' AND policyname = 'Users can update their own documents'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can update their own documents" ON "Document"
        FOR UPDATE USING (auth.uid()::text = "userId"::text);
    $$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Document' AND policyname = 'Users can delete their own documents'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can delete their own documents" ON "Document"
        FOR DELETE USING (auth.uid()::text = "userId"::text);
    $$;
  END IF;
END $$;

-- Enable RLS on Suggestion table
ALTER TABLE "Suggestion" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for Suggestion table (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Suggestion' AND policyname = 'Users can view suggestions for their documents'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can view suggestions for their documents" ON "Suggestion"
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM "Document" d 
            WHERE d.id = "documentId" 
              AND d."userId"::text = auth.uid()::text
          )
        );
    $$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Suggestion' AND policyname = 'Users can create suggestions for their documents'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can create suggestions for their documents" ON "Suggestion"
        FOR INSERT WITH CHECK (
          EXISTS (
            SELECT 1 FROM "Document" d 
            WHERE d.id = "documentId" 
              AND d."userId"::text = auth.uid()::text
          )
        );
    $$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Suggestion' AND policyname = 'Users can update their own suggestions'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can update their own suggestions" ON "Suggestion"
        FOR UPDATE USING (auth.uid()::text = "userId"::text);
    $$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'Suggestion' AND policyname = 'Users can delete their own suggestions'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can delete their own suggestions" ON "Suggestion"
        FOR DELETE USING (auth.uid()::text = "userId"::text);
    $$;
  END IF;
END $$;
