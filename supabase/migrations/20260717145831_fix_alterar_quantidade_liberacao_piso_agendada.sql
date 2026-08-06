-- Fix: o piso mínimo de alterar_quantidade_liberacao considerava apenas
-- quantidade_retirada + carregamentos em andamento (etapa 2-5), mas não a soma
-- de agendamentos ainda não iniciados (etapa 1). Isso permitia reduzir a
-- liberação abaixo do total já agendado, deixando agendamentos "órfãos"
-- (ex.: 200t agendada numa liberação de 50t, barra de progresso em 400%).
-- O piso agora é o maior entre: quantidade comprometida (retirada + em
-- carregamento) e a soma de agendamentos ativos (pendente/em_andamento/concluido).

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
  v_qty_agendada_ativa numeric := 0;
  v_piso                numeric := 0;
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

  SELECT COALESCE(SUM(a.quantidade), 0)
  INTO v_qty_agendada_ativa
  FROM agendamentos a
  WHERE a.liberacao_id = p_liberacao_id
    AND a.status IN ('pendente', 'em_andamento', 'concluido');

  v_piso := GREATEST(v_qty_comprometida, v_qty_agendada_ativa);

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
    'quantidade_agendada_ativa', v_qty_agendada_ativa,
    'quantidade_comprometida',  v_piso,
    'estoque_disponivel',       v_estoque_disponivel,
    'quantidade_maxima',        v_lib.quantidade_liberada + v_estoque_disponivel
  );
END;
$$;

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
  v_piso                numeric := 0;
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

  -- Quantidade comprometida (retirada + em carregamento ativo)
  SELECT COALESCE(SUM(ag.quantidade), 0)
  INTO v_qty_em_andamento
  FROM agendamentos ag
  JOIN carregamentos c ON c.agendamento_id = ag.id
  WHERE ag.liberacao_id = p_liberacao_id
    AND c.etapa_atual BETWEEN 2 AND 5;

  v_qty_comprometida := v_lib.quantidade_retirada + v_qty_em_andamento;

  -- Quantidade agendada ativa (inclui agendamentos ainda não iniciados, etapa 1)
  SELECT COALESCE(SUM(a.quantidade), 0)
  INTO v_qty_agendada_ativa
  FROM agendamentos a
  WHERE a.liberacao_id = p_liberacao_id
    AND a.status IN ('pendente', 'em_andamento', 'concluido');

  -- Piso mínimo do novo valor = o maior entre os dois, para nunca deixar
  -- agendamentos (iniciados ou não) somando mais que o total da liberação
  v_piso := GREATEST(v_qty_comprometida, v_qty_agendada_ativa);

  IF p_nova_quantidade < v_piso THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Nova quantidade (%s) não pode ser menor que a quantidade já comprometida/agendada (%s)', p_nova_quantidade, v_piso)
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
  -- dispara em mudanças de agendamentos, não de liberacoes). v_qty_agendada_ativa
  -- já foi calculada acima.
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
