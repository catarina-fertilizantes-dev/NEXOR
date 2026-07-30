-- Padroniza CPF/CNPJ em representantes e armazens com o mesmo padrão já
-- existente em clientes (CHECK de tamanho 11/14 + UNIQUE). Ver auditoria em
-- 2026-07-29/30: só clientes tinha essas garantias hoje.
--
-- armazens.cnpj_cpf também passa a ser NOT NULL: o formulário (Armazens.tsx)
-- já marca o campo como obrigatório ("CNPJ/CPF *"), o banco só não refletia
-- isso. Confirmado antes de rodar que os 3 armazéns e os 2 representantes
-- cadastrados no Dev já têm o campo preenchido e sem duplicatas.

ALTER TABLE "public"."armazens"
  ALTER COLUMN "cnpj_cpf" SET NOT NULL;

ALTER TABLE "public"."armazens"
  ADD CONSTRAINT "armazens_cnpj_cpf_length_check" CHECK (("char_length"("cnpj_cpf") = ANY (ARRAY[11, 14])));

ALTER TABLE "public"."armazens"
  ADD CONSTRAINT "armazens_cnpj_cpf_unique" UNIQUE ("cnpj_cpf");

ALTER TABLE "public"."representantes"
  ADD CONSTRAINT "representantes_cpf_length_check" CHECK (("char_length"("cpf") = ANY (ARRAY[11, 14])));

ALTER TABLE "public"."representantes"
  ADD CONSTRAINT "representantes_cpf_unique" UNIQUE ("cpf");
