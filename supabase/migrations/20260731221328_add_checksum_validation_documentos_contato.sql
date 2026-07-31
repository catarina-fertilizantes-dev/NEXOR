-- Fecha a lacuna descoberta em 2026-07-31: a validação de dígito verificador de
-- CPF/CNPJ (e a de tamanho de telefone/CEP) existia só no frontend. Confirmado
-- via chamada direta à Edge Function create-customer-user (bypassando a tela)
-- que um CPF "11111111111" (dígito verificador inválido) era aceito sem erro,
-- porque tanto a Edge Function quanto o banco só verificavam o tamanho.
--
-- Esta migration adiciona a validação real (módulo 11) como CHECK constraint,
-- última camada de defesa independente de como o dado chega (Edge Function,
-- extensão de navegador, chamada de API direta, ou um bug futuro no frontend).
-- As Edge Functions (create-customer-user/create-representante-user/
-- create-armazem-user) recebem a mesma validação, redeployadas separadamente.

-- ============================================================
-- 1. Funções de validação (módulo 11), espelhando src/lib/documentValidation.ts
-- ============================================================

CREATE OR REPLACE FUNCTION "public"."_cpf_cnpj_dv"("digitos" text, "pesos" integer[])
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
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

CREATE OR REPLACE FUNCTION "public"."validar_cpf"("cpf" text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
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
$$;

CREATE OR REPLACE FUNCTION "public"."validar_cnpj"("cnpj" text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
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
$$;

CREATE OR REPLACE FUNCTION "public"."validar_cpf_ou_cnpj"("documento" text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
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

-- ============================================================
-- 2. Corrige os fixtures de teste com checksum inválido, ANTES de travar
--    a constraint (achados via auditoria de leitura em 2026-07-31 — nenhum
--    outro registro em clientes/armazens/representantes/agendamentos tinha
--    esse problema). Só o dígito verificador muda; o restante do número
--    (prefixo) é mantido igual para continuar reconhecível como o mesmo
--    fixture. "Teste Bypass Backend" era um registro criado durante o teste
--    de segurança desta mesma investigação (chamada direta à Edge Function),
--    não um fixture real — corrigido do mesmo jeito por simplicidade.
-- ============================================================

UPDATE "public"."clientes" SET "cnpj_cpf" = '11222333000181'
  WHERE "id" = 'f3768e10-0abe-4001-87f3-5533f3104d85' AND "cnpj_cpf" = '11222333000144';

UPDATE "public"."clientes" SET "cnpj_cpf" = '33444555000181'
  WHERE "id" = 'eb15e1f9-4f7d-4c9e-98f3-9050a17ef4df' AND "cnpj_cpf" = '33444555000122';

UPDATE "public"."clientes" SET "cnpj_cpf" = '55666777000181'
  WHERE "id" = 'a17ccf3d-e4bb-40e6-b9b4-1a97dff4514a' AND "cnpj_cpf" = '55666777000188';

UPDATE "public"."clientes" SET "cnpj_cpf" = '52998224725'
  WHERE "id" = '7726b526-3243-48f6-9a7f-a5855489c400' AND "cnpj_cpf" = '11111111111';

UPDATE "public"."armazens" SET "cnpj_cpf" = '12345678000195'
  WHERE "id" = '1249e35e-7df5-4228-a319-93ae1fbff8f6' AND "cnpj_cpf" = '12345678000190';

UPDATE "public"."armazens" SET "cnpj_cpf" = '98765432000198'
  WHERE "id" = '18606706-f260-40e9-ad9f-118954728346' AND "cnpj_cpf" = '98765432000110';

UPDATE "public"."armazens" SET "cnpj_cpf" = '11111111000191'
  WHERE "id" = 'c6e14ee2-2169-44fc-bb33-a67f049bcdbf' AND "cnpj_cpf" = '11111111111111';

-- Confere que a correção realmente deixou os dados válidos antes de travar
-- a constraint (aborta a migration inteira se sobrar algo inválido).
DO $$
DECLARE
  invalidos int;
BEGIN
  SELECT count(*) INTO invalidos FROM "public"."clientes" WHERE NOT "public"."validar_cpf_ou_cnpj"("cnpj_cpf");
  IF invalidos > 0 THEN
    RAISE EXCEPTION 'Ainda existem % clientes com CNPJ/CPF inválido após a correção dos fixtures', invalidos;
  END IF;
  SELECT count(*) INTO invalidos FROM "public"."armazens" WHERE NOT "public"."validar_cpf_ou_cnpj"("cnpj_cpf");
  IF invalidos > 0 THEN
    RAISE EXCEPTION 'Ainda existem % armazéns com CNPJ/CPF inválido após a correção dos fixtures', invalidos;
  END IF;
  SELECT count(*) INTO invalidos FROM "public"."representantes" WHERE NOT "public"."validar_cpf_ou_cnpj"("cpf");
  IF invalidos > 0 THEN
    RAISE EXCEPTION 'Existem % representantes com CPF/CNPJ inválido', invalidos;
  END IF;
  SELECT count(*) INTO invalidos FROM "public"."agendamentos" WHERE NOT "public"."validar_cpf"("motorista_documento");
  IF invalidos > 0 THEN
    RAISE EXCEPTION 'Existem % agendamentos com CPF de motorista inválido', invalidos;
  END IF;
  SELECT count(*) INTO invalidos FROM "public"."agendamentos" WHERE NOT "public"."validar_cnpj"("cnpj_transportadora");
  IF invalidos > 0 THEN
    RAISE EXCEPTION 'Existem % agendamentos com CNPJ de transportadora inválido', invalidos;
  END IF;
END $$;

-- ============================================================
-- 3. CHECK constraints de dígito verificador (CPF/CNPJ)
-- ============================================================

ALTER TABLE "public"."clientes"
  ADD CONSTRAINT "clientes_cnpj_cpf_checksum_check" CHECK ("public"."validar_cpf_ou_cnpj"("cnpj_cpf"));

ALTER TABLE "public"."armazens"
  ADD CONSTRAINT "armazens_cnpj_cpf_checksum_check" CHECK ("public"."validar_cpf_ou_cnpj"("cnpj_cpf"));

ALTER TABLE "public"."representantes"
  ADD CONSTRAINT "representantes_cpf_checksum_check" CHECK ("public"."validar_cpf_ou_cnpj"("cpf"));

-- Agendamento: motorista_documento é sempre CPF (pessoa física), cnpj_transportadora
-- é sempre CNPJ — diferente dos cadastros acima, aqui não aceita "CPF ou CNPJ".
ALTER TABLE "public"."agendamentos"
  ADD CONSTRAINT "agendamentos_motorista_documento_checksum_check" CHECK ("public"."validar_cpf"("motorista_documento"));

ALTER TABLE "public"."agendamentos"
  ADD CONSTRAINT "agendamentos_cnpj_transportadora_checksum_check" CHECK ("public"."validar_cnpj"("cnpj_transportadora"));

-- ============================================================
-- 4. CHECK constraints de tamanho (telefone/CEP) — campos opcionais,
--    a constraint só entra em vigor quando o campo está preenchido.
-- ============================================================

ALTER TABLE "public"."clientes"
  ADD CONSTRAINT "clientes_telefone_length_check" CHECK ("telefone" IS NULL OR length(regexp_replace("telefone", '\D', '', 'g')) = ANY (ARRAY[10, 11]));
ALTER TABLE "public"."clientes"
  ADD CONSTRAINT "clientes_cep_length_check" CHECK ("cep" IS NULL OR length(regexp_replace("cep", '\D', '', 'g')) = 8);

ALTER TABLE "public"."armazens"
  ADD CONSTRAINT "armazens_telefone_length_check" CHECK ("telefone" IS NULL OR length(regexp_replace("telefone", '\D', '', 'g')) = ANY (ARRAY[10, 11]));
ALTER TABLE "public"."armazens"
  ADD CONSTRAINT "armazens_cep_length_check" CHECK ("cep" IS NULL OR length(regexp_replace("cep", '\D', '', 'g')) = 8);

ALTER TABLE "public"."representantes"
  ADD CONSTRAINT "representantes_telefone_length_check" CHECK ("telefone" IS NULL OR length(regexp_replace("telefone", '\D', '', 'g')) = ANY (ARRAY[10, 11]));
