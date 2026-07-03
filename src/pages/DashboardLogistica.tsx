import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ClipboardList,
  ClipboardX,
  Calendar,
  CalendarDays,
  CalendarRange,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Warehouse,
  Building2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  startOfDayISO,
  endOfDayISO,
  addDays,
  ENTRADA_ETAPA_FIELD,
  EntityListCard,
  DocumentacaoPendenteCard,
  DocumentacaoPendenteItem,
  SUB_ETAPAS_DOCUMENTACAO,
  FunilEtapasCard,
  ETAPA_LABELS,
  ProximosAgendamentosCard,
  ProximoAgendamentoItem,
  EstoqueBaixoCard,
  EstoqueBaixoItem,
  TitleWithInfo,
  formatarDuracaoMinutos,
  media,
} from "@/components/dashboard/DashboardShared";

interface TemposArmazemRow {
  armazemId: string;
  nome: string;
  tempoEspera: number | null;
  tempoCarregamento: number | null;
  tempoTotalProcesso: number | null;
  finalizadoAte1Doc: number | null;
  doc1AteDoc2: number | null;
  doc2AteFinalizacao: number | null;
}

// Médias dos últimos 30 dias, quebradas por armazém, para a logística
// identificar rapidamente qual armazém está com gargalo em qual etapa.
function TemposPorArmazemCard({ dados, isLoading }: { dados: TemposArmazemRow[] | undefined; isLoading: boolean }) {
  const linhas = dados ?? [];

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <TitleWithInfo
          title="Tempos por Armazém (últimos 30 dias)"
          tooltip="Tempo médio de operação e de documentação de cada armazém, para identificar onde há gargalo."
        />
      </CardHeader>
      <CardContent className="pt-0">
        {!isLoading && linhas.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum carregamento finalizado nos últimos 30 dias.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead rowSpan={2} className="align-bottom">
                  Armazém
                </TableHead>
                <TableHead colSpan={3} className="text-center border-l">
                  Operação
                </TableHead>
                <TableHead colSpan={3} className="text-center border-l">
                  Documentação
                </TableHead>
              </TableRow>
              <TableRow>
                <TableHead className="border-l text-xs" title="Chegada até início do carregamento">
                  Espera
                </TableHead>
                <TableHead className="text-xs" title="Início até finalização do carregamento">
                  Carregamento
                </TableHead>
                <TableHead className="text-xs" title="Chegada até finalização de toda a documentação">
                  Total
                </TableHead>
                <TableHead className="border-l text-xs" title="Carregamento finalizado até o 1º documento (armazém)">
                  Finalizado → 1º Doc
                </TableHead>
                <TableHead className="text-xs" title="1º documento (armazém) até 2º documento (logística)">
                  1º → 2º Doc
                </TableHead>
                <TableHead className="text-xs" title="2º documento (logística) até a finalização (armazém)">
                  2º Doc → Fim
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-xs text-muted-foreground">
                    Carregando…
                  </TableCell>
                </TableRow>
              ) : (
                linhas.map((row) => (
                  <TableRow key={row.armazemId}>
                    <TableCell className="font-medium">
                      <Link to="/armazens" className="hover:underline underline-offset-2">
                        {row.nome}
                      </Link>
                    </TableCell>
                    <TableCell className="border-l text-sm">{formatarDuracaoMinutos(row.tempoEspera)}</TableCell>
                    <TableCell className="text-sm">{formatarDuracaoMinutos(row.tempoCarregamento)}</TableCell>
                    <TableCell className="text-sm">{formatarDuracaoMinutos(row.tempoTotalProcesso)}</TableCell>
                    <TableCell className="border-l text-sm">
                      {formatarDuracaoMinutos(row.finalizadoAte1Doc)}
                    </TableCell>
                    <TableCell className="text-sm">{formatarDuracaoMinutos(row.doc1AteDoc2)}</TableCell>
                    <TableCell className="text-sm">{formatarDuracaoMinutos(row.doc2AteFinalizacao)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

const DashboardLogistica = () => {
  const hoje = useMemo(() => new Date(), []);
  const inicioHoje = startOfDayISO(hoje);
  const fimHoje = endOfDayISO(hoje);
  const inicioAmanha = startOfDayISO(addDays(hoje, 1));
  const fimAmanha = endOfDayISO(addDays(hoje, 1));
  const fimSemana = endOfDayISO(addDays(hoje, 6));
  const inicioJanela30d = startOfDayISO(addDays(hoje, -30));

  const { data: liberacoesAbertas, isLoading: loadingLiberacoesAbertas } = useQuery({
    queryKey: ["dash-liberacoes-abertas"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("liberacoes")
        .select("id", { count: "exact", head: true })
        .in("status", ["disponivel", "parcialmente_agendada", "totalmente_agendada"]);
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });

  const { data: liberacoesSemAgendamento, isLoading: loadingLiberacoesSemAgendamento } = useQuery({
    queryKey: ["dash-liberacoes-sem-agendamento"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("liberacoes")
        .select("id", { count: "exact", head: true })
        .eq("status", "disponivel");
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });

  const { data: agendamentosHoje, isLoading: loadingAgendamentosHoje } = useQuery({
    queryKey: ["dash-agendamentos-hoje"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("agendamentos")
        .select("id", { count: "exact", head: true })
        .gte("data_retirada", inicioHoje)
        .lte("data_retirada", fimHoje)
        .neq("status", "cancelado");
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });

  const { data: agendamentosAmanha, isLoading: loadingAgendamentosAmanha } = useQuery({
    queryKey: ["dash-agendamentos-amanha"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("agendamentos")
        .select("id", { count: "exact", head: true })
        .gte("data_retirada", inicioAmanha)
        .lte("data_retirada", fimAmanha)
        .neq("status", "cancelado");
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });

  const { data: agendamentosSemana, isLoading: loadingAgendamentosSemana } = useQuery({
    queryKey: ["dash-agendamentos-semana"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("agendamentos")
        .select("id", { count: "exact", head: true })
        .gte("data_retirada", inicioHoje)
        .lte("data_retirada", fimSemana)
        .neq("status", "cancelado");
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });

  const { data: carregamentosAndamento, isLoading: loadingCarregamentosAndamento } = useQuery({
    queryKey: ["dash-carregamentos-andamento"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("carregamentos")
        .select("id", { count: "exact", head: true })
        .lt("etapa_atual", 6);
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });

  const { data: carregamentosFinalizadosHoje, isLoading: loadingCarregamentosFinalizadosHoje } = useQuery({
    queryKey: ["dash-carregamentos-finalizados-hoje"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("carregamentos")
        .select("id", { count: "exact", head: true })
        .eq("etapa_atual", 6)
        .gte("data_documentacao", inicioHoje)
        .lte("data_documentacao", fimHoje);
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });

  // Etapa 1 (aguardando chegada) não entra nessa métrica: data_retirada do
  // agendamento é um DATE (sem horário), então não dá para medir atraso em
  // minutos com precisão — e a chegada em si não é uma ação já registrada.
  // Só etapas 2-5, com timestamp exato (ver ENTRADA_ETAPA_FIELD), contam.
  const { data: carregamentosAtrasados, isLoading: loadingCarregamentosAtrasados } = useQuery({
    queryKey: ["dash-carregamentos-atrasados"],
    queryFn: async () => {
      const [{ data: config, error: configError }, { data: emAndamento, error: carregamentosError }] =
        await Promise.all([
          supabase.from("config_tempo_etapas").select("etapa,tempo_maximo_minutos"),
          supabase
            .from("carregamentos")
            .select("id,etapa_atual,data_chegada,data_inicio,data_carregando,data_finalizacao")
            .gte("etapa_atual", 2)
            .lt("etapa_atual", 6),
        ]);
      if (configError) throw configError;
      if (carregamentosError) throw carregamentosError;

      const limites = new Map((config ?? []).map((c) => [c.etapa, c.tempo_maximo_minutos]));
      const agora = Date.now();

      return (emAndamento ?? []).filter((c: any) => {
        const limiteMinutos = limites.get(c.etapa_atual);
        if (!limiteMinutos) return false;
        const entradaISO = c[ENTRADA_ETAPA_FIELD[c.etapa_atual] as string];
        if (!entradaISO) return false;
        const minutosDecorridos = (agora - new Date(entradaISO).getTime()) / 60_000;
        return minutosDecorridos > limiteMinutos;
      }).length;
    },
    refetchInterval: 60_000,
  });

  // Armazéns/clientes com operação hoje: agendamento marcado para hoje OU
  // carregamento atualmente em andamento (etapa < 6, independente de quando começou).
  const { data: operacoesHoje, isLoading: loadingOperacoesHoje } = useQuery({
    queryKey: ["dash-operacoes-hoje"],
    queryFn: async () => {
      const [{ data: agHoje, error: agError }, { data: carAndamento, error: carError }] = await Promise.all([
        supabase
          .from("agendamentos")
          .select("armazem_id, cliente_id, armazens(nome), clientes(nome)")
          .gte("data_retirada", inicioHoje)
          .lte("data_retirada", fimHoje)
          .neq("status", "cancelado"),
        supabase
          .from("carregamentos")
          .select("armazem_id, cliente_id, armazens(nome), clientes(nome)")
          .lt("etapa_atual", 6),
      ]);
      if (agError) throw agError;
      if (carError) throw carError;

      const armazensMap = new Map<string, string>();
      const clientesMap = new Map<string, string>();

      [...(agHoje ?? []), ...(carAndamento ?? [])].forEach((row: any) => {
        if (row.armazem_id && row.armazens?.nome) armazensMap.set(row.armazem_id, row.armazens.nome);
        if (row.cliente_id && row.clientes?.nome) clientesMap.set(row.cliente_id, row.clientes.nome);
      });

      return {
        armazens: Array.from(armazensMap.values()).sort((a, b) => a.localeCompare(b)),
        clientes: Array.from(clientesMap.values()).sort((a, b) => a.localeCompare(b)),
      };
    },
    refetchInterval: 60_000,
  });

  const { data: documentacaoPendente, isLoading: loadingDocumentacaoPendente } = useQuery({
    queryKey: ["dash-documentacao-pendente"],
    queryFn: async (): Promise<DocumentacaoPendenteItem[]> => {
      const { data, error } = await supabase
        .from("carregamentos")
        .select("id, etapa_5a_status, etapa_5b_status, etapa_5c_status, clientes(nome), armazens(nome)")
        .eq("etapa_atual", 5);
      if (error) throw error;

      return (data ?? [])
        .map((c: any) => ({
          id: c.id as string,
          cliente: c.clientes?.nome ?? "Cliente",
          armazem: c.armazens?.nome ?? "Armazém",
          pendencias: SUB_ETAPAS_DOCUMENTACAO.filter((sub) => c[sub.campo] !== "concluida").map((sub) => ({
            label: sub.label,
            responsavel: sub.responsavel,
          })),
        }))
        .filter((item) => item.pendencias.length > 0);
    },
    refetchInterval: 60_000,
  });

  const { data: funilEtapas, isLoading: loadingFunilEtapas } = useQuery({
    queryKey: ["dash-funil-etapas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("carregamentos").select("etapa_atual").lt("etapa_atual", 6);
      if (error) throw error;

      const contagem: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      (data ?? []).forEach((c) => {
        contagem[c.etapa_atual] = (contagem[c.etapa_atual] ?? 0) + 1;
      });

      return ETAPA_LABELS.map((label, index) => ({ etapa: label, quantidade: contagem[index + 1] ?? 0 }));
    },
    refetchInterval: 60_000,
  });

  // Tempos médios (últimos 30 dias), quebrados por armazém: os 3 tempos gerais
  // (mesmas definições de calcularEstatisticas() em CarregamentoDetalhe.tsx) e
  // os 3 segmentos de documentação. A ordem das sub-etapas é sempre 5a
  // (armazém) → 5b (logística) → 5c (armazém) — ver getProximaSubEtapa em
  // CarregamentoDetalhe.tsx.
  const { data: temposPorArmazem, isLoading: loadingTemposPorArmazem } = useQuery({
    queryKey: ["dash-tempos-por-armazem"],
    queryFn: async (): Promise<TemposArmazemRow[]> => {
      const { data, error } = await supabase
        .from("carregamentos")
        .select(
          "armazem_id, armazens(nome), data_chegada, data_inicio, data_finalizacao, data_documentacao, etapa_5a_concluida_em, etapa_5b_concluida_em"
        )
        .gte("data_finalizacao", inicioJanela30d)
        .not("data_finalizacao", "is", null);
      if (error) throw error;

      const porArmazem = new Map<string, { nome: string; linhas: any[] }>();
      (data ?? []).forEach((c: any) => {
        if (!c.armazem_id) return;
        if (!porArmazem.has(c.armazem_id)) {
          porArmazem.set(c.armazem_id, { nome: c.armazens?.nome ?? "Armazém", linhas: [] });
        }
        porArmazem.get(c.armazem_id)!.linhas.push(c);
      });

      return Array.from(porArmazem.entries())
        .map(([armazemId, { nome, linhas }]) => ({
          armazemId,
          nome,
          tempoEspera: media(
            linhas
              .filter((l) => l.data_chegada && l.data_inicio)
              .map((l) => (new Date(l.data_inicio).getTime() - new Date(l.data_chegada).getTime()) / 60_000)
          ),
          tempoCarregamento: media(
            linhas
              .filter((l) => l.data_inicio && l.data_finalizacao)
              .map((l) => (new Date(l.data_finalizacao).getTime() - new Date(l.data_inicio).getTime()) / 60_000)
          ),
          tempoTotalProcesso: media(
            linhas
              .filter((l) => l.data_chegada && l.data_documentacao)
              .map((l) => (new Date(l.data_documentacao).getTime() - new Date(l.data_chegada).getTime()) / 60_000)
          ),
          finalizadoAte1Doc: media(
            linhas
              .filter((l) => l.data_finalizacao && l.etapa_5a_concluida_em)
              .map((l) => (new Date(l.etapa_5a_concluida_em).getTime() - new Date(l.data_finalizacao).getTime()) / 60_000)
          ),
          doc1AteDoc2: media(
            linhas
              .filter((l) => l.etapa_5a_concluida_em && l.etapa_5b_concluida_em)
              .map(
                (l) => (new Date(l.etapa_5b_concluida_em).getTime() - new Date(l.etapa_5a_concluida_em).getTime()) / 60_000
              )
          ),
          doc2AteFinalizacao: media(
            linhas
              .filter((l) => l.etapa_5b_concluida_em && l.data_documentacao)
              .map(
                (l) => (new Date(l.data_documentacao).getTime() - new Date(l.etapa_5b_concluida_em).getTime()) / 60_000
              )
          ),
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome));
    },
    refetchInterval: 120_000,
  });

  const { data: proximosAgendamentos, isLoading: loadingProximosAgendamentos } = useQuery({
    queryKey: ["dash-proximos-agendamentos"],
    queryFn: async (): Promise<ProximoAgendamentoItem[]> => {
      const { data, error } = await supabase
        .from("agendamentos")
        .select("id, data_retirada, clientes(nome), armazens(nome), liberacoes(produtos(nome))")
        .gte("data_retirada", new Date().toISOString())
        .neq("status", "cancelado")
        .order("data_retirada", { ascending: true })
        .limit(5);
      if (error) throw error;

      return (data ?? []).map((a: any) => ({
        id: a.id as string,
        cliente: a.clientes?.nome ?? "Cliente",
        armazem: a.armazens?.nome ?? "Armazém",
        produto: a.liberacoes?.produtos?.nome ?? "Produto",
        dataRetirada: a.data_retirada as string,
      }));
    },
    refetchInterval: 60_000,
  });

  const { data: estoqueBaixo, isLoading: loadingEstoqueBaixo } = useQuery({
    queryKey: ["dash-estoque-baixo"],
    queryFn: async (): Promise<EstoqueBaixoItem[]> => {
      const { data, error } = await supabase
        .from("estoque")
        .select("id, quantidade, produtos(nome, unidade, estoque_minimo), armazens(nome)");
      if (error) throw error;

      return (data ?? [])
        .filter((e: any) => e.produtos?.estoque_minimo != null && Number(e.quantidade) < Number(e.produtos.estoque_minimo))
        .map((e: any) => ({
          id: e.id as string,
          produto: e.produtos?.nome ?? "Produto",
          armazem: e.armazens?.nome ?? "Armazém",
          quantidade: Number(e.quantidade),
          minimo: Number(e.produtos.estoque_minimo),
          unidade: e.produtos?.unidade ?? "",
        }));
    },
    refetchInterval: 120_000,
  });

  const valor = (v: number | undefined, loading: boolean) => (loading ? "…" : v ?? 0);

  return (
    <div className="container mx-auto px-4 md:px-6 py-6">
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral das operações de logística"
        icon={LayoutDashboard}
      />

      <div className="mt-6 space-y-8">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Liberações & Agendamentos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <StatCard
              title="Liberações em Aberto"
              value={valor(liberacoesAbertas, loadingLiberacoesAbertas)}
              icon={ClipboardList}
              variant="primary"
              tooltip="Liberações que ainda têm quantidade disponível para ser agendada ou retirada."
              to="/liberacoes"
            />
            <StatCard
              title="Liberações sem Agendamento"
              value={valor(liberacoesSemAgendamento, loadingLiberacoesSemAgendamento)}
              icon={ClipboardX}
              variant="warning"
              tooltip="Liberações que ainda não tiveram nenhuma retirada agendada."
              to="/liberacoes"
            />
            <StatCard
              title="Agendamentos Hoje"
              value={valor(agendamentosHoje, loadingAgendamentosHoje)}
              icon={Calendar}
              variant="primary"
              tooltip="Retiradas agendadas para o dia de hoje."
              to="/agendamentos"
            />
            <StatCard
              title="Agendamentos Amanhã"
              value={valor(agendamentosAmanha, loadingAgendamentosAmanha)}
              icon={CalendarDays}
              variant="default"
              tooltip="Retiradas agendadas para amanhã."
              to="/agendamentos"
            />
            <StatCard
              title="Agendamentos da Semana"
              value={valor(agendamentosSemana, loadingAgendamentosSemana)}
              icon={CalendarRange}
              variant="default"
              tooltip="Retiradas agendadas para os próximos 7 dias (incluindo hoje)."
              to="/agendamentos"
            />
          </div>
        </section>

        <section>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ProximosAgendamentosCard itens={proximosAgendamentos} isLoading={loadingProximosAgendamentos} />
            <EstoqueBaixoCard itens={estoqueBaixo} isLoading={loadingEstoqueBaixo} />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Carregamentos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <StatCard
              title="Carregamentos em Andamento"
              value={valor(carregamentosAndamento, loadingCarregamentosAndamento)}
              icon={Truck}
              variant="primary"
              tooltip="Carregamentos que já foram iniciados, mas ainda não foram finalizados."
              to="/carregamentos"
            />
            <StatCard
              title="Finalizados Hoje"
              value={valor(carregamentosFinalizadosHoje, loadingCarregamentosFinalizadosHoje)}
              icon={CheckCircle2}
              variant="success"
              tooltip="Carregamentos que foram finalizados hoje."
              to="/carregamentos"
            />
            <StatCard
              title="Carregamentos Atrasados"
              value={valor(carregamentosAtrasados, loadingCarregamentosAtrasados)}
              icon={AlertTriangle}
              variant="warning"
              tooltip="Carregamentos parados na etapa atual há mais tempo do que o limite configurado para essa etapa."
              to="/carregamentos"
            />
          </div>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FunilEtapasCard data={funilEtapas} isLoading={loadingFunilEtapas} />
            <DocumentacaoPendenteCard itens={documentacaoPendente} isLoading={loadingDocumentacaoPendente} />
          </div>
        </section>

        <section>
          <TemposPorArmazemCard dados={temposPorArmazem} isLoading={loadingTemposPorArmazem} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Visão Geral
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <EntityListCard
              title="Armazéns com Operação Hoje"
              tooltip="Armazéns que têm agendamento para hoje ou carregamento em andamento."
              icon={Warehouse}
              names={operacoesHoje?.armazens}
              isLoading={loadingOperacoesHoje}
              emptyLabel="Nenhum armazém com operação hoje."
              to="/armazens"
            />
            <EntityListCard
              title="Clientes com Operação Hoje"
              tooltip="Clientes que têm agendamento para hoje ou carregamento em andamento."
              icon={Building2}
              names={operacoesHoje?.clientes}
              isLoading={loadingOperacoesHoje}
              emptyLabel="Nenhum cliente com operação hoje."
              to="/clientes"
            />
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardLogistica;
