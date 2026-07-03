-- Timestamp de conclusão de cada sub-etapa de documentação (5a/5b/5c).
-- Hoje só existe o status ('pendente'/'concluida'), sem registro de quando cada
-- documento foi anexado. Necessário para o dashboard de armazém calcular:
--   - tempo entre Carregamento Finalizado e o primeiro documento anexado
--   - tempo entre o documento anexado pela logística (5b) e a finalização do
--     carregamento (quando o armazém completa 5a/5c e o processo fecha)

ALTER TABLE public.carregamentos
  ADD COLUMN etapa_5a_concluida_em TIMESTAMPTZ,
  ADD COLUMN etapa_5b_concluida_em TIMESTAMPTZ,
  ADD COLUMN etapa_5c_concluida_em TIMESTAMPTZ;
