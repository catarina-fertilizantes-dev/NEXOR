-- Migration: Alterar quantidade de Liberação e de Agendamento
-- 1. cancelar_liberacao passa a recusar cancelamento quando há carregamento iniciado (etapa_atual >= 2)
-- 2. calcular_cancelamento_liberacao passa a informar pode_cancelar + motivo
-- 3. Novo par de RPCs (preview + execução) para alterar o total de uma liberação
-- 4. Nova RPC para alterar a quantidade de um agendamento (só enquanto etapa_atual = 1)

-- ============================================================
-- 1. cancelar_liberacao: recusar se houver carregamento iniciado (etapa_atual >= 2)
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

  -- 2. Existe carregamento já iniciado (etapa_atual >= 2)?
  --    Nesse caso o cancelamento não é mais permitido — só reduzir a quantidade
  --    via alterar_quantidade_liberacao.
  SELECT EXISTS (
    SELECT 1
    FROM agendamentos ag
    JOIN carregamentos c ON c.agendamento_id = ag.id
    WHERE ag.liberacao_id = p_liberacao_id
      AND c.etapa_atual >= 2
  ) INTO v_tem_carreg_iniciado;

  IF v_tem_carreg_iniciado THEN
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

-- ============================================================
-- 2. calcular_cancelamento_liberacao: agora informa pode_cancelar + motivo
-- ============================================================
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
BEGIN
  SELECT * INTO v_lib FROM liberacoes WHERE id = p_liberacao_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Liberação não encontrada');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM agendamentos ag
    JOIN carregamentos c ON c.agendamento_id = ag.id
    WHERE ag.liberacao_id = p_liberacao_id
      AND c.etapa_atual >= 2
  ) INTO v_tem_carreg_iniciado;

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
    'pode_cancelar',           NOT v_tem_carreg_iniciado,
    'motivo_bloqueio',         CASE WHEN v_tem_carreg_iniciado
                                     THEN 'Esta liberação já possui carregamento(s) iniciado(s). Utilize "Alterar Quantidade" para reduzir o total ao que já foi comprometido.'
                                     ELSE NULL END,
    'quantidade_a_devolver',   v_qty_a_devolver,
    'quantidade_em_andamento', v_qty_em_andamento,
    'quantidade_retirada',     v_lib.quantidade_retirada,
    'quantidade_liberada',     v_lib.quantidade_liberada
  );
END;
$$;

-- ============================================================
-- 3a. calcular_alteracao_liberacao: preview read-only para o dialog de "Alterar Quantidade"
-- ============================================================
CREATE OR REPLACE FUNCTION calcular_alteracao_liberacao(
  p_liberacao_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lib                liberacoes%ROWTYPE;
  v_qty_em_andamento   numeric := 0;
  v_qty_comprometida   numeric := 0;
  v_estoque_disponivel numeric := 0;
BEGIN
  SELECT * INTO v_lib FROM liberacoes WHERE id = p_liberacao_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Liberação não encontrada');
  END IF;
  IF v_lib.status IN ('cancelada', 'finalizada') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Liberação cancelada ou finalizada não pode ser alterada');
  END IF;

  SELECT COALESCE(SUM(ag.quantidade), 0)
  INTO v_qty_em_andamento
  FROM agendamentos ag
  JOIN carregamentos c ON c.agendamento_id = ag.id
  WHERE ag.liberacao_id = p_liberacao_id
    AND c.etapa_atual BETWEEN 2 AND 5;

  v_qty_comprometida := v_lib.quantidade_retirada + v_qty_em_andamento;

  SELECT COALESCE(quantidade_disponivel, 0)
  INTO v_estoque_disponivel
  FROM estoque
  WHERE produto_id = v_lib.produto_id
    AND armazem_id = v_lib.armazem_id;

  RETURN jsonb_build_object(
    'success',                  true,
    'quantidade_liberada',      v_lib.quantidade_liberada,
    'quantidade_retirada',      v_lib.quantidade_retirada,
    'quantidade_em_andamento',  v_qty_em_andamento,
    'quantidade_comprometida',  v_qty_comprometida,
    'estoque_disponivel',       v_estoque_disponivel,
    'quantidade_maxima',        v_lib.quantidade_liberada + v_estoque_disponivel
  );
END;
$$;

-- ============================================================
-- 3b. alterar_quantidade_liberacao: execução
-- ============================================================
CREATE OR REPLACE FUNCTION alterar_quantidade_liberacao(
  p_liberacao_id    uuid,
  p_nova_quantidade numeric,
  p_user_id         uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lib                liberacoes%ROWTYPE;
  v_qty_em_andamento   numeric := 0;
  v_qty_comprometida   numeric := 0;
  v_qty_agendada_ativa numeric := 0;
  v_delta              numeric := 0;
  v_estoque_disponivel numeric := 0;
  v_novo_status        liberacao_status;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id
      AND role IN ('admin', 'logistica')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para alterar liberações');
  END IF;

  IF p_nova_quantidade IS NULL OR p_nova_quantidade <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quantidade inválida');
  END IF;

  -- Lock e carrega liberação
  SELECT * INTO v_lib FROM liberacoes WHERE id = p_liberacao_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Liberação não encontrada');
  END IF;
  IF v_lib.status IN ('cancelada', 'finalizada') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Liberação cancelada ou finalizada não pode ser alterada');
  END IF;

  -- Quantidade comprometida (retirada + em carregamento ativo) = piso mínimo do novo valor
  SELECT COALESCE(SUM(ag.quantidade), 0)
  INTO v_qty_em_andamento
  FROM agendamentos ag
  JOIN carregamentos c ON c.agendamento_id = ag.id
  WHERE ag.liberacao_id = p_liberacao_id
    AND c.etapa_atual BETWEEN 2 AND 5;

  v_qty_comprometida := v_lib.quantidade_retirada + v_qty_em_andamento;

  IF p_nova_quantidade < v_qty_comprometida THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Nova quantidade (%s) não pode ser menor que a quantidade já comprometida em carregamentos (%s)', p_nova_quantidade, v_qty_comprometida)
    );
  END IF;

  v_delta := p_nova_quantidade - v_lib.quantidade_liberada;

  IF v_delta > 0 THEN
    -- Aumento: valida e debita estoque disponível do armazém atual
    SELECT COALESCE(quantidade_disponivel, 0)
    INTO v_estoque_disponivel
    FROM estoque
    WHERE produto_id = v_lib.produto_id
      AND armazem_id = v_lib.armazem_id;

    IF v_estoque_disponivel < v_delta THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Estoque disponível insuficiente. Disponível: %s, Necessário: %s', v_estoque_disponivel, v_delta)
      );
    END IF;

    UPDATE estoque
    SET quantidade_disponivel = quantidade_disponivel - v_delta,
        updated_at = now(),
        updated_by = p_user_id
    WHERE produto_id = v_lib.produto_id
      AND armazem_id = v_lib.armazem_id;
  ELSIF v_delta < 0 THEN
    -- Redução: devolve a diferença ao estoque disponível
    UPDATE estoque
    SET quantidade_disponivel = quantidade_disponivel + abs(v_delta),
        updated_at = now(),
        updated_by = p_user_id
    WHERE produto_id = v_lib.produto_id
      AND armazem_id = v_lib.armazem_id;
  END IF;

  -- Recalcula status (mesma lógica de sync_liberacao_agendamento_status, que só
  -- dispara em mudanças de agendamentos, não de liberacoes)
  SELECT COALESCE(SUM(a.quantidade), 0)
  INTO v_qty_agendada_ativa
  FROM agendamentos a
  WHERE a.liberacao_id = p_liberacao_id
    AND a.status IN ('pendente', 'em_andamento', 'concluido');

  IF v_qty_agendada_ativa = 0 THEN
    v_novo_status := 'disponivel';
  ELSIF v_qty_agendada_ativa < p_nova_quantidade THEN
    v_novo_status := 'parcialmente_agendada';
  ELSE
    v_novo_status := 'totalmente_agendada';
  END IF;

  UPDATE liberacoes
  SET quantidade_liberada = p_nova_quantidade,
      status = v_novo_status,
      updated_at = now()
  WHERE id = p_liberacao_id;

  RETURN jsonb_build_object(
    'success', true,
    'quantidade_anterior', v_lib.quantidade_liberada,
    'quantidade_nova', p_nova_quantidade,
    'delta', v_delta,
    'novo_status', v_novo_status
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================
-- 4. alterar_quantidade_agendamento: só permitido enquanto etapa_atual = 1
--    (chegada do caminhão ainda não registrada no carregamento vinculado)
-- ============================================================
CREATE OR REPLACE FUNCTION alterar_quantidade_agendamento(
  p_agendamento_id  uuid,
  p_nova_quantidade numeric,
  p_user_id         uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ag          agendamentos%ROWTYPE;
  v_etapa_atual smallint;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id
      AND role IN ('admin', 'logistica')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para alterar agendamentos');
  END IF;

  IF p_nova_quantidade IS NULL OR p_nova_quantidade <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quantidade inválida');
  END IF;

  SELECT * INTO v_ag FROM agendamentos WHERE id = p_agendamento_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Agendamento não encontrado');
  END IF;
  IF v_ag.status = 'cancelado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Agendamento cancelado não pode ser alterado');
  END IF;

  SELECT etapa_atual INTO v_etapa_atual
  FROM carregamentos
  WHERE agendamento_id = p_agendamento_id;

  IF v_etapa_atual IS NULL OR v_etapa_atual != 1 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Só é possível alterar a quantidade enquanto a chegada do caminhão ainda não foi registrada'
    );
  END IF;

  -- A validação de saldo disponível na liberação já é feita pelo trigger
  -- aaa_validate_agendamento_quantidade (BEFORE UPDATE), que soma de volta
  -- a quantidade antiga do próprio agendamento antes de comparar.
  UPDATE agendamentos
  SET quantidade = p_nova_quantidade,
      updated_at = now()
  WHERE id = p_agendamento_id;

  RETURN jsonb_build_object(
    'success', true,
    'quantidade_anterior', v_ag.quantidade,
    'quantidade_nova', p_nova_quantidade
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
