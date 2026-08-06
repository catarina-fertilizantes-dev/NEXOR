-- CRÍTICO: get_liberacoes_universal, get_agendamentos_universal,
-- get_carregamentos_universal e get_carregamento_detalhe_universal são
-- SECURITY DEFINER (bypassam RLS) e confiavam inteiramente em parâmetros
-- enviados pelo próprio cliente (p_user_role/p_cliente_id/p_armazem_id/
-- p_representante_id) para decidir o que mostrar — qualquer chamador podia
-- passar p_user_role=null (cai no ELSE TRUE) e ver TODAS as liberações/
-- agendamentos/carregamentos do sistema, com nome/CNPJ de cliente incluído,
-- sem nem precisar estar logado (GRANT padrão do Supabase para anon).
--
-- Corrigido derivando role/vínculo de auth.uid() internamente, no mesmo
-- padrão já usado corretamente nas RLS policies das tabelas (agendamentos,
-- carregamentos, liberacoes, clientes) — incluindo o caso de representante
-- com múltiplos clientes. Assinatura, colunas retornadas e toda a lógica de
-- negócio (cálculos de percentual, tooltip, cor, etc.) permanecem IDÊNTICAS
-- — os parâmetros continuam existindo (frontend não muda nada), só deixam
-- de ser usados para autorização.
--
-- get_liberacoes_universal parte da versão de 20260710134911 (sessão de UX
-- concorrente) — preserva quantidade_agendada somando só
-- pendente/em_andamento (exclui concluido), ver memória
-- project-nexor-rls-security-audit.

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
    SELECT id INTO v_cliente_id FROM clientes WHERE user_id = auth.uid();
    SELECT id INTO v_armazem_id FROM armazens WHERE user_id = auth.uid();
    SELECT id INTO v_representante_id FROM representantes WHERE user_id = auth.uid();

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
        (l.quantidade_retirada >= l.quantidade_liberada) as finalizada,
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


CREATE OR REPLACE FUNCTION "public"."get_agendamentos_universal"("p_user_role" "text", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_cliente_id" "uuid" DEFAULT NULL::"uuid", "p_armazem_id" "uuid" DEFAULT NULL::"uuid", "p_representante_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "liberacao_id" "uuid", "data_retirada" "date", "quantidade" numeric, "motorista_nome" "text", "motorista_documento" "text", "placa_caminhao" "text", "placa_carreta_1" "text", "placa_carreta_2" "text", "transportadora" "text", "cnpj_transportadora" "text", "status" "public"."agendamento_status", "observacoes" "text", "created_by" "uuid", "created_at" timestamp with time zone, "cliente_id" "uuid", "updated_at" timestamp with time zone, "armazem_id" "uuid", "pedido_interno" "text", "quantidade_liberada" numeric, "quantidade_retirada" numeric, "data_liberacao" "date", "status_liberacao" "public"."liberacao_status", "cliente_nome" "text", "cliente_cnpj_cpf" "text", "produto_id" "uuid", "produto_nome" "text", "produto_unidade" "text", "armazem_nome" "text", "armazem_cidade" "text", "armazem_estado" "text", "carregamento_id" "uuid", "etapa_atual" smallint, "status_carregamento" "text", "percentual_carregamento" integer, "tooltip_carregamento" "text", "finalizado" boolean)
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
    SELECT id INTO v_cliente_id FROM clientes WHERE user_id = auth.uid();
    SELECT id INTO v_armazem_id FROM armazens WHERE user_id = auth.uid();
    SELECT id INTO v_representante_id FROM representantes WHERE user_id = auth.uid();

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
        v_is_admin_logistica
        OR (v_cliente_id IS NOT NULL AND a.cliente_id = v_cliente_id)
        OR (v_armazem_id IS NOT NULL AND a.armazem_id = v_armazem_id)
        OR (v_representante_id IS NOT NULL AND c.representante_id = v_representante_id)
    ORDER BY a.created_at DESC;
END;
$$;


CREATE OR REPLACE FUNCTION "public"."get_carregamentos_universal"("p_user_role" "text" DEFAULT NULL::"text", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_cliente_id" "uuid" DEFAULT NULL::"uuid", "p_armazem_id" "uuid" DEFAULT NULL::"uuid", "p_representante_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "etapa_atual" smallint, "numero_nf" "text", "data_chegada" timestamp with time zone, "created_at" timestamp with time zone, "cliente_id" "uuid", "armazem_id" "uuid", "url_foto_chegada" "text", "url_foto_inicio" "text", "url_foto_carregando" "text", "url_foto_finalizacao" "text", "agendamento_id" "uuid", "data_retirada" "date", "quantidade" numeric, "placa_caminhao" "text", "motorista_nome" "text", "motorista_documento" "text", "pedido_interno" "text", "cliente_nome" "text", "produto_nome" "text", "armazem_nome" "text", "armazem_cidade" "text", "armazem_estado" "text", "fotos_total" integer, "status_carregamento" "text", "cor_carregamento" "text", "tooltip_carregamento" "text", "percentual_carregamento" integer, "finalizado" boolean, "transportadora" "text")
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
    SELECT id INTO v_cliente_id FROM clientes WHERE user_id = auth.uid();
    SELECT id INTO v_armazem_id FROM armazens WHERE user_id = auth.uid();
    SELECT id INTO v_representante_id FROM representantes WHERE user_id = auth.uid();

    RETURN QUERY
    SELECT
        c.id,
        c.etapa_atual,
        c.numero_nf,
        c.data_chegada,
        c.created_at,
        c.cliente_id,
        c.armazem_id,
        c.url_foto_chegada,
        c.url_foto_inicio,
        c.url_foto_carregando,
        c.url_foto_finalizacao,

        a.id as agendamento_id,
        a.data_retirada,
        a.quantidade,
        a.placa_caminhao,
        a.motorista_nome,
        a.motorista_documento,

        l.pedido_interno,

        cl.nome as cliente_nome,

        p.nome as produto_nome,

        ar.nome as armazem_nome,
        ar.cidade as armazem_cidade,
        ar.estado as armazem_estado,

        (
            CASE WHEN c.url_foto_chegada IS NOT NULL AND c.url_foto_chegada != '' THEN 1 ELSE 0 END +
            CASE WHEN c.url_foto_inicio IS NOT NULL AND c.url_foto_inicio != '' THEN 1 ELSE 0 END +
            CASE WHEN c.url_foto_carregando IS NOT NULL AND c.url_foto_carregando != '' THEN 1 ELSE 0 END +
            CASE WHEN c.url_foto_finalizacao IS NOT NULL AND c.url_foto_finalizacao != '' THEN 1 ELSE 0 END
        )::integer as fotos_total,

        CASE
            WHEN c.etapa_atual = 1 THEN 'Aguardando'
            WHEN c.etapa_atual BETWEEN 2 AND 5 THEN 'Em Andamento'
            ELSE 'Finalizado'
        END as status_carregamento,

        CASE
            WHEN c.etapa_atual = 1 THEN 'bg-yellow-100 text-yellow-800'
            WHEN c.etapa_atual BETWEEN 2 AND 5 THEN 'bg-blue-100 text-blue-800'
            ELSE 'bg-green-100 text-green-800'
        END as cor_carregamento,

        CASE
            WHEN c.etapa_atual = 1 THEN 'Aguardando chegada do veículo'
            WHEN c.etapa_atual = 2 THEN 'Carregamento do caminhão iniciado'
            WHEN c.etapa_atual = 3 THEN 'Carregando o caminhão'
            WHEN c.etapa_atual = 4 THEN 'Carregamento do caminhão finalizado'
            WHEN c.etapa_atual = 5 THEN 'Anexando documentação'
            ELSE 'Documentação anexada e processo concluído'
        END as tooltip_carregamento,

        CASE
            WHEN c.etapa_atual = 1 THEN 0
            WHEN c.etapa_atual BETWEEN 2 AND 5 THEN
                ROUND(((c.etapa_atual - 1) / 5.0) * 100)::integer
            ELSE 100
        END as percentual_carregamento,

        (c.etapa_atual = 6) as finalizado,

        a.transportadora

    FROM carregamentos c
    INNER JOIN agendamentos a ON c.agendamento_id = a.id
    INNER JOIN liberacoes l ON a.liberacao_id = l.id
    INNER JOIN clientes cl ON l.cliente_id = cl.id
    INNER JOIN produtos p ON l.produto_id = p.id
    INNER JOIN armazens ar ON c.armazem_id = ar.id
    WHERE
        v_is_admin_logistica
        OR (v_cliente_id IS NOT NULL AND c.cliente_id = v_cliente_id)
        OR (v_armazem_id IS NOT NULL AND c.armazem_id = v_armazem_id)
        OR (v_representante_id IS NOT NULL AND cl.representante_id = v_representante_id)
    ORDER BY c.created_at DESC;
END;
$$;


CREATE OR REPLACE FUNCTION "public"."get_carregamento_detalhe_universal"("p_carregamento_id" "uuid", "p_user_role" "text", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_cliente_id" "uuid" DEFAULT NULL::"uuid", "p_armazem_id" "uuid" DEFAULT NULL::"uuid", "p_representante_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "etapa_atual" smallint, "numero_nf" "text", "data_chegada" timestamp with time zone, "created_at" timestamp with time zone, "cliente_id" "uuid", "armazem_id" "uuid", "observacao_chegada" "text", "observacao_inicio" "text", "observacao_carregando" "text", "observacao_finalizacao" "text", "observacao_documentacao" "text", "data_inicio" timestamp with time zone, "data_carregando" timestamp with time zone, "data_finalizacao" timestamp with time zone, "data_documentacao" timestamp with time zone, "docs_retorno_url" "text", "docs_retorno_xml_url" "text", "docs_venda_url" "text", "docs_venda_xml_url" "text", "docs_remessa_url" "text", "docs_remessa_xml_url" "text", "etapa_5a_status" character varying, "etapa_5b_status" character varying, "etapa_5c_status" character varying, "url_foto_chegada" "text", "url_foto_inicio" "text", "url_foto_carregando" "text", "url_foto_finalizacao" "text", "agendamento_id" "uuid", "agendamento_data_retirada" "date", "agendamento_quantidade" numeric, "agendamento_placa_caminhao" "text", "agendamento_placa_carreta_1" "text", "agendamento_placa_carreta_2" "text", "agendamento_transportadora" "text", "agendamento_cnpj_transportadora" "text", "agendamento_motorista_nome" "text", "agendamento_motorista_documento" "text", "cliente_nome" "text", "liberacao_pedido_interno" "text", "produto_nome" "text")
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
    SELECT id INTO v_cliente_id FROM clientes WHERE user_id = auth.uid();
    SELECT id INTO v_armazem_id FROM armazens WHERE user_id = auth.uid();
    SELECT id INTO v_representante_id FROM representantes WHERE user_id = auth.uid();

    RETURN QUERY
    SELECT
        c.id,
        c.etapa_atual,
        c.numero_nf,
        c.data_chegada,
        c.created_at,
        c.cliente_id,
        c.armazem_id,
        c.observacao_chegada,
        c.observacao_inicio,
        c.observacao_carregando,
        c.observacao_finalizacao,
        c.observacao_documentacao,
        c.data_inicio,
        c.data_carregando,
        c.data_finalizacao,
        c.data_documentacao,
        c.docs_retorno_url,
        c.docs_retorno_xml_url,
        c.docs_venda_url,
        c.docs_venda_xml_url,
        c.docs_remessa_url,
        c.docs_remessa_xml_url,
        COALESCE(c.etapa_5a_status, 'pendente'::character varying) as etapa_5a_status,
        COALESCE(c.etapa_5b_status, 'pendente'::character varying) as etapa_5b_status,
        COALESCE(c.etapa_5c_status, 'pendente'::character varying) as etapa_5c_status,
        c.url_foto_chegada,
        c.url_foto_inicio,
        c.url_foto_carregando,
        c.url_foto_finalizacao,

        a.id as agendamento_id,
        a.data_retirada as agendamento_data_retirada,
        a.quantidade as agendamento_quantidade,
        a.placa_caminhao as agendamento_placa_caminhao,
        a.placa_carreta_1 as agendamento_placa_carreta_1,
        a.placa_carreta_2 as agendamento_placa_carreta_2,
        a.transportadora as agendamento_transportadora,
        a.cnpj_transportadora as agendamento_cnpj_transportadora,
        a.motorista_nome as agendamento_motorista_nome,
        a.motorista_documento as agendamento_motorista_documento,

        cl.nome as cliente_nome,
        l.pedido_interno as liberacao_pedido_interno,
        p.nome as produto_nome

    FROM carregamentos c
    INNER JOIN agendamentos a ON c.agendamento_id = a.id
    INNER JOIN liberacoes l ON a.liberacao_id = l.id
    INNER JOIN clientes cl ON l.cliente_id = cl.id
    INNER JOIN produtos p ON l.produto_id = p.id
    WHERE c.id = p_carregamento_id
    AND (
        v_is_admin_logistica
        OR (v_cliente_id IS NOT NULL AND c.cliente_id = v_cliente_id)
        OR (v_armazem_id IS NOT NULL AND c.armazem_id = v_armazem_id)
        OR (v_representante_id IS NOT NULL AND cl.representante_id = v_representante_id)
    );
END;
$$;


-- get_liberacoes_disponiveis_universal não é chamada por nenhum código em
-- src/ (confirmado via grep, só aparecia no types.ts gerado) — dead code com
-- o mesmo problema (ELSE TRUE confiando em parâmetro do cliente). Removida.
DROP FUNCTION IF EXISTS "public"."get_liberacoes_disponiveis_universal"("text", "uuid", "uuid", "uuid");
