-- "Carregamentos Atrasados" passa de uma janela por etapa_atual (2,3,4,5)
-- pra 3 janelas ancoradas em ações bem definidas: Espera (chegada->início),
-- Carregamento (início->finalização, cobre etapa_atual 3 e 4 juntas) e
-- Documentação (finalização->documentação concluída). A etapa 4 (Em
-- Carregamento) tinha como âncora data_carregando — o timestamp de uma foto
-- que o operador pode tirar a qualquer momento entre o início e o fim do
-- carregamento físico, sem corresponder a um marco real de nada. Usá-la
-- como âncora de "quanto tempo falta pra terminar" gerava falso
-- positivo/negativo sem relação com o atraso real do carregamento.
--
-- etapa=3 é reaproveitada pra representar a janela "Carregamento" (ancorada
-- em data_inicio, não mais em data_carregando) — ver JANELA_POR_ETAPA em
-- src/components/dashboard/DashboardShared.tsx.

DELETE FROM public.config_tempo_etapas WHERE etapa = 4;

UPDATE public.config_tempo_etapas SET nome = 'Espera', tempo_maximo_minutos = 45 WHERE etapa = 2;
UPDATE public.config_tempo_etapas SET nome = 'Carregamento', tempo_maximo_minutos = 180 WHERE etapa = 3;
UPDATE public.config_tempo_etapas SET nome = 'Documentação', tempo_maximo_minutos = 60 WHERE etapa = 5;

-- Aperta o CHECK pra só as 3 etapas com janela própria, sem depender do
-- nome exato do constraint (gerado automaticamente pelo Postgres).
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.config_tempo_etapas'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%etapa%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.config_tempo_etapas DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE public.config_tempo_etapas
  ADD CONSTRAINT config_tempo_etapas_etapa_check CHECK (etapa IN (2, 3, 5));
