-- Remove a função de diagnóstico temporária criada em 20260716003025 — só serviu
-- para confirmar o estado real das policies de storage.objects (que divergiam
-- do histórico de migrations, por terem sido criadas direto no Dashboard).
DROP FUNCTION IF EXISTS "public"."tmp_diag_storage_policies"();
