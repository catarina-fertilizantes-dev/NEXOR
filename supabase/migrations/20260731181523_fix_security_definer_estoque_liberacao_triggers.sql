-- Fix crítico: dois triggers de sistema sem SECURITY DEFINER, quebrados desde
-- 20260626120000_fix_rls_security.sql / 20260626100000_fix_liberacoes_update_rls.sql.
--
-- Mesmo bug que já tinha acontecido no mesmo dia com insert_carregamento_from_agendamento
-- (ver 20260626130000_fix_trigger_security_definer.sql), só que nestas duas funções
-- nunca foi corrigido:
--
--   1. sync_estoque_fisico_from_carregamento — dispara em UPDATE de carregamentos,
--      debita estoque.quantidade ao chegar na etapa 6. Sem SECURITY DEFINER, roda com
--      o privilégio de quem avançou o carregamento (tipicamente o usuário `armazem`,
--      que atualiza carregamentos direto pela tela, sem RPC). A policy
--      "estoque_update_admin_logistica" só permite UPDATE de admin/logistica, então o
--      UPDATE interno do trigger silenciosamente afeta 0 linhas — sem erro nenhum.
--
--   2. sync_liberacao_quantidade_retirada — mesma causa, dispara na mesma transição e
--      tenta atualizar liberacoes.quantidade_retirada/status. A policy
--      "liberacoes_update_admin_logistica" bloqueia qualquer role fora admin/logistica.
--
-- Resultado: ao finalizar um carregamento (etapa 6) por um usuário armazem, o estoque
-- físico nunca é debitado e a liberação nunca reflete a quantidade retirada nem vira
-- 'finalizada'. Reportado em 2026-07-31 (liberação de nitrato 45t em Joinville).
--
-- Correção: adicionar SECURITY DEFINER + SET search_path TO 'public' nas duas
-- funções, igual ao padrão já usado em insert_carregamento_from_agendamento e
-- sync_liberacao_agendamento_status.

CREATE OR REPLACE FUNCTION "public"."sync_estoque_fisico_from_carregamento"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_produto_id UUID;
    v_armazem_id UUID;
    v_quantidade_carregamento NUMERIC;
BEGIN
    -- Só processar quando carregamento for FINALIZADO (etapa 6)
    IF NEW.etapa_atual = 6 AND (OLD.etapa_atual IS NULL OR OLD.etapa_atual < 6) THEN

        -- Buscar dados da liberação E QUANTIDADE DO AGENDAMENTO
        SELECT
            l.produto_id,
            l.armazem_id,
            a.quantidade
        INTO v_produto_id, v_armazem_id, v_quantidade_carregamento
        FROM agendamentos a
        JOIN liberacoes l ON a.liberacao_id = l.id
        WHERE a.id = NEW.agendamento_id;

        -- Verificar se encontrou os dados
        IF v_produto_id IS NULL THEN
            RAISE EXCEPTION 'Não foi possível encontrar dados do agendamento %', NEW.agendamento_id;
        END IF;

        -- Descontar do estoque FÍSICO
        UPDATE estoque
        SET quantidade = quantidade - v_quantidade_carregamento,
            updated_at = NOW()
        WHERE produto_id = v_produto_id
        AND armazem_id = v_armazem_id;

        RAISE NOTICE 'Estoque físico descontado ao finalizar carregamento: produto_id=%, armazem_id=%, quantidade=%',
            v_produto_id, v_armazem_id, v_quantidade_carregamento;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."sync_liberacao_quantidade_retirada"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    liberacao_id_target UUID;
    quantidade_retirada_total NUMERIC;
    quantidade_liberada_atual NUMERIC;
    status_atual liberacao_status;
BEGIN
    SELECT a.liberacao_id
    INTO liberacao_id_target
    FROM agendamentos a
    WHERE a.id = NEW.agendamento_id;

    SELECT COALESCE(SUM(a.quantidade), 0)
    INTO quantidade_retirada_total
    FROM agendamentos a
    JOIN carregamentos c ON c.agendamento_id = a.id
    WHERE a.liberacao_id = liberacao_id_target
    AND c.etapa_atual = 6;

    SELECT quantidade_liberada, status
    INTO quantidade_liberada_atual, status_atual
    FROM liberacoes
    WHERE id = liberacao_id_target;

    UPDATE liberacoes
    SET quantidade_retirada = quantidade_retirada_total,
        status = CASE
            WHEN status_atual = 'cancelada' THEN status_atual
            WHEN quantidade_retirada_total >= quantidade_liberada_atual THEN 'finalizada'
            ELSE status_atual
        END
    WHERE id = liberacao_id_target;

    RETURN NEW;
END;
$$;

-- ============================================================
-- Bug secundário reportado junto: cancelar_liberacao/calcular_cancelamento_liberacao
-- usavam sempre a mensagem "carregamento(s) iniciado(s)", mesmo quando o carregamento
-- já estava FINALIZADO (etapa 6) — texto confuso para quem está tentando cancelar.
-- Passa a diferenciar "iniciado(s)" (etapa 2-5) de "finalizado(s)" (etapa 6). O
-- comportamento de bloqueio (etapa_atual >= 2) não muda, só a mensagem.
-- ============================================================

CREATE OR REPLACE FUNCTION cancelar_liberacao(
  p_liberacao_id uuid,
  p_user_id      uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lib                liberacoes%ROWTYPE;
  v_qty_em_andamento    numeric := 0;
  v_qty_a_devolver      numeric := 0;
  v_tem_carreg_iniciado boolean := false;
  v_tem_carreg_finalizado boolean := false;
BEGIN
  -- Validação de role: apenas admin ou logistica podem cancelar
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id
      AND role IN ('admin', 'logistica')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para cancelar liberações');
  END IF;

  -- 1. Lock e carrega liberação
  SELECT * INTO v_lib FROM liberacoes WHERE id = p_liberacao_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Liberação não encontrada');
  END IF;
  IF v_lib.status = 'cancelada' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Liberação já está cancelada');
  END IF;
  IF v_lib.status = 'finalizada' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Liberação já finalizada não pode ser cancelada');
  END IF;

  -- 2. Existe carregamento já iniciado (etapa 2-5) ou finalizado (etapa 6)?
  --    Em ambos os casos o cancelamento não é mais permitido — só reduzir a
  --    quantidade via alterar_quantidade_liberacao.
  SELECT
    EXISTS (
      SELECT 1
      FROM agendamentos ag
      JOIN carregamentos c ON c.agendamento_id = ag.id
      WHERE ag.liberacao_id = p_liberacao_id
        AND c.etapa_atual BETWEEN 2 AND 5
    ),
    EXISTS (
      SELECT 1
      FROM agendamentos ag
      JOIN carregamentos c ON c.agendamento_id = ag.id
      WHERE ag.liberacao_id = p_liberacao_id
        AND c.etapa_atual = 6
    )
  INTO v_tem_carreg_iniciado, v_tem_carreg_finalizado;

  IF v_tem_carreg_finalizado THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Esta liberação já possui carregamento(s) finalizado(s) e não pode mais ser cancelada. Utilize "Alterar Quantidade" para reduzir o total ao que já foi comprometido.'
    );
  ELSIF v_tem_carreg_iniciado THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Esta liberação já possui carregamento(s) iniciado(s) e não pode mais ser cancelada. Utilize "Alterar Quantidade" para reduzir o total ao que já foi comprometido.'
    );
  END IF;

  -- 3. Carregamentos em andamento (etapa 2–5, caminhão presente mas não finalizado)
  --    Sempre 0 neste ponto (passo 2 já bloqueou), mantido para compor o retorno.
  SELECT COALESCE(SUM(ag.quantidade), 0)
  INTO v_qty_em_andamento
  FROM agendamentos ag
  JOIN carregamentos c ON c.agendamento_id = ag.id
  WHERE ag.liberacao_id = p_liberacao_id
    AND c.etapa_atual BETWEEN 2 AND 5;

  -- 4. Quantidade a devolver = total liberado - já retirado - em carregamento ativo
  v_qty_a_devolver := v_lib.quantidade_liberada
                    - v_lib.quantidade_retirada
                    - v_qty_em_andamento;

  -- 5. Deletar carregamentos não iniciados (etapa 1)
  DELETE FROM carregamentos c
  USING agendamentos ag
  WHERE c.agendamento_id = ag.id
    AND ag.liberacao_id = p_liberacao_id
    AND c.etapa_atual = 1;

  -- 6. Arquivar todos os agendamentos desta liberação
  UPDATE agendamentos
  SET status = 'cancelado', updated_at = now()
  WHERE liberacao_id = p_liberacao_id
    AND status != 'cancelado';

  -- 7. Devolver quantidade ao estoque do armazém atual
  IF v_qty_a_devolver > 0 THEN
    UPDATE estoque
    SET quantidade_disponivel = quantidade_disponivel + v_qty_a_devolver,
        updated_at  = now(),
        updated_by  = p_user_id
    WHERE armazem_id = v_lib.armazem_id
      AND produto_id = v_lib.produto_id;
  END IF;

  -- 8. Setar liberação como cancelada com auditoria
  UPDATE liberacoes
  SET status       = 'cancelada',
      cancelado_por = p_user_id,
      cancelado_em  = now(),
      updated_at   = now()
  WHERE id = p_liberacao_id;

  RETURN jsonb_build_object(
    'success',                 true,
    'quantidade_devolvida',    v_qty_a_devolver,
    'quantidade_em_andamento', v_qty_em_andamento,
    'quantidade_retirada',     v_lib.quantidade_retirada
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION calcular_cancelamento_liberacao(
  p_liberacao_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lib                 liberacoes%ROWTYPE;
  v_qty_em_andamento    numeric := 0;
  v_qty_a_devolver      numeric := 0;
  v_tem_carreg_iniciado boolean := false;
  v_tem_carreg_finalizado boolean := false;
BEGIN
  SELECT * INTO v_lib FROM liberacoes WHERE id = p_liberacao_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Liberação não encontrada');
  END IF;

  SELECT
    EXISTS (
      SELECT 1
      FROM agendamentos ag
      JOIN carregamentos c ON c.agendamento_id = ag.id
      WHERE ag.liberacao_id = p_liberacao_id
        AND c.etapa_atual BETWEEN 2 AND 5
    ),
    EXISTS (
      SELECT 1
      FROM agendamentos ag
      JOIN carregamentos c ON c.agendamento_id = ag.id
      WHERE ag.liberacao_id = p_liberacao_id
        AND c.etapa_atual = 6
    )
  INTO v_tem_carreg_iniciado, v_tem_carreg_finalizado;

  SELECT COALESCE(SUM(ag.quantidade), 0)
  INTO v_qty_em_andamento
  FROM agendamentos ag
  JOIN carregamentos c ON c.agendamento_id = ag.id
  WHERE ag.liberacao_id = p_liberacao_id
    AND c.etapa_atual BETWEEN 2 AND 5;

  v_qty_a_devolver := v_lib.quantidade_liberada
                    - v_lib.quantidade_retirada
                    - v_qty_em_andamento;

  RETURN jsonb_build_object(
    'success',                 true,
    'pode_cancelar',           NOT (v_tem_carreg_iniciado OR v_tem_carreg_finalizado),
    'motivo_bloqueio',         CASE
                                     WHEN v_tem_carreg_finalizado
                                     THEN 'Esta liberação já possui carregamento(s) finalizado(s). Utilize "Alterar Quantidade" para reduzir o total ao que já foi comprometido.'
                                     WHEN v_tem_carreg_iniciado
                                     THEN 'Esta liberação já possui carregamento(s) iniciado(s). Utilize "Alterar Quantidade" para reduzir o total ao que já foi comprometido.'
                                     ELSE NULL END,
    'quantidade_a_devolver',   v_qty_a_devolver,
    'quantidade_em_andamento', v_qty_em_andamento,
    'quantidade_retirada',     v_lib.quantidade_retirada,
    'quantidade_liberada',     v_lib.quantidade_liberada
  );
END;
$$;
