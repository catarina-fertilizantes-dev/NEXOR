-- RPCs da Transferência de Propriedade, seguindo o mesmo padrão de
-- cancelar_liberacao/alterar_quantidade_liberacao: transação atômica única,
-- SECURITY DEFINER, validação de role dentro da própria função.

-- ============================================================
-- 1. registrar_transferencia_propriedade: debita quantidade E
--    quantidade_disponivel simultaneamente (não há Liberação prévia
--    reservando disponível, diferente do fluxo normal de carregamento)
-- ============================================================
CREATE OR REPLACE FUNCTION registrar_transferencia_propriedade(
  p_produto_id                 uuid,
  p_armazem_id                 uuid,
  p_quantidade                 numeric,
  p_cliente_id                 uuid,
  p_cliente_cnpj_texto         text,
  p_cliente_razao_social_texto text,
  p_numero_pedido              text,
  p_data_transferencia         date,
  p_url_nota                   text,
  p_url_xml                    text,
  p_user_id                    uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_estoque            estoque%ROWTYPE;
  v_transferencia_id    uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id
      AND role IN ('admin', 'logistica')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para registrar transferência de propriedade');
  END IF;

  IF p_quantidade IS NULL OR p_quantidade <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quantidade inválida');
  END IF;

  IF p_cliente_id IS NULL AND (p_cliente_cnpj_texto IS NULL OR p_cliente_razao_social_texto IS NULL) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Informe um cliente cadastrado ou CNPJ/CPF + Razão Social');
  END IF;

  -- Lock e carrega estoque atual (se não existir linha, trata como 0 disponível)
  SELECT * INTO v_estoque
  FROM estoque
  WHERE produto_id = p_produto_id
    AND armazem_id = p_armazem_id
  FOR UPDATE;

  IF NOT FOUND OR v_estoque.quantidade_disponivel < p_quantidade THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Estoque disponível insuficiente. Disponível: %s, Necessário: %s', COALESCE(v_estoque.quantidade_disponivel, 0), p_quantidade)
    );
  END IF;

  UPDATE estoque
  SET quantidade = quantidade - p_quantidade,
      quantidade_disponivel = quantidade_disponivel - p_quantidade,
      updated_at = now(),
      updated_by = p_user_id
  WHERE produto_id = p_produto_id
    AND armazem_id = p_armazem_id;

  INSERT INTO estoque_transferencias (
    produto_id, armazem_id, quantidade,
    cliente_id, cliente_cnpj_texto, cliente_razao_social_texto,
    numero_pedido, data_transferencia, url_nota, url_xml,
    created_by
  ) VALUES (
    p_produto_id, p_armazem_id, p_quantidade,
    p_cliente_id, p_cliente_cnpj_texto, p_cliente_razao_social_texto,
    p_numero_pedido, COALESCE(p_data_transferencia, CURRENT_DATE), p_url_nota, p_url_xml,
    p_user_id
  )
  RETURNING id INTO v_transferencia_id;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_transferencia_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================
-- 2. calcular_cancelamento_transferencia: preview read-only pro dialog de estorno
-- ============================================================
CREATE OR REPLACE FUNCTION calcular_cancelamento_transferencia(
  p_transferencia_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_transf estoque_transferencias%ROWTYPE;
BEGIN
  SELECT * INTO v_transf FROM estoque_transferencias WHERE id = p_transferencia_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transferência não encontrada');
  END IF;

  RETURN jsonb_build_object(
    'success',        true,
    'pode_cancelar',  v_transf.status = 'ativa',
    'motivo_bloqueio', CASE WHEN v_transf.status != 'ativa'
                             THEN 'Esta transferência já está cancelada'
                             ELSE NULL END,
    'quantidade',     v_transf.quantidade,
    'produto_id',     v_transf.produto_id,
    'armazem_id',     v_transf.armazem_id
  );
END;
$$;

-- ============================================================
-- 3. cancelar_transferencia_propriedade: estorna quantidade + quantidade_disponivel
-- ============================================================
CREATE OR REPLACE FUNCTION cancelar_transferencia_propriedade(
  p_transferencia_id uuid,
  p_user_id          uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_transf estoque_transferencias%ROWTYPE;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id
      AND role IN ('admin', 'logistica')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para cancelar transferência de propriedade');
  END IF;

  SELECT * INTO v_transf FROM estoque_transferencias WHERE id = p_transferencia_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transferência não encontrada');
  END IF;
  IF v_transf.status != 'ativa' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta transferência já está cancelada');
  END IF;

  UPDATE estoque
  SET quantidade = quantidade + v_transf.quantidade,
      quantidade_disponivel = quantidade_disponivel + v_transf.quantidade,
      updated_at = now(),
      updated_by = p_user_id
  WHERE produto_id = v_transf.produto_id
    AND armazem_id = v_transf.armazem_id;

  UPDATE estoque_transferencias
  SET status        = 'cancelada',
      cancelado_por = p_user_id,
      cancelado_em  = now(),
      updated_at    = now()
  WHERE id = p_transferencia_id;

  RETURN jsonb_build_object(
    'success',              true,
    'quantidade_devolvida', v_transf.quantidade
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
