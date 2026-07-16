-- As policies abaixo (carregamento_fotos_select_policy, carregamento_fotos_upload_policy,
-- carregamento_documentos_select_policy, carregamento_documentos_upload_policy,
-- estoque_documentos_select_policy, estoque_documentos_upload_policy,
-- estoque_documentos_delete_policy) foram criadas direto pelo Dashboard do Supabase,
-- fora do fluxo de migrations (confirmado via consulta a pg_policies em 2026-07-16).
-- Todas checam apenas o *role* de quem chama, nunca se o carregamento/armazém
-- específico pertence a esse usuário — qualquer cliente/representante autenticado
-- conseguia ler fotos e documentos de carregamentos de QUALQUER outro cliente.
--
-- Os nomes de arquivo já embutem os IDs necessários (sem estrutura de pastas):
--   carregamento-fotos / carregamento-documentos: "{carregamento_id}_etapa_..."
--   estoque-documentos: "{produto_id}_{armazem_id}_nota_remessa_..."
-- As funções abaixo extraem esses IDs do nome do objeto e verificam o vínculo
-- real (armazém dono, cliente dono, ou representante do cliente).

CREATE OR REPLACE FUNCTION "public"."can_access_carregamento_arquivo"("_user_id" "uuid", "_object_name" "text", "_for_insert" boolean DEFAULT false)
RETURNS boolean
LANGUAGE "plpgsql"
STABLE
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
DECLARE
  _carregamento_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role IN ('admin', 'logistica')) THEN
    RETURN TRUE;
  END IF;

  BEGIN
    _carregamento_id := split_part(_object_name, '_', 1)::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
  END;

  IF _for_insert THEN
    RETURN EXISTS (
      SELECT 1 FROM carregamentos c
      JOIN armazens a ON a.id = c.armazem_id
      WHERE c.id = _carregamento_id AND a.user_id = _user_id
    );
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM carregamentos c
    WHERE c.id = _carregamento_id AND (
      EXISTS (SELECT 1 FROM armazens a WHERE a.id = c.armazem_id AND a.user_id = _user_id)
      OR EXISTS (SELECT 1 FROM clientes cl WHERE cl.id = c.cliente_id AND cl.user_id = _user_id)
      OR EXISTS (
        SELECT 1 FROM representantes r
        JOIN clientes cl ON cl.representante_id = r.id
        WHERE cl.id = c.cliente_id AND r.user_id = _user_id
      )
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION "public"."can_access_estoque_arquivo"("_user_id" "uuid", "_object_name" "text")
RETURNS boolean
LANGUAGE "plpgsql"
STABLE
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
DECLARE
  _armazem_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role IN ('admin', 'logistica')) THEN
    RETURN TRUE;
  END IF;

  BEGIN
    _armazem_id := split_part(_object_name, '_', 2)::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
  END;

  RETURN EXISTS (SELECT 1 FROM armazens a WHERE a.id = _armazem_id AND a.user_id = _user_id);
END;
$$;

-- Remove as policies antigas (Dashboard) e as duas policies originais mais antigas
-- de carregamento-fotos (migrations 20251016155853/20251022175042), caso ainda existam.
DROP POLICY IF EXISTS "carregamento_fotos_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "carregamento_fotos_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "carregamento_documentos_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "carregamento_documentos_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "estoque_documentos_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "estoque_documentos_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "estoque_documentos_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users with proper role can view photos" ON storage.objects;
DROP POLICY IF EXISTS "Armazém pode fazer upload" ON storage.objects;

CREATE POLICY "carregamento_fotos_select_policy" ON storage.objects
  FOR SELECT TO "public"
  USING (bucket_id = 'carregamento-fotos' AND public.can_access_carregamento_arquivo(auth.uid(), name, false));

CREATE POLICY "carregamento_fotos_upload_policy" ON storage.objects
  FOR INSERT TO "public"
  WITH CHECK (bucket_id = 'carregamento-fotos' AND public.can_access_carregamento_arquivo(auth.uid(), name, true));

CREATE POLICY "carregamento_documentos_select_policy" ON storage.objects
  FOR SELECT TO "public"
  USING (bucket_id = 'carregamento-documentos' AND public.can_access_carregamento_arquivo(auth.uid(), name, false));

CREATE POLICY "carregamento_documentos_upload_policy" ON storage.objects
  FOR INSERT TO "public"
  WITH CHECK (bucket_id = 'carregamento-documentos' AND public.can_access_carregamento_arquivo(auth.uid(), name, true));

CREATE POLICY "estoque_documentos_select_policy" ON storage.objects
  FOR SELECT TO "public"
  USING (bucket_id = 'estoque-documentos' AND public.can_access_estoque_arquivo(auth.uid(), name));

CREATE POLICY "estoque_documentos_upload_policy" ON storage.objects
  FOR INSERT TO "public"
  WITH CHECK (bucket_id = 'estoque-documentos' AND EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'logistica')
  ));

CREATE POLICY "estoque_documentos_delete_policy" ON storage.objects
  FOR DELETE TO "public"
  USING (bucket_id = 'estoque-documentos' AND EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'logistica')
  ));
