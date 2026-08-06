-- user_roles nunca teve UNIQUE (user_id, role) — só PRIMARY KEY (id), que é
-- sempre um uuid novo. O "ON CONFLICT (user_id, role) DO NOTHING" em
-- update_user_role dependia de uma constraint que não existia, então todo
-- INSERT falhava e a troca de role nunca era aplicada de fato (confirmado:
-- nenhuma duplicata existente, seguro adicionar agora).
ALTER TABLE "public"."user_roles"
  ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");

-- update_user_role é usada exclusivamente pela página /colaboradores
-- (admin-only), que só gerencia contas com role admin ou logistica —
-- armazém/cliente/representante são criados e geridos em suas próprias
-- páginas/edge functions dedicadas. Adiciona validação explícita para que
-- essa RPC nunca possa setar nenhuma role fora de admin/logistica, mesmo
-- que chamada diretamente (não só pela UI).
CREATE OR REPLACE FUNCTION "public"."update_user_role"("_user_id" "uuid", "_role" "public"."user_role") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::user_role) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF _role NOT IN ('admin', 'logistica') THEN
    RAISE EXCEPTION 'update_user_role só aceita role admin ou logistica';
  END IF;

  BEGIN
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role <> _role;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN TRUE;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'update_user_role falhou: %', SQLERRM;
    RETURN FALSE;
  END;
END;
$$;
