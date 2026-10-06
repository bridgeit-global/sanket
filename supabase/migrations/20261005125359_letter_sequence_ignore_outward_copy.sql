-- A saved letter also copies its reference onto an outward register entry.
-- That copy must not keep the number reserved after the letter itself is deleted.
-- Sequence reuse follows the Letter table for each document type.

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
  );
$$;

REVOKE ALL ON FUNCTION public.document_type_sequence_in_use(text, integer) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.document_type_sequence_in_use(text, integer) FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION public.document_type_sequence_in_use(text, integer) FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.document_type_sequence_in_use(text, integer) TO service_role;
  END IF;
END $$;

-- If the current high number has no letter, and nothing higher exists either,
-- put that number back. Do not rewind a counter that already sits below
-- later letters of the same document type.
DO $$
DECLARE
  r record;
  v_higher boolean;
BEGIN
  FOR r IN
    SELECT code, last_sequence
    FROM "DocumentTypeMaster"
    WHERE last_sequence > 0
  LOOP
    IF public.document_type_sequence_in_use(r.code, r.last_sequence) THEN
      CONTINUE;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM "Letter" l
      WHERE public.document_type_reference_matches(l.reference_no, r.code)
        AND CAST(substring(l.reference_no FROM '/([0-9]+)$') AS integer) > r.last_sequence
    )
    INTO v_higher;

    IF NOT v_higher THEN
      PERFORM public.release_document_type_sequence(r.code, r.last_sequence);
    END IF;
  END LOOP;
END $$;
