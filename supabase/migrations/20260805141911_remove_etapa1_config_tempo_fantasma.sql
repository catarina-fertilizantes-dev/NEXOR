-- A etapa 1 (Aguardando Chegada) nunca deveria ter um prazo de "tempo máximo
-- na etapa": ao contrário das etapas 2-5, ela não é uma ação em andamento com
-- um timestamp de entrada — é um estado de espera controlado pela data
-- agendada da retirada (agendamentos.data_retirada). O frontend já excluía
-- etapa 1 do cálculo de "Carregamentos Atrasados" (nunca usava esse limite
-- pra flagar nada), mas a dica do card ainda exibia o prazo configurado aqui,
-- criando a impressão enganosa de que ele era aplicado.

DELETE FROM public.config_tempo_etapas WHERE etapa = 1;

-- Aperta o CHECK de 1-5 pra 2-5, sem depender do nome exato do constraint
-- original (gerado automaticamente pelo Postgres na criação da tabela).
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
  ADD CONSTRAINT config_tempo_etapas_etapa_check CHECK (etapa BETWEEN 2 AND 5);
