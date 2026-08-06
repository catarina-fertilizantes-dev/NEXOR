-- Transferência de Propriedade: registro de saída de estoque quando a Catarina
-- transfere a responsabilidade de armazenagem/retirada pro comprador, sem o
-- fluxo normal Liberação → Agendamento → Carregamento.
--
-- Diferente do fluxo normal (onde a Liberação já reserva quantidade_disponivel
-- bem antes do carregamento finalizar), aqui não existe reserva prévia: o
-- lançamento debita quantidade (físico) E quantidade_disponivel simultaneamente,
-- na mesma transação, via RPC (ver migration seguinte).

CREATE TYPE "public"."estoque_transferencia_status" AS ENUM (
    'ativa',
    'cancelada'
);

ALTER TYPE "public"."estoque_transferencia_status" OWNER TO "postgres";

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
    CONSTRAINT "estoque_transferencias_quantidade_check" CHECK (("quantidade" > (0)::numeric)),
    CONSTRAINT "estoque_transferencias_cliente_check" CHECK (
        (("cliente_id" IS NOT NULL) AND ("cliente_cnpj_texto" IS NULL) AND ("cliente_razao_social_texto" IS NULL))
        OR
        (("cliente_id" IS NULL) AND ("cliente_cnpj_texto" IS NOT NULL) AND ("cliente_razao_social_texto" IS NOT NULL))
    ),
    CONSTRAINT "estoque_transferencias_cnpj_texto_length_check" CHECK (
        "cliente_cnpj_texto" IS NULL OR ("char_length"("cliente_cnpj_texto") = ANY (ARRAY[11, 14]))
    )
);

ALTER TABLE "public"."estoque_transferencias" OWNER TO "postgres";

COMMENT ON TABLE "public"."estoque_transferencias" IS 'Histórico de saídas de estoque por Transferência de Propriedade (sem fluxo de Liberação/Agendamento/Carregamento)';
COMMENT ON COLUMN "public"."estoque_transferencias"."cliente_cnpj_texto" IS 'CNPJ/CPF digitado livremente (só dígitos) quando o comprador não tem cadastro em clientes';
COMMENT ON COLUMN "public"."estoque_transferencias"."cliente_razao_social_texto" IS 'Razão social digitada livremente quando o comprador não tem cadastro em clientes';
COMMENT ON COLUMN "public"."estoque_transferencias"."status" IS 'ativa = debitou estoque; cancelada = estornada, estoque devolvido';

ALTER TABLE ONLY "public"."estoque_transferencias"
    ADD CONSTRAINT "estoque_transferencias_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."estoque_transferencias"
    ADD CONSTRAINT "estoque_transferencias_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."estoque_transferencias"
    ADD CONSTRAINT "estoque_transferencias_armazem_id_fkey" FOREIGN KEY ("armazem_id") REFERENCES "public"."armazens"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."estoque_transferencias"
    ADD CONSTRAINT "estoque_transferencias_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE RESTRICT;

ALTER TABLE ONLY "public"."estoque_transferencias"
    ADD CONSTRAINT "estoque_transferencias_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");

ALTER TABLE ONLY "public"."estoque_transferencias"
    ADD CONSTRAINT "estoque_transferencias_cancelado_por_fkey" FOREIGN KEY ("cancelado_por") REFERENCES "auth"."users"("id");

CREATE INDEX "idx_estoque_transferencias_produto_armazem" ON "public"."estoque_transferencias" USING "btree" ("produto_id", "armazem_id");
CREATE INDEX "idx_estoque_transferencias_cliente_id" ON "public"."estoque_transferencias" USING "btree" ("cliente_id");
CREATE INDEX "idx_estoque_transferencias_cnpj_texto" ON "public"."estoque_transferencias" USING "btree" ("cliente_cnpj_texto");
CREATE INDEX "idx_estoque_transferencias_created_at" ON "public"."estoque_transferencias" USING "btree" ("created_at" DESC);
CREATE INDEX "idx_estoque_transferencias_status" ON "public"."estoque_transferencias" USING "btree" ("status");

ALTER TABLE "public"."estoque_transferencias" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "estoque_transferencias_select_por_permissao" ON "public"."estoque_transferencias" FOR SELECT TO "authenticated" USING (
    (EXISTS (
        SELECT 1 FROM "public"."user_roles" "ur"
        WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"])))
    ))
    OR (EXISTS (
        SELECT 1 FROM "public"."armazens" "a"
        WHERE (("a"."user_id" = "auth"."uid"()) AND ("a"."id" = "estoque_transferencias"."armazem_id"))
    ))
);

CREATE POLICY "estoque_transferencias_insert_policy" ON "public"."estoque_transferencias" FOR INSERT WITH CHECK (
    (EXISTS (
        SELECT 1 FROM "public"."user_roles" "ur"
        WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"])))
    ))
);

CREATE POLICY "estoque_transferencias_update_policy" ON "public"."estoque_transferencias" FOR UPDATE USING (
    (EXISTS (
        SELECT 1 FROM "public"."user_roles" "ur"
        WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = ANY (ARRAY['admin'::"public"."user_role", 'logistica'::"public"."user_role"])))
    ))
);

CREATE POLICY "estoque_transferencias_delete_policy" ON "public"."estoque_transferencias" FOR DELETE USING (
    (EXISTS (
        SELECT 1 FROM "public"."user_roles" "ur"
        WHERE (("ur"."user_id" = "auth"."uid"()) AND ("ur"."role" = 'admin'::"public"."user_role"))
    ))
);

GRANT ALL ON TABLE "public"."estoque_transferencias" TO "anon";
GRANT ALL ON TABLE "public"."estoque_transferencias" TO "authenticated";
GRANT ALL ON TABLE "public"."estoque_transferencias" TO "service_role";
