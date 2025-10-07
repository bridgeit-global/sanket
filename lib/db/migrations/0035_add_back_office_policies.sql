-- Safely add back-office RLS policies for Voter without re-adding columns

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'Voter' 
      AND policyname = 'Back-office can view all voters'
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
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'Voter' 
      AND policyname = 'Back-office can update voter mobile numbers'
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
END
$$;


