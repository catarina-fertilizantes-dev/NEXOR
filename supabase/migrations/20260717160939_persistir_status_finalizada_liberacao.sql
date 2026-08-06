-- Migration: persistir status='finalizada' no banco
--
-- Até agora 'finalizada' existia no enum liberacao_status mas nunca era
-- gravado — era só um booleano calculado na tela (quantidade_retirada >=
-- quantidade_liberada) e replicado de forma independente dentro de
-- get_liberacoes_universal. Isso deixava sem efeito as checagens
-- "IF status = 'finalizada'" já existentes em cancelar_liberacao e
-- alterar_quantidade_liberacao — o bloqueio de editar/cancelar uma
-- liberação finalizada só existia na tela, nunca no banco.
--
-- 1. sync_liberacao_quantidade_retirada (dispara quando um carregamento
--    chega na etapa 6) passa a também marcar a liberação como 'finalizada'
--    quando quantidade_retirada atinge quantidade_liberada.
-- 2. alterar_quantidade_liberacao passa a poder finalizar diretamente
--    (caso de reduzir o total para o que já foi retirado, sem que nenhum
--    carregamento tenha acabado de finalizar agora).
-- 3. Backfill único das liberações que já estão nesse estado hoje.
-- 4. get_liberacoes_universal passa a ler o status em vez de recalcular.

-- ============================================================
-- 1. sync_liberacao_quantidade_retirada: também finaliza a liberação
-- ============================================================
CREATE OR REPLACE FUNCTION "public"."sync_liberacao_quantidade_retirada"() RETURNS "trigger"
    LANGUAGE "plpgsql"
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
-- 2. alterar_quantidade_liberacao: também pode finalizar diretamente
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

  SELECT * INTO v_lib FROM liberacoes WHERE id = p_liberacao_id FOR UPDATE;

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

  IF p_nova_quantidade < v_piso THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Nova quantidade (%s) não pode ser menor que a quantidade já comprometida/agendada (%s)', p_nova_quantidade, v_piso)
    );
  END IF;

  v_delta := p_nova_quantidade - v_lib.quantidade_liberada;

  IF v_delta > 0 THEN
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
    UPDATE estoque
    SET quantidade_disponivel = quantidade_disponivel + abs(v_delta),
        updated_at = now(),
        updated_by = p_user_id
    WHERE produto_id = v_lib.produto_id
      AND armazem_id = v_lib.armazem_id;
  END IF;

  -- Se o novo total já foi inteiramente retirado e não há mais nenhum
  -- carregamento em andamento, a liberação finaliza imediatamente
  -- (ex.: reduzir o total para o valor já retirado). Senão, mesma lógica
  -- de sync_liberacao_agendamento_status baseada em quanto está agendado.
  IF v_lib.quantidade_retirada >= p_nova_quantidade AND v_qty_em_andamento = 0 THEN
    v_novo_status := 'finalizada';
  ELSIF v_qty_agendada_ativa = 0 THEN
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
-- 3. Backfill único: corrige liberações já 100% retiradas hoje
-- ============================================================
UPDATE liberacoes
SET status = 'finalizada'
WHERE quantidade_retirada >= quantidade_liberada
  AND quantidade_liberada > 0
  AND status NOT IN ('cancelada', 'finalizada');

-- ============================================================
-- 4. get_liberacoes_universal: usar o status gravado em vez de recalcular
-- ============================================================
CREATE OR REPLACE FUNCTION "public"."get_liberacoes_universal"("p_user_role" "text" DEFAULT NULL::"text", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_cliente_id" "uuid" DEFAULT NULL::"uuid", "p_armazem_id" "uuid" DEFAULT NULL::"uuid", "p_representante_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "pedido_interno" "text", "quantidade_liberada" numeric, "quantidade_retirada" numeric, "quantidade_agendada" numeric, "quantidade_disponivel" numeric, "percentual_retirado" integer, "percentual_agendado" integer, "finalizada" boolean, "data_liberacao" "date", "status" "public"."liberacao_status", "cliente_id" "uuid", "produto_id" "uuid", "armazem_id" "uuid", "created_at" timestamp with time zone, "cliente_nome" "text", "cliente_cnpj_cpf" "text", "produto_nome" "text", "produto_unidade" "text", "armazem_nome" "text", "armazem_cidade" "text", "armazem_estado" "text", "armazem_endereco" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_is_admin_logistica boolean;
    v_cliente_id uuid;
    v_armazem_id uuid;
    v_representante_id uuid;
BEGIN
    v_is_admin_logistica := EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'logistica'));
    SELECT cl2.id INTO v_cliente_id FROM clientes cl2 WHERE cl2.user_id = auth.uid();
    SELECT am2.id INTO v_armazem_id FROM armazens am2 WHERE am2.user_id = auth.uid();
    SELECT rp2.id INTO v_representante_id FROM representantes rp2 WHERE rp2.user_id = auth.uid();

    RETURN QUERY
    SELECT
        l.id,
        l.pedido_interno,
        l.quantidade_liberada,
        l.quantidade_retirada,
        COALESCE(SUM(CASE WHEN a.status IN ('pendente', 'em_andamento') THEN a.quantidade ELSE 0 END), 0) as quantidade_agendada,
        get_quantidade_disponivel_liberacao(l.id) as quantidade_disponivel,
        CASE
            WHEN l.quantidade_liberada > 0 THEN
                ROUND((l.quantidade_retirada / l.quantidade_liberada) * 100)::integer
            ELSE 0
        END as percentual_retirado,
        CASE
            WHEN l.quantidade_liberada > 0 THEN
                ROUND((COALESCE(SUM(CASE WHEN a.status IN ('pendente', 'em_andamento') THEN a.quantidade ELSE 0 END), 0) / l.quantidade_liberada) * 100)::integer
            ELSE 0
        END as percentual_agendado,
        (l.status = 'finalizada') as finalizada,
        l.data_liberacao,
        l.status,
        l.cliente_id,
        l.produto_id,
        l.armazem_id,
        l.created_at,
        c.nome as cliente_nome,
        c.cnpj_cpf as cliente_cnpj_cpf,
        p.nome as produto_nome,
        p.unidade as produto_unidade,
        ar.nome as armazem_nome,
        ar.cidade as armazem_cidade,
        ar.estado as armazem_estado,
        ar.endereco as armazem_endereco
    FROM liberacoes l
    INNER JOIN clientes c ON l.cliente_id = c.id
    INNER JOIN produtos p ON l.produto_id = p.id
    INNER JOIN armazens ar ON l.armazem_id = ar.id
    LEFT JOIN agendamentos a ON a.liberacao_id = l.id
    WHERE
        v_is_admin_logistica
        OR (v_cliente_id IS NOT NULL AND l.cliente_id = v_cliente_id)
        OR (v_armazem_id IS NOT NULL AND l.armazem_id = v_armazem_id)
        OR (v_representante_id IS NOT NULL AND c.representante_id = v_representante_id)
    GROUP BY l.id, l.pedido_interno, l.quantidade_liberada, l.quantidade_retirada,
             l.data_liberacao, l.status, l.cliente_id, l.produto_id, l.armazem_id, l.created_at,
             c.nome, c.cnpj_cpf, p.nome, p.unidade, ar.nome, ar.cidade, ar.estado, ar.endereco
    ORDER BY l.data_liberacao DESC;
END;
$$;
