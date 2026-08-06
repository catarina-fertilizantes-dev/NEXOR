-- get_colaboradores() não é chamada por nenhum código em src/ nem em
-- supabase/functions/ (a página /colaboradores usa get_users_with_roles) e não
-- tinha nenhuma checagem de permissão — qualquer autenticado (ou até anon, via
-- GRANT padrão do Supabase) podia listar nome/email de todo o staff admin/logistica.
-- Como está morta, a correção é remover.
--
-- Corpo original (para referência/rollback, caso necessário):
-- CREATE OR REPLACE FUNCTION "public"."get_colaboradores"() RETURNS TABLE("id" "uuid", "nome" "text", "email" "text", "created_at" timestamp with time zone, "role" "public"."user_role")
--     LANGUAGE "sql" STABLE SECURITY DEFINER
--     SET "search_path" TO 'public'
--     AS $$
--   SELECT u.id, col.nome, u.email, u.created_at,
--          CASE
--            WHEN 'admin' = ANY(array_agg(ur.role)) THEN 'admin'::user_role
--            WHEN 'logistica' = ANY(array_agg(ur.role)) THEN 'logistica'::user_role
--            ELSE COALESCE((array_agg(ur.role))[1], 'logistica'::user_role)
--          END AS role
--   FROM auth.users u
--   JOIN public.colaboradores col ON col.user_id = u.id
--   LEFT JOIN public.user_roles ur ON ur.user_id = u.id
--   WHERE ur.role IN ('admin','logistica')
--   GROUP BY u.id, col.nome, u.email, u.created_at
--   ORDER BY u.created_at DESC;
-- $$;
DROP FUNCTION IF EXISTS "public"."get_colaboradores"();

-- get_users_with_roles() é usada por src/pages/Colaboradores.tsx (página
-- admin-only na UI), mas a função em si não tinha nenhuma checagem de
-- permissão — qualquer autenticado podia chamar via RPC direto e listar
-- nome/email/roles de todos os usuários do sistema. Convertida de "sql" para
-- "plpgsql" para permitir a checagem de role antes da query (a lógica de
-- listagem em si permanece idêntica).
CREATE OR REPLACE FUNCTION "public"."get_users_with_roles"()
RETURNS TABLE("id" "uuid", "nome" "text", "email" "text", "created_at" timestamp with time zone, "roles" "public"."user_role"[])
LANGUAGE "plpgsql" STABLE SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::user_role) OR public.has_role(auth.uid(), 'logistica'::user_role)) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  WITH entity_users AS (
    SELECT c.user_id AS id, c.nome FROM public.clientes c WHERE c.user_id IS NOT NULL
    UNION
    SELECT a.user_id AS id, a.nome FROM public.armazens a WHERE a.user_id IS NOT NULL
    UNION
    SELECT col.user_id AS id, col.nome FROM public.colaboradores col WHERE col.user_id IS NOT NULL
    UNION
    SELECT au.id, COALESCE(au.raw_user_meta_data->>'nome', au.email) AS nome
    FROM auth.users au
    WHERE NOT EXISTS (
      SELECT 1 FROM public.clientes c WHERE c.user_id = au.id
      UNION SELECT 1 FROM public.armazens a WHERE a.user_id = au.id
      UNION SELECT 1 FROM public.colaboradores col WHERE col.user_id = au.id
    )
  )
  SELECT u.id, u.nome, au.email, au.created_at,
         COALESCE(array_agg(DISTINCT ur.role) FILTER (WHERE ur.role IS NOT NULL), ARRAY[]::user_role[]) AS roles
  FROM entity_users u
  JOIN auth.users au ON au.id = u.id
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  GROUP BY u.id, u.nome, au.email, au.created_at
  ORDER BY au.created_at DESC;
END;
$$;
