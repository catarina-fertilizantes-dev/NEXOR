-- Migration: Correções pós-implementação de Cancelar Liberação
-- 1. Adiciona colunas de auditoria em liberacoes (cancelado_por, cancelado_em)
-- 2. Corrige trigger sync_liberacao_agendamento_status para respeitar status 'cancelada'
-- 3. Recria cancelar_liberacao com validação de role + auditoria + função de preview

-- ============================================================
-- 1. Colunas de auditoria em liberacoes
-- ============================================================
ALTER TABLE liberacoes
  ADD COLUMN IF NOT EXISTS cancelado_por uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS cancelado_em  timestamptz;

-- ============================================================
-- 2. Corrigir trigger sync_liberacao_agendamento_status
--    Impede que o trigger sobrescreva status 'cancelada' ou 'finalizada'
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_liberacao_agendamento_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_liberacao_id     uuid;
  quantidade_liberada numeric;
  quantidade_agendada numeric;
  v_status_atual      text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_liberacao_id := OLD.liberacao_id;
  ELSE
    v_liberacao_id := NEW.liberacao_id;
  END IF;

  SELECT status, l.quantidade_liberada
  INTO v_status_atual, quantidade_liberada
  FROM liberacoes l
  WHERE l.id = v_liberacao_id;

  -- Não sobrescrever liberações já encerradas
  IF v_status_atual IN ('cancelada', 'finalizada') THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  SELECT COALESCE(SUM(a.quantidade), 0)
  INTO quantidade_agendada
  FROM agendamentos a
  WHERE a.liberacao_id = v_liberacao_id
    AND a.status IN ('pendente', 'em_andamento', 'concluido');

  IF quantidade_agendada = 0 THEN
    UPDATE liberacoes SET status = 'disponivel'            WHERE id = v_liberacao_id;
  ELSIF quantidade_agendada < quantidade_liberada THEN
    UPDATE liberacoes SET status = 'parcialmente_agendada' WHERE id = v_liberacao_id;
  ELSE
    UPDATE liberacoes SET status = 'totalmente_agendada'   WHERE id = v_liberacao_id;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- ============================================================
-- 3. Recriar cancelar_liberacao com validação de role + auditoria
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
  v_lib              liberacoes%ROWTYPE;
  v_qty_em_andamento numeric := 0;
  v_qty_a_devolver   numeric := 0;
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

  -- 2. Carregamentos em andamento (etapa 2–5, caminhão presente mas não finalizado)
  SELECT COALESCE(SUM(ag.quantidade), 0)
  INTO v_qty_em_andamento
  FROM agendamentos ag
  JOIN carregamentos c ON c.agendamento_id = ag.id
  WHERE ag.liberacao_id = p_liberacao_id
    AND c.etapa_atual BETWEEN 2 AND 5;

  -- 3. Quantidade a devolver = total liberado - já retirado - em carregamento ativo
  v_qty_a_devolver := v_lib.quantidade_liberada
                    - v_lib.quantidade_retirada
                    - v_qty_em_andamento;

  -- 4. Deletar carregamentos não iniciados (etapa 1)
  DELETE FROM carregamentos c
  USING agendamentos ag
  WHERE c.agendamento_id = ag.id
    AND ag.liberacao_id = p_liberacao_id
    AND c.etapa_atual = 1;

  -- 5. Arquivar todos os agendamentos desta liberação
  --    O trigger sync_liberacao_agendamento_status agora respeita 'cancelada',
  --    mas a liberação ainda não está cancelada neste ponto — o trigger vai setar
  --    'disponivel'. Isso é sobrescrito no passo 7.
  UPDATE agendamentos
  SET status = 'cancelado', updated_at = now()
  WHERE liberacao_id = p_liberacao_id
    AND status != 'cancelado';

  -- 6. Devolver quantidade ao estoque do armazém atual
  IF v_qty_a_devolver > 0 THEN
    UPDATE estoque
    SET quantidade_disponivel = quantidade_disponivel + v_qty_a_devolver,
        updated_at  = now(),
        updated_by  = p_user_id
    WHERE armazem_id = v_lib.armazem_id
      AND produto_id = v_lib.produto_id;
  END IF;

  -- 7. Setar liberação como cancelada com auditoria
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
-- 4. Função de preview (read-only) para o dialog de confirmação
-- ============================================================
CREATE OR REPLACE FUNCTION calcular_cancelamento_liberacao(
  p_liberacao_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lib              liberacoes%ROWTYPE;
  v_qty_em_andamento numeric := 0;
  v_qty_a_devolver   numeric := 0;
BEGIN
  SELECT * INTO v_lib FROM liberacoes WHERE id = p_liberacao_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Liberação não encontrada');
  END IF;

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
    'quantidade_a_devolver',   v_qty_a_devolver,
    'quantidade_em_andamento', v_qty_em_andamento,
    'quantidade_retirada',     v_lib.quantidade_retirada,
    'quantidade_liberada',     v_lib.quantidade_liberada
  );
END;
$$;
