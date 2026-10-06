-- Reuse reference numbers freed by deleting a letter or outward entry.
-- last_sequence stays the high-water mark. available_sequences holds gaps that
-- were released for this document type only. Allocation takes the lowest freed
-- number before issuing a new one, and skips numbers still stored on a letter
-- or outward entry. Existing counters are left as they are.

ALTER TABLE "DocumentTypeMaster"
  ADD COLUMN IF NOT EXISTS available_sequences integer[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN "DocumentTypeMaster".available_sequences IS
  'Freed sequence numbers for this document type that should be reused before last_sequence + 1.';

CREATE OR REPLACE FUNCTION public.document_type_reference_matches(p_ref text, p_code text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT p_ref IS NOT NULL
    AND btrim(COALESCE(p_code, '')) <> ''
    AND btrim(p_ref) ~ '/[0-9]+$'
    AND lower(regexp_replace(btrim(p_ref), '/[0-9]+$', '')) = lower(btrim(p_code));
$$;

CREATE OR REPLACE FUNCTION public.document_type_sequence_in_use(p_code text, p_seq integer)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "Letter" l
    WHERE public.document_type_reference_matches(l.reference_no, p_code)
      AND CAST(substring(l.reference_no FROM '/([0-9]+)$') AS integer) = p_seq
  )
  OR EXISTS (
    SELECT 1
    FROM "RegisterEntry" re
    WHERE re.type = 'outward'
      AND public.document_type_reference_matches(re.ref_no, p_code)
      AND CAST(substring(re.ref_no FROM '/([0-9]+)$') AS integer) = p_seq
  );
$$;

CREATE OR REPLACE FUNCTION public.peek_document_type_sequence(p_code text)
RETURNS integer
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_last integer;
  v_next integer;
BEGIN
  SELECT code, last_sequence
  INTO v_code, v_last
  FROM "DocumentTypeMaster"
  WHERE lower(code) = lower(btrim(COALESCE(p_code, '')))
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document type not found or inactive';
  END IF;

  SELECT MIN(n)
  INTO v_next
  FROM unnest(COALESCE((
    SELECT available_sequences
    FROM "DocumentTypeMaster"
    WHERE lower(code) = lower(v_code)
  ), '{}'::integer[])) AS n
  WHERE n >= 1
    AND n <= v_last
    AND NOT public.document_type_sequence_in_use(v_code, n);

  IF v_next IS NOT NULL THEN
    RETURN v_next;
  END IF;

  LOOP
    v_last := v_last + 1;
    EXIT WHEN NOT public.document_type_sequence_in_use(v_code, v_last);
  END LOOP;

  RETURN v_last;
END;
$$;

CREATE OR REPLACE FUNCTION public.allocate_document_type_sequence(p_code text)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_last integer;
  v_available integer[];
  v_next integer;
BEGIN
  SELECT code, last_sequence, COALESCE(available_sequences, '{}'::integer[])
  INTO v_code, v_last, v_available
  FROM "DocumentTypeMaster"
  WHERE lower(code) = lower(btrim(COALESCE(p_code, '')))
    AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document type not found or inactive';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT n ORDER BY n), '{}'::integer[])
  INTO v_available
  FROM unnest(v_available) AS n
  WHERE n >= 1
    AND n <= v_last
    AND NOT public.document_type_sequence_in_use(v_code, n);

  SELECT MIN(n) INTO v_next FROM unnest(v_available) AS n;

  IF v_next IS NULL THEN
    LOOP
      v_last := v_last + 1;
      EXIT WHEN NOT public.document_type_sequence_in_use(v_code, v_last);
    END LOOP;
    v_next := v_last;
  ELSE
    v_available := array_remove(v_available, v_next);
  END IF;

  UPDATE "DocumentTypeMaster"
  SET
    last_sequence = v_last,
    available_sequences = v_available,
    updated_at = now()
  WHERE lower(code) = lower(v_code);

  RETURN v_next;
END;
$$;

-- Call after the letter or outward row is gone. Frees p_seq for this document
-- type only. The current high-water number steps last_sequence back by one;
-- an earlier number is kept as a reusable gap.
CREATE OR REPLACE FUNCTION public.release_document_type_sequence(p_code text, p_seq integer)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_last integer;
  v_available integer[];
BEGIN
  IF p_seq IS NULL OR p_seq < 1 OR btrim(COALESCE(p_code, '')) = '' THEN
    RETURN NULL;
  END IF;

  SELECT code, last_sequence, COALESCE(available_sequences, '{}'::integer[])
  INTO v_code, v_last, v_available
  FROM "DocumentTypeMaster"
  WHERE lower(code) = lower(btrim(p_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF public.document_type_sequence_in_use(v_code, p_seq) THEN
    RETURN v_last;
  END IF;

  IF p_seq > v_last THEN
    RETURN v_last;
  END IF;

  IF p_seq = v_last THEN
    v_last := v_last - 1;
    v_available := array_remove(v_available, p_seq);
  ELSE
    v_available := v_available || ARRAY[p_seq];
  END IF;

  SELECT COALESCE(array_agg(DISTINCT n ORDER BY n), '{}'::integer[])
  INTO v_available
  FROM unnest(v_available) AS n
  WHERE n >= 1
    AND n <= v_last
    AND NOT public.document_type_sequence_in_use(v_code, n);

  UPDATE "DocumentTypeMaster"
  SET
    last_sequence = v_last,
    available_sequences = v_available,
    updated_at = now()
  WHERE lower(code) = lower(v_code);

  RETURN v_last;
END;
$$;

CREATE OR REPLACE FUNCTION public.bump_document_type_sequence(p_code text, p_seq integer)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_last integer;
  v_available integer[];
  v_hole integer;
BEGIN
  IF p_seq IS NULL OR p_seq < 1 THEN
    RAISE EXCEPTION 'Invalid sequence number';
  END IF;

  SELECT code, last_sequence, COALESCE(available_sequences, '{}'::integer[])
  INTO v_code, v_last, v_available
  FROM "DocumentTypeMaster"
  WHERE lower(code) = lower(btrim(COALESCE(p_code, '')))
    AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document type not found or inactive';
  END IF;

  v_available := array_remove(v_available, p_seq);

  IF p_seq > v_last + 1 THEN
    FOR v_hole IN v_last + 1 .. p_seq - 1 LOOP
      IF NOT public.document_type_sequence_in_use(v_code, v_hole) THEN
        v_available := v_available || ARRAY[v_hole];
      END IF;
    END LOOP;
  END IF;

  IF p_seq > v_last THEN
    v_last := p_seq;
  END IF;

  SELECT COALESCE(array_agg(DISTINCT n ORDER BY n), '{}'::integer[])
  INTO v_available
  FROM unnest(v_available) AS n
  WHERE n >= 1
    AND n <= v_last
    AND n <> p_seq
    AND NOT public.document_type_sequence_in_use(v_code, n);

  UPDATE "DocumentTypeMaster"
  SET
    last_sequence = v_last,
    available_sequences = v_available,
    updated_at = now()
  WHERE lower(code) = lower(v_code);

  RETURN v_last;
END;
$$;

REVOKE ALL ON FUNCTION public.document_type_reference_matches(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.document_type_sequence_in_use(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.peek_document_type_sequence(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.allocate_document_type_sequence(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_document_type_sequence(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bump_document_type_sequence(text, integer) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.document_type_reference_matches(text, text) FROM anon;
    REVOKE ALL ON FUNCTION public.document_type_sequence_in_use(text, integer) FROM anon;
    REVOKE ALL ON FUNCTION public.peek_document_type_sequence(text) FROM anon;
    REVOKE ALL ON FUNCTION public.allocate_document_type_sequence(text) FROM anon;
    REVOKE ALL ON FUNCTION public.release_document_type_sequence(text, integer) FROM anon;
    REVOKE ALL ON FUNCTION public.bump_document_type_sequence(text, integer) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION public.document_type_reference_matches(text, text) FROM authenticated;
    REVOKE ALL ON FUNCTION public.document_type_sequence_in_use(text, integer) FROM authenticated;
    REVOKE ALL ON FUNCTION public.peek_document_type_sequence(text) FROM authenticated;
    REVOKE ALL ON FUNCTION public.allocate_document_type_sequence(text) FROM authenticated;
    REVOKE ALL ON FUNCTION public.release_document_type_sequence(text, integer) FROM authenticated;
    REVOKE ALL ON FUNCTION public.bump_document_type_sequence(text, integer) FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.document_type_reference_matches(text, text) TO service_role;
    GRANT EXECUTE ON FUNCTION public.document_type_sequence_in_use(text, integer) TO service_role;
    GRANT EXECUTE ON FUNCTION public.peek_document_type_sequence(text) TO service_role;
    GRANT EXECUTE ON FUNCTION public.allocate_document_type_sequence(text) TO service_role;
    GRANT EXECUTE ON FUNCTION public.release_document_type_sequence(text, integer) TO service_role;
    GRANT EXECUTE ON FUNCTION public.bump_document_type_sequence(text, integer) TO service_role;
  END IF;
END $$;

