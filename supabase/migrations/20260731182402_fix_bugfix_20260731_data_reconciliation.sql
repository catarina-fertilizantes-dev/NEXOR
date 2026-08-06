-- Correção pontual de dados (Dev apenas) — não recorrente. Reconcilia os
-- registros que ficaram inconsistentes pela ausência de SECURITY DEFINER
-- corrigida em 20260731181523, corrigindo diretamente as tabelas com a mesma
-- lógica que os triggers já corrigidos teriam aplicado (não é dado de teste
-- novo, é o estado que já deveria existir).
--
-- 1. liberacoes.quantidade_retirada / status — recomputa para TODAS as
--    liberações usando exatamente a fórmula de sync_liberacao_quantidade_retirada.
--    Idempotente: linhas já corretas não são alteradas.
--
-- 2. estoque.quantidade (físico) — corrigido pontualmente em 3 pares
--    produto/armazém onde o diagnóstico confirmou que remessas >= consumo
--    total (carregamentos finalizados + transferências ativas), ou seja, a
--    diferença é exatamente o débito que o trigger quebrado deixou de aplicar:
--      • Nitrato @ Armazém Joinville:  45  -> 0
--      • Ureia 46% @ Armazém Porto Alegre: 630 -> 600
--      • Ureia 46% @ Armazém 1: 670 -> 580
--
--    NÃO corrigido automaticamente: Ureia 46% @ Armazém Joinville
--    (produto_id 15cf2cd4-7284-44fd-94e0-61618a3958e5, armazem_id
--    1249e35e-7df5-4228-a319-93ae1fbff8f6). O diagnóstico mostrou consumo
--    total (carregamentos finalizados + transferências ativas = 540) MAIOR
--    que a soma de remessas já recebidas (500) — uma inconsistência de 40
--    que esse bug NÃO explica (o bug só faz o físico ficar mais alto do que
--    deveria, nunca mais baixo que o suprido). É um problema de dado de teste
--    pré-existente e separado; decisão de correção fica para revisão manual.

-- ============================================================
-- 1. liberacoes: recompute geral de quantidade_retirada + status
-- ============================================================
WITH retirada_correta AS (
  SELECT
    l.id,
    COALESCE(SUM(a.quantidade) FILTER (WHERE c.etapa_atual = 6), 0) AS retirada_total
  FROM liberacoes l
  LEFT JOIN agendamentos a ON a.liberacao_id = l.id
  LEFT JOIN carregamentos c ON c.agendamento_id = a.id
  GROUP BY l.id
)
UPDATE liberacoes l
SET quantidade_retirada = rc.retirada_total,
    status = CASE
      WHEN l.status = 'cancelada' THEN l.status
      WHEN rc.retirada_total >= l.quantidade_liberada THEN 'finalizada'
      ELSE l.status
    END,
    updated_at = now()
FROM retirada_correta rc
WHERE rc.id = l.id
  AND l.quantidade_retirada <> rc.retirada_total;

-- ============================================================
-- 2. estoque: débito físico que o trigger quebrado não aplicou
--    (3 pares confirmados manualmente, ver diagnóstico acima)
-- ============================================================
UPDATE estoque
SET quantidade = 0,
    updated_at = now()
WHERE produto_id = '79217e03-f346-4ea2-ada5-6323087e8d89' -- Nitrato
  AND armazem_id = '1249e35e-7df5-4228-a319-93ae1fbff8f6' -- Armazém Joinville
  AND quantidade = 45;

UPDATE estoque
SET quantidade = 600,
    updated_at = now()
WHERE produto_id = '15cf2cd4-7284-44fd-94e0-61618a3958e5' -- Ureia 46%
  AND armazem_id = '18606706-f260-40e9-ad9f-118954728346' -- Armazém Porto Alegre
  AND quantidade = 630;

UPDATE estoque
SET quantidade = 580,
    updated_at = now()
WHERE produto_id = '15cf2cd4-7284-44fd-94e0-61618a3958e5' -- Ureia 46%
  AND armazem_id = 'c6e14ee2-2169-44fc-bb33-a67f049bcdbf' -- Armazém 1
  AND quantidade = 670;

-- ============================================================
-- 3. Remove as functions de diagnóstico temporárias (uso único, não fazem
--    parte do sistema)
-- ============================================================
DROP FUNCTION IF EXISTS "public"."diag_bugfix_20260731"();
DROP FUNCTION IF EXISTS "public"."diag_bugfix_20260731_detalhe"(uuid, uuid);
