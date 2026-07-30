-- Migration: expor cancelado_em nas RPCs universais de Agendamentos e Liberações
-- Necessário para exibir "Cancelado em DD/MM/AAAA" nos cards/detalhes de itens
-- cancelados, no lugar de dados de carregamento/agendamento que perdem o sentido
-- depois do cancelamento (etapa de carregamento, saldo, etc.)
--
-- CREATE OR REPLACE FUNCTION não permite adicionar coluna ao RETURNS TABLE de uma
-- função existente — precisa DROP + CREATE.

DROP FUNCTION IF EXISTS get_agendamentos_universal(text, uuid, uuid, uuid, uuid);

CREATE FUNCTION get_agendamentos_universal(
  p_user_role text,
  p_user_id uuid DEFAULT NULL,
  p_cliente_id uuid DEFAULT NULL,
  p_armazem_id uuid DEFAULT NULL,
  p_representante_id uuid DEFAULT NULL
) RETURNS TABLE(
  id uuid,
  liberacao_id uuid,
  data_retirada date,
  quantidade numeric,
  motorista_nome text,
  motorista_documento text,
  placa_caminhao text,
  placa_carreta_1 text,
  placa_carreta_2 text,
  transportadora text,
  cnpj_transportadora text,
  status agendamento_status,
  observacoes text,
  created_by uuid,
  created_at timestamptz,
  cliente_id uuid,
  updated_at timestamptz,
  armazem_id uuid,
  cancelado_em timestamptz,
  pedido_interno text,
  quantidade_liberada numeric,
  quantidade_retirada numeric,
  data_liberacao date,
  status_liberacao liberacao_status,
  cliente_nome text,
  cliente_cnpj_cpf text,
  produto_id uuid,
  produto_nome text,
  produto_unidade text,
  armazem_nome text,
  armazem_cidade text,
  armazem_estado text,
  carregamento_id uuid,
  etapa_atual smallint,
  status_carregamento text,
  percentual_carregamento integer,
  tooltip_carregamento text,
  finalizado boolean
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.liberacao_id,
        a.data_retirada,
        a.quantidade,
        a.motorista_nome,
        a.motorista_documento,
        a.placa_caminhao,
        a.placa_carreta_1,
        a.placa_carreta_2,
        a.transportadora,
        a.cnpj_transportadora,
        a.status,
        a.observacoes,
        a.created_by,
        a.created_at,
        a.cliente_id,
        a.updated_at,
        a.armazem_id,
        a.cancelado_em,

        l.pedido_interno,
        l.quantidade_liberada,
        l.quantidade_retirada,
        l.data_liberacao,
        l.status as status_liberacao,

        c.nome as cliente_nome,
        c.cnpj_cpf as cliente_cnpj_cpf,

        p.id as produto_id,
        p.nome as produto_nome,
        p.unidade as produto_unidade,

        ar.nome as armazem_nome,
        ar.cidade as armazem_cidade,
        ar.estado as armazem_estado,

        ca.id as carregamento_id,
        COALESCE(ca.etapa_atual, 1::smallint) as etapa_atual,

        CASE
            WHEN COALESCE(ca.etapa_atual, 1) = 1 THEN 'Aguardando'
            WHEN COALESCE(ca.etapa_atual, 1) BETWEEN 2 AND 5 THEN 'Em Andamento'
            ELSE 'Finalizado'
        END as status_carregamento,

        CASE
            WHEN COALESCE(ca.etapa_atual, 1) = 1 THEN 0
            WHEN COALESCE(ca.etapa_atual, 1) BETWEEN 2 AND 5 THEN
                ROUND(((COALESCE(ca.etapa_atual, 1) - 1) / 5.0) * 100)::integer
            ELSE 100
        END as percentual_carregamento,

        CASE
            WHEN COALESCE(ca.etapa_atual, 1) = 1 THEN 'Aguardando chegada do veículo'
            WHEN COALESCE(ca.etapa_atual, 1) = 2 THEN 'Carregamento do caminhão iniciado'
            WHEN COALESCE(ca.etapa_atual, 1) = 3 THEN 'Carregando o caminhão'
            WHEN COALESCE(ca.etapa_atual, 1) = 4 THEN 'Carregamento do caminhão finalizado'
            WHEN COALESCE(ca.etapa_atual, 1) = 5 THEN 'Anexando documentação'
            ELSE 'Documentação anexada e processo concluído'
        END as tooltip_carregamento,

        (a.status = 'concluido') as finalizado

    FROM agendamentos a
    INNER JOIN liberacoes l ON a.liberacao_id = l.id
    INNER JOIN clientes c ON l.cliente_id = c.id
    INNER JOIN produtos p ON l.produto_id = p.id
    INNER JOIN armazens ar ON a.armazem_id = ar.id
    LEFT JOIN carregamentos ca ON a.id = ca.agendamento_id
    WHERE
        CASE
            WHEN p_user_role = 'representante' THEN
                c.representante_id = p_representante_id
            WHEN p_user_role = 'cliente' THEN
                a.cliente_id = p_cliente_id
            WHEN p_user_role = 'armazem' THEN
                a.armazem_id = p_armazem_id
            ELSE TRUE
        END
    ORDER BY a.created_at DESC;
END;
$$;

DROP FUNCTION IF EXISTS get_liberacoes_universal(text, uuid, uuid, uuid, uuid);

CREATE FUNCTION get_liberacoes_universal(
  p_user_role text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_cliente_id uuid DEFAULT NULL,
  p_armazem_id uuid DEFAULT NULL,
  p_representante_id uuid DEFAULT NULL
) RETURNS TABLE(
  id uuid,
  pedido_interno text,
  quantidade_liberada numeric,
  quantidade_retirada numeric,
  quantidade_agendada numeric,
  quantidade_disponivel numeric,
  percentual_retirado integer,
  percentual_agendado integer,
  finalizada boolean,
  data_liberacao date,
  status liberacao_status,
  cliente_id uuid,
  produto_id uuid,
  armazem_id uuid,
  created_at timestamptz,
  cancelado_em timestamptz,
  cliente_nome text,
  cliente_cnpj_cpf text,
  produto_nome text,
  produto_unidade text,
  armazem_nome text,
  armazem_cidade text,
  armazem_estado text,
  armazem_endereco text
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
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
        l.cancelado_em,
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
             l.cancelado_em, c.nome, c.cnpj_cpf, p.nome, p.unidade, ar.nome, ar.cidade, ar.estado, ar.endereco
    ORDER BY l.data_liberacao DESC;
END;
$$;
