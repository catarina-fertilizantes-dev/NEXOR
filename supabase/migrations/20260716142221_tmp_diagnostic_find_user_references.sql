-- Diagnóstico temporário: Alessandro não conseguiu excluir um usuário do
-- Authentication (já removido de colaboradores/user_roles) — provavelmente
-- porque alguma outra tabela ainda referencia esse user_id (FK sem CASCADE) e
-- bloqueia a exclusão. Esta função varre TODAS as FKs que apontam para
-- auth.users(id) e reporta em quais tabela/coluna/linha o uuid ainda aparece.
-- Será removida logo em seguida (migration de limpeza já planejada).
CREATE OR REPLACE FUNCTION "public"."tmp_diag_find_user_refs"("_target_user_id" "uuid")
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
      tc.table_schema,
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
      AND tc.table_schema = 'public'
  LOOP
    EXECUTE format(
      'SELECT count(*) FROM %I.%I WHERE %I = $1',
      rec.table_schema, rec.tname, rec.cname
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
