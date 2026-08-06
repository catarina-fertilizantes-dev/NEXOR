-- Configuração global do prazo (em dias) para retirada total de uma
-- liberação, usada no dashboard de cliente/representante para alertar sobre
-- liberações perto do prazo ou já vencidas. O cálculo usa apenas
-- quantidade_retirada (o que já saiu de fato), não a quantidade agendada,
-- já que um agendamento pode não se concretizar na data prevista.

CREATE TABLE public.config_liberacao_prazo (
  id BOOLEAN PRIMARY KEY DEFAULT true,
  prazo_maximo_dias INTEGER NOT NULL DEFAULT 10 CHECK (prazo_maximo_dias > 0),
  dias_alerta INTEGER NOT NULL DEFAULT 5 CHECK (dias_alerta > 0 AND dias_alerta <= prazo_maximo_dias),
  CONSTRAINT config_liberacao_prazo_singleton CHECK (id)
);

INSERT INTO public.config_liberacao_prazo (id, prazo_maximo_dias, dias_alerta) VALUES (true, 10, 5);

ALTER TABLE public.config_liberacao_prazo ENABLE ROW LEVEL SECURITY;

-- Leitura liberada a qualquer autenticado: cliente/representante precisam
-- disso no próprio dashboard, e não é dado sensível.
CREATE POLICY "config_liberacao_prazo_select_all" ON public.config_liberacao_prazo
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "config_liberacao_prazo_update_admin" ON public.config_liberacao_prazo
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  );
