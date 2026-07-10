-- get_liberacoes_universal: "Agendada" deve refletir apenas o que está em aberto
-- (pendente + em_andamento). Antes somava também 'concluido', o que fazia a mesma
-- quantidade aparecer ao mesmo tempo em "Agendada" e em "Retirada" depois que o
-- carregamento finalizava (número "preso" reportado pelos usuários).
--
-- Com isso, o Saldo exibido na tela (quantidade_disponivel = Liberada - Retirada -
-- Agendada_ativa, já retornado por get_quantidade_disponivel_liberacao) passa a bater
-- com Liberada - (Agendada + Retirada) sem dupla contagem.
--
-- ATENÇÃO (coordenação entre sessões): a auditoria RLS planeja reescrever esta mesma
-- função para derivar os parâmetros de auth.uid(). Ao fazê-lo, PRESERVAR o filtro de
-- status abaixo (apenas 'pendente'/'em_andamento' em quantidade_agendada e
-- percentual_agendado). Ver memória project-nexor-rls-security-audit.

CREATE OR REPLACE FUNCTION "public"."get_liberacoes_universal"("p_user_role" "text" DEFAULT NULL::"text", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_cliente_id" "uuid" DEFAULT NULL::"uuid", "p_armazem_id" "uuid" DEFAULT NULL::"uuid", "p_representante_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "pedido_interno" "text", "quantidade_liberada" numeric, "quantidade_retirada" numeric, "quantidade_agendada" numeric, "quantidade_disponivel" numeric, "percentual_retirado" integer, "percentual_agendado" integer, "finalizada" boolean, "data_liberacao" "date", "status" "public"."liberacao_status", "cliente_id" "uuid", "produto_id" "uuid", "armazem_id" "uuid", "created_at" timestamp with time zone, "cliente_nome" "text", "cliente_cnpj_cpf" "text", "produto_nome" "text", "produto_unidade" "text", "armazem_nome" "text", "armazem_cidade" "text", "armazem_estado" "text", "armazem_endereco" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
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

        -- Dados relacionados
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
        CASE
            WHEN p_user_role = 'representante' THEN
                c.representante_id = p_representante_id
            WHEN p_user_role = 'cliente' THEN
                l.cliente_id = p_cliente_id
            WHEN p_user_role = 'armazem' THEN
                l.armazem_id = p_armazem_id
            ELSE TRUE
        END
    GROUP BY l.id, l.pedido_interno, l.quantidade_liberada, l.quantidade_retirada,
             l.data_liberacao, l.status, l.cliente_id, l.produto_id, l.armazem_id, l.created_at,
             c.nome, c.cnpj_cpf, p.nome, p.unidade, ar.nome, ar.cidade, ar.estado, ar.endereco
    ORDER BY l.data_liberacao DESC;
END;
$$;
