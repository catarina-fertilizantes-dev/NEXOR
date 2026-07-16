-- Diagnóstico temporário: as policies de storage.objects reconstruídas a partir
-- do histórico de migrations não bateram com o comportamento real observado em
-- Dev (cliente1 conseguiu gerar signed URL para carregamento-fotos, que a policy
-- documentada não permitiria). Suspeita: policies de storage foram configuradas
-- direto pelo Dashboard em algum momento, fora do fluxo de migrations. Esta
-- função só lê pg_policies para confirmar o estado real; será removida logo
-- em seguida (migration de limpeza já planejada).
CREATE OR REPLACE FUNCTION "public"."tmp_diag_storage_policies"()
RETURNS TABLE("policyname" "name", "cmd" "text", "roles" "name"[], "qual" "text", "with_check" "text")
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::user_role)) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT p.policyname, p.cmd::text, p.roles, p.qual, p.with_check
  FROM pg_policies p
  WHERE p.schemaname = 'storage' AND p.tablename = 'objects';
END;
$$;
