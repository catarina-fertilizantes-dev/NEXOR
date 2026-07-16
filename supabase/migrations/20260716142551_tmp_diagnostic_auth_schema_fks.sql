-- Diagnóstico temporário (continuação): checa tabelas internas do próprio
-- Supabase Auth (auth.identities, auth.sessions, auth.refresh_tokens,
-- auth.mfa_factors, auth.one_time_tokens etc.) que referenciam auth.users e
-- ainda têm linha para o usuário-alvo — é aí que o "Delete user" do Studio
-- normalmente cai se o cascade delas falhar por algum motivo.
CREATE OR REPLACE FUNCTION "public"."tmp_diag_auth_internal_refs"("_target_user_id" "uuid")
RETURNS TABLE("table_name" "text", "column_name" "text", "row_count" bigint)
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
  cnt bigint;
BEGIN
  FOR rec IN
    SELECT
      tc.table_name AS tname,
      kcu.column_name AS cname
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_schema = 'auth'
      AND ccu.table_name = 'users'
      AND tc.table_schema = 'auth'
  LOOP
    EXECUTE format(
      'SELECT count(*) FROM auth.%I WHERE %I = $1',
      rec.tname, rec.cname
    ) INTO cnt USING _target_user_id;

    IF cnt > 0 THEN
      table_name := rec.tname;
      column_name := rec.cname;
      row_count := cnt;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;
