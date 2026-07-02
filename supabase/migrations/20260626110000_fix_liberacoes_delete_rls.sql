-- Migration: Adicionar política RLS de DELETE em liberacoes
--
-- Não existia nenhuma policy de DELETE. Em Supabase/PostgreSQL, sem policy explícita
-- para um comando, o comportamento padrão com RLS habilitado é negar o acesso.
-- Porém, para garantir isso explicitamente e documentar a intenção, criamos a policy.
--
-- Apenas admin e logistica podem deletar liberações (operação rara, mas possível
-- para limpeza administrativa).

CREATE POLICY "liberacoes_delete_admin_logistica" ON public.liberacoes
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'logistica')
    )
  );
