-- ATENÇÃO: rodar SOMENTE no SQL Editor do projeto de PRODUÇÃO (sxfomgeddxokdxjazdtg).
-- NÃO faz parte do fluxo de `supabase db push` (que é linkado ao projeto dev,
-- vxidpkrsfqyjwwdbvtwc) — este arquivo é só documentação/histórico, não uma migration.
--
-- Objetivo: bloquear DELETE/TRUNCATE feitos via Supabase Studio (dashboard),
-- que conecta como role `postgres`/`supabase_admin`, para evitar repetição do
-- incidente de 2026-07-08 (exclusão acidental de dados reais de prod pelo
-- dashboard, achando que era o projeto dev).
--
-- O que NÃO é afetado:
--   - Frontend (PostgREST) conecta como anon/authenticated — passa livre.
--   - Edge Functions com service_role — passa livre.
--   - Cascades disparados pelo GoTrue (supabase_auth_admin) — passam livre.
--
-- Como testar depois de aplicar: no dashboard de prod, abrir qualquer tabela,
-- marcar uma linha, clicar em "Delete Rows". Deve falhar com a mensagem de erro,
-- sem apagar nada. Pelo frontend, exclusões reais (ex.: excluir usuário) devem
-- continuar funcionando normalmente.
--
-- Como fazer um DELETE/TRUNCATE consciente em prod quando for realmente necessário:
--   ALTER TABLE public.sua_tabela DISABLE TRIGGER zz_block_admin_delete;
--   -- fazer a operação --
--   ALTER TABLE public.sua_tabela ENABLE TRIGGER zz_block_admin_delete;
--
-- ATENÇÃO — CASCADES: se a tabela tiver colunas referenciadas por outras
-- tabelas com ON DELETE CASCADE, apagar a linha "pai" dispara um DELETE real
-- nas tabelas "filhas" também — e esse DELETE aciona o trigger DELAS, mesmo
-- que você só tenha desativado o trigger da tabela pai. Ou seja: é preciso
-- desativar o trigger em TODA a cadeia de cascade antes de apagar, não só na
-- tabela que você está olhando. Exemplo real (validado em 2026-07-08):
-- apagar uma linha de `armazens` cascateia para `estoque` E `estoque_remessas`
-- (ambas ON DELETE CASCADE) — as 3 precisam ter o trigger desativado.
-- Isso vale também para apagar um usuário em Authentication → Users: o
-- cascade de auth.users para public.user_roles (ON DELETE CASCADE) aciona o
-- trigger de user_roles e bloqueia a exclusão do usuário até você desativar
-- o trigger nela também.
--
-- Depois de QUALQUER operação assim (reativando os triggers), rode
-- `prod-verify-delete-guard.sql` para confirmar que nada ficou destravado —
-- cada ALTER TABLE é uma instrução com autocommit própria, então um erro no
-- meio do script pode deixar uma tabela sem proteção sem nenhum aviso visível.
--
-- IMPORTANTE: tabelas novas criadas em prod DEPOIS de rodar este script não
-- recebem os triggers automaticamente. Sempre que criar uma tabela nova em
-- prod, rode de novo o bloco `DO $$ ... $$` abaixo (é seguro reexecutar).

-- 1. Função que bloqueia deletes vindos de roles administrativos (dashboard/superusuário)
CREATE OR REPLACE FUNCTION public.block_admin_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION
      'Delete/Truncate bloqueado nesta tabela de PRODUCAO via dashboard/admin. Se for realmente necessario, desative o trigger conscientemente.';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 2. Anexa os dois triggers em TODAS as tabelas do schema public
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS zz_block_admin_delete ON public.%I;
       CREATE TRIGGER zz_block_admin_delete
       BEFORE DELETE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.block_admin_delete();',
      r.tablename, r.tablename);

    EXECUTE format(
      'DROP TRIGGER IF EXISTS zz_block_admin_truncate ON public.%I;
       CREATE TRIGGER zz_block_admin_truncate
       BEFORE TRUNCATE ON public.%I
       FOR EACH STATEMENT EXECUTE FUNCTION public.block_admin_delete();',
      r.tablename, r.tablename);
  END LOOP;
END $$;
