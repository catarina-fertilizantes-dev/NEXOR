-- Diagnóstico temporário: levanta todas as functions do schema public (nome,
-- argumentos, security definer/invoker, linguagem, quem pode executar) e todos
-- os triggers do banco, para a auditoria completa de functions/triggers
-- solicitada por Alessandro. Será removida logo em seguida.
CREATE OR REPLACE FUNCTION "public"."tmp_diag_list_functions"()
RETURNS TABLE("function_name" "text", "arguments" "text", "security_type" "text", "language" "text", "grantees" "text")
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.proname::text,
    pg_get_function_identity_arguments(p.oid)::text,
    CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END::text,
    l.lanname::text,
    (
      SELECT string_agg(DISTINCT grantee::text, ', ')
      FROM information_schema.routine_privileges rp
      WHERE rp.specific_schema = 'public' AND rp.routine_name = p.proname
    )::text
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  JOIN pg_language l ON p.prolang = l.oid
  WHERE n.nspname = 'public'
  ORDER BY p.proname;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."tmp_diag_list_triggers"()
RETURNS TABLE("trigger_name" "text", "table_name" "text", "timing" "text", "event" "text", "function_called" "text")
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.tgname::text,
    c.relname::text,
    CASE t.tgtype & 2 WHEN 2 THEN 'BEFORE' ELSE 'AFTER' END::text,
    (
      CASE WHEN t.tgtype & 4 = 4 THEN 'INSERT ' ELSE '' END ||
      CASE WHEN t.tgtype & 8 = 8 THEN 'DELETE ' ELSE '' END ||
      CASE WHEN t.tgtype & 16 = 16 THEN 'UPDATE ' ELSE '' END
    )::text,
    p.proname::text
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  JOIN pg_proc p ON t.tgfoid = p.oid
  WHERE NOT t.tgisinternal AND n.nspname = 'public'
  ORDER BY c.relname, t.tgname;
END;
$$;
