-- CRÍTICO: update_user_role era SECURITY DEFINER sem NENHUMA checagem de
-- permissão — qualquer usuário (inclusive anon, via GRANT padrão do Supabase)
-- podia chamar via RPC e atribuir qualquer role (inclusive 'admin') a
-- qualquer user_id. Só admin acessa /colaboradores (CLAUDE.md), e a RLS de
-- user_roles já restringe UPDATE a admin apenas — a função deveria seguir a
-- mesma regra.
--
-- A checagem fica FORA do bloco EXCEPTION WHEN OTHERS original (que engolia
-- qualquer erro retornando FALSE silenciosamente) — senão "Acesso negado"
-- seria capturado e o chamador só veria FALSE, sem mensagem clara.
CREATE OR REPLACE FUNCTION "public"."update_user_role"("_user_id" "uuid", "_role" "public"."user_role") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::user_role) THEN
    RAISE EXCEPTION 'Acesso negado';
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
