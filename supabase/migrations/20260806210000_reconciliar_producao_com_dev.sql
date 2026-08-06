-- ============================================================================
-- RECONCILIAÇÃO DE PRODUÇÃO COM O SCHEMA ATUAL DO DEV
-- ============================================================================
-- Gerada em 2026-08-06 a partir de um DIFF REAL entre o schema de produção
-- (dump ao vivo, projeto sxfomgeddxokdxjazdtg) e o schema atual do Dev (dump
-- ao vivo, projeto vxidpkrsfqyjwwdbvtwc) — NÃO é um replay do histórico de
-- ~65 migrations do Dev. A tabela de histórico de migrations de produção não
-- é confiável (anos de edição direta via SQL Editor antes da disciplina de
-- migrations começar) e `baseline_schema.sql` colidiria com objetos que
-- produção já tem. Ver memória de projeto `project_nexor_move_to_production`
-- para o racional completo e a metodologia usada para gerar este arquivo.
--
-- Todas as instruções abaixo são construídas para serem seguras de rodar
-- TANTO em produção (que precisa de tudo isso) QUANTO em Dev (que já tem
-- tudo isso) sem erro — porque este arquivo, uma vez em supabase/migrations/,
-- será considerado por qualquer `supabase db push --linked` futuro,
-- independente do ambiente. Por isso: CREATE TYPE/ADD CONSTRAINT em blocos
-- DO com captura de duplicate_object, ADD COLUMN/CREATE INDEX com
-- IF NOT EXISTS, seeds com ON CONFLICT DO NOTHING.
--
-- >>> AINDA NÃO APLICADA EM NENHUM AMBIENTE — rascunho para revisão. <<<
--
-- Antes de aplicar em produção (checklist):
--   1. Rodar a query de diagnóstico (diagnostico_constraints.sql, enviada
--      separadamente) em prod e confirmar as contagens de violação (ver
--      seção 5 abaixo — usa NOT VALID por isso).
--   2. Testar esta migration inteira num clone/branch de produção primeiro.
--   3. Backup completo de produção imediatamente antes de aplicar de verdade.
-- Depois de aplicar em produção (fora desta migration, manual):
--   4. Re-rodar docs/ops/prod-block-admin-delete.sql (o DO $$ é seguro de
--      re-executar; anexa o guard-rail zz_block_admin_* às 3 tabelas novas).
--   5. `supabase functions deploy --project-ref sxfomgeddxokdxjazdtg` para as
--      4 functions ativas (estão com código desatualizado, nov/2025-jan/2026).
--   6. `supabase functions delete safe-upload-foto/safe-upload-documento
--      --project-ref sxfomgeddxokdxjazdtg` (código morto, já removido do Dev
--      em 2026-07-16, mas ainda ACTIVE em produção).
--   7. Se a seção 5 abaixo ficou com VALIDATE CONSTRAINT comentado, decidir
--      o que fazer com as linhas antigas que violam e validar depois.

SET check_function_bodies = false;


-- ============================================================================
-- SEÇÃO 1 — Tipo novo
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE "public"."estoque_transferencia_status" AS ENUM (
      'ativa',
      'cancelada'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================================
-- SEÇÃO 2 — Tabelas novas (config_liberacao_prazo, config_tempo_etapas,
-- estoque_transferencias) + PK/FK/índices + dados de configuração inicial
-- ============================================================================

CREATE TABLE IF NOT EXISTS "public"."config_liberacao_prazo" (
    "id" boolean DEFAULT true NOT NULL,
    "prazo_maximo_dias" integer DEFAULT 10 NOT NULL,
    "dias_alerta" integer DEFAULT 5 NOT NULL,
    CONSTRAINT "config_liberacao_prazo_check" CHECK ((("dias_alerta" > 0) AND ("dias_alerta" <= "prazo_maximo_dias"))),
    CONSTRAINT "config_liberacao_prazo_prazo_maximo_dias_check" CHECK (("prazo_maximo_dias" > 0)),
    CONSTRAINT "config_liberacao_prazo_singleton" CHECK ("id")
);

CREATE TABLE IF NOT EXISTS "public"."config_tempo_etapas" (
    "etapa" smallint NOT NULL,
    "nome" "text" NOT NULL,
    "tempo_maximo_minutos" integer NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "config_tempo_etapas_etapa_check" CHECK (("etapa" = ANY (ARRAY[2, 3, 5]))),
    CONSTRAINT "config_tempo_etapas_tempo_maximo_minutos_check" CHECK (("tempo_maximo_minutos" > 0))
);

CREATE TABLE IF NOT EXISTS "public"."estoque_transferencias" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "produto_id" "uuid" NOT NULL,
    "armazem_id" "uuid" NOT NULL,
    "quantidade" numeric NOT NULL,
    "cliente_id" "uuid",
    "cliente_cnpj_texto" "text",
    "cliente_razao_social_texto" "text",
    "numero_pedido" "text" NOT NULL,
    "data_transferencia" "date" DEFAULT CURRENT_DATE NOT NULL,
    "url_nota" "text" NOT NULL,
    "url_xml" "text" NOT NULL,
    "status" "public"."estoque_transferencia_status" DEFAULT 'ativa'::"public"."estoque_transferencia_status" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "cancelado_por" "uuid",
    "cancelado_em" timestamp with time zone,
    CONSTRAINT "estoque_transferencias_cliente_check" CHECK (((("cliente_id" IS NOT NULL) AND ("cliente_cnpj_texto" IS NULL) AND ("cliente_razao_social_texto" IS NULL)) OR (("cliente_id" IS NULL) AND ("cliente_cnpj_texto" IS NOT NULL) AND ("cliente_razao_social_texto" IS NOT NULL)))),
    CONSTRAINT "estoque_transferencias_cnpj_texto_length_check" CHECK ((("cliente_cnpj_texto" IS NULL) OR ("char_length"("cliente_cnpj_texto") = ANY (ARRAY[11, 14])))),
    CONSTRAINT "estoque_transferencias_quantidade_check" CHECK (("quantidade" > (0)::numeric))
);

COMMENT ON TABLE "public"."estoque_transferencias" IS 'Histórico de saídas de estoque por Transferência de Propriedade (sem fluxo de Liberação/Agendamento/Carregamento)';
COMMENT ON COLUMN "public"."estoque_transferencias"."cliente_cnpj_texto" IS 'CNPJ/CPF digitado livremente (só dígitos) quando o comprador não tem cadastro em clientes';
COMMENT ON COLUMN "public"."estoque_transferencias"."cliente_razao_social_texto" IS 'Razão social digitada livremente quando o comprador não tem cadastro em clientes';
COMMENT ON COLUMN "public"."estoque_transferencias"."status" IS 'ativa = debitou estoque; cancelada = estornada, estoque devolvido';

-- PRIMARY KEY usa checagem direta em pg_constraint, não EXCEPTION WHEN
-- duplicate_object: adicionar uma 2a PK numa tabela que já tem uma gera
-- "multiple primary keys ... not allowed" (SQLSTATE 42P16), não 42710 —
-- confirmado batendo nisso ao testar contra o Dev (que já tem as 3 tabelas).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'config_liberacao_prazo_pkey' AND conrelid = 'public.config_liberacao_prazo'::regclass) THEN
    ALTER TABLE ONLY "public"."config_liberacao_prazo" ADD CONSTRAINT "config_liberacao_prazo_pkey" PRIMARY KEY ("id");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'config_tempo_etapas_pkey' AND conrelid = 'public.config_tempo_etapas'::regclass) THEN
    ALTER TABLE ONLY "public"."config_tempo_etapas" ADD CONSTRAINT "config_tempo_etapas_pkey" PRIMARY KEY ("etapa");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'estoque_transferencias_pkey' AND conrelid = 'public.estoque_transferencias'::regclass) THEN
    ALTER TABLE ONLY "public"."estoque_transferencias" ADD CONSTRAINT "estoque_transferencias_pkey" PRIMARY KEY ("id");
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."estoque_transferencias" ADD CONSTRAINT "estoque_transferencias_armazem_id_fkey" FOREIGN KEY ("armazem_id") REFERENCES "public"."armazens"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."estoque_transferencias" ADD CONSTRAINT "estoque_transferencias_cancelado_por_fkey" FOREIGN KEY ("cancelado_por") REFERENCES "auth"."users"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."estoque_transferencias" ADD CONSTRAINT "estoque_transferencias_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."estoque_transferencias" ADD CONSTRAINT "estoque_transferencias_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."estoque_transferencias" ADD CONSTRAINT "estoque_transferencias_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "idx_estoque_transferencias_cliente_id" ON "public"."estoque_transferencias" USING "btree" ("cliente_id");
CREATE INDEX IF NOT EXISTS "idx_estoque_transferencias_cnpj_texto" ON "public"."estoque_transferencias" USING "btree" ("cliente_cnpj_texto");
CREATE INDEX IF NOT EXISTS "idx_estoque_transferencias_created_at" ON "public"."estoque_transferencias" USING "btree" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_estoque_transferencias_produto_armazem" ON "public"."estoque_transferencias" USING "btree" ("produto_id", "armazem_id");
CREATE INDEX IF NOT EXISTS "idx_estoque_transferencias_status" ON "public"."estoque_transferencias" USING "btree" ("status");

ALTER TABLE "public"."config_liberacao_prazo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."config_tempo_etapas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."estoque_transferencias" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE "public"."config_liberacao_prazo" TO "anon";
GRANT ALL ON TABLE "public"."config_liberacao_prazo" TO "authenticated";
GRANT ALL ON TABLE "public"."config_liberacao_prazo" TO "service_role";
GRANT ALL ON TABLE "public"."config_tempo_etapas" TO "anon";
GRANT ALL ON TABLE "public"."config_tempo_etapas" TO "authenticated";
GRANT ALL ON TABLE "public"."config_tempo_etapas" TO "service_role";
GRANT ALL ON TABLE "public"."estoque_transferencias" TO "anon";
GRANT ALL ON TABLE "public"."estoque_transferencias" TO "authenticated";
GRANT ALL ON TABLE "public"."estoque_transferencias" TO "service_role";

-- Configuração inicial (mesmos valores atuais do Dev — ajustar depois via UI se
-- produção precisar de números diferentes de prazo/alerta/tempo por etapa)
INSERT INTO "public"."config_liberacao_prazo" ("id", "prazo_maximo_dias", "dias_alerta")
VALUES (true, 10, 5)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "public"."config_tempo_etapas" ("etapa", "nome", "tempo_maximo_minutos") VALUES
    (2, 'Espera', 45),
    (3, 'Carregamento', 180),
    (5, 'Documentação', 60)
ON CONFLICT ("etapa") DO NOTHING;

-- ============================================================================
-- SEÇÃO 3 — Funções novas/alteradas (CREATE OR REPLACE, idempotente por
-- natureza). Ordem: helpers de validação primeiro (usados pelas constraints
-- da Seção 5), depois o resto.
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."_cpf_cnpj_dv"("digitos" "text", "pesos" integer[]) RETURNS integer
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
  soma int := 0;
  resto int;
  i int;
BEGIN
  FOR i IN 1..length(digitos) LOOP
    soma := soma + (substring(digitos FROM i FOR 1)::int * pesos[i]);
  END LOOP;
  resto := soma % 11;
  IF resto < 2 THEN
    RETURN 0;
  ELSE
    RETURN 11 - resto;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."validar_cnpj"("cnpj" "text") RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    AS $_$
DECLARE
  d1 int;
  d2 int;
BEGIN
  IF cnpj IS NULL OR length(cnpj) != 14 OR cnpj ~ '^(\d)\1{13}$' THEN
    RETURN false;
  END IF;
  d1 := "public"."_cpf_cnpj_dv"(substring(cnpj FROM 1 FOR 12), ARRAY[5,4,3,2,9,8,7,6,5,4,3,2]);
  d2 := "public"."_cpf_cnpj_dv"(substring(cnpj FROM 1 FOR 12) || d1::text, ARRAY[6,5,4,3,2,9,8,7,6,5,4,3,2]);
  RETURN cnpj = substring(cnpj FROM 1 FOR 12) || d1::text || d2::text;
END;
$_$;

CREATE OR REPLACE FUNCTION "public"."validar_cpf"("cpf" "text") RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    AS $_$
DECLARE
  d1 int;
  d2 int;
BEGIN
  IF cpf IS NULL OR length(cpf) != 11 OR cpf ~ '^(\d)\1{10}$' THEN
    RETURN false;
  END IF;
  d1 := "public"."_cpf_cnpj_dv"(substring(cpf FROM 1 FOR 9), ARRAY[10,9,8,7,6,5,4,3,2]);
  d2 := "public"."_cpf_cnpj_dv"(substring(cpf FROM 1 FOR 9) || d1::text, ARRAY[11,10,9,8,7,6,5,4,3,2]);
  RETURN cpf = substring(cpf FROM 1 FOR 9) || d1::text || d2::text;
END;
$_$;

CREATE OR REPLACE FUNCTION "public"."validar_cpf_ou_cnpj"("documento" "text") RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
  digs text;
BEGIN
  digs := regexp_replace(coalesce(documento, ''), '\D', '', 'g');
  IF length(digs) = 11 THEN
    RETURN "public"."validar_cpf"(digs);
  ELSIF length(digs) = 14 THEN
    RETURN "public"."validar_cnpj"(digs);
  ELSE
    RETURN false;
  END IF;
END;
$$;

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


CREATE OR REPLACE FUNCTION "public"."can_access_carregamento_arquivo"("_user_id" "uuid", "_object_name" "text", "_for_insert" boolean DEFAULT false) RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  _carregamento_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role IN ('admin', 'logistica')) THEN
    RETURN TRUE;
  END IF;

  BEGIN
    _carregamento_id := split_part(_object_name, '_', 1)::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
  END;

  IF _for_insert THEN
    -- Chegou aqui = quem chama não é admin/logistica. "5b" (Docs. Venda) é
    -- responsabilidade exclusiva de logística/admin — bloquear mesmo que seja
    -- o armazém dono do carregamento.
    IF split_part(_object_name, '_', 2) = '5b' THEN
      RETURN FALSE;
    END IF;

    RETURN EXISTS (
      SELECT 1 FROM carregamentos c
      JOIN armazens a ON a.id = c.armazem_id
      WHERE c.id = _carregamento_id AND a.user_id = _user_id
    );
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM carregamentos c
    WHERE c.id = _carregamento_id AND (
      EXISTS (SELECT 1 FROM armazens a WHERE a.id = c.armazem_id AND a.user_id = _user_id)
      OR EXISTS (SELECT 1 FROM clientes cl WHERE cl.id = c.cliente_id AND cl.user_id = _user_id)
      OR EXISTS (
        SELECT 1 FROM representantes r
        JOIN clientes cl ON cl.representante_id = r.id
        WHERE cl.id = c.cliente_id AND r.user_id = _user_id
      )
    )
  );
END;
$$;


CREATE OR REPLACE FUNCTION "public"."can_access_estoque_arquivo"("_user_id" "uuid", "_object_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  _armazem_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role IN ('admin', 'logistica')) THEN
    RETURN TRUE;
  END IF;

  BEGIN
    _armazem_id := split_part(_object_name, '_', 2)::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
  END;

  RETURN EXISTS (SELECT 1 FROM armazens a WHERE a.id = _armazem_id AND a.user_id = _user_id);
END;
$$;


CREATE OR REPLACE FUNCTION "public"."update_user_role"("_user_id" "uuid", "_role" "public"."user_role") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::user_role) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF _role NOT IN ('admin', 'logistica') THEN
    RAISE EXCEPTION 'update_user_role só aceita role admin ou logistica';
  END IF;

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
END;
$$;


CREATE OR REPLACE FUNCTION "public"."get_users_with_roles"() RETURNS TABLE("id" "uuid", "nome" "text", "email" "text", "created_at" timestamp with time zone, "roles" "public"."user_role"[])
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::user_role) OR public.has_role(auth.uid(), 'logistica'::user_role)) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  WITH entity_users AS (
    SELECT c.user_id AS id, c.nome FROM public.clientes c WHERE c.user_id IS NOT NULL
    UNION
    SELECT a.user_id AS id, a.nome FROM public.armazens a WHERE a.user_id IS NOT NULL
    UNION
    SELECT col.user_id AS id, col.nome FROM public.colaboradores col WHERE col.user_id IS NOT NULL
    UNION
    SELECT au.id, COALESCE(au.raw_user_meta_data->>'nome', au.email) AS nome
    FROM auth.users au
    WHERE NOT EXISTS (
      SELECT 1 FROM public.clientes c WHERE c.user_id = au.id
      UNION SELECT 1 FROM public.armazens a WHERE a.user_id = au.id
      UNION SELECT 1 FROM public.colaboradores col WHERE col.user_id = au.id
    )
  )
  SELECT u.id, u.nome, au.email::text, au.created_at,
         COALESCE(array_agg(DISTINCT ur.role) FILTER (WHERE ur.role IS NOT NULL), ARRAY[]::user_role[]) AS roles
  FROM entity_users u
  JOIN auth.users au ON au.id = u.id
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  GROUP BY u.id, u.nome, au.email, au.created_at
  ORDER BY au.created_at DESC;
END;
$$;


-- Assinatura de retorno mudou (colunas novas) — CREATE OR REPLACE nao cobre isso, precisa DROP antes
DROP FUNCTION IF EXISTS "public"."get_agendamentos_universal"("text","uuid","uuid","uuid","uuid");
CREATE OR REPLACE FUNCTION "public"."get_agendamentos_universal"("p_user_role" "text", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_cliente_id" "uuid" DEFAULT NULL::"uuid", "p_armazem_id" "uuid" DEFAULT NULL::"uuid", "p_representante_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "liberacao_id" "uuid", "data_retirada" "date", "quantidade" numeric, "motorista_nome" "text", "motorista_documento" "text", "placa_caminhao" "text", "placa_carreta_1" "text", "placa_carreta_2" "text", "transportadora" "text", "cnpj_transportadora" "text", "status" "public"."agendamento_status", "observacoes" "text", "created_by" "uuid", "created_at" timestamp with time zone, "cliente_id" "uuid", "updated_at" timestamp with time zone, "armazem_id" "uuid", "cancelado_em" timestamp with time zone, "pedido_interno" "text", "quantidade_liberada" numeric, "quantidade_retirada" numeric, "data_liberacao" "date", "status_liberacao" "public"."liberacao_status", "cliente_nome" "text", "cliente_cnpj_cpf" "text", "produto_id" "uuid", "produto_nome" "text", "produto_unidade" "text", "armazem_nome" "text", "armazem_cidade" "text", "armazem_estado" "text", "carregamento_id" "uuid", "etapa_atual" smallint, "status_carregamento" "text", "percentual_carregamento" integer, "tooltip_carregamento" "text", "finalizado" boolean)
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


-- Assinatura de retorno mudou (colunas novas) — CREATE OR REPLACE nao cobre isso, precisa DROP antes
DROP FUNCTION IF EXISTS "public"."get_carregamento_detalhe_universal"("uuid","text","uuid","uuid","uuid","uuid");
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
    SELECT cl2.id INTO v_cliente_id FROM clientes cl2 WHERE cl2.user_id = auth.uid();
    SELECT am2.id INTO v_armazem_id FROM armazens am2 WHERE am2.user_id = auth.uid();
    SELECT rp2.id INTO v_representante_id FROM representantes rp2 WHERE rp2.user_id = auth.uid();

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


-- Assinatura de retorno mudou (colunas novas) — CREATE OR REPLACE nao cobre isso, precisa DROP antes
DROP FUNCTION IF EXISTS "public"."get_carregamentos_universal"("text","uuid","uuid","uuid","uuid");
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


-- Assinatura de retorno mudou (colunas novas) — CREATE OR REPLACE nao cobre isso, precisa DROP antes
DROP FUNCTION IF EXISTS "public"."get_liberacoes_universal"("text","uuid","uuid","uuid","uuid");
CREATE OR REPLACE FUNCTION "public"."get_liberacoes_universal"("p_user_role" "text" DEFAULT NULL::"text", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_cliente_id" "uuid" DEFAULT NULL::"uuid", "p_armazem_id" "uuid" DEFAULT NULL::"uuid", "p_representante_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "pedido_interno" "text", "quantidade_liberada" numeric, "quantidade_retirada" numeric, "quantidade_agendada" numeric, "quantidade_disponivel" numeric, "percentual_retirado" integer, "percentual_agendado" integer, "finalizada" boolean, "data_liberacao" "date", "status" "public"."liberacao_status", "cliente_id" "uuid", "produto_id" "uuid", "armazem_id" "uuid", "created_at" timestamp with time zone, "cancelado_em" timestamp with time zone, "cliente_nome" "text", "cliente_cnpj_cpf" "text", "produto_nome" "text", "produto_unidade" "text", "armazem_nome" "text", "armazem_cidade" "text", "armazem_estado" "text", "armazem_endereco" "text")
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


CREATE OR REPLACE FUNCTION "public"."insert_carregamento_from_agendamento"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
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
END;
$$;


CREATE OR REPLACE FUNCTION "public"."sync_estoque_fisico_from_carregamento"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


CREATE OR REPLACE FUNCTION "public"."sync_liberacao_agendamento_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


CREATE OR REPLACE FUNCTION "public"."sync_liberacao_quantidade_retirada"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


CREATE OR REPLACE FUNCTION "public"."calcular_cancelamento_liberacao"("p_liberacao_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_lib                 liberacoes%ROWTYPE;
  v_qty_em_andamento    numeric := 0;
  v_qty_a_devolver      numeric := 0;
  v_tem_carreg_iniciado boolean := false;
  v_tem_carreg_finalizado boolean := false;
BEGIN
  SELECT * INTO v_lib FROM liberacoes WHERE id = p_liberacao_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Liberação não encontrada');
  END IF;

  SELECT
    EXISTS (
      SELECT 1
      FROM agendamentos ag
      JOIN carregamentos c ON c.agendamento_id = ag.id
      WHERE ag.liberacao_id = p_liberacao_id
        AND c.etapa_atual BETWEEN 2 AND 5
    ),
    EXISTS (
      SELECT 1
      FROM agendamentos ag
      JOIN carregamentos c ON c.agendamento_id = ag.id
      WHERE ag.liberacao_id = p_liberacao_id
        AND c.etapa_atual = 6
    )
  INTO v_tem_carreg_iniciado, v_tem_carreg_finalizado;

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
    'pode_cancelar',           NOT (v_tem_carreg_iniciado OR v_tem_carreg_finalizado),
    'motivo_bloqueio',         CASE
                                     WHEN v_tem_carreg_finalizado
                                     THEN 'Esta liberação já possui carregamento(s) finalizado(s). Utilize "Alterar Quantidade" para reduzir o total ao que já foi comprometido.'
                                     WHEN v_tem_carreg_iniciado
                                     THEN 'Esta liberação já possui carregamento(s) iniciado(s). Utilize "Alterar Quantidade" para reduzir o total ao que já foi comprometido.'
                                     ELSE NULL END,
    'quantidade_a_devolver',   v_qty_a_devolver,
    'quantidade_em_andamento', v_qty_em_andamento,
    'quantidade_retirada',     v_lib.quantidade_retirada,
    'quantidade_liberada',     v_lib.quantidade_liberada
  );
END;
$$;


CREATE OR REPLACE FUNCTION "public"."cancelar_liberacao"("p_liberacao_id" "uuid", "p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_lib                liberacoes%ROWTYPE;
  v_qty_em_andamento    numeric := 0;
  v_qty_a_devolver      numeric := 0;
  v_tem_carreg_iniciado boolean := false;
  v_tem_carreg_finalizado boolean := false;
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

  -- 2. Existe carregamento já iniciado (etapa 2-5) ou finalizado (etapa 6)?
  --    Em ambos os casos o cancelamento não é mais permitido — só reduzir a
  --    quantidade via alterar_quantidade_liberacao.
  SELECT
    EXISTS (
      SELECT 1
      FROM agendamentos ag
      JOIN carregamentos c ON c.agendamento_id = ag.id
      WHERE ag.liberacao_id = p_liberacao_id
        AND c.etapa_atual BETWEEN 2 AND 5
    ),
    EXISTS (
      SELECT 1
      FROM agendamentos ag
      JOIN carregamentos c ON c.agendamento_id = ag.id
      WHERE ag.liberacao_id = p_liberacao_id
        AND c.etapa_atual = 6
    )
  INTO v_tem_carreg_iniciado, v_tem_carreg_finalizado;

  IF v_tem_carreg_finalizado THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Esta liberação já possui carregamento(s) finalizado(s) e não pode mais ser cancelada. Utilize "Alterar Quantidade" para reduzir o total ao que já foi comprometido.'
    );
  ELSIF v_tem_carreg_iniciado THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Esta liberação já possui carregamento(s) iniciado(s) e não pode mais ser cancelada. Utilize "Alterar Quantidade" para reduzir o total ao que já foi comprometido.'
    );
  END IF;

  -- 3. Carregamentos em andamento (etapa 2–5, caminhão presente mas não finalizado)
  --    Sempre 0 neste ponto (passo 2 já bloqueou), mantido para compor o retorno.
  SELECT COALESCE(SUM(ag.quantidade), 0)
  INTO v_qty_em_andamento
  FROM agendamentos ag
  JOIN carregamentos c ON c.agendamento_id = ag.id
  WHERE ag.liberacao_id = p_liberacao_id
    AND c.etapa_atual BETWEEN 2 AND 5;

  -- 4. Quantidade a devolver = total liberado - já retirado - em carregamento ativo
  v_qty_a_devolver := v_lib.quantidade_liberada
                    - v_lib.quantidade_retirada
                    - v_qty_em_andamento;

  -- 5. Deletar carregamentos não iniciados (etapa 1)
  DELETE FROM carregamentos c
  USING agendamentos ag
  WHERE c.agendamento_id = ag.id
    AND ag.liberacao_id = p_liberacao_id
    AND c.etapa_atual = 1;

  -- 6. Arquivar todos os agendamentos desta liberação
  UPDATE agendamentos
  SET status = 'cancelado', updated_at = now()
  WHERE liberacao_id = p_liberacao_id
    AND status != 'cancelado';

  -- 7. Devolver quantidade ao estoque do armazém atual
  IF v_qty_a_devolver > 0 THEN
    UPDATE estoque
    SET quantidade_disponivel = quantidade_disponivel + v_qty_a_devolver,
        updated_at  = now(),
        updated_by  = p_user_id
    WHERE armazem_id = v_lib.armazem_id
      AND produto_id = v_lib.produto_id;
  END IF;

  -- 8. Setar liberação como cancelada com auditoria
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


CREATE OR REPLACE FUNCTION "public"."calcular_alteracao_liberacao"("p_liberacao_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_lib                liberacoes%ROWTYPE;
  v_qty_em_andamento   numeric := 0;
  v_qty_comprometida   numeric := 0;
  v_qty_agendada_ativa numeric := 0;
  v_piso                numeric := 0;
  v_estoque_disponivel numeric := 0;
BEGIN
  SELECT * INTO v_lib FROM liberacoes WHERE id = p_liberacao_id;

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

  SELECT COALESCE(quantidade_disponivel, 0)
  INTO v_estoque_disponivel
  FROM estoque
  WHERE produto_id = v_lib.produto_id
    AND armazem_id = v_lib.armazem_id;

  RETURN jsonb_build_object(
    'success',                  true,
    'quantidade_liberada',      v_lib.quantidade_liberada,
    'quantidade_retirada',      v_lib.quantidade_retirada,
    'quantidade_em_andamento',  v_qty_em_andamento,
    'quantidade_agendada_ativa', v_qty_agendada_ativa,
    'quantidade_comprometida',  v_piso,
    'estoque_disponivel',       v_estoque_disponivel,
    'quantidade_maxima',        v_lib.quantidade_liberada + v_estoque_disponivel
  );
END;
$$;


CREATE OR REPLACE FUNCTION "public"."alterar_quantidade_liberacao"("p_liberacao_id" "uuid", "p_nova_quantidade" numeric, "p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


CREATE OR REPLACE FUNCTION "public"."cancelar_agendamento"("p_agendamento_id" "uuid", "p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


CREATE OR REPLACE FUNCTION "public"."editar_agendamento"("p_agendamento_id" "uuid", "p_quantidade" numeric, "p_data_retirada" "date", "p_placa_caminhao" "text", "p_placa_carreta_1" "text", "p_placa_carreta_2" "text", "p_motorista_nome" "text", "p_motorista_documento" "text", "p_transportadora" "text", "p_cnpj_transportadora" "text", "p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


CREATE OR REPLACE FUNCTION "public"."alterar_quantidade_agendamento"("p_agendamento_id" "uuid", "p_nova_quantidade" numeric, "p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para alterar agendamentos');
  END IF;

  IF p_nova_quantidade IS NULL OR p_nova_quantidade <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quantidade inválida');
  END IF;

  SELECT * INTO v_ag FROM agendamentos WHERE id = p_agendamento_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Agendamento não encontrado');
  END IF;
  IF v_ag.status = 'cancelado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Agendamento cancelado não pode ser alterado');
  END IF;

  SELECT etapa_atual INTO v_etapa_atual
  FROM carregamentos
  WHERE agendamento_id = p_agendamento_id;

  IF v_etapa_atual IS NULL OR v_etapa_atual != 1 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Só é possível alterar a quantidade enquanto a chegada do caminhão ainda não foi registrada'
    );
  END IF;

  -- A validação de saldo disponível na liberação já é feita pelo trigger
  -- aaa_validate_agendamento_quantidade (BEFORE UPDATE), que soma de volta
  -- a quantidade antiga do próprio agendamento antes de comparar.
  UPDATE agendamentos
  SET quantidade = p_nova_quantidade,
      updated_at = now()
  WHERE id = p_agendamento_id;

  RETURN jsonb_build_object(
    'success', true,
    'quantidade_anterior', v_ag.quantidade,
    'quantidade_nova', p_nova_quantidade
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


CREATE OR REPLACE FUNCTION "public"."calcular_cancelamento_transferencia"("p_transferencia_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


CREATE OR REPLACE FUNCTION "public"."registrar_transferencia_propriedade"("p_produto_id" "uuid", "p_armazem_id" "uuid", "p_quantidade" numeric, "p_cliente_id" "uuid", "p_cliente_cnpj_texto" "text", "p_cliente_razao_social_texto" "text", "p_numero_pedido" "text", "p_data_transferencia" "date", "p_url_nota" "text", "p_url_xml" "text", "p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


CREATE OR REPLACE FUNCTION "public"."cancelar_transferencia_propriedade"("p_transferencia_id" "uuid", "p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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



-- ============================================================================
-- SEÇÃO 4 — Colunas novas em tabelas já existentes
-- ============================================================================

ALTER TABLE "public"."agendamentos" ADD COLUMN IF NOT EXISTS "cancelado_por" "uuid";
ALTER TABLE "public"."agendamentos" ADD COLUMN IF NOT EXISTS "cancelado_em" timestamp with time zone;

ALTER TABLE "public"."liberacoes" ADD COLUMN IF NOT EXISTS "cancelado_por" "uuid";
ALTER TABLE "public"."liberacoes" ADD COLUMN IF NOT EXISTS "cancelado_em" timestamp with time zone;

ALTER TABLE "public"."produtos" ADD COLUMN IF NOT EXISTS "estoque_minimo" numeric;

ALTER TABLE "public"."carregamentos" ADD COLUMN IF NOT EXISTS "etapa_5a_concluida_em" timestamp with time zone;
ALTER TABLE "public"."carregamentos" ADD COLUMN IF NOT EXISTS "etapa_5b_concluida_em" timestamp with time zone;
ALTER TABLE "public"."carregamentos" ADD COLUMN IF NOT EXISTS "etapa_5c_concluida_em" timestamp with time zone;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."agendamentos" ADD CONSTRAINT "agendamentos_cancelado_por_fkey" FOREIGN KEY ("cancelado_por") REFERENCES "auth"."users"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."liberacoes" ADD CONSTRAINT "liberacoes_cancelado_por_fkey" FOREIGN KEY ("cancelado_por") REFERENCES "auth"."users"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."produtos" ADD CONSTRAINT "produtos_estoque_minimo_check" CHECK ((("estoque_minimo" IS NULL) OR ("estoque_minimo" > (0)::numeric)));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- SEÇÃO 5 — Constraints de validação novas em tabelas com dado existente
-- ============================================================================
-- Usa NOT VALID: a constraint passa a valer para toda escrita NOVA a partir
-- de agora, mas NÃO varre/bloqueia linhas antigas na hora do ADD. A validação
-- retroativa (VALIDATE CONSTRAINT, no fim desta seção) só deve rodar depois
-- de confirmar 0 violações via diagnostico_constraints.sql em prod — se
-- houver violação, aplicar esta migration inteira continua seguro, só a
-- VALIDATE fica pendente até decidirmos o que fazer com o dado antigo.
--
-- ÚNICA EXCEÇÃO: "armazens.cnpj_cpf" virar NOT NULL não tem equivalente
-- NOT VALID — se o diagnóstico mostrar alguma linha com cnpj_cpf NULL, essa
-- linha específica (armazens_cnpj_cpf_not_null) vai falhar e precisa ser
-- comentada/ajustada antes de aplicar em prod.

DO $$ BEGIN
  ALTER TABLE ONLY "public"."armazens" ADD CONSTRAINT "armazens_cnpj_cpf_length_check" CHECK (("char_length"("cnpj_cpf") = ANY (ARRAY[11, 14]))) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."armazens" ADD CONSTRAINT "armazens_cnpj_cpf_checksum_check" CHECK ("public"."validar_cpf_ou_cnpj"("cnpj_cpf")) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."armazens" ADD CONSTRAINT "armazens_cep_length_check" CHECK ((("cep" IS NULL) OR ("length"("regexp_replace"("cep", '\D'::"text", ''::"text", 'g'::"text")) = 8))) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."armazens" ADD CONSTRAINT "armazens_telefone_length_check" CHECK ((("telefone" IS NULL) OR ("length"("regexp_replace"("telefone", '\D'::"text", ''::"text", 'g'::"text")) = ANY (ARRAY[10, 11])))) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- armazens.cnpj_cpf NOT NULL — gatilhado pelo diagnóstico, ver comentário acima
ALTER TABLE "public"."armazens" ALTER COLUMN "cnpj_cpf" SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."clientes" ADD CONSTRAINT "clientes_cnpj_cpf_checksum_check" CHECK ("public"."validar_cpf_ou_cnpj"("cnpj_cpf")) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."clientes" ADD CONSTRAINT "clientes_cep_length_check" CHECK ((("cep" IS NULL) OR ("length"("regexp_replace"("cep", '\D'::"text", ''::"text", 'g'::"text")) = 8))) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."clientes" ADD CONSTRAINT "clientes_telefone_length_check" CHECK ((("telefone" IS NULL) OR ("length"("regexp_replace"("telefone", '\D'::"text", ''::"text", 'g'::"text")) = ANY (ARRAY[10, 11])))) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."representantes" ADD CONSTRAINT "representantes_cpf_length_check" CHECK (("char_length"("cpf") = ANY (ARRAY[11, 14]))) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."representantes" ADD CONSTRAINT "representantes_cpf_checksum_check" CHECK ("public"."validar_cpf_ou_cnpj"("cpf")) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."representantes" ADD CONSTRAINT "representantes_telefone_length_check" CHECK ((("telefone" IS NULL) OR ("length"("regexp_replace"("telefone", '\D'::"text", ''::"text", 'g'::"text")) = ANY (ARRAY[10, 11])))) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."agendamentos" ADD CONSTRAINT "agendamentos_cnpj_transportadora_checksum_check" CHECK ("public"."validar_cnpj"("cnpj_transportadora")) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ONLY "public"."agendamentos" ADD CONSTRAINT "agendamentos_motorista_documento_checksum_check" CHECK ("public"."validar_cpf"("motorista_documento")) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- --------------------------------------------------------------------------
-- VALIDATE CONSTRAINT — diagnostico_constraints.sql confirmado 0 violações em
-- 2026-08-06 (13/13 checagens limpas; a única violação, armazens.cep do
-- SITREX com 7 dígitos, foi corrigida por Alessandro via UI antes desta
-- atualização — CEP correto 79304-110). Todas ativas.
-- --------------------------------------------------------------------------
ALTER TABLE "public"."armazens" VALIDATE CONSTRAINT "armazens_cnpj_cpf_length_check";
ALTER TABLE "public"."armazens" VALIDATE CONSTRAINT "armazens_cnpj_cpf_checksum_check";
ALTER TABLE "public"."armazens" VALIDATE CONSTRAINT "armazens_cep_length_check";
ALTER TABLE "public"."armazens" VALIDATE CONSTRAINT "armazens_telefone_length_check";
ALTER TABLE "public"."clientes" VALIDATE CONSTRAINT "clientes_cnpj_cpf_checksum_check";
ALTER TABLE "public"."clientes" VALIDATE CONSTRAINT "clientes_cep_length_check";
ALTER TABLE "public"."clientes" VALIDATE CONSTRAINT "clientes_telefone_length_check";
ALTER TABLE "public"."representantes" VALIDATE CONSTRAINT "representantes_cpf_length_check";
ALTER TABLE "public"."representantes" VALIDATE CONSTRAINT "representantes_cpf_checksum_check";
ALTER TABLE "public"."representantes" VALIDATE CONSTRAINT "representantes_telefone_length_check";
ALTER TABLE "public"."agendamentos" VALIDATE CONSTRAINT "agendamentos_cnpj_transportadora_checksum_check";
ALTER TABLE "public"."agendamentos" VALIDATE CONSTRAINT "agendamentos_motorista_documento_checksum_check";

-- ============================================================================
-- SEÇÃO 6 — Funções mortas que só existem em produção (o Dev já removeu
-- estas no processo de auditoria de 2026-07-15/17). NÃO inclui
-- "block_admin_delete" (guard-rail intencional, só de produção).
-- ============================================================================

DROP FUNCTION IF EXISTS "public"."can_upload_documento_for_carregamento"("_user_id" "uuid", "_carregamento_id" "uuid");
DROP FUNCTION IF EXISTS "public"."can_upload_foto_for_carregamento"("_user_id" "uuid", "_carregamento_id" "uuid");
DROP FUNCTION IF EXISTS "public"."get_agendamentos_by_representante_backup"("p_representante_id" "uuid");
DROP FUNCTION IF EXISTS "public"."get_carregamento_detalhe_by_representante_backup"("p_representante_id" "uuid", "p_carregamento_id" "uuid");
DROP FUNCTION IF EXISTS "public"."get_carregamentos_by_representante_backup"("p_representante_id" "uuid");
DROP FUNCTION IF EXISTS "public"."get_colaboradores"();
DROP FUNCTION IF EXISTS "public"."get_liberacoes_by_representante_backup"("p_representante_id" "uuid");
DROP FUNCTION IF EXISTS "public"."get_liberacoes_disponiveis_universal"("p_user_role" "text", "p_user_id" "uuid", "p_cliente_id" "uuid", "p_representante_id" "uuid");
DROP FUNCTION IF EXISTS "public"."has_role"("p_role" "text");
DROP FUNCTION IF EXISTS "public"."is_representante_of_cliente"("cliente_uuid" "uuid");
DROP FUNCTION IF EXISTS "public"."sync_estoque_from_carregamento_backup"();

-- ============================================================================
-- SEÇÃO 7 — RLS do schema public: remover policies antigas/permissivas de
-- produção e criar as versões atuais do Dev. Inclui as 3 correções de
-- segurança confirmadas ativas em produção (2026-08-06):
--   - estoque_insert_auth / estoque_update_auth / produtos_insert_auth eram
--     WITH CHECK/USING (true) para QUALQUER autenticado (cliente, armazém,
--     representante incluídos) — qualquer um podia escrever estoque/produto.
--   - liberacoes_update_admin_logistica (mesmo nome, corpo diferente) também
--     permitia cliente/armazém dono da linha dar UPDATE direto na liberação,
--     por fora das RPCs de negócio (cancelar_liberacao etc.).
-- ============================================================================

DROP POLICY IF EXISTS "Clientes visualização por si ou admin/logistica" ON "public"."clientes";
DROP POLICY IF EXISTS "Produtos visualização por roles" ON "public"."produtos";
DROP POLICY IF EXISTS "authenticated_read_clientes" ON "public"."clientes";
DROP POLICY IF EXISTS "authenticated_read_colaboradores" ON "public"."colaboradores";
DROP POLICY IF EXISTS "authenticated_read_produtos" ON "public"."produtos";
DROP POLICY IF EXISTS "carregamentos_create_por_permissao" ON "public"."carregamentos";
DROP POLICY IF EXISTS "carregamentos_update_por_permissao" ON "public"."carregamentos";
DROP POLICY IF EXISTS "estoque_insert_auth" ON "public"."estoque";
DROP POLICY IF EXISTS "estoque_update_auth" ON "public"."estoque";
DROP POLICY IF EXISTS "logistica_admin_estoque_all" ON "public"."estoque";
DROP POLICY IF EXISTS "produtos_insert_auth" ON "public"."produtos";
DROP POLICY IF EXISTS "produtos_select_auth" ON "public"."produtos";
DROP POLICY IF EXISTS "produtos_update_auth" ON "public"."produtos";
DROP POLICY IF EXISTS "liberacoes_update_admin_logistica" ON "public"."liberacoes";

DROP POLICY IF EXISTS "clientes_select_representante" ON "public"."clientes";
CREATE POLICY "clientes_select_representante" ON "public"."clientes" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."representantes" "r"
  WHERE (("r"."user_id" = "auth"."uid"()) AND ("r"."id" = "clientes"."representante_id")))));

DROP POLICY IF EXISTS "config_liberacao_prazo_select_all" ON "public"."config_liberacao_prazo";
CREATE POLICY "config_liberacao_prazo_select_all" ON "public"."config_liberacao_prazo" FOR SELECT TO "authenticated" USING (true);

DROP POLICY IF EXISTS "config_liberacao_prazo_update_admin" ON "public"."config_liberacao_prazo";
CREATE POLICY "config_liberacao_prazo_update_admin" ON "public"."config_liberacao_prazo" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = 'admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = 'admin'::"public"."user_role")))));

DROP POLICY IF EXISTS "config_tempo_etapas_select_admin_logistica" ON "public"."config_tempo_etapas";
CREATE POLICY "config_tempo_etapas_select_admin_logistica" ON "public"."config_tempo_etapas" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"]))))));

DROP POLICY IF EXISTS "config_tempo_etapas_update_admin" ON "public"."config_tempo_etapas";
CREATE POLICY "config_tempo_etapas_update_admin" ON "public"."config_tempo_etapas" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = 'admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = 'admin'::"public"."user_role")))));

DROP POLICY IF EXISTS "estoque_delete_admin" ON "public"."estoque";
CREATE POLICY "estoque_delete_admin" ON "public"."estoque" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = 'admin'::"public"."user_role")))));

DROP POLICY IF EXISTS "estoque_insert_admin_logistica" ON "public"."estoque";
CREATE POLICY "estoque_insert_admin_logistica" ON "public"."estoque" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"]))))));

DROP POLICY IF EXISTS "estoque_transferencias_delete_policy" ON "public"."estoque_transferencias";
CREATE POLICY "estoque_transferencias_delete_policy" ON "public"."estoque_transferencias" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = 'admin'::"public"."user_role")))));

DROP POLICY IF EXISTS "estoque_transferencias_insert_policy" ON "public"."estoque_transferencias";
CREATE POLICY "estoque_transferencias_insert_policy" ON "public"."estoque_transferencias" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"]))))));

DROP POLICY IF EXISTS "estoque_transferencias_select_por_permissao" ON "public"."estoque_transferencias";
CREATE POLICY "estoque_transferencias_select_por_permissao" ON "public"."estoque_transferencias" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"]))))) OR (EXISTS ( SELECT 1
   FROM "public"."armazens" "a"
  WHERE (("a"."user_id" = "auth"."uid"()) AND ("a"."id" = "estoque_transferencias"."armazem_id"))))));

DROP POLICY IF EXISTS "estoque_transferencias_update_policy" ON "public"."estoque_transferencias";
CREATE POLICY "estoque_transferencias_update_policy" ON "public"."estoque_transferencias" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"]))))));

DROP POLICY IF EXISTS "estoque_update_admin_logistica" ON "public"."estoque";
CREATE POLICY "estoque_update_admin_logistica" ON "public"."estoque" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"]))))));

DROP POLICY IF EXISTS "liberacoes_delete_admin_logistica" ON "public"."liberacoes";
CREATE POLICY "liberacoes_delete_admin_logistica" ON "public"."liberacoes" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"]))))));

DROP POLICY IF EXISTS "produtos_delete_admin" ON "public"."produtos";
CREATE POLICY "produtos_delete_admin" ON "public"."produtos" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = 'admin'::"public"."user_role")))));

DROP POLICY IF EXISTS "produtos_insert_admin_logistica" ON "public"."produtos";
CREATE POLICY "produtos_insert_admin_logistica" ON "public"."produtos" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"]))))));

DROP POLICY IF EXISTS "produtos_select_por_role" ON "public"."produtos";
CREATE POLICY "produtos_select_por_role" ON "public"."produtos" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role", 'cliente'::"public"."user_role", 'armazem'::"public"."user_role", 'representante'::"public"."user_role"]))))));

DROP POLICY IF EXISTS "produtos_update_admin_logistica" ON "public"."produtos";
CREATE POLICY "produtos_update_admin_logistica" ON "public"."produtos" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"]))))));

DROP POLICY IF EXISTS "carregamentos_insert_arm_admin_logistica" ON "public"."carregamentos";
CREATE POLICY "carregamentos_insert_arm_admin_logistica" ON "public"."carregamentos" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"]))))) OR (EXISTS ( SELECT 1
   FROM "public"."armazens" "a"
  WHERE (("a"."user_id" = "auth"."uid"()) AND ("a"."id" = "carregamentos"."armazem_id"))))));

DROP POLICY IF EXISTS "carregamentos_update_arm_admin_logistica" ON "public"."carregamentos";
CREATE POLICY "carregamentos_update_arm_admin_logistica" ON "public"."carregamentos" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"]))))) OR (EXISTS ( SELECT 1
   FROM "public"."armazens" "a"
  WHERE (("a"."user_id" = "auth"."uid"()) AND ("a"."id" = "carregamentos"."armazem_id")))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"]))))) OR (EXISTS ( SELECT 1
   FROM "public"."armazens" "a"
  WHERE (("a"."user_id" = "auth"."uid"()) AND ("a"."id" = "carregamentos"."armazem_id"))))));

DROP POLICY IF EXISTS "liberacoes_update_admin_logistica" ON "public"."liberacoes";
CREATE POLICY "liberacoes_update_admin_logistica" ON "public"."liberacoes" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles" "ur"
  WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"]))))));

-- ============================================================================
-- SEÇÃO 8 — RLS de storage.objects: as policies de produção têm os MESMOS
-- NOMES que as do Dev mas corpos completamente diferentes e bem mais
-- permissivos — confirmado 2026-08-06 (achado crítico não documentado antes
-- desta sessão): em produção, "carregamento_documentos_select_policy" e
-- "carregamento_fotos_select_policy" liberam para QUALQUER role autenticado
-- (cliente, armazém, representante, admin, logistica) sem checar dono —
-- ou seja, qualquer cliente logado podia baixar fotos/documentos de
-- carregamento de QUALQUER OUTRO cliente. As novas usam
-- can_access_carregamento_arquivo/can_access_estoque_arquivo (Seção 3),
-- que já checam posse real.
-- ============================================================================

DROP POLICY IF EXISTS "carregamento_documentos_select_policy" ON "storage"."objects";
DROP POLICY IF EXISTS "carregamento_documentos_upload_policy" ON "storage"."objects";
DROP POLICY IF EXISTS "carregamento_fotos_select_policy" ON "storage"."objects";
DROP POLICY IF EXISTS "carregamento_fotos_upload_policy" ON "storage"."objects";
DROP POLICY IF EXISTS "estoque_documentos_delete_policy" ON "storage"."objects";
DROP POLICY IF EXISTS "estoque_documentos_select_policy" ON "storage"."objects";
DROP POLICY IF EXISTS "estoque_documentos_upload_policy" ON "storage"."objects";

DROP POLICY IF EXISTS "carregamento_documentos_select_policy" ON "storage"."objects";
CREATE POLICY "carregamento_documentos_select_policy" ON "storage"."objects" FOR SELECT USING ((("bucket_id" = 'carregamento-documentos'::"text") AND "public"."can_access_carregamento_arquivo"("auth"."uid"(), "name", false)));

DROP POLICY IF EXISTS "carregamento_documentos_upload_policy" ON "storage"."objects";
CREATE POLICY "carregamento_documentos_upload_policy" ON "storage"."objects" FOR INSERT WITH CHECK ((("bucket_id" = 'carregamento-documentos'::"text") AND "public"."can_access_carregamento_arquivo"("auth"."uid"(), "name", true)));

DROP POLICY IF EXISTS "carregamento_fotos_select_policy" ON "storage"."objects";
CREATE POLICY "carregamento_fotos_select_policy" ON "storage"."objects" FOR SELECT USING ((("bucket_id" = 'carregamento-fotos'::"text") AND "public"."can_access_carregamento_arquivo"("auth"."uid"(), "name", false)));

DROP POLICY IF EXISTS "carregamento_fotos_upload_policy" ON "storage"."objects";
CREATE POLICY "carregamento_fotos_upload_policy" ON "storage"."objects" FOR INSERT WITH CHECK ((("bucket_id" = 'carregamento-fotos'::"text") AND "public"."can_access_carregamento_arquivo"("auth"."uid"(), "name", true)));

DROP POLICY IF EXISTS "estoque_documentos_delete_policy" ON "storage"."objects";
CREATE POLICY "estoque_documentos_delete_policy" ON "storage"."objects" FOR DELETE USING ((("bucket_id" = 'estoque-documentos'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"])))))));

DROP POLICY IF EXISTS "estoque_documentos_select_policy" ON "storage"."objects";
CREATE POLICY "estoque_documentos_select_policy" ON "storage"."objects" FOR SELECT USING ((("bucket_id" = 'estoque-documentos'::"text") AND "public"."can_access_estoque_arquivo"("auth"."uid"(), "name")));

DROP POLICY IF EXISTS "estoque_documentos_upload_policy" ON "storage"."objects";
CREATE POLICY "estoque_documentos_upload_policy" ON "storage"."objects" FOR INSERT WITH CHECK ((("bucket_id" = 'estoque-documentos'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."user_id" = "auth"."uid"()) AND ("user_roles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"])))))));

