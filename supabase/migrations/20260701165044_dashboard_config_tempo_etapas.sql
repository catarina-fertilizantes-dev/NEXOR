-- Configuração de tempo máximo (em minutos) por etapa de carregamento.
-- Usada pelo dashboard de logística/admin para calcular "Carregamentos Atrasados":
-- um carregamento é considerado atrasado quando permanece na etapa atual por mais
-- tempo do que o configurado aqui. Sem página de configuração ainda — ajustar via banco.

CREATE TABLE public.config_tempo_etapas (
  etapa SMALLINT PRIMARY KEY CHECK (etapa BETWEEN 1 AND 5),
  nome TEXT NOT NULL,
  tempo_maximo_minutos INTEGER NOT NULL CHECK (tempo_maximo_minutos > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.config_tempo_etapas (etapa, nome, tempo_maximo_minutos) VALUES
  (1, 'Chegada', 60),
  (2, 'Início Carregamento', 30),
  (3, 'Carregando', 120),
  (4, 'Carregamento Finalizado', 60),
  (5, 'Documentação', 180);

ALTER TABLE public.config_tempo_etapas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "config_tempo_etapas_select_admin_logistica" ON public.config_tempo_etapas
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'logistica')
    )
  );

CREATE POLICY "config_tempo_etapas_update_admin" ON public.config_tempo_etapas
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
