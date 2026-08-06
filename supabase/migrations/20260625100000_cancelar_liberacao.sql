-- Migration: Cancelar Liberação
-- Adds 'cancelada' status to liberacao_status enum and creates the cancelar_liberacao RPC function.

-- Step 1: Add 'cancelada' to the enum
ALTER TYPE liberacao_status ADD VALUE IF NOT EXISTS 'cancelada';

-- Step 2: Create the RPC function
CREATE OR REPLACE FUNCTION cancelar_liberacao(
  p_liberacao_id uuid,
  p_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lib liberacoes%ROWTYPE;
  v_qty_em_andamento numeric := 0;
  v_qty_a_devolver   numeric := 0;
BEGIN
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

  -- 3. Quantidade a devolver ao armazém atual da liberação
  --    = total liberado - já fisicamente retirado (etapa 6) - caminhões carregando (etapa 2-5)
  v_qty_a_devolver := v_lib.quantidade_liberada
                    - v_lib.quantidade_retirada
                    - v_qty_em_andamento;

  -- 4. Deletar carregamentos não iniciados (etapa 1)
  --    São criados automaticamente por trigger; não existe status 'cancelado' para carregamentos
  DELETE FROM carregamentos c
  USING agendamentos ag
  WHERE c.agendamento_id = ag.id
    AND ag.liberacao_id = p_liberacao_id
    AND c.etapa_atual = 1;

  -- 5. Arquivar todos os agendamentos desta liberação (status = 'cancelado')
  --    Agendamentos com carregamentos em andamento (etapa >= 2) continuarão até conclusão natural
  --    Nota: trigger 'trigger_sync_liberacao_final' dispara aqui e pode temporariamente
  --    setar liberação para 'disponivel' — isso é sobrescrito no passo 7
  UPDATE agendamentos
  SET status = 'cancelado', updated_at = now()
  WHERE liberacao_id = p_liberacao_id
    AND status != 'cancelado';

  -- 6. Devolver quantidade ao estoque disponível do armazém atual da liberação
  --    Cenário de troca de armazém: armazem_id já foi atualizado por alterar_armazem_liberacao,
  --    portanto retornamos ao armazém correto
  IF v_qty_a_devolver > 0 THEN
    UPDATE estoque
    SET quantidade_disponivel = quantidade_disponivel + v_qty_a_devolver,
        updated_at = now(),
        updated_by = p_user_id
    WHERE armazem_id = v_lib.armazem_id
      AND produto_id = v_lib.produto_id;
  END IF;

  -- 7. Setar liberação como cancelada
  --    UPDATE sem mudança de armazem_id: trigger sync_estoque_from_liberacao NÃO dispara
  UPDATE liberacoes
  SET status = 'cancelada', updated_at = now()
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
