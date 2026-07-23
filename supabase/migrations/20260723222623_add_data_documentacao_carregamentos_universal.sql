-- Adiciona data_documentacao ao retorno de get_carregamentos_universal.
-- Sem essa coluna, a página Carregamentos não tinha como saber QUANDO um
-- carregamento foi de fato finalizado (só sabia o status "Finalizado" via
-- etapa_atual = 6) — o deep-link do dashboard "Finalizados Hoje" não
-- conseguia filtrar por data real de finalização, só por status. Nenhuma
-- mudança de regra de segurança: mesma lógica de acesso por role, só um
-- campo a mais no SELECT.
--
-- Precisa de DROP antes: Postgres não permite CREATE OR REPLACE mudar as
-- colunas de retorno de uma function com RETURNS TABLE.
DROP FUNCTION IF EXISTS "public"."get_carregamentos_universal"("text", "uuid", "uuid", "uuid", "uuid");

CREATE OR REPLACE FUNCTION "public"."get_carregamentos_universal"("p_user_role" "text" DEFAULT NULL::"text", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_cliente_id" "uuid" DEFAULT NULL::"uuid", "p_armazem_id" "uuid" DEFAULT NULL::"uuid", "p_representante_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "etapa_atual" smallint, "numero_nf" "text", "data_chegada" timestamp with time zone, "data_documentacao" timestamp with time zone, "created_at" timestamp with time zone, "cliente_id" "uuid", "armazem_id" "uuid", "url_foto_chegada" "text", "url_foto_inicio" "text", "url_foto_carregando" "text", "url_foto_finalizacao" "text", "agendamento_id" "uuid", "data_retirada" "date", "quantidade" numeric, "placa_caminhao" "text", "motorista_nome" "text", "motorista_documento" "text", "pedido_interno" "text", "cliente_nome" "text", "produto_nome" "text", "armazem_nome" "text", "armazem_cidade" "text", "armazem_estado" "text", "fotos_total" integer, "status_carregamento" "text", "cor_carregamento" "text", "tooltip_carregamento" "text", "percentual_carregamento" integer, "finalizado" boolean, "transportadora" "text")
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
        c.id,
        c.etapa_atual,
        c.numero_nf,
        c.data_chegada,
        c.data_documentacao,
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

-- DROP FUNCTION remove os grants existentes — precisa reconceder (mesmos
-- grants da migration original, baseline_schema.sql).
GRANT ALL ON FUNCTION "public"."get_carregamentos_universal"("p_user_role" "text", "p_user_id" "uuid", "p_cliente_id" "uuid", "p_armazem_id" "uuid", "p_representante_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_carregamentos_universal"("p_user_role" "text", "p_user_id" "uuid", "p_cliente_id" "uuid", "p_armazem_id" "uuid", "p_representante_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_carregamentos_universal"("p_user_role" "text", "p_user_id" "uuid", "p_cliente_id" "uuid", "p_armazem_id" "uuid", "p_representante_id" "uuid") TO "service_role";
