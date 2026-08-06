-- Migration: Editar e Cancelar Agendamento (admin/logistica, só enquanto etapa_atual = 1)
-- 1. Colunas de auditoria de cancelamento em agendamentos (mesmo padrão de liberacoes)
-- 2. cancelar_agendamento: cancela o agendamento e libera o saldo na liberação
-- 3. editar_agendamento: mescla a antiga alterar_quantidade_agendamento com os demais
--    campos editáveis (data, placas, motorista, transportadora) num único RPC

-- ============================================================
-- 1. Colunas de auditoria
-- ============================================================
ALTER TABLE agendamentos
  ADD COLUMN IF NOT EXISTS cancelado_por uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS cancelado_em  timestamptz;

-- ============================================================
-- 2. cancelar_agendamento: só enquanto etapa_atual = 1
--    Ordem crítica: deletar o carregamento ANTES de marcar 'cancelado' —
--    a trigger sync_agendamento_status_from_carregamento reage a DELETE de
--    carregamento fazendo UPDATE agendamentos SET status = 'pendente', então
--    se a ordem fosse invertida ela reverteria o cancelamento silenciosamente.
-- ============================================================
CREATE OR REPLACE FUNCTION cancelar_agendamento(
  p_agendamento_id uuid,
  p_user_id        uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ag              agendamentos%ROWTYPE;
  v_carregamento_id uuid;
  v_etapa_atual     smallint;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id
      AND role IN ('admin', 'logistica')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para cancelar agendamentos');
  END IF;

  SELECT * INTO v_ag FROM agendamentos WHERE id = p_agendamento_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Agendamento não encontrado');
  END IF;
  IF v_ag.status = 'cancelado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Agendamento já está cancelado');
  END IF;

  SELECT id, etapa_atual INTO v_carregamento_id, v_etapa_atual
  FROM carregamentos
  WHERE agendamento_id = p_agendamento_id
  FOR UPDATE;

  IF v_etapa_atual IS NULL OR v_etapa_atual != 1 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Só é possível cancelar enquanto a chegada do caminhão ainda não foi registrada'
    );
  END IF;

  DELETE FROM carregamentos WHERE id = v_carregamento_id;

  UPDATE agendamentos
  SET status        = 'cancelado',
      cancelado_por = p_user_id,
      cancelado_em  = now(),
      updated_at    = now()
  WHERE id = p_agendamento_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================
-- 3. editar_agendamento: substitui alterar_quantidade_agendamento (mantida no
--    banco sem uso — mesmas regras, agora cobrindo também os demais campos)
-- ============================================================
CREATE OR REPLACE FUNCTION editar_agendamento(
  p_agendamento_id       uuid,
  p_quantidade           numeric,
  p_data_retirada        date,
  p_placa_caminhao       text,
  p_placa_carreta_1      text,
  p_placa_carreta_2      text,
  p_motorista_nome       text,
  p_motorista_documento  text,
  p_transportadora       text,
  p_cnpj_transportadora  text,
  p_user_id              uuid
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
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para editar agendamentos');
  END IF;

  IF p_quantidade IS NULL OR p_quantidade <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quantidade inválida');
  END IF;
  IF p_data_retirada IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Data de retirada é obrigatória');
  END IF;
  IF coalesce(trim(p_placa_caminhao), '') = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Placa do caminhão é obrigatória');
  END IF;
  IF coalesce(trim(p_placa_carreta_1), '') = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Placa da carreta 1 é obrigatória');
  END IF;
  IF coalesce(trim(p_motorista_nome), '') = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nome do motorista é obrigatório');
  END IF;
  IF coalesce(trim(p_motorista_documento), '') = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'CPF do motorista é obrigatório');
  END IF;
  IF coalesce(trim(p_transportadora), '') = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transportadora é obrigatória');
  END IF;
  IF coalesce(trim(p_cnpj_transportadora), '') = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'CNPJ da transportadora é obrigatório');
  END IF;

  SELECT * INTO v_ag FROM agendamentos WHERE id = p_agendamento_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Agendamento não encontrado');
  END IF;
  IF v_ag.status = 'cancelado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Agendamento cancelado não pode ser editado');
  END IF;

  SELECT etapa_atual INTO v_etapa_atual
  FROM carregamentos
  WHERE agendamento_id = p_agendamento_id
  FOR UPDATE;

  IF v_etapa_atual IS NULL OR v_etapa_atual != 1 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Só é possível editar o agendamento enquanto a chegada do caminhão ainda não foi registrada'
    );
  END IF;

  -- A validação de saldo disponível na liberação (quando a quantidade muda) já é
  -- feita pelo trigger aaa_validate_agendamento_quantidade (BEFORE UPDATE), que
  -- soma de volta a quantidade antiga do próprio agendamento antes de comparar.
  UPDATE agendamentos
  SET quantidade          = p_quantidade,
      data_retirada       = p_data_retirada,
      placa_caminhao      = p_placa_caminhao,
      placa_carreta_1     = p_placa_carreta_1,
      placa_carreta_2     = nullif(trim(p_placa_carreta_2), ''),
      motorista_nome      = p_motorista_nome,
      motorista_documento = p_motorista_documento,
      transportadora      = p_transportadora,
      cnpj_transportadora = p_cnpj_transportadora,
      updated_at          = now()
  WHERE id = p_agendamento_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
