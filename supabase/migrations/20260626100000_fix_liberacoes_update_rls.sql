-- Migration: Corrigir política RLS de UPDATE em liberacoes
--
-- Bug: a policy "liberacoes_update_admin_logistica" permitia UPDATE para clientes e
-- armazéns em qualquer liberação que eles podiam ver via SELECT. Isso permitia que
-- um cliente alterasse campos como quantidade_liberada ou status diretamente via API.
--
-- Correção: UPDATE em liberacoes deve ser exclusivo para admin e logistica.
-- Clientes e armazéns não têm caso de uso legítimo para alterar liberações —
-- suas interações acontecem via agendamentos (clientes) ou carregamentos (armazéns).

DROP POLICY IF EXISTS "liberacoes_update_admin_logistica" ON public.liberacoes;

CREATE POLICY "liberacoes_update_admin_logistica" ON public.liberacoes
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
