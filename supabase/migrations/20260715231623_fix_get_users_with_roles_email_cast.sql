-- Corrige bug introduzido na migration anterior (20260715231347): ao converter
-- get_users_with_roles de LANGUAGE sql para plpgsql, RETURN QUERY passou a
-- exigir tipo exato entre a query e o RETURNS TABLE declarado. auth.users.email
-- é character varying(255), não text, e a versão SQL anterior fazia a coerção
-- implícita — plpgsql não faz. Corrige com cast explícito ::text.
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
  SELECT u.id, u.nome, au.email::text, au.created_at,
         COALESCE(array_agg(DISTINCT ur.role) FILTER (WHERE ur.role IS NOT NULL), ARRAY[]::user_role[]) AS roles
  FROM entity_users u
  JOIN auth.users au ON au.id = u.id
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  GROUP BY u.id, u.nome, au.email, au.created_at
  ORDER BY au.created_at DESC;
END;
$$;
