-- Remove as 3 funções de diagnóstico temporárias criadas em 20260716142221,
-- 20260716142409 e 20260716142551 — só serviram para investigar por que um
-- usuário não conseguia ser excluído do Authentication (conclusão: sem FK/
-- trigger no banco bloqueando; provavelmente questão pontual do Studio).
DROP FUNCTION IF EXISTS "public"."tmp_diag_find_user_refs"("uuid");
DROP FUNCTION IF EXISTS "public"."tmp_diag_auth_triggers"();
DROP FUNCTION IF EXISTS "public"."tmp_diag_find_uuid_anywhere"("uuid");
DROP FUNCTION IF EXISTS "public"."tmp_diag_auth_internal_refs"("uuid");
