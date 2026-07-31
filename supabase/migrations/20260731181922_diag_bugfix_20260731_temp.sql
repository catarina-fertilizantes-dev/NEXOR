-- TEMPORÁRIA — função de diagnóstico read-only para levantar o estrago do bug
-- corrigido em 20260731181523 (triggers sem SECURITY DEFINER). Será removida
-- em migration subsequente assim que o diagnóstico for lido. Não referenciada
-- por nenhum outro código do sistema.

CREATE OR REPLACE FUNCTION "public"."diag_bugfix_20260731"() RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_liberacoes jsonb;
  v_estoque jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO v_liberacoes
  FROM (
    SELECT
      l.id,
      l.pedido_interno,
      l.quantidade_liberada,
      l.quantidade_retirada AS retirada_atual,
      COALESCE(SUM(a.quantidade) FILTER (WHERE c.etapa_atual = 6), 0) AS retirada_correta,
      l.status AS status_atual
    FROM liberacoes l
    LEFT JOIN agendamentos a ON a.liberacao_id = l.id
    LEFT JOIN carregamentos c ON c.agendamento_id = a.id
    GROUP BY l.id, l.pedido_interno, l.quantidade_liberada, l.quantidade_retirada, l.status
    HAVING l.quantidade_retirada <> COALESCE(SUM(a.quantidade) FILTER (WHERE c.etapa_atual = 6), 0)
  ) t;

  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO v_estoque
  FROM (
    SELECT
      e.produto_id,
      p.nome AS produto_nome,
      e.armazem_id,
      am.nome AS armazem_nome,
      e.quantidade AS quantidade_atual,
      (
        COALESCE((SELECT SUM(r.quantidade_original) FROM estoque_remessas r
                  WHERE r.produto_id = e.produto_id AND r.armazem_id = e.armazem_id), 0)
        - COALESCE((SELECT SUM(a.quantidade)
                    FROM agendamentos a
                    JOIN carregamentos c ON c.agendamento_id = a.id
                    JOIN liberacoes l ON l.id = a.liberacao_id
                    WHERE l.produto_id = e.produto_id AND l.armazem_id = e.armazem_id
                      AND c.etapa_atual = 6), 0)
        - COALESCE((SELECT SUM(tr.quantidade) FROM estoque_transferencias tr
                    WHERE tr.produto_id = e.produto_id AND tr.armazem_id = e.armazem_id
                      AND tr.status = 'ativa'), 0)
      ) AS quantidade_esperada
    FROM estoque e
    JOIN produtos p ON p.id = e.produto_id
    JOIN armazens am ON am.id = e.armazem_id
  ) t
  WHERE t.quantidade_atual <> t.quantidade_esperada;

  RETURN jsonb_build_object(
    'liberacoes_mismatch', v_liberacoes,
    'estoque_mismatch', v_estoque
  );
END;
$$;
