-- can_access_carregamento_arquivo (criada em 20260716004319) checava só o
-- vínculo armazém-carregamento no INSERT, sem saber qual sub-etapa da etapa 5
-- (Documentação) o arquivo pertence. Isso permitia, na teoria, que o próprio
-- armazém subisse um arquivo de "5b" (Docs. Venda) do seu carregamento — regra
-- de negócio que hoje só é aplicada no frontend (CarregamentoDetalhe.tsx:
-- roles_permitidos: 5a/5c = ["armazem"], 5b = ["admin","logistica"]).
--
-- Nome do arquivo em carregamento-documentos é "{carregamento_id}_{subEtapaId}_nota|xml_{ts}.ext"
-- (subEtapaId = '5a'/'5b'/'5c'). Em carregamento-fotos o segundo segmento é
-- sempre o literal "etapa" (nunca '5b'), então a checagem abaixo não afeta fotos.
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
    -- Chegou aqui = quem chama não é admin/logistica. "5b" (Docs. Venda) é
    -- responsabilidade exclusiva de logística/admin — bloquear mesmo que seja
    -- o armazém dono do carregamento.
    IF split_part(_object_name, '_', 2) = '5b' THEN
      RETURN FALSE;
    END IF;

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
