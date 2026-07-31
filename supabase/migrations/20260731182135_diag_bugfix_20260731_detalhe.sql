-- TEMPORÁRIA — detalha os componentes do cálculo para um par produto/armazém
-- específico, para investigar casos onde quantidade_esperada deu negativa
-- (impossível fisicamente) antes de aplicar qualquer correção automática.
-- Será removida junto com diag_bugfix_20260731.

CREATE OR REPLACE FUNCTION "public"."diag_bugfix_20260731_detalhe"(p_produto_id uuid, p_armazem_id uuid) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_remessas jsonb;
  v_carregamentos jsonb;
  v_transferencias jsonb;
  v_estoque_atual numeric;
BEGIN
  SELECT quantidade INTO v_estoque_atual FROM estoque WHERE produto_id = p_produto_id AND armazem_id = p_armazem_id;

  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO v_remessas
  FROM (
    SELECT id, numero_remessa, quantidade_original, data_remessa, created_at
    FROM estoque_remessas
    WHERE produto_id = p_produto_id AND armazem_id = p_armazem_id
    ORDER BY created_at
  ) t;

  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO v_carregamentos
  FROM (
    SELECT c.id AS carregamento_id, a.id AS agendamento_id, l.id AS liberacao_id,
           l.pedido_interno, a.quantidade, c.etapa_atual, l.status AS liberacao_status
    FROM agendamentos a
    JOIN carregamentos c ON c.agendamento_id = a.id
    JOIN liberacoes l ON l.id = a.liberacao_id
    WHERE l.produto_id = p_produto_id AND l.armazem_id = p_armazem_id
    ORDER BY c.etapa_atual DESC
  ) t;

  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO v_transferencias
  FROM (
    SELECT id, quantidade, status, numero_pedido, created_at
    FROM estoque_transferencias
    WHERE produto_id = p_produto_id AND armazem_id = p_armazem_id
    ORDER BY created_at
  ) t;

  RETURN jsonb_build_object(
    'estoque_atual', v_estoque_atual,
    'remessas', v_remessas,
    'carregamentos', v_carregamentos,
    'transferencias', v_transferencias
  );
END;
$$;
