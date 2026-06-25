


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."agendamento_status" AS ENUM (
    'pendente',
    'em_andamento',
    'concluido',
    'cancelado'
);


ALTER TYPE "public"."agendamento_status" OWNER TO "postgres";


CREATE TYPE "public"."liberacao_status" AS ENUM (
    'disponivel',
    'parcialmente_agendada',
    'totalmente_agendada',
    'finalizada'
);


ALTER TYPE "public"."liberacao_status" OWNER TO "postgres";


CREATE TYPE "public"."status_carregamento" AS ENUM (
    'aguardando',
    'liberado',
    'carregando',
    'carregado',
    'nf_entregue'
);


ALTER TYPE "public"."status_carregamento" OWNER TO "postgres";


CREATE TYPE "public"."tipo_documento_carregamento" AS ENUM (
    'nf',
    'xml',
    'cte',
    'outro'
);


ALTER TYPE "public"."tipo_documento_carregamento" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'logistica',
    'armazem',
    'cliente',
    'representante'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


COMMENT ON TYPE "public"."user_role" IS 'Roles ativas: admin, logistica, armazem, cliente. Role comercial removida em 2025-11-24.';



CREATE OR REPLACE FUNCTION "public"."alterar_armazem_liberacao"("p_liberacao_id" "uuid", "p_novo_armazem_id" "uuid", "p_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_liberacao RECORD;
  v_quantidade_disponivel NUMERIC;
  v_estoque_novo_armazem NUMERIC;
  v_armazem_novo RECORD;
  v_produto RECORD;
BEGIN
  -- 1. Buscar dados da liberação
  SELECT l.*, p.nome as produto_nome, a.nome as armazem_atual_nome
  INTO v_liberacao 
  FROM liberacoes l
  JOIN produtos p ON l.produto_id = p.id
  JOIN armazens a ON l.armazem_id = a.id
  WHERE l.id = p_liberacao_id 
  AND l.status IN ('disponivel', 'parcialmente_agendada');
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Liberação não encontrada ou já finalizada');
  END IF;
  
  -- 2. Verificar se o novo armazém existe e está ativo
  SELECT * INTO v_armazem_novo 
  FROM armazens 
  WHERE id = p_novo_armazem_id AND ativo = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Armazém não encontrado ou inativo');
  END IF;
  
  -- 3. Verificar se não é o mesmo armazém
  IF v_liberacao.armazem_id = p_novo_armazem_id THEN
    RETURN json_build_object('success', false, 'error', 'O armazém selecionado é o mesmo atual');
  END IF;
  
  -- 4. Calcular quantidade disponível (ainda não agendada)
  v_quantidade_disponivel := get_quantidade_disponivel_liberacao(p_liberacao_id);
  
  -- 5. Verificar estoque no novo armazém
  SELECT COALESCE(quantidade, 0) INTO v_estoque_novo_armazem
  FROM estoque 
  WHERE produto_id = v_liberacao.produto_id 
  AND armazem_id = p_novo_armazem_id;
  
  -- 6. Validar se há estoque suficiente
  IF v_estoque_novo_armazem < v_quantidade_disponivel THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Estoque insuficiente no novo armazém',
      'detalhes', json_build_object(
        'quantidade_necessaria', v_quantidade_disponivel,
        'estoque_disponivel', v_estoque_novo_armazem,
        'produto', v_liberacao.produto_nome,
        'armazem_novo', v_armazem_novo.nome || ' - ' || v_armazem_novo.cidade
      )
    );
  END IF;
  
  -- 7. Atualizar armazém da liberação
  UPDATE liberacoes 
  SET armazem_id = p_novo_armazem_id,
      updated_at = NOW()
  WHERE id = p_liberacao_id;
  
  RETURN json_build_object(
    'success', true, 
    'message', 'Armazém alterado com sucesso',
    'detalhes', json_build_object(
      'armazem_anterior', v_liberacao.armazem_atual_nome,
      'armazem_novo', v_armazem_novo.nome || ' - ' || v_armazem_novo.cidade,
      'quantidade_disponivel', v_quantidade_disponivel
    )
  );
END;
$$;


ALTER FUNCTION "public"."alterar_armazem_liberacao"("p_liberacao_id" "uuid", "p_novo_armazem_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_upload_documento_for_carregamento"("_user_id" "uuid", "_carregamento_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  tem_permissao boolean := false;
BEGIN
  -- Admin ou logistica podem sempre
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'logistica')
  ) INTO tem_permissao;
  IF tem_permissao THEN
    RETURN TRUE;
  END IF;

  -- Usuário armazem responsável pelo carregamento
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN armazens a ON ur.user_id = a.user_id AND ur.role = 'armazem'
    JOIN carregamentos c ON c.armazem_id = a.id AND c.id = _carregamento_id
    WHERE ur.user_id = _user_id
  ) INTO tem_permissao;
  IF tem_permissao THEN
    RETURN TRUE;
  END IF;

  -- Cliente responsável pelo carregamento (caso queira permitir upload pelo cliente - remova este bloco se NÃO quiser)
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN clientes cli ON ur.user_id = cli.user_id AND ur.role = 'cliente'
    JOIN carregamentos c ON c.cliente_id = cli.id AND c.id = _carregamento_id
    WHERE ur.user_id = _user_id
  ) INTO tem_permissao;
  IF tem_permissao THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."can_upload_documento_for_carregamento"("_user_id" "uuid", "_carregamento_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_upload_foto_for_carregamento"("_user_id" "uuid", "_carregamento_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  tem_permissao boolean := false;
BEGIN
  -- Admin ou logistica podem sempre
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'logistica')
  ) INTO tem_permissao;
  IF tem_permissao THEN
    RETURN TRUE;
  END IF;

  -- Usuário armazem responsável pelo carregamento
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN armazens a ON ur.user_id = a.user_id AND ur.role = 'armazem'
    JOIN carregamentos c ON c.armazem_id = a.id AND c.id = _carregamento_id
    WHERE ur.user_id = _user_id
  ) INTO tem_permissao;
  IF tem_permissao THEN
    RETURN TRUE;
  END IF;

  -- Cliente responsável pelo carregamento (caso queira permitir upload pelo cliente - remova este bloco se NÃO quiser)
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN clientes cli ON ur.user_id = cli.user_id AND ur.role = 'cliente'
    JOIN carregamentos c ON c.cliente_id = cli.id AND c.id = _carregamento_id
    WHERE ur.user_id = _user_id
  ) INTO tem_permissao;
  IF tem_permissao THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."can_upload_foto_for_carregamento"("_user_id" "uuid", "_carregamento_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_user_active_status"("user_uuid" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_role_result text;
    is_active boolean := false;
    result_json json;
BEGIN
    -- Buscar role do usuário
    SELECT role::text INTO user_role_result
    FROM user_roles 
    WHERE user_id = user_uuid 
    LIMIT 1;
    
    -- Se não tem role, considerar inativo
    IF user_role_result IS NULL THEN
        RETURN json_build_object(
            'active', false,
            'role', null,
            'message', 'Usuário sem role definido'
        );
    END IF;
    
    -- Verificar status ativo conforme role
    CASE user_role_result
        WHEN 'cliente' THEN
            SELECT ativo INTO is_active FROM clientes WHERE user_id = user_uuid;
        WHEN 'armazem' THEN
            SELECT ativo INTO is_active FROM armazens WHERE user_id = user_uuid;
        WHEN 'representante' THEN
            SELECT ativo INTO is_active FROM representantes WHERE user_id = user_uuid;
        WHEN 'admin', 'logistica' THEN
            is_active := true; -- Colaboradores sempre ativos
        ELSE
            is_active := false;
    END CASE;
    
    -- Retornar resultado
    RETURN json_build_object(
        'active', COALESCE(is_active, false),
        'role', user_role_result,
        'message', CASE 
            WHEN COALESCE(is_active, false) THEN 'Usuário ativo'
            ELSE 'Usuário inativo'
        END
    );
END;
$$;


ALTER FUNCTION "public"."check_user_active_status"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clear_user_temp_password"("user_email" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  _result json;
  _cleared_count integer := 0;
  _total_cleared integer := 0;
BEGIN
  -- Limpar temp_password em clientes
  UPDATE clientes 
  SET temp_password = NULL, updated_at = NOW()
  WHERE email = user_email AND temp_password IS NOT NULL;
  
  GET DIAGNOSTICS _cleared_count = ROW_COUNT;
  _total_cleared := _total_cleared + _cleared_count;
  
  -- Limpar temp_password em armazens
  UPDATE armazens 
  SET temp_password = NULL, updated_at = NOW()
  WHERE email = user_email AND temp_password IS NOT NULL;
  
  GET DIAGNOSTICS _cleared_count = ROW_COUNT;
  _total_cleared := _total_cleared + _cleared_count;
  
  -- 🆕 ADICIONAR LIMPEZA PARA REPRESENTANTES
  UPDATE representantes 
  SET temp_password = NULL, updated_at = NOW()
  WHERE email = user_email AND temp_password IS NOT NULL;
  
  GET DIAGNOSTICS _cleared_count = ROW_COUNT;
  _total_cleared := _total_cleared + _cleared_count;
  
  RETURN json_build_object(
    'success', true,
    'cleared_count', _total_cleared,
    'message', 'Temporary password cleared successfully for all user types'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;


ALTER FUNCTION "public"."clear_user_temp_password"("user_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_agendamentos_by_representante_backup"("p_representante_id" "uuid") RETURNS TABLE("id" "uuid", "liberacao_id" "uuid", "data_retirada" "date", "quantidade" numeric, "motorista_nome" "text", "motorista_documento" "text", "placa_caminhao" "text", "tipo_caminhao" "text", "status" "public"."agendamento_status", "observacoes" "text", "created_by" "uuid", "created_at" timestamp with time zone, "cliente_id" "uuid", "updated_at" timestamp with time zone, "armazem_id" "uuid", "pedido_interno" "text", "quantidade_liberada" numeric, "quantidade_retirada" numeric, "data_liberacao" "date", "status_liberacao" "public"."liberacao_status", "cliente_nome" "text", "cliente_cnpj_cpf" "text", "produto_id" "uuid", "produto_nome" "text", "produto_unidade" "text", "armazem_nome" "text", "armazem_cidade" "text", "armazem_estado" "text", "carregamento_id" "uuid", "etapa_atual" smallint)
    LANGUAGE "plpgsql" SECURITY DEFINER
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
    a.tipo_caminhao,
    a.status,
    a.observacoes,
    a.created_by,
    a.created_at,
    a.cliente_id,
    a.updated_at,
    a.armazem_id,
    -- Dados da liberação
    l.pedido_interno,
    l.quantidade_liberada,
    l.quantidade_retirada,
    l.data_liberacao,
    l.status as status_liberacao,
    -- Dados do cliente
    c.nome as cliente_nome,
    c.cnpj_cpf as cliente_cnpj_cpf,
    -- Dados do produto
    p.id as produto_id,
    p.nome as produto_nome,
    p.unidade as produto_unidade,
    -- Dados do armazém
    ar.nome as armazem_nome,
    ar.cidade as armazem_cidade,
    ar.estado as armazem_estado,
    -- Dados do carregamento
    ca.id as carregamento_id,
    ca.etapa_atual
  FROM agendamentos a
  INNER JOIN liberacoes l ON a.liberacao_id = l.id
  INNER JOIN clientes c ON l.cliente_id = c.id
  INNER JOIN produtos p ON l.produto_id = p.id
  INNER JOIN armazens ar ON l.armazem_id = ar.id
  LEFT JOIN carregamentos ca ON a.id = ca.agendamento_id
  WHERE c.representante_id = p_representante_id
  ORDER BY a.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_agendamentos_by_representante_backup"("p_representante_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_agendamentos_universal"("p_user_role" "text", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_cliente_id" "uuid" DEFAULT NULL::"uuid", "p_armazem_id" "uuid" DEFAULT NULL::"uuid", "p_representante_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "liberacao_id" "uuid", "data_retirada" "date", "quantidade" numeric, "motorista_nome" "text", "motorista_documento" "text", "placa_caminhao" "text", "placa_carreta_1" "text", "placa_carreta_2" "text", "transportadora" "text", "cnpj_transportadora" "text", "status" "public"."agendamento_status", "observacoes" "text", "created_by" "uuid", "created_at" timestamp with time zone, "cliente_id" "uuid", "updated_at" timestamp with time zone, "armazem_id" "uuid", "pedido_interno" "text", "quantidade_liberada" numeric, "quantidade_retirada" numeric, "data_liberacao" "date", "status_liberacao" "public"."liberacao_status", "cliente_nome" "text", "cliente_cnpj_cpf" "text", "produto_id" "uuid", "produto_nome" "text", "produto_unidade" "text", "armazem_nome" "text", "armazem_cidade" "text", "armazem_estado" "text", "carregamento_id" "uuid", "etapa_atual" smallint, "status_carregamento" "text", "percentual_carregamento" integer, "tooltip_carregamento" "text", "finalizado" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_agendamentos_universal"("p_user_role" "text", "p_user_id" "uuid", "p_cliente_id" "uuid", "p_armazem_id" "uuid", "p_representante_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_carregamento_detalhe_by_representante_backup"("p_representante_id" "uuid", "p_carregamento_id" "uuid") RETURNS TABLE("id" "uuid", "etapa_atual" smallint, "numero_nf" "text", "data_chegada" timestamp with time zone, "created_at" timestamp with time zone, "cliente_id" "uuid", "armazem_id" "uuid", "observacao_chegada" "text", "observacao_inicio" "text", "observacao_carregando" "text", "observacao_finalizacao" "text", "observacao_documentacao" "text", "data_inicio" timestamp with time zone, "data_carregando" timestamp with time zone, "data_finalizacao" timestamp with time zone, "data_documentacao" timestamp with time zone, "docs_retorno_url" "text", "docs_retorno_xml_url" "text", "url_foto_chegada" "text", "url_foto_inicio" "text", "url_foto_carregando" "text", "url_foto_finalizacao" "text", "agendamento_id" "uuid", "agendamento_data_retirada" timestamp with time zone, "agendamento_quantidade" numeric, "agendamento_placa_caminhao" "text", "agendamento_motorista_nome" "text", "agendamento_motorista_documento" "text", "liberacao_pedido_interno" "text", "cliente_nome" "text", "produto_nome" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
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
    c.url_foto_chegada,
    c.url_foto_inicio,
    c.url_foto_carregando,
    c.url_foto_finalizacao,
    a.id as agendamento_id,
    a.data_retirada as agendamento_data_retirada,
    a.quantidade as agendamento_quantidade,
    a.placa_caminhao as agendamento_placa_caminhao,
    a.motorista_nome as agendamento_motorista_nome,
    a.motorista_documento as agendamento_motorista_documento,
    l.pedido_interno as liberacao_pedido_interno,
    cl.nome as cliente_nome,
    p.nome as produto_nome
  FROM carregamentos c
  INNER JOIN agendamentos a ON c.agendamento_id = a.id
  INNER JOIN liberacoes l ON a.liberacao_id = l.id
  INNER JOIN clientes cl ON l.cliente_id = cl.id
  INNER JOIN produtos p ON l.produto_id = p.id
  WHERE cl.representante_id = p_representante_id
    AND c.id = p_carregamento_id;
END;
$$;


ALTER FUNCTION "public"."get_carregamento_detalhe_by_representante_backup"("p_representante_id" "uuid", "p_carregamento_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_carregamento_detalhe_universal"("p_carregamento_id" "uuid", "p_user_role" "text", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_cliente_id" "uuid" DEFAULT NULL::"uuid", "p_armazem_id" "uuid" DEFAULT NULL::"uuid", "p_representante_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "etapa_atual" smallint, "numero_nf" "text", "data_chegada" timestamp with time zone, "created_at" timestamp with time zone, "cliente_id" "uuid", "armazem_id" "uuid", "observacao_chegada" "text", "observacao_inicio" "text", "observacao_carregando" "text", "observacao_finalizacao" "text", "observacao_documentacao" "text", "data_inicio" timestamp with time zone, "data_carregando" timestamp with time zone, "data_finalizacao" timestamp with time zone, "data_documentacao" timestamp with time zone, "docs_retorno_url" "text", "docs_retorno_xml_url" "text", "docs_venda_url" "text", "docs_venda_xml_url" "text", "docs_remessa_url" "text", "docs_remessa_xml_url" "text", "etapa_5a_status" character varying, "etapa_5b_status" character varying, "etapa_5c_status" character varying, "url_foto_chegada" "text", "url_foto_inicio" "text", "url_foto_carregando" "text", "url_foto_finalizacao" "text", "agendamento_id" "uuid", "agendamento_data_retirada" "date", "agendamento_quantidade" numeric, "agendamento_placa_caminhao" "text", "agendamento_placa_carreta_1" "text", "agendamento_placa_carreta_2" "text", "agendamento_transportadora" "text", "agendamento_cnpj_transportadora" "text", "agendamento_motorista_nome" "text", "agendamento_motorista_documento" "text", "cliente_nome" "text", "liberacao_pedido_interno" "text", "produto_nome" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
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
    
    -- Dados do agendamento com novos campos
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
    
    -- Dados das relações com nomes únicos
    cl.nome as cliente_nome,
    l.pedido_interno as liberacao_pedido_interno,
    p.nome as produto_nome
    
  FROM carregamentos c
  INNER JOIN agendamentos a ON c.agendamento_id = a.id
  INNER JOIN liberacoes l ON a.liberacao_id = l.id
  INNER JOIN clientes cl ON l.cliente_id = cl.id
  INNER JOIN produtos p ON l.produto_id = p.id
  WHERE c.id = p_carregamento_id
  AND CASE 
    WHEN p_user_role = 'representante' THEN 
      cl.representante_id = p_representante_id
    WHEN p_user_role = 'cliente' THEN 
      c.cliente_id = p_cliente_id
    WHEN p_user_role = 'armazem' THEN 
      c.armazem_id = p_armazem_id  -- ✅ Validação correta pelo armazém do carregamento
    ELSE TRUE 
  END;
END;
$$;


ALTER FUNCTION "public"."get_carregamento_detalhe_universal"("p_carregamento_id" "uuid", "p_user_role" "text", "p_user_id" "uuid", "p_cliente_id" "uuid", "p_armazem_id" "uuid", "p_representante_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_carregamentos_by_representante_backup"("p_representante_id" "uuid") RETURNS TABLE("id" "uuid", "etapa_atual" smallint, "numero_nf" "text", "data_chegada" timestamp with time zone, "created_at" timestamp with time zone, "cliente_id" "uuid", "armazem_id" "uuid", "url_foto_chegada" "text", "url_foto_inicio" "text", "url_foto_carregando" "text", "url_foto_finalizacao" "text", "agendamento_id" "uuid", "data_retirada" "date", "quantidade" numeric, "placa_caminhao" "text", "motorista_nome" "text", "motorista_documento" "text", "pedido_interno" "text", "cliente_nome" "text", "produto_nome" "text", "armazem_nome" "text", "armazem_cidade" "text", "armazem_estado" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
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
    -- Dados do agendamento
    a.id as agendamento_id,
    a.data_retirada,
    a.quantidade,
    a.placa_caminhao,
    a.motorista_nome,
    a.motorista_documento,
    -- Dados da liberação
    l.pedido_interno,
    -- Dados do cliente
    cl.nome as cliente_nome,
    -- Dados do produto
    p.nome as produto_nome,
    -- Dados do armazém
    ar.nome as armazem_nome,
    ar.cidade as armazem_cidade,
    ar.estado as armazem_estado
  FROM carregamentos c
  INNER JOIN agendamentos a ON c.agendamento_id = a.id
  INNER JOIN liberacoes l ON a.liberacao_id = l.id
  INNER JOIN clientes cl ON l.cliente_id = cl.id
  INNER JOIN produtos p ON l.produto_id = p.id
  INNER JOIN armazens ar ON l.armazem_id = ar.id
  WHERE cl.representante_id = p_representante_id
  ORDER BY c.data_chegada DESC NULLS LAST;
END;
$$;


ALTER FUNCTION "public"."get_carregamentos_by_representante_backup"("p_representante_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_carregamentos_universal"("p_user_role" "text" DEFAULT NULL::"text", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_cliente_id" "uuid" DEFAULT NULL::"uuid", "p_armazem_id" "uuid" DEFAULT NULL::"uuid", "p_representante_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "etapa_atual" smallint, "numero_nf" "text", "data_chegada" timestamp with time zone, "created_at" timestamp with time zone, "cliente_id" "uuid", "armazem_id" "uuid", "url_foto_chegada" "text", "url_foto_inicio" "text", "url_foto_carregando" "text", "url_foto_finalizacao" "text", "agendamento_id" "uuid", "data_retirada" "date", "quantidade" numeric, "placa_caminhao" "text", "motorista_nome" "text", "motorista_documento" "text", "pedido_interno" "text", "cliente_nome" "text", "produto_nome" "text", "armazem_nome" "text", "armazem_cidade" "text", "armazem_estado" "text", "fotos_total" integer, "status_carregamento" "text", "cor_carregamento" "text", "tooltip_carregamento" "text", "percentual_carregamento" integer, "finalizado" boolean, "transportadora" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
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
        
        -- Dados do agendamento
        a.id as agendamento_id,
        a.data_retirada,
        a.quantidade,
        a.placa_caminhao,
        a.motorista_nome,
        a.motorista_documento,
        
        -- Dados da liberação
        l.pedido_interno,
        
        -- Dados do cliente
        cl.nome as cliente_nome,
        
        -- Dados do produto
        p.nome as produto_nome,
        
        -- ✅ CORREÇÃO: Pegar armazém do CARREGAMENTO, não da liberação
        ar.nome as armazem_nome,
        ar.cidade as armazem_cidade,
        ar.estado as armazem_estado,
        
        -- Contagem de fotos
        (
            CASE WHEN c.url_foto_chegada IS NOT NULL AND c.url_foto_chegada != '' THEN 1 ELSE 0 END +
            CASE WHEN c.url_foto_inicio IS NOT NULL AND c.url_foto_inicio != '' THEN 1 ELSE 0 END +
            CASE WHEN c.url_foto_carregando IS NOT NULL AND c.url_foto_carregando != '' THEN 1 ELSE 0 END +
            CASE WHEN c.url_foto_finalizacao IS NOT NULL AND c.url_foto_finalizacao != '' THEN 1 ELSE 0 END
        )::integer as fotos_total,
        
        -- Status do carregamento
        CASE 
            WHEN c.etapa_atual = 1 THEN 'Aguardando'
            WHEN c.etapa_atual BETWEEN 2 AND 5 THEN 'Em Andamento'
            ELSE 'Finalizado'
        END as status_carregamento,
        
        -- Cor do carregamento
        CASE 
            WHEN c.etapa_atual = 1 THEN 'bg-yellow-100 text-yellow-800'
            WHEN c.etapa_atual BETWEEN 2 AND 5 THEN 'bg-blue-100 text-blue-800'
            ELSE 'bg-green-100 text-green-800'
        END as cor_carregamento,
        
        -- Tooltip do carregamento
        CASE 
            WHEN c.etapa_atual = 1 THEN 'Aguardando chegada do veículo'
            WHEN c.etapa_atual = 2 THEN 'Carregamento do caminhão iniciado'
            WHEN c.etapa_atual = 3 THEN 'Carregando o caminhão'
            WHEN c.etapa_atual = 4 THEN 'Carregamento do caminhão finalizado'
            WHEN c.etapa_atual = 5 THEN 'Anexando documentação'
            ELSE 'Documentação anexada e processo concluído'
        END as tooltip_carregamento,
        
        -- Percentual do carregamento
        CASE 
            WHEN c.etapa_atual = 1 THEN 0
            WHEN c.etapa_atual BETWEEN 2 AND 5 THEN 
                ROUND(((c.etapa_atual - 1) / 5.0) * 100)::integer
            ELSE 100
        END as percentual_carregamento,
        
        -- Finalizado baseado na etapa
        (c.etapa_atual = 6) as finalizado,
        
        -- Transportadora do agendamento
        a.transportadora
        
    FROM carregamentos c
    INNER JOIN agendamentos a ON c.agendamento_id = a.id
    INNER JOIN liberacoes l ON a.liberacao_id = l.id
    INNER JOIN clientes cl ON l.cliente_id = cl.id
    INNER JOIN produtos p ON l.produto_id = p.id
    -- ✅ MUDANÇA CRÍTICA: JOIN com armazém do CARREGAMENTO
    INNER JOIN armazens ar ON c.armazem_id = ar.id
    WHERE 
        CASE 
            WHEN p_user_role = 'representante' THEN 
                cl.representante_id = p_representante_id
            WHEN p_user_role = 'cliente' THEN 
                c.cliente_id = p_cliente_id
            WHEN p_user_role = 'armazem' THEN 
                c.armazem_id = p_armazem_id
            ELSE TRUE 
        END
    ORDER BY c.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_carregamentos_universal"("p_user_role" "text", "p_user_id" "uuid", "p_cliente_id" "uuid", "p_armazem_id" "uuid", "p_representante_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_colaboradores"() RETURNS TABLE("id" "uuid", "nome" "text", "email" "text", "created_at" timestamp with time zone, "role" "public"."user_role")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT u.id,
         col.nome,
         u.email,
         u.created_at,
         CASE
           WHEN 'admin' = ANY(array_agg(ur.role)) THEN 'admin'::user_role
           WHEN 'logistica' = ANY(array_agg(ur.role)) THEN 'logistica'::user_role
           ELSE COALESCE((array_agg(ur.role))[1], 'logistica'::user_role)
         END AS role
  FROM auth.users u
  JOIN public.colaboradores col ON col.user_id = u.id
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  WHERE ur.role IN ('admin','logistica')
  GROUP BY u.id, col.nome, u.email, u.created_at
  ORDER BY u.created_at DESC;
$$;


ALTER FUNCTION "public"."get_colaboradores"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_liberacoes_by_representante_backup"("p_representante_id" "uuid") RETURNS TABLE("id" "uuid", "pedido_interno" "text", "quantidade_liberada" numeric, "quantidade_retirada" numeric, "quantidade_disponivel" numeric, "data_liberacao" "date", "status" "public"."liberacao_status", "cliente_id" "uuid", "produto_id" "uuid", "armazem_id" "uuid", "cliente_nome" "text", "produto_nome" "text", "armazem_nome" "text", "armazem_cidade" "text", "armazem_estado" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.pedido_interno,
    l.quantidade_liberada,
    l.quantidade_retirada,
    get_quantidade_disponivel_liberacao(l.id) as quantidade_disponivel,
    l.data_liberacao,
    l.status,
    l.cliente_id,
    l.produto_id,
    l.armazem_id,
    c.nome as cliente_nome,
    p.nome as produto_nome,
    a.nome as armazem_nome,
    a.cidade as armazem_cidade,
    a.estado as armazem_estado,
    l.created_at
  FROM liberacoes l
  INNER JOIN clientes c ON l.cliente_id = c.id
  INNER JOIN produtos p ON l.produto_id = p.id
  INNER JOIN armazens a ON l.armazem_id = a.id
  WHERE c.representante_id = p_representante_id
  ORDER BY l.data_liberacao DESC;
END;
$$;


ALTER FUNCTION "public"."get_liberacoes_by_representante_backup"("p_representante_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_liberacoes_disponiveis_universal"("p_user_role" "text" DEFAULT NULL::"text", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_cliente_id" "uuid" DEFAULT NULL::"uuid", "p_representante_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "pedido_interno" "text", "quantidade_liberada" numeric, "quantidade_retirada" numeric, "status" "text", "cliente_id" "uuid", "cliente_nome" "text", "produto_nome" "text", "armazem_id" "uuid", "armazem_cidade" "text", "armazem_estado" "text", "armazem_nome" "text", "quantidade_disponivel_real" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.pedido_interno,
        l.quantidade_liberada,
        l.quantidade_retirada,
        l.status,
        l.cliente_id,
        c.nome as cliente_nome,
        p.nome as produto_nome,
        a.id as armazem_id,
        a.cidade as armazem_cidade,
        a.estado as armazem_estado,
        a.nome as armazem_nome,
        get_quantidade_disponivel_liberacao(l.id) as quantidade_disponivel_real
        
    FROM liberacoes l
    INNER JOIN clientes c ON l.cliente_id = c.id
    INNER JOIN produtos p ON l.produto_id = p.id
    INNER JOIN armazens a ON l.armazem_id = a.id
    WHERE l.status IN ('disponivel', 'parcialmente_agendada')
    AND get_quantidade_disponivel_liberacao(l.id) > 0
    AND CASE 
        -- ✅ REPRESENTANTE: Ver liberações de TODOS os seus clientes
        WHEN p_user_role = 'representante' THEN 
            c.representante_id = p_representante_id
        -- ✅ CLIENTE: Ver apenas suas liberações
        WHEN p_user_role = 'cliente' THEN 
            l.cliente_id = p_cliente_id
        -- ✅ ADMIN/LOGÍSTICA: Ver tudo
        ELSE TRUE 
    END
    ORDER BY l.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_liberacoes_disponiveis_universal"("p_user_role" "text", "p_user_id" "uuid", "p_cliente_id" "uuid", "p_representante_id" "uuid") OWNER TO "postgres";


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
        COALESCE(SUM(CASE WHEN a.status IN ('pendente', 'em_andamento', 'concluido') THEN a.quantidade ELSE 0 END), 0) as quantidade_agendada,
        get_quantidade_disponivel_liberacao(l.id) as quantidade_disponivel,
        CASE 
            WHEN l.quantidade_liberada > 0 THEN 
                ROUND((l.quantidade_retirada / l.quantidade_liberada) * 100)::integer
            ELSE 0 
        END as percentual_retirado,
        CASE 
            WHEN l.quantidade_liberada > 0 THEN 
                ROUND((COALESCE(SUM(CASE WHEN a.status IN ('pendente', 'em_andamento', 'concluido') THEN a.quantidade ELSE 0 END), 0) / l.quantidade_liberada) * 100)::integer
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


ALTER FUNCTION "public"."get_liberacoes_universal"("p_user_role" "text", "p_user_id" "uuid", "p_cliente_id" "uuid", "p_armazem_id" "uuid", "p_representante_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_quantidade_disponivel_liberacao"("liberacao_uuid" "uuid") RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    quantidade_liberada NUMERIC;
    quantidade_retirada NUMERIC;
    quantidade_agendada_ativa NUMERIC;
    quantidade_disponivel NUMERIC;
BEGIN
    -- Buscar dados da liberação
    SELECT l.quantidade_liberada, COALESCE(l.quantidade_retirada, 0)
    INTO quantidade_liberada, quantidade_retirada
    FROM liberacoes l 
    WHERE l.id = liberacao_uuid;
    
    -- Se liberação não encontrada, retornar 0
    IF quantidade_liberada IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Calcular total agendado ATIVO (apenas pendente e em_andamento)
    SELECT COALESCE(SUM(a.quantidade), 0)
    INTO quantidade_agendada_ativa
    FROM agendamentos a
    WHERE a.liberacao_id = liberacao_uuid
    AND a.status IN ('pendente', 'em_andamento');
    
    -- Cálculo correto: Liberada - Retirada - Agendada Ativa
    quantidade_disponivel := quantidade_liberada - quantidade_retirada - quantidade_agendada_ativa;
    
    -- Garantir que não seja negativo
    IF quantidade_disponivel < 0 THEN
        quantidade_disponivel := 0;
    END IF;
    
    RETURN quantidade_disponivel;
END;
$$;


ALTER FUNCTION "public"."get_quantidade_disponivel_liberacao"("liberacao_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_users_with_roles"() RETURNS TABLE("id" "uuid", "nome" "text", "email" "text", "created_at" timestamp with time zone, "roles" "public"."user_role"[])
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  WITH entity_users AS (
    SELECT c.user_id AS id, c.nome
    FROM public.clientes c
    WHERE c.user_id IS NOT NULL

    UNION
    SELECT a.user_id AS id, a.nome
    FROM public.armazens a
    WHERE a.user_id IS NOT NULL

    UNION
    SELECT col.user_id AS id, col.nome
    FROM public.colaboradores col
    WHERE col.user_id IS NOT NULL

    UNION
    SELECT au.id, COALESCE(au.raw_user_meta_data->>'nome', au.email) AS nome
    FROM auth.users au
    WHERE NOT EXISTS (
      SELECT 1 FROM public.clientes c WHERE c.user_id = au.id
      UNION
      SELECT 1 FROM public.armazens a WHERE a.user_id = au.id
      UNION
      SELECT 1 FROM public.colaboradores col WHERE col.user_id = au.id
    )
  )
  SELECT
    u.id,
    u.nome,
    au.email,
    au.created_at,
    COALESCE(
      array_agg(DISTINCT ur.role) FILTER (WHERE ur.role IS NOT NULL),
      ARRAY[]::user_role[]
    ) AS roles
  FROM entity_users u
  JOIN auth.users au ON au.id = u.id
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  GROUP BY u.id, u.nome, au.email, au.created_at
  ORDER BY au.created_at DESC;
$$;


ALTER FUNCTION "public"."get_users_with_roles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("p_role" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role::text = p_role
  );
$$;


ALTER FUNCTION "public"."has_role"("p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."user_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = _role
  );
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."user_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_carregamento_from_agendamento"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$DECLARE
  v_cliente_id uuid;
  v_armazem_id uuid;
BEGIN
  -- Busca os FKs a partir do agendamento criado
  SELECT a.cliente_id, l.armazem_id
    INTO v_cliente_id, v_armazem_id
    FROM agendamentos a
         JOIN liberacoes l ON a.liberacao_id = l.id
    WHERE a.id = NEW.id;

  -- Insere novo carregamento a cada novo agendamento já com os campos populados
  INSERT INTO carregamentos (
    agendamento_id,
    etapa_atual,
    criado_por,
    created_at,
    updated_at,
    cliente_id,
    armazem_id
  ) VALUES (
    NEW.id,
    1,           -- Etapa inicial (1 = Chegada)
    NEW.created_by,
    now(),
    now(),
    v_cliente_id,
    v_armazem_id
  );
  RETURN NEW;
END;$$;


ALTER FUNCTION "public"."insert_carregamento_from_agendamento"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_representante_of_cliente"("cliente_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM representantes r
        JOIN clientes c ON c.representante_id = r.id
        WHERE c.id = cliente_uuid 
        AND r.user_id = auth.uid()
    );
END;
$$;


ALTER FUNCTION "public"."is_representante_of_cliente"("cliente_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_agendamento_status_from_carregamento"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    etapa_carregamento SMALLINT;
    agendamento_id_target UUID;
    novo_status agendamento_status;
BEGIN
    -- Determinar qual agendamento_id e etapa usar
    IF TG_OP = 'DELETE' THEN
        agendamento_id_target := OLD.agendamento_id;
        etapa_carregamento := 1; -- Se carregamento foi deletado, volta para etapa inicial
    ELSE
        agendamento_id_target := NEW.agendamento_id;
        etapa_carregamento := NEW.etapa_atual;
    END IF;

    -- CORRIGIDO: Mapear etapa_atual para status do agendamento conforme lógica correta
    novo_status := CASE 
        WHEN etapa_carregamento = 1 THEN 'pendente'::agendamento_status           -- Aguardando
        WHEN etapa_carregamento IN (2, 3, 4, 5) THEN 'em_andamento'::agendamento_status  -- Em Andamento
        WHEN etapa_carregamento = 6 THEN 'concluido'::agendamento_status         -- Finalizado
        ELSE 'pendente'::agendamento_status
    END;

    -- Atualizar status do agendamento
    UPDATE agendamentos 
    SET status = novo_status,
        updated_at = NOW()
    WHERE id = agendamento_id_target;

    -- Retornar o registro apropriado
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;


ALTER FUNCTION "public"."sync_agendamento_status_from_carregamento"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_estoque_fisico_from_carregamento"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_produto_id UUID;
    v_armazem_id UUID;
    v_quantidade_carregamento NUMERIC;
BEGIN
    -- Só processar quando carregamento for FINALIZADO (etapa 6)
    IF NEW.etapa_atual = 6 AND (OLD.etapa_atual IS NULL OR OLD.etapa_atual < 6) THEN
        
        -- Buscar dados da liberação E QUANTIDADE DO AGENDAMENTO
        SELECT 
            l.produto_id,
            l.armazem_id,
            a.quantidade
        INTO v_produto_id, v_armazem_id, v_quantidade_carregamento
        FROM agendamentos a
        JOIN liberacoes l ON a.liberacao_id = l.id
        WHERE a.id = NEW.agendamento_id;
        
        -- Verificar se encontrou os dados
        IF v_produto_id IS NULL THEN
            RAISE EXCEPTION 'Não foi possível encontrar dados do agendamento %', NEW.agendamento_id;
        END IF;
        
        -- Descontar do estoque FÍSICO
        UPDATE estoque
        SET quantidade = quantidade - v_quantidade_carregamento,
            updated_at = NOW()
        WHERE produto_id = v_produto_id
        AND armazem_id = v_armazem_id;
        
        RAISE NOTICE 'Estoque físico descontado ao finalizar carregamento: produto_id=%, armazem_id=%, quantidade=%',
            v_produto_id, v_armazem_id, v_quantidade_carregamento;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_estoque_fisico_from_carregamento"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_estoque_from_carregamento_backup"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    produto_id_target UUID;
    armazem_id_target UUID;
    quantidade_agendamento NUMERIC;
BEGIN
    -- Só processa se está chegando na etapa 6 (finalização)
    IF NEW.etapa_atual = 6 AND (OLD.etapa_atual IS NULL OR OLD.etapa_atual != 6) THEN
        
        -- Buscar dados da liberação através do agendamento
        SELECT 
            l.produto_id,
            l.armazem_id,
            a.quantidade
        INTO produto_id_target, armazem_id_target, quantidade_agendamento
        FROM agendamentos a
        JOIN liberacoes l ON a.liberacao_id = l.id
        WHERE a.id = NEW.agendamento_id;
        
        -- Verificar se encontrou os dados
        IF produto_id_target IS NOT NULL THEN
            -- Reduzir estoque
            UPDATE estoque 
            SET quantidade = quantidade - quantidade_agendamento,
                updated_at = NOW(),
                updated_by = NEW.atualizado_por
            WHERE produto_id = produto_id_target 
            AND armazem_id = armazem_id_target;
            
            -- Log para debug (opcional - pode remover em produção)
            RAISE NOTICE 'Estoque reduzido: produto_id=%, armazem_id=%, quantidade=%, carregamento_id=%', 
                produto_id_target, armazem_id_target, quantidade_agendamento, NEW.id;
        ELSE
            -- Log de erro se não encontrou dados
            RAISE WARNING 'Não foi possível encontrar dados da liberação para carregamento_id=%', NEW.id;
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_estoque_from_carregamento_backup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_estoque_from_liberacao"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    quantidade_disponivel_no_armazem NUMERIC;
BEGIN
    -- ============================================
    -- CASO 1: INSERIR NOVA LIBERAÇÃO
    -- ============================================
    IF TG_OP = 'INSERT' THEN
        -- Verificar se há estoque DISPONÍVEL suficiente
        SELECT COALESCE(quantidade_disponivel, 0) 
        INTO quantidade_disponivel_no_armazem
        FROM estoque
        WHERE produto_id = NEW.produto_id 
        AND armazem_id = NEW.armazem_id;
        
        IF quantidade_disponivel_no_armazem < NEW.quantidade_liberada THEN
            RAISE EXCEPTION 'Estoque disponível insuficiente. Disponível: %, Solicitado: %', 
                quantidade_disponivel_no_armazem, NEW.quantidade_liberada;
        END IF;
        
        -- Descontar apenas do estoque DISPONÍVEL (físico não muda)
        UPDATE estoque
        SET quantidade_disponivel = quantidade_disponivel - NEW.quantidade_liberada,
            updated_at = NOW(),
            updated_by = NEW.created_by
        WHERE produto_id = NEW.produto_id 
        AND armazem_id = NEW.armazem_id;
        
        RAISE NOTICE 'Estoque disponível descontado: produto_id=%, armazem_id=%, quantidade=%', 
            NEW.produto_id, NEW.armazem_id, NEW.quantidade_liberada;
        
        RETURN NEW;
    END IF;
    
    -- ============================================
    -- CASO 2: MODIFICAR ARMAZÉM DA LIBERAÇÃO
    -- ============================================
    IF TG_OP = 'UPDATE' AND OLD.armazem_id != NEW.armazem_id THEN
        DECLARE
            quantidade_ja_agendada NUMERIC;
            quantidade_disponivel_para_mover NUMERIC;
            estoque_disponivel_novo_armazem NUMERIC;
        BEGIN
            -- Quantidade já agendada (não pode ser movida)
            SELECT COALESCE(SUM(quantidade), 0)
            INTO quantidade_ja_agendada
            FROM agendamentos
            WHERE liberacao_id = NEW.id
            AND status IN ('pendente', 'em_andamento', 'concluido');
            
            -- Quantidade que ainda pode ser movida
            quantidade_disponivel_para_mover := NEW.quantidade_liberada - quantidade_ja_agendada;
            
            IF quantidade_disponivel_para_mover <= 0 THEN
                RAISE EXCEPTION 'Não é possível alterar o armazém pois toda a quantidade já foi agendada';
            END IF;
            
            -- Verificar estoque DISPONÍVEL no novo armazém
            SELECT COALESCE(quantidade_disponivel, 0)
            INTO estoque_disponivel_novo_armazem
            FROM estoque
            WHERE produto_id = NEW.produto_id 
            AND armazem_id = NEW.armazem_id;
            
            IF estoque_disponivel_novo_armazem < quantidade_disponivel_para_mover THEN
                RAISE EXCEPTION 'Estoque disponível insuficiente no novo armazém. Disponível: %, Necessário: %',
                    estoque_disponivel_novo_armazem, quantidade_disponivel_para_mover;
            END IF;
            
            -- CREDITAR estoque disponível no armazém antigo (devolver)
            UPDATE estoque
            SET quantidade_disponivel = quantidade_disponivel + quantidade_disponivel_para_mover,
                updated_at = NOW()
            WHERE produto_id = NEW.produto_id 
            AND armazem_id = OLD.armazem_id;
            
            -- DEBITAR estoque disponível do novo armazém
            UPDATE estoque
            SET quantidade_disponivel = quantidade_disponivel - quantidade_disponivel_para_mover,
                updated_at = NOW()
            WHERE produto_id = NEW.produto_id 
            AND armazem_id = NEW.armazem_id;
            
            RAISE NOTICE 'Estoque disponível ajustado na mudança: armazem_antigo=%, armazem_novo=%, quantidade=%',
                OLD.armazem_id, NEW.armazem_id, quantidade_disponivel_para_mover;
        END;
        
        RETURN NEW;
    END IF;
    
    -- ============================================
    -- CASO 3: DELETAR LIBERAÇÃO
    -- ============================================
    IF TG_OP = 'DELETE' THEN
        DECLARE
            quantidade_ja_agendada NUMERIC;
            quantidade_para_devolver NUMERIC;
        BEGIN
            -- Calcular quanto já foi agendado
            SELECT COALESCE(SUM(quantidade), 0)
            INTO quantidade_ja_agendada
            FROM agendamentos
            WHERE liberacao_id = OLD.id
            AND status IN ('pendente', 'em_andamento', 'concluido');
            
            -- Devolver ao estoque DISPONÍVEL (não ao físico)
            quantidade_para_devolver := OLD.quantidade_liberada - quantidade_ja_agendada;
            
            IF quantidade_para_devolver > 0 THEN
                UPDATE estoque
                SET quantidade_disponivel = quantidade_disponivel + quantidade_para_devolver,
                    updated_at = NOW()
                WHERE produto_id = OLD.produto_id 
                AND armazem_id = OLD.armazem_id;
                
                RAISE NOTICE 'Estoque disponível devolvido: produto_id=%, armazem_id=%, quantidade=%',
                    OLD.produto_id, OLD.armazem_id, quantidade_para_devolver;
            END IF;
        END;
        
        RETURN OLD;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_estoque_from_liberacao"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_liberacao_agendamento_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    quantidade_liberada NUMERIC;
    quantidade_agendada NUMERIC;
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        SELECT l.quantidade_liberada 
        INTO quantidade_liberada
        FROM liberacoes l 
        WHERE l.id = NEW.liberacao_id;
        
        SELECT COALESCE(SUM(a.quantidade), 0)
        INTO quantidade_agendada
        FROM agendamentos a
        WHERE a.liberacao_id = NEW.liberacao_id
        AND a.status IN ('pendente', 'em_andamento', 'concluido');
        
        IF quantidade_agendada = 0 THEN
            UPDATE liberacoes SET status = 'disponivel' WHERE id = NEW.liberacao_id;
        ELSIF quantidade_agendada < quantidade_liberada THEN
            UPDATE liberacoes SET status = 'parcialmente_agendada' WHERE id = NEW.liberacao_id;
        ELSIF quantidade_agendada >= quantidade_liberada THEN
            UPDATE liberacoes SET status = 'totalmente_agendada' WHERE id = NEW.liberacao_id;
        END IF;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        SELECT l.quantidade_liberada 
        INTO quantidade_liberada
        FROM liberacoes l 
        WHERE l.id = OLD.liberacao_id;
        
        SELECT COALESCE(SUM(a.quantidade), 0)
        INTO quantidade_agendada
        FROM agendamentos a
        WHERE a.liberacao_id = OLD.liberacao_id
        AND a.status IN ('pendente', 'em_andamento', 'concluido');
        
        IF quantidade_agendada = 0 THEN
            UPDATE liberacoes SET status = 'disponivel' WHERE id = OLD.liberacao_id;
        ELSIF quantidade_agendada < quantidade_liberada THEN
            UPDATE liberacoes SET status = 'parcialmente_agendada' WHERE id = OLD.liberacao_id;
        ELSIF quantidade_agendada >= quantidade_liberada THEN
            UPDATE liberacoes SET status = 'totalmente_agendada' WHERE id = OLD.liberacao_id;
        END IF;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."sync_liberacao_agendamento_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_liberacao_quantidade_retirada"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    liberacao_id_target UUID;
    quantidade_retirada_total NUMERIC;
BEGIN
    -- Buscar liberacao_id do agendamento
    SELECT a.liberacao_id 
    INTO liberacao_id_target
    FROM agendamentos a
    WHERE a.id = NEW.agendamento_id;
    
    -- Calcular total retirado (carregamentos com etapa = 6)
    SELECT COALESCE(SUM(a.quantidade), 0)
    INTO quantidade_retirada_total
    FROM agendamentos a
    JOIN carregamentos c ON c.agendamento_id = a.id
    WHERE a.liberacao_id = liberacao_id_target
    AND c.etapa_atual = 6;
    
    -- Atualizar quantidade_retirada na liberação
    UPDATE liberacoes 
    SET quantidade_retirada = quantidade_retirada_total
    WHERE id = liberacao_id_target;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_liberacao_quantidade_retirada"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_role"("_user_id" "uuid", "_role" "public"."user_role") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
BEGIN
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role <> _role;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'update_user_role falhou: %', SQLERRM;
  RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."update_user_role"("_user_id" "uuid", "_role" "public"."user_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_agendamento_quantidade"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    quantidade_disponivel NUMERIC;
    quantidade_solicitada NUMERIC;
BEGIN
    -- Pegar quantidade solicitada (NEW para insert/update)
    quantidade_solicitada := NEW.quantidade;
    
    -- Se for UPDATE, somar a quantidade antiga de volta
    IF TG_OP = 'UPDATE' THEN
        quantidade_disponivel := get_quantidade_disponivel_liberacao(NEW.liberacao_id) + OLD.quantidade;
    ELSE
        quantidade_disponivel := get_quantidade_disponivel_liberacao(NEW.liberacao_id);
    END IF;
    
    -- Validar se há quantidade suficiente
    IF quantidade_solicitada > quantidade_disponivel THEN
        RAISE EXCEPTION 'Quantidade solicitada (%) excede o disponível (%) para esta liberação', 
            quantidade_solicitada, quantidade_disponivel;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_agendamento_quantidade"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."agendamentos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "liberacao_id" "uuid" NOT NULL,
    "data_retirada" "date",
    "quantidade" numeric NOT NULL,
    "motorista_nome" "text" NOT NULL,
    "motorista_documento" "text" NOT NULL,
    "placa_caminhao" "text" NOT NULL,
    "status" "public"."agendamento_status" DEFAULT 'pendente'::"public"."agendamento_status",
    "observacoes" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "cliente_id" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "armazem_id" "uuid",
    "placa_carreta_1" "text" NOT NULL,
    "transportadora" "text" NOT NULL,
    "cnpj_transportadora" "text" NOT NULL,
    "placa_carreta_2" "text"
);


ALTER TABLE "public"."agendamentos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."armazens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "cidade" "text" NOT NULL,
    "estado" "text" NOT NULL,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "capacidade_total" numeric(10,2),
    "capacidade_disponivel" numeric(10,2),
    "telefone" "text",
    "endereco" "text",
    "email" "text",
    "cep" "text",
    "cnpj_cpf" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "temp_password" "text"
);


ALTER TABLE "public"."armazens" OWNER TO "postgres";


COMMENT ON COLUMN "public"."armazens"."capacidade_total" IS 'Capacidade total do armazem em toneladas';



COMMENT ON COLUMN "public"."armazens"."capacidade_disponivel" IS 'Capacidade disponivel atual em toneladas';



COMMENT ON COLUMN "public"."armazens"."telefone" IS 'Telefone de contato do armazem';



COMMENT ON COLUMN "public"."armazens"."endereco" IS 'Endereco completo do armazem';



COMMENT ON COLUMN "public"."armazens"."email" IS 'Email do usuario responsavel pelo armazem (copiado de auth.users)';



CREATE TABLE IF NOT EXISTS "public"."clientes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "cnpj_cpf" "text" NOT NULL,
    "email" "text" NOT NULL,
    "telefone" "text",
    "endereco" "text",
    "cidade" "text",
    "estado" "text",
    "cep" "text",
    "ativo" boolean DEFAULT true,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "temp_password" "text",
    "representante_id" "uuid",
    CONSTRAINT "clientes_cnpj_cpf_length_check" CHECK (("char_length"("cnpj_cpf") = ANY (ARRAY[11, 14])))
);


ALTER TABLE "public"."clientes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."liberacoes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "produto_id" "uuid" NOT NULL,
    "armazem_id" "uuid" NOT NULL,
    "pedido_interno" "text" NOT NULL,
    "quantidade_liberada" numeric NOT NULL,
    "quantidade_retirada" numeric DEFAULT 0 NOT NULL,
    "data_liberacao" "date" DEFAULT CURRENT_DATE,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "cliente_id" "uuid" NOT NULL,
    "status" "public"."liberacao_status" DEFAULT 'disponivel'::"public"."liberacao_status",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."liberacoes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."produtos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "unidade" "text" DEFAULT 't'::"text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."produtos" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."agendamentos_view" AS
 SELECT "ag"."id",
    "ag"."liberacao_id",
    "ag"."data_retirada",
    "ag"."quantidade",
    "ag"."motorista_nome",
    "ag"."motorista_documento",
    "ag"."placa_caminhao",
    "ag"."placa_carreta_1",
    "ag"."placa_carreta_2",
    "ag"."transportadora",
    "ag"."cnpj_transportadora",
    "ag"."status",
    "ag"."observacoes",
    "ag"."created_at",
    "ag"."cliente_id",
    "c"."nome" AS "cliente_nome",
    "c"."cnpj_cpf" AS "cliente_cnpj",
    "l"."pedido_interno",
    "p"."nome" AS "produto_nome",
    "a"."nome" AS "armazem_nome"
   FROM (((("public"."agendamentos" "ag"
     LEFT JOIN "public"."clientes" "c" ON (("ag"."cliente_id" = "c"."id")))
     LEFT JOIN "public"."liberacoes" "l" ON (("ag"."liberacao_id" = "l"."id")))
     LEFT JOIN "public"."produtos" "p" ON (("l"."produto_id" = "p"."id")))
     LEFT JOIN "public"."armazens" "a" ON (("l"."armazem_id" = "a"."id")));


ALTER VIEW "public"."agendamentos_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."carregamentos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agendamento_id" "uuid" NOT NULL,
    "numero_nf" "text",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "etapa_atual" smallint DEFAULT 1 NOT NULL,
    "observacao_chegada" "text",
    "observacao_inicio" "text",
    "observacao_carregando" "text",
    "observacao_finalizacao" "text",
    "observacao_documentacao" "text",
    "docs_retorno_url" "text",
    "docs_retorno_xml_url" "text",
    "data_chegada" timestamp with time zone,
    "data_inicio" timestamp with time zone,
    "data_carregando" timestamp with time zone,
    "data_finalizacao" timestamp with time zone,
    "data_documentacao" timestamp with time zone,
    "criado_por" "uuid",
    "atualizado_por" "uuid",
    "cliente_id" "uuid",
    "armazem_id" "uuid",
    "url_foto_chegada" "text",
    "url_foto_inicio" "text",
    "url_foto_carregando" "text",
    "url_foto_finalizacao" "text",
    "etapa_5a_status" character varying(20) DEFAULT 'pendente'::character varying,
    "etapa_5b_status" character varying(20) DEFAULT 'pendente'::character varying,
    "etapa_5c_status" character varying(20) DEFAULT 'pendente'::character varying,
    "docs_venda_url" "text",
    "docs_venda_xml_url" "text",
    "docs_remessa_url" "text",
    "docs_remessa_xml_url" "text"
);


ALTER TABLE "public"."carregamentos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."colaboradores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "nome" "text" NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."colaboradores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."estoque" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "produto_id" "uuid" NOT NULL,
    "armazem_id" "uuid" NOT NULL,
    "quantidade" numeric DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid",
    "quantidade_disponivel" numeric NOT NULL
);


ALTER TABLE "public"."estoque" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."estoque_remessas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "produto_id" "uuid" NOT NULL,
    "armazem_id" "uuid" NOT NULL,
    "quantidade_original" numeric NOT NULL,
    "data_remessa" timestamp with time zone DEFAULT "now"() NOT NULL,
    "url_nota_remessa" "text",
    "url_xml_remessa" "text",
    "numero_remessa" "text" NOT NULL,
    "observacoes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "estoque_remessas_quantidade_original_check" CHECK (("quantidade_original" > (0)::numeric))
);


ALTER TABLE "public"."estoque_remessas" OWNER TO "postgres";


COMMENT ON TABLE "public"."estoque_remessas" IS 'Histórico de remessas de produtos com documentação anexada';



COMMENT ON COLUMN "public"."estoque_remessas"."quantidade_original" IS 'Quantidade original da remessa (apenas para histórico)';



COMMENT ON COLUMN "public"."estoque_remessas"."url_nota_remessa" IS 'URL do PDF da nota de remessa';



COMMENT ON COLUMN "public"."estoque_remessas"."url_xml_remessa" IS 'URL do arquivo XML da remessa';



COMMENT ON COLUMN "public"."estoque_remessas"."numero_remessa" IS 'Número da remessa (opcional)';



CREATE TABLE IF NOT EXISTS "public"."representantes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "email" "text" NOT NULL,
    "telefone" "text",
    "cpf" "text" NOT NULL,
    "regiao_atuacao" "text",
    "ativo" boolean DEFAULT true,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "temp_password" "text"
);


ALTER TABLE "public"."representantes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role" "text" NOT NULL,
    "resource" "text" NOT NULL,
    "can_create" boolean DEFAULT false,
    "can_read" boolean DEFAULT false,
    "can_update" boolean DEFAULT false,
    "can_delete" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."user_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."agendamentos"
    ADD CONSTRAINT "agendamentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."armazens"
    ADD CONSTRAINT "armazens_email_unique" UNIQUE ("email");



ALTER TABLE ONLY "public"."armazens"
    ADD CONSTRAINT "armazens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."armazens"
    ADD CONSTRAINT "armazens_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."carregamentos"
    ADD CONSTRAINT "carregamentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "clientes_cnpj_cpf_unique" UNIQUE ("cnpj_cpf");



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "clientes_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "clientes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."colaboradores"
    ADD CONSTRAINT "colaboradores_email_unique" UNIQUE ("email");



ALTER TABLE ONLY "public"."colaboradores"
    ADD CONSTRAINT "colaboradores_nome_unique" UNIQUE ("nome");



ALTER TABLE ONLY "public"."colaboradores"
    ADD CONSTRAINT "colaboradores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."colaboradores"
    ADD CONSTRAINT "colaboradores_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."estoque"
    ADD CONSTRAINT "estoque_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."estoque"
    ADD CONSTRAINT "estoque_produto_id_armazem_id_key" UNIQUE ("produto_id", "armazem_id");



ALTER TABLE ONLY "public"."estoque_remessas"
    ADD CONSTRAINT "estoque_remessas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."liberacoes"
    ADD CONSTRAINT "liberacoes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."produtos"
    ADD CONSTRAINT "produtos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."representantes"
    ADD CONSTRAINT "representantes_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."representantes"
    ADD CONSTRAINT "representantes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_key" UNIQUE ("user_id");



CREATE INDEX "idx_agendamentos_cliente_id" ON "public"."agendamentos" USING "btree" ("cliente_id");



CREATE INDEX "idx_armazens_email" ON "public"."armazens" USING "btree" ("email");



CREATE INDEX "idx_clientes_ativo" ON "public"."clientes" USING "btree" ("ativo");



CREATE INDEX "idx_clientes_user_id" ON "public"."clientes" USING "btree" ("user_id");



CREATE INDEX "idx_estoque_remessas_created_by" ON "public"."estoque_remessas" USING "btree" ("created_by");



CREATE INDEX "idx_estoque_remessas_data" ON "public"."estoque_remessas" USING "btree" ("data_remessa" DESC);



CREATE INDEX "idx_estoque_remessas_produto_armazem" ON "public"."estoque_remessas" USING "btree" ("produto_id", "armazem_id");



CREATE INDEX "idx_liberacoes_cliente_id" ON "public"."liberacoes" USING "btree" ("cliente_id");



CREATE UNIQUE INDEX "idx_role_permissions_role_resource" ON "public"."role_permissions" USING "btree" ("role", "resource");



CREATE OR REPLACE TRIGGER "aaa_validate_agendamento_quantidade" BEFORE INSERT OR UPDATE ON "public"."agendamentos" FOR EACH ROW EXECUTE FUNCTION "public"."validate_agendamento_quantidade"();



CREATE OR REPLACE TRIGGER "trg_insert_carregamento_from_agendamento" AFTER INSERT ON "public"."agendamentos" FOR EACH ROW EXECUTE FUNCTION "public"."insert_carregamento_from_agendamento"();



CREATE OR REPLACE TRIGGER "trg_sync_estoque_from_liberacao" BEFORE INSERT OR DELETE OR UPDATE ON "public"."liberacoes" FOR EACH ROW EXECUTE FUNCTION "public"."sync_estoque_from_liberacao"();



CREATE OR REPLACE TRIGGER "trigger_sync_agendamento_status" AFTER INSERT OR DELETE OR UPDATE ON "public"."carregamentos" FOR EACH ROW EXECUTE FUNCTION "public"."sync_agendamento_status_from_carregamento"();



CREATE OR REPLACE TRIGGER "trigger_sync_estoque_fisico_carregamento" AFTER UPDATE ON "public"."carregamentos" FOR EACH ROW EXECUTE FUNCTION "public"."sync_estoque_fisico_from_carregamento"();



CREATE OR REPLACE TRIGGER "trigger_sync_liberacao_final" AFTER INSERT OR DELETE OR UPDATE ON "public"."agendamentos" FOR EACH ROW EXECUTE FUNCTION "public"."sync_liberacao_agendamento_status"();



CREATE OR REPLACE TRIGGER "trigger_sync_quantidade_retirada" AFTER UPDATE ON "public"."carregamentos" FOR EACH ROW WHEN ((("new"."etapa_atual" = 6) AND ("old"."etapa_atual" <> 6))) EXECUTE FUNCTION "public"."sync_liberacao_quantidade_retirada"();



CREATE OR REPLACE TRIGGER "update_liberacoes_updated_at" BEFORE UPDATE ON "public"."liberacoes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."agendamentos"
    ADD CONSTRAINT "agendamentos_armazem_id_fkey" FOREIGN KEY ("armazem_id") REFERENCES "public"."armazens"("id");



ALTER TABLE ONLY "public"."agendamentos"
    ADD CONSTRAINT "agendamentos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id");



ALTER TABLE ONLY "public"."agendamentos"
    ADD CONSTRAINT "agendamentos_liberacao_id_fkey" FOREIGN KEY ("liberacao_id") REFERENCES "public"."liberacoes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."carregamentos"
    ADD CONSTRAINT "carregamentos_agendamento_id_fkey" FOREIGN KEY ("agendamento_id") REFERENCES "public"."agendamentos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."carregamentos"
    ADD CONSTRAINT "carregamentos_armazem_id_fkey" FOREIGN KEY ("armazem_id") REFERENCES "public"."armazens"("id");



ALTER TABLE ONLY "public"."carregamentos"
    ADD CONSTRAINT "carregamentos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id");



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "clientes_representante_id_fkey" FOREIGN KEY ("representante_id") REFERENCES "public"."representantes"("id");



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "clientes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."estoque"
    ADD CONSTRAINT "estoque_armazem_id_fkey" FOREIGN KEY ("armazem_id") REFERENCES "public"."armazens"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."estoque"
    ADD CONSTRAINT "estoque_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."estoque_remessas"
    ADD CONSTRAINT "estoque_remessas_armazem_id_fkey" FOREIGN KEY ("armazem_id") REFERENCES "public"."armazens"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."estoque_remessas"
    ADD CONSTRAINT "estoque_remessas_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."estoque_remessas"
    ADD CONSTRAINT "estoque_remessas_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."armazens"
    ADD CONSTRAINT "fk_armazens_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "fk_clientes_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."colaboradores"
    ADD CONSTRAINT "fk_colaboradores_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."liberacoes"
    ADD CONSTRAINT "liberacoes_armazem_id_fkey" FOREIGN KEY ("armazem_id") REFERENCES "public"."armazens"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."liberacoes"
    ADD CONSTRAINT "liberacoes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id");



ALTER TABLE ONLY "public"."liberacoes"
    ADD CONSTRAINT "liberacoes_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."representantes"
    ADD CONSTRAINT "representantes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admin e logística podem atualizar representantes" ON "public"."representantes" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"]))))));



CREATE POLICY "Admin e logística podem inserir representantes" ON "public"."representantes" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"]))))));



CREATE POLICY "Admin e logística podem ver todos os representantes" ON "public"."representantes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"]))))));



CREATE POLICY "Agendamentos podem ser deletados por admin, logistica ou criado" ON "public"."agendamentos" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"]))))) OR ("created_by" = "auth"."uid"())));



CREATE POLICY "Apenas admin pode deletar representantes" ON "public"."representantes" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Authenticated users can read all permissions" ON "public"."role_permissions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Clientes visualização por si ou admin/logistica" ON "public"."clientes" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"])))))));



CREATE POLICY "Produtos visualização por roles" ON "public"."produtos" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role", 'cliente'::"public"."user_role"]))))));



CREATE POLICY "Representantes podem ver seus próprios dados" ON "public"."representantes" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Todos podem ver armazéns" ON "public"."armazens" FOR SELECT USING (true);



CREATE POLICY "admin_logistica_delete_clientes" ON "public"."clientes" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"]))))));



CREATE POLICY "admin_logistica_update_clientes" ON "public"."clientes" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"]))))));



CREATE POLICY "admin_logistica_veem_clientes" ON "public"."clientes" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"]))))));



ALTER TABLE "public"."agendamentos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "agendamentos_insert_policy" ON "public"."agendamentos" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"]))))) OR (EXISTS ( SELECT 1
   FROM "public"."clientes" "c"
  WHERE (("c"."user_id" = "auth"."uid"()) AND ("c"."id" = "agendamentos"."cliente_id")))) OR (EXISTS ( SELECT 1
   FROM ("public"."representantes" "r"
     JOIN "public"."clientes" "c" ON (("c"."representante_id" = "r"."id")))
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("c"."id" = "agendamentos"."cliente_id"))))));



CREATE POLICY "agendamentos_select_por_permissao" ON "public"."agendamentos" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"]))))) OR (EXISTS ( SELECT 1
   FROM "public"."clientes" "c"
  WHERE (("c"."user_id" = "auth"."uid"()) AND ("c"."id" = "agendamentos"."cliente_id")))) OR (EXISTS ( SELECT 1
   FROM "public"."armazens" "a"
  WHERE (("a"."user_id" = "auth"."uid"()) AND ("a"."id" = "agendamentos"."armazem_id")))) OR (EXISTS ( SELECT 1
   FROM ("public"."representantes" "r"
     JOIN "public"."clientes" "c" ON (("c"."representante_id" = "r"."id")))
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("c"."id" = "agendamentos"."cliente_id"))))));



CREATE POLICY "agendamentos_update_sistema" ON "public"."agendamentos" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"]))))) OR ("created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."clientes" "c"
  WHERE (("c"."user_id" = "auth"."uid"()) AND ("c"."id" = "agendamentos"."cliente_id")))) OR (EXISTS ( SELECT 1
   FROM "public"."armazens" "a"
  WHERE (("a"."user_id" = "auth"."uid"()) AND ("a"."id" = "agendamentos"."armazem_id")))) OR (EXISTS ( SELECT 1
   FROM ("public"."representantes" "r"
     JOIN "public"."clientes" "c" ON (("c"."representante_id" = "r"."id")))
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("c"."id" = "agendamentos"."cliente_id"))))));



ALTER TABLE "public"."armazens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "armazens_admin_logistica_all" ON "public"."armazens" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['logistica'::"public"."user_role", 'admin'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['logistica'::"public"."user_role", 'admin'::"public"."user_role"]))))));



CREATE POLICY "armazens_read_own" ON "public"."armazens" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "authenticated_read_armazens" ON "public"."armazens" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_read_clientes" ON "public"."clientes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_read_colaboradores" ON "public"."colaboradores" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_read_produtos" ON "public"."produtos" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_read_role_permissions" ON "public"."role_permissions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated_read_user_roles" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."carregamentos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "carregamentos_create_por_permissao" ON "public"."carregamentos" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role", 'armazem'::"public"."user_role"]))))) OR (EXISTS ( SELECT 1
   FROM "public"."clientes" "c"
  WHERE (("c"."user_id" = "auth"."uid"()) AND ("c"."id" = "carregamentos"."cliente_id")))) OR (EXISTS ( SELECT 1
   FROM ("public"."representantes" "r"
     JOIN "public"."clientes" "c" ON (("c"."representante_id" = "r"."id")))
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("c"."id" = "carregamentos"."cliente_id")))) OR (EXISTS ( SELECT 1
   FROM "public"."armazens" "a"
  WHERE (("a"."user_id" = "auth"."uid"()) AND ("a"."id" = "carregamentos"."armazem_id"))))));



CREATE POLICY "carregamentos_read_por_permissao" ON "public"."carregamentos" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"]))))) OR (EXISTS ( SELECT 1
   FROM "public"."clientes" "c"
  WHERE (("c"."user_id" = "auth"."uid"()) AND ("c"."id" = "carregamentos"."cliente_id")))) OR (EXISTS ( SELECT 1
   FROM ("public"."representantes" "r"
     JOIN "public"."clientes" "c" ON (("c"."representante_id" = "r"."id")))
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("c"."id" = "carregamentos"."cliente_id")))) OR (EXISTS ( SELECT 1
   FROM "public"."armazens" "a"
  WHERE (("a"."user_id" = "auth"."uid"()) AND ("a"."id" = "carregamentos"."armazem_id"))))));



CREATE POLICY "carregamentos_update_por_permissao" ON "public"."carregamentos" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"]))))) OR (EXISTS ( SELECT 1
   FROM "public"."clientes" "c"
  WHERE (("c"."user_id" = "auth"."uid"()) AND ("c"."id" = "carregamentos"."cliente_id")))) OR (EXISTS ( SELECT 1
   FROM ("public"."representantes" "r"
     JOIN "public"."clientes" "c" ON (("c"."representante_id" = "r"."id")))
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("c"."id" = "carregamentos"."cliente_id")))) OR (EXISTS ( SELECT 1
   FROM "public"."armazens" "a"
  WHERE (("a"."user_id" = "auth"."uid"()) AND ("a"."id" = "carregamentos"."armazem_id"))))));



ALTER TABLE "public"."clientes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clientes_read_own" ON "public"."clientes" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."colaboradores" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "colaboradores_admin_logistica_all" ON "public"."colaboradores" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['logistica'::"public"."user_role", 'admin'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['logistica'::"public"."user_role", 'admin'::"public"."user_role"]))))));



CREATE POLICY "colaboradores_view_self" ON "public"."colaboradores" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."estoque" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "estoque_insert_auth" ON "public"."estoque" FOR INSERT TO "authenticated" WITH CHECK (true);



ALTER TABLE "public"."estoque_remessas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "estoque_remessas_delete_policy" ON "public"."estoque_remessas" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "estoque_remessas_insert_policy" ON "public"."estoque_remessas" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"]))))));



CREATE POLICY "estoque_remessas_select_por_permissao" ON "public"."estoque_remessas" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"]))))) OR (EXISTS ( SELECT 1
   FROM "public"."armazens" "a"
  WHERE (("a"."user_id" = "auth"."uid"()) AND ("a"."id" = "estoque_remessas"."armazem_id"))))));



CREATE POLICY "estoque_remessas_update_policy" ON "public"."estoque_remessas" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"]))))));



CREATE POLICY "estoque_select_por_permissao" ON "public"."estoque" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"]))))) OR (EXISTS ( SELECT 1
   FROM "public"."armazens" "a"
  WHERE (("a"."user_id" = "auth"."uid"()) AND ("a"."id" = "estoque"."armazem_id"))))));



CREATE POLICY "estoque_update_auth" ON "public"."estoque" FOR UPDATE TO "authenticated" USING (true);



ALTER TABLE "public"."liberacoes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "liberacoes_insert_admin_logistica" ON "public"."liberacoes" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"]))))));



CREATE POLICY "liberacoes_select_por_permissao" ON "public"."liberacoes" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"]))))) OR (EXISTS ( SELECT 1
   FROM "public"."clientes" "c"
  WHERE (("c"."user_id" = "auth"."uid"()) AND ("c"."id" = "liberacoes"."cliente_id")))) OR (EXISTS ( SELECT 1
   FROM "public"."armazens" "a"
  WHERE (("a"."user_id" = "auth"."uid"()) AND ("a"."id" = "liberacoes"."armazem_id")))) OR (EXISTS ( SELECT 1
   FROM ("public"."representantes" "r"
     JOIN "public"."clientes" "c" ON (("c"."representante_id" = "r"."id")))
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("c"."id" = "liberacoes"."cliente_id"))))));



CREATE POLICY "liberacoes_update_admin_logistica" ON "public"."liberacoes" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"]))))) OR (EXISTS ( SELECT 1
   FROM "public"."clientes" "c"
  WHERE (("c"."user_id" = "auth"."uid"()) AND ("c"."id" = "liberacoes"."cliente_id")))) OR (EXISTS ( SELECT 1
   FROM "public"."armazens" "a"
  WHERE (("a"."user_id" = "auth"."uid"()) AND ("a"."id" = "liberacoes"."armazem_id"))))));



CREATE POLICY "logistica_admin_estoque_all" ON "public"."estoque" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['logistica'::"public"."user_role", 'admin'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['logistica'::"public"."user_role", 'admin'::"public"."user_role"]))))));



ALTER TABLE "public"."produtos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "produtos_insert_auth" ON "public"."produtos" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "produtos_select_auth" ON "public"."produtos" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "produtos_update_auth" ON "public"."produtos" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "read_own_armazem" ON "public"."armazens" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "read_own_cliente" ON "public"."clientes" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."representantes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."role_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "role_permissions_admin_all" ON "public"."role_permissions" TO "authenticated" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."user_role")) WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."user_role"));



CREATE POLICY "service_role_insert" ON "public"."armazens" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "service_role_insert" ON "public"."clientes" FOR INSERT TO "service_role" WITH CHECK (true);



ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_roles_delete_admin" ON "public"."user_roles" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur2"
  WHERE (("ur2"."user_id" = "auth"."uid"()) AND ("ur2"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "user_roles_insert_admin" ON "public"."user_roles" FOR INSERT TO "authenticated" WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."user_role"));



CREATE POLICY "user_roles_update_admin" ON "public"."user_roles" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur2"
  WHERE (("ur2"."user_id" = "auth"."uid"()) AND ("ur2"."role" = 'admin'::"public"."user_role")))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."alterar_armazem_liberacao"("p_liberacao_id" "uuid", "p_novo_armazem_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."alterar_armazem_liberacao"("p_liberacao_id" "uuid", "p_novo_armazem_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."alterar_armazem_liberacao"("p_liberacao_id" "uuid", "p_novo_armazem_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_upload_documento_for_carregamento"("_user_id" "uuid", "_carregamento_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_upload_documento_for_carregamento"("_user_id" "uuid", "_carregamento_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_upload_documento_for_carregamento"("_user_id" "uuid", "_carregamento_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_upload_foto_for_carregamento"("_user_id" "uuid", "_carregamento_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_upload_foto_for_carregamento"("_user_id" "uuid", "_carregamento_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_upload_foto_for_carregamento"("_user_id" "uuid", "_carregamento_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_user_active_status"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_active_status"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_active_status"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."clear_user_temp_password"("user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."clear_user_temp_password"("user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."clear_user_temp_password"("user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_agendamentos_by_representante_backup"("p_representante_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_agendamentos_by_representante_backup"("p_representante_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_agendamentos_by_representante_backup"("p_representante_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_agendamentos_universal"("p_user_role" "text", "p_user_id" "uuid", "p_cliente_id" "uuid", "p_armazem_id" "uuid", "p_representante_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_agendamentos_universal"("p_user_role" "text", "p_user_id" "uuid", "p_cliente_id" "uuid", "p_armazem_id" "uuid", "p_representante_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_agendamentos_universal"("p_user_role" "text", "p_user_id" "uuid", "p_cliente_id" "uuid", "p_armazem_id" "uuid", "p_representante_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_carregamento_detalhe_by_representante_backup"("p_representante_id" "uuid", "p_carregamento_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_carregamento_detalhe_by_representante_backup"("p_representante_id" "uuid", "p_carregamento_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_carregamento_detalhe_by_representante_backup"("p_representante_id" "uuid", "p_carregamento_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_carregamento_detalhe_universal"("p_carregamento_id" "uuid", "p_user_role" "text", "p_user_id" "uuid", "p_cliente_id" "uuid", "p_armazem_id" "uuid", "p_representante_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_carregamento_detalhe_universal"("p_carregamento_id" "uuid", "p_user_role" "text", "p_user_id" "uuid", "p_cliente_id" "uuid", "p_armazem_id" "uuid", "p_representante_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_carregamento_detalhe_universal"("p_carregamento_id" "uuid", "p_user_role" "text", "p_user_id" "uuid", "p_cliente_id" "uuid", "p_armazem_id" "uuid", "p_representante_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_carregamentos_by_representante_backup"("p_representante_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_carregamentos_by_representante_backup"("p_representante_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_carregamentos_by_representante_backup"("p_representante_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_carregamentos_universal"("p_user_role" "text", "p_user_id" "uuid", "p_cliente_id" "uuid", "p_armazem_id" "uuid", "p_representante_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_carregamentos_universal"("p_user_role" "text", "p_user_id" "uuid", "p_cliente_id" "uuid", "p_armazem_id" "uuid", "p_representante_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_carregamentos_universal"("p_user_role" "text", "p_user_id" "uuid", "p_cliente_id" "uuid", "p_armazem_id" "uuid", "p_representante_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_colaboradores"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_colaboradores"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_colaboradores"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_liberacoes_by_representante_backup"("p_representante_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_liberacoes_by_representante_backup"("p_representante_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_liberacoes_by_representante_backup"("p_representante_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_liberacoes_disponiveis_universal"("p_user_role" "text", "p_user_id" "uuid", "p_cliente_id" "uuid", "p_representante_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_liberacoes_disponiveis_universal"("p_user_role" "text", "p_user_id" "uuid", "p_cliente_id" "uuid", "p_representante_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_liberacoes_disponiveis_universal"("p_user_role" "text", "p_user_id" "uuid", "p_cliente_id" "uuid", "p_representante_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_liberacoes_universal"("p_user_role" "text", "p_user_id" "uuid", "p_cliente_id" "uuid", "p_armazem_id" "uuid", "p_representante_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_liberacoes_universal"("p_user_role" "text", "p_user_id" "uuid", "p_cliente_id" "uuid", "p_armazem_id" "uuid", "p_representante_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_liberacoes_universal"("p_user_role" "text", "p_user_id" "uuid", "p_cliente_id" "uuid", "p_armazem_id" "uuid", "p_representante_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_quantidade_disponivel_liberacao"("liberacao_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_quantidade_disponivel_liberacao"("liberacao_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_quantidade_disponivel_liberacao"("liberacao_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_users_with_roles"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_users_with_roles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_users_with_roles"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("p_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("p_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."user_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."user_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."user_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_carregamento_from_agendamento"() TO "anon";
GRANT ALL ON FUNCTION "public"."insert_carregamento_from_agendamento"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_carregamento_from_agendamento"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_representante_of_cliente"("cliente_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_representante_of_cliente"("cliente_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_representante_of_cliente"("cliente_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_agendamento_status_from_carregamento"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_agendamento_status_from_carregamento"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_agendamento_status_from_carregamento"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_estoque_fisico_from_carregamento"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_estoque_fisico_from_carregamento"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_estoque_fisico_from_carregamento"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_estoque_from_carregamento_backup"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_estoque_from_carregamento_backup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_estoque_from_carregamento_backup"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_estoque_from_liberacao"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_estoque_from_liberacao"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_estoque_from_liberacao"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_liberacao_agendamento_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_liberacao_agendamento_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_liberacao_agendamento_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_liberacao_quantidade_retirada"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_liberacao_quantidade_retirada"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_liberacao_quantidade_retirada"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_role"("_user_id" "uuid", "_role" "public"."user_role") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_role"("_user_id" "uuid", "_role" "public"."user_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_role"("_user_id" "uuid", "_role" "public"."user_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_agendamento_quantidade"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_agendamento_quantidade"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_agendamento_quantidade"() TO "service_role";


















GRANT ALL ON TABLE "public"."agendamentos" TO "anon";
GRANT ALL ON TABLE "public"."agendamentos" TO "authenticated";
GRANT ALL ON TABLE "public"."agendamentos" TO "service_role";



GRANT ALL ON TABLE "public"."armazens" TO "anon";
GRANT ALL ON TABLE "public"."armazens" TO "authenticated";
GRANT ALL ON TABLE "public"."armazens" TO "service_role";



GRANT ALL ON TABLE "public"."clientes" TO "anon";
GRANT ALL ON TABLE "public"."clientes" TO "authenticated";
GRANT ALL ON TABLE "public"."clientes" TO "service_role";



GRANT ALL ON TABLE "public"."liberacoes" TO "anon";
GRANT ALL ON TABLE "public"."liberacoes" TO "authenticated";
GRANT ALL ON TABLE "public"."liberacoes" TO "service_role";



GRANT ALL ON TABLE "public"."produtos" TO "anon";
GRANT ALL ON TABLE "public"."produtos" TO "authenticated";
GRANT ALL ON TABLE "public"."produtos" TO "service_role";



GRANT ALL ON TABLE "public"."agendamentos_view" TO "anon";
GRANT ALL ON TABLE "public"."agendamentos_view" TO "authenticated";
GRANT ALL ON TABLE "public"."agendamentos_view" TO "service_role";



GRANT ALL ON TABLE "public"."carregamentos" TO "anon";
GRANT ALL ON TABLE "public"."carregamentos" TO "authenticated";
GRANT ALL ON TABLE "public"."carregamentos" TO "service_role";



GRANT ALL ON TABLE "public"."colaboradores" TO "anon";
GRANT ALL ON TABLE "public"."colaboradores" TO "authenticated";
GRANT ALL ON TABLE "public"."colaboradores" TO "service_role";



GRANT ALL ON TABLE "public"."estoque" TO "anon";
GRANT ALL ON TABLE "public"."estoque" TO "authenticated";
GRANT ALL ON TABLE "public"."estoque" TO "service_role";



GRANT ALL ON TABLE "public"."estoque_remessas" TO "anon";
GRANT ALL ON TABLE "public"."estoque_remessas" TO "authenticated";
GRANT ALL ON TABLE "public"."estoque_remessas" TO "service_role";



GRANT ALL ON TABLE "public"."representantes" TO "anon";
GRANT ALL ON TABLE "public"."representantes" TO "authenticated";
GRANT ALL ON TABLE "public"."representantes" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































