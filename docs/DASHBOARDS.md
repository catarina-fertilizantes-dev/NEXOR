# NEXOR — Dashboards por Perfil

Os 5 roles têm 3 dashboards personalizados (implementados 2026-07-01 a 2026-07-03, em produção no `develop`):

- `DashboardLogistica.tsx` — admin/logistica
- `DashboardArmazem.tsx` — armazem
- `DashboardCliente.tsx` — cliente e representante (representante agrega todos os clientes que representa via `clientesDoRepresentante`)
- `Dashboard.tsx` — apenas um dispatcher por `userRole`, não tem UI própria

## Arquitetura

- `src/components/dashboard/DashboardShared.tsx` — componentes e helpers reaproveitados entre os 3 dashboards: cards no estilo `StatCard` (`EntityListCard`, `DocumentacaoPendenteCard`, `FunilEtapasCard`, `ProximosAgendamentosCard`, `EstoqueBaixoCard`), helpers de data (`startOfDayISO`/`endOfDayISO`/`addDays`), `media()`, `formatarDuracaoMinutos()`, `ENTRADA_ETAPA_FIELD`.
- Componentes específicos de um único dashboard (ex.: `LiberacoesEmAtrasoCard`, `VeiculosAgendadosCard`, `TemposPorArmazemCard`) ficam locais no arquivo da própria página, não em `DashboardShared`.

## Configs novas criadas só para dashboards (DB-only, sem tela de configuração ainda)

- `config_tempo_etapas` — tempo máximo (minutos) por etapa de carregamento (1–5), usado em "Carregamentos Atrasados"/"Operações Atrasadas". Editável só via SQL direto.
- `config_liberacao_prazo` — tabela singleton (`prazo_maximo_dias`, `dias_alerta`) usada em "Liberações em Atraso" no dashboard de cliente. Cálculo usa só `quantidade_retirada` (nunca agendamentos, que podem não se concretizar).
- `produtos.estoque_minimo` — coluna nullable usada no card "Estoque Baixo". Sem campo no formulário de Produtos ainda.

## Descobertas sobre o fluxo de carregamento relevantes para qualquer métrica de tempo

- A sequência das sub-etapas de documentação é sempre fixa: 5a (Docs. Retorno, armazém) → 5b (Docs. Venda, logística) → 5c (Docs. Remessa, armazém). Ver `getProximaSubEtapa()` em `CarregamentoDetalhe.tsx`.
- `data_retirada` (agendamentos) é `DATE`, sem horário — não dá para medir atraso em minutos nessa granularidade. Por isso a etapa 1 (aguardando chegada) é excluída do cálculo de "atrasado" em todos os dashboards.
- As definições oficiais de tempo médio já existem em `calcularEstatisticas()` de `CarregamentoDetalhe.tsx` (Tempo de Espera, Tempo de Carregamento, Tempo Total do Processo) — sempre reaproveitar essas definições/nomes em vez de inventar novos, para não gerar inconsistência entre páginas.
- `etapa_5a_concluida_em` / `5b` / `5c` (timestamps) foram adicionados numa migration específica para dar suporte aos tempos granulares de documentação — antes só existia o status (pendente/concluida), sem timestamp.
- Dashboard de Logística tem uma tabela "Tempos por Armazém" com uma linha por armazém e 6 colunas de tempo médio (30 dias): 3 de operação (mesmas definições de `calcularEstatisticas()`) + 3 de documentação (Finalizado→1º Doc, 1º→2º Doc, 2º Doc→Finalização). O segmento 1º→2º Doc (5a→5b) é exclusivo da logística e não aparece no dashboard de armazém (lá só aparecem os 2 segmentos que são responsabilidade do próprio armazém).

## Regra: filtro de "liberação em aberto/não finalizada"

Sempre usar os 3 status juntos — `disponivel`, `parcialmente_agendada`, `totalmente_agendada` — nunca um subconjunto. Uma liberação pode estar 100% agendada e ainda não ter sido fisicamente retirada, então excluir `totalmente_agendada` desse filtro já causou um bug real (card "Liberações em Atraso" batendo diferente do StatCard "Liberações em Aberto").

## Regra de layout: cards de altura variável não dividem linha com StatCards fixos

`StatCard` com prop `to` envolve o `Card` num `<Link className="block">`; o Grid CSS estica o `Link`, mas o `Card` visível só ficava do tamanho do próprio conteúdo (sem `h-full`), causando cards visivelmente mais altos que os vizinhos quando o título quebrava em 2 linhas. Fix aplicado: cascata `h-full` — `Link` (`block h-full`) → `Card` (`h-full flex flex-col`) → `CardContent` (`flex-1 flex items-center`).

Daqui pra frente: cards de tamanho variável (ex.: `EntityListCard` com lista que pode crescer) não devem dividir a mesma linha de grid com StatCards de tamanho fixo — ficam em linha própria.

## Seeding de dados de teste

Ver [docs/TESTING.md](TESTING.md) e a regra "nunca inserir dados de teste via SQL direto" em `CLAUDE.md`.
