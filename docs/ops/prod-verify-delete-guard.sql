-- Rodar no SQL Editor do projeto de PRODUÇÃO (sxfomgeddxokdxjazdtg) para
-- confirmar que o guard-rail contra DELETE/TRUNCATE acidental (ver
-- prod-block-admin-delete.sql) está intacto em TODAS as tabelas de public.
--
-- Rode isto SEMPRE que:
--   - acabar de instalar/reinstalar o guard-rail;
--   - fizer qualquer DELETE/TRUNCATE consciente em prod (o procedimento
--     documentado é DISABLE TRIGGER -> operação -> ENABLE TRIGGER; como cada
--     ALTER TABLE é uma instrução com autocommit própria, um erro no meio do
--     script pode deixar uma tabela destravada sem nenhum aviso visível);
--   - criar uma tabela nova em prod (ela não recebe os triggers automaticamente,
--     é preciso rodar de novo o bloco DO $$ ... $$ de prod-block-admin-delete.sql).
--
-- Resultado esperado: NENHUMA LINHA retornada. Qualquer linha retornada é uma
-- tabela com o trigger de DELETE e/ou TRUNCATE ausente ou desativado — trate
-- como incidente até corrigir (normalmente basta rodar de novo o bloco DO $$
-- de prod-block-admin-delete.sql, ou reativar o trigger específico que ficou
-- desligado).

SELECT
  c.relname AS tabela,
  COALESCE(bool_or(t.tgname = 'zz_block_admin_delete' AND t.tgenabled = 'O'), false) AS delete_protegido,
  COALESCE(bool_or(t.tgname = 'zz_block_admin_truncate' AND t.tgenabled = 'O'), false) AS truncate_protegido
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_trigger t ON t.tgrelid = c.oid AND t.tgname LIKE 'zz_block_admin%'
WHERE n.nspname = 'public' AND c.relkind = 'r'
GROUP BY c.relname
HAVING NOT (
  COALESCE(bool_or(t.tgname = 'zz_block_admin_delete' AND t.tgenabled = 'O'), false)
  AND COALESCE(bool_or(t.tgname = 'zz_block_admin_truncate' AND t.tgenabled = 'O'), false)
)
ORDER BY tabela;
