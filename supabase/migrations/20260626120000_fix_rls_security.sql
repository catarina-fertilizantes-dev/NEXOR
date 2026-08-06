-- Migration: Correção de políticas RLS com falhas de segurança
-- Detectados por testes automatizados em 2026-06-26
--
-- Bugs corrigidos:
--  1. estoque INSERT/UPDATE — qualquer autenticado podia escrever diretamente
--  2. produtos INSERT/UPDATE — qualquer autenticado podia gerenciar produtos
--  3. colaboradores SELECT — clientes/armazens/representantes viam toda a equipe interna
--  4. clientes SELECT — qualquer autenticado via todos os clientes (cliente A via dados do cliente B)
--  5. carregamentos INSERT/UPDATE — clientes e representantes podiam criar/modificar carregamentos

-- ============================================================
-- 1. ESTOQUE — restringir INSERT e UPDATE a admin/logística
-- ============================================================

-- Drops das políticas permissivas (WITH CHECK (true) e USING (true))
DROP POLICY IF EXISTS "estoque_insert_auth" ON public.estoque;
DROP POLICY IF EXISTS "estoque_update_auth" ON public.estoque;
-- Também remove política legada que pode existir
DROP POLICY IF EXISTS "logistica_admin_estoque_all" ON public.estoque;

-- INSERT: apenas admin e logística podem criar registros de estoque
CREATE POLICY "estoque_insert_admin_logistica" ON public.estoque
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'logistica')
    )
  );

-- UPDATE: apenas admin e logística podem atualizar estoque diretamente
-- (triggers de sistema como sync_estoque_from_liberacao rodam como postgres e bypassam RLS)
CREATE POLICY "estoque_update_admin_logistica" ON public.estoque
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'logistica')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'logistica')
    )
  );

-- DELETE: apenas admin pode deletar registros de estoque
DROP POLICY IF EXISTS "estoque_delete_admin" ON public.estoque;
CREATE POLICY "estoque_delete_admin" ON public.estoque
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  );

-- ============================================================
-- 2. PRODUTOS — restringir INSERT e UPDATE a admin/logística
-- ============================================================

DROP POLICY IF EXISTS "produtos_insert_auth" ON public.produtos;
DROP POLICY IF EXISTS "produtos_update_auth" ON public.produtos;
-- Remove SELECT legado permissivo (mantemos apenas o com roles explícitas)
DROP POLICY IF EXISTS "authenticated_read_produtos" ON public.produtos;
DROP POLICY IF EXISTS "Produtos visualização por roles" ON public.produtos;

-- SELECT: todos os roles que precisam usar produtos podem ler (armazem e representante precisam ver nome do produto)
CREATE POLICY "produtos_select_por_role" ON public.produtos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'logistica', 'cliente', 'armazem', 'representante')
    )
  );

-- INSERT: apenas admin e logística
CREATE POLICY "produtos_insert_admin_logistica" ON public.produtos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'logistica')
    )
  );

-- UPDATE: apenas admin e logística
CREATE POLICY "produtos_update_admin_logistica" ON public.produtos
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'logistica')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'logistica')
    )
  );

-- DELETE: apenas admin
DROP POLICY IF EXISTS "produtos_delete_admin" ON public.produtos;
CREATE POLICY "produtos_delete_admin" ON public.produtos
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  );

-- ============================================================
-- 3. COLABORADORES — restringir leitura a admin/logística + self
-- ============================================================

-- Remove política permissiva que expunha toda a equipe interna
DROP POLICY IF EXISTS "authenticated_read_colaboradores" ON public.colaboradores;

-- Mantém:
--   colaboradores_admin_logistica_all  (já existe — CRUD para admin/logistica)
--   colaboradores_view_self            (já existe — colaborador vê seus próprios dados)

-- ============================================================
-- 4. CLIENTES — restringir leitura por role
-- ============================================================

-- Remove política que expunha todos os clientes para qualquer autenticado
DROP POLICY IF EXISTS "authenticated_read_clientes" ON public.clientes;
-- Remove políticas legadas/duplicadas de SELECT
DROP POLICY IF EXISTS "Clientes visualização por si ou admin/logistica" ON public.clientes;

-- SELECT para cliente: vê apenas seus próprios dados
-- (clientes_read_own já existe, mantém)
-- SELECT para admin/logística: vê todos
-- (admin_logistica_veem_clientes já existe, mantém)
-- SELECT para representante: vê apenas clientes que representa
DROP POLICY IF EXISTS "clientes_select_representante" ON public.clientes;
CREATE POLICY "clientes_select_representante" ON public.clientes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.representantes r
      WHERE r.user_id = auth.uid()
        AND r.id = public.clientes.representante_id
    )
  );

-- ============================================================
-- 5. CARREGAMENTOS — remover cliente e representante do INSERT e UPDATE
-- ============================================================
-- Regra de negócio: apenas armazém, admin e logística criam e modificam carregamentos
-- Clientes e representantes têm acesso de LEITURA apenas (já coberto pelo SELECT policy)
-- Os carregamentos são criados automaticamente via trigger quando agendamento é inserido

DROP POLICY IF EXISTS "carregamentos_create_por_permissao" ON public.carregamentos;
CREATE POLICY "carregamentos_insert_arm_admin_logistica" ON public.carregamentos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'logistica')
    )
    OR EXISTS (
      SELECT 1 FROM public.armazens a
      WHERE a.user_id = auth.uid()
        AND a.id = public.carregamentos.armazem_id
    )
  );

DROP POLICY IF EXISTS "carregamentos_update_por_permissao" ON public.carregamentos;
CREATE POLICY "carregamentos_update_arm_admin_logistica" ON public.carregamentos
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'logistica')
    )
    OR EXISTS (
      SELECT 1 FROM public.armazens a
      WHERE a.user_id = auth.uid()
        AND a.id = public.carregamentos.armazem_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'logistica')
    )
    OR EXISTS (
      SELECT 1 FROM public.armazens a
      WHERE a.user_id = auth.uid()
        AND a.id = public.carregamentos.armazem_id
    )
  );
