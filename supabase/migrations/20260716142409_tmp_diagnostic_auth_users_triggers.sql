-- Diagnóstico temporário (continuação de 20260716142221): a varredura de FKs
-- no schema public não achou nada. Checando agora se existe algum trigger em
-- auth.users que possa estar bloqueando a exclusão, e também colunas soltas
-- (sem FK formal, ex. created_by/updated_by) que ainda tenham esse uuid.
CREATE OR REPLACE FUNCTION "public"."tmp_diag_auth_triggers"()
RETURNS TABLE("trigger_name" "text", "event_manipulation" "text", "action_timing" "text")
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT t.trigger_name::text, t.event_manipulation::text, t.action_timing::text
  FROM information_schema.triggers t
  WHERE t.event_object_schema = 'auth' AND t.event_object_table = 'users';
END;
$$;

-- Varre TODAS as colunas uuid do schema public (com FK ou não) procurando o
-- valor, para pegar referências "soltas" (created_by/updated_by sem FK formal).
CREATE OR REPLACE FUNCTION "public"."tmp_diag_find_uuid_anywhere"("_target_user_id" "uuid")
RETURNS TABLE("table_name" "text", "column_name" "text", "row_count" bigint)
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
  cnt bigint;
BEGIN
  FOR rec IN
    SELECT c.table_name AS tname, c.column_name AS cname
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.data_type = 'uuid'
  LOOP
    EXECUTE format(
      'SELECT count(*) FROM %I.%I WHERE %I = $1',
      'public', rec.tname, rec.cname
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
