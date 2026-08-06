-- Limite mínimo de estoque por produto, usado pelo dashboard de logística/admin
-- para o alerta de "Estoque Baixo". NULL = sem alerta configurado para o produto.
-- Por produto (não por armazém) porque a unidade (t/kg) já varia por produto e um
-- limite fixo global não faria sentido entre produtos de escalas diferentes.
-- Sem campo no formulário de Produtos ainda — ajustar via banco por enquanto,
-- mesmo padrão adotado para config_tempo_etapas.

ALTER TABLE public.produtos
  ADD COLUMN estoque_minimo NUMERIC CHECK (estoque_minimo IS NULL OR estoque_minimo > 0);
