-- As 4 RPCs *_backup abaixo não são chamadas por nenhum código em src/ nem em
-- supabase/functions/ (confirmado via grep) — sobraram de um refactor anterior.
-- Cada uma filtra só por WHERE cl.representante_id = p_representante_id, sem
-- nenhuma checagem de auth.uid()/role, e está GRANT'ada para "anon" (padrão do
-- Supabase para toda função nova). Ou seja, qualquer pessoa, mesmo sem login,
-- podia chamar e ler liberações/agendamentos/carregamentos de qualquer
-- representante só sabendo o UUID. Como não têm uso real, a correção é remover.

DROP FUNCTION IF EXISTS "public"."get_agendamentos_by_representante_backup"("uuid");

DROP FUNCTION IF EXISTS "public"."get_carregamento_detalhe_by_representante_backup"("uuid", "uuid");

DROP FUNCTION IF EXISTS "public"."get_carregamentos_by_representante_backup"("uuid");

DROP FUNCTION IF EXISTS "public"."get_liberacoes_by_representante_backup"("uuid");
