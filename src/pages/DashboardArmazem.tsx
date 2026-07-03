import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Calendar,
  CalendarRange,
  Truck,
  CheckCircle2,
  AlertTriangle,
  ListOrdered,
  Timer,
  Hourglass,
  History,
  FileClock,
  FileCheck2,
  Package,
  PackageCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/usePermissions";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import {
  startOfDayISO,
  endOfDayISO,
  addDays,
  ENTRADA_ETAPA_FIELD,
  DocumentacaoPendenteCard,
  DocumentacaoPendenteItem,
  SUB_ETAPAS_DOCUMENTACAO,
  ProximosAgendamentosCard,
  ProximoAgendamentoItem,
  EstoqueBaixoCard,
  EstoqueBaixoItem,
  formatarDuracaoMinutos,
  media,
} from "@/components/dashboard/DashboardShared";

const DashboardArmazem = () => {
  const { armazemId, loading: permissionsLoading } = usePermissions();

  const hoje = useMemo(() => new Date(), []);
  const inicioHoje = startOfDayISO(hoje);
  const fimHoje = endOfDayISO(hoje);
  const fimSemana = endOfDayISO(addDays(hoje, 6));
  const inicioMes = startOfDayISO(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const inicioJanela30d = startOfDayISO(addDays(hoje, -30));

  const habilitado = !permissionsLoading && !!armazemId;

  const { data: agendamentosHoje, isLoading: loadingAgendamentosHoje } = useQuery({
    queryKey: ["dash-arm-agendamentos-hoje", armazemId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("agendamentos")
        .select("id", { count: "exact", head: true })
        .eq("armazem_id", armazemId!)
        .gte("data_retirada", inicioHoje)
        .lte("data_retirada", fimHoje)
        .neq("status", "cancelado");
      if (error) throw error;
      return count ?? 0;
    },
    enabled: habilitado,
    refetchInterval: 60_000,
  });

  const { data: agendamentosSemana, isLoading: loadingAgendamentosSemana } = useQuery({
    queryKey: ["dash-arm-agendamentos-semana", armazemId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("agendamentos")
        .select("id", { count: "exact", head: true })
        .eq("armazem_id", armazemId!)
        .gte("data_retirada", inicioHoje)
        .lte("data_retirada", fimSemana)
        .neq("status", "cancelado");
      if (error) throw error;
      return count ?? 0;
    },
    enabled: habilitado,
    refetchInterval: 60_000,
  });

  const { data: caminhoesNaFila, isLoading: loadingCaminhoesNaFila } = useQuery({
    queryKey: ["dash-arm-caminhoes-fila", armazemId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("carregamentos")
        .select("id", { count: "exact", head: true })
        .eq("armazem_id", armazemId!)
        .eq("etapa_atual", 2);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: habilitado,
    refetchInterval: 60_000,
  });

  const { data: carregamentosAndamento, isLoading: loadingCarregamentosAndamento } = useQuery({
    queryKey: ["dash-arm-carregamentos-andamento", armazemId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("carregamentos")
        .select("id", { count: "exact", head: true })
        .eq("armazem_id", armazemId!)
        .lt("etapa_atual", 6);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: habilitado,
    refetchInterval: 60_000,
  });

  const { data: carregamentosFinalizadosHoje, isLoading: loadingCarregamentosFinalizadosHoje } = useQuery({
    queryKey: ["dash-arm-carregamentos-finalizados-hoje", armazemId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("carregamentos")
        .select("id", { count: "exact", head: true })
        .eq("armazem_id", armazemId!)
        .eq("etapa_atual", 6)
        .gte("data_documentacao", inicioHoje)
        .lte("data_documentacao", fimHoje);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: habilitado,
    refetchInterval: 60_000,
  });

  // Etapa 1 (aguardando chegada) não entra nessa métrica: data_retirada do
  // agendamento é um DATE (sem horário), então não dá para medir atraso em
  // minutos com precisão — e a chegada em si não é uma ação do armazém que já
  // tenha acontecido. Só etapas 2-5, que têm timestamp exato registrado em
  // CarregamentoDetalhe.tsx, contam para "atrasado".
  const { data: operacoesAtrasadas, isLoading: loadingOperacoesAtrasadas } = useQuery({
    queryKey: ["dash-arm-operacoes-atrasadas", armazemId],
    queryFn: async () => {
      const [{ data: config, error: configError }, { data: emAndamento, error: carregamentosError }] =
        await Promise.all([
          supabase.from("config_tempo_etapas").select("etapa,tempo_maximo_minutos"),
          supabase
            .from("carregamentos")
            .select("id,etapa_atual,data_chegada,data_inicio,data_carregando,data_finalizacao")
            .eq("armazem_id", armazemId!)
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
    enabled: habilitado,
    refetchInterval: 60_000,
  });

  // Tempos médios (últimos 30 dias) — todos calculados a partir dos mesmos
  // timestamps já registrados a cada troca de etapa em CarregamentoDetalhe.tsx.
  const { data: temposMedios, isLoading: loadingTemposMedios } = useQuery({
    queryKey: ["dash-arm-tempos-medios", armazemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("carregamentos")
        .select("data_chegada,data_inicio,data_finalizacao,data_documentacao,etapa_5a_concluida_em,etapa_5b_concluida_em")
        .eq("armazem_id", armazemId!)
        .gte("data_finalizacao", inicioJanela30d)
        .not("data_finalizacao", "is", null);
      if (error) throw error;

      const linhas = data ?? [];

      // Mesmas definições de calcularEstatisticas() em CarregamentoDetalhe.tsx.
      const tempoEspera = media(
        linhas
          .filter((l) => l.data_chegada && l.data_inicio)
          .map((l) => (new Date(l.data_inicio!).getTime() - new Date(l.data_chegada!).getTime()) / 60_000)
      );

      const tempoCarregamento = media(
        linhas
          .filter((l) => l.data_inicio && l.data_finalizacao)
          .map((l) => (new Date(l.data_finalizacao!).getTime() - new Date(l.data_inicio!).getTime()) / 60_000)
      );

      const tempoTotalProcesso = media(
        linhas
          .filter((l) => l.data_chegada && l.data_documentacao)
          .map((l) => (new Date(l.data_documentacao!).getTime() - new Date(l.data_chegada!).getTime()) / 60_000)
      );

      // A ordem das sub-etapas é sempre 5a → 5b → 5c (ver getProximaSubEtapa em
      // CarregamentoDetalhe.tsx), então o "1º documento" é sempre o 5a (armazém).
      const ateOPrimeiroDocumento = media(
        linhas
          .filter((l) => l.data_finalizacao && l.etapa_5a_concluida_em)
          .map(
            (l) => (new Date(l.etapa_5a_concluida_em!).getTime() - new Date(l.data_finalizacao!).getTime()) / 60_000
          )
      );

      const docLogisticaAteFinalizacao = media(
        linhas
          .filter((l) => l.etapa_5b_concluida_em && l.data_documentacao)
          .map(
            (l) =>
              (new Date(l.data_documentacao!).getTime() - new Date(l.etapa_5b_concluida_em!).getTime()) / 60_000
          )
      );

      return { tempoEspera, tempoCarregamento, tempoTotalProcesso, ateOPrimeiroDocumento, docLogisticaAteFinalizacao };
    },
    enabled: habilitado,
    refetchInterval: 120_000,
  });

  // Volume carregado = soma da quantidade dos carregamentos fisicamente
  // finalizados no período (data_finalizacao), independente da documentação já
  // estar completa. Kg é convertido para toneladas (hoje só se opera em
  // toneladas, mas a conversão deixa o número correto se isso mudar).
  const somarVolume = async (inicio: string, fim: string) => {
    const { data, error } = await supabase
      .from("carregamentos")
      .select("agendamentos(quantidade, liberacoes(produtos(unidade)))")
      .eq("armazem_id", armazemId!)
      .gte("data_finalizacao", inicio)
      .lte("data_finalizacao", fim);
    if (error) throw error;

    return (data ?? []).reduce((total, c: any) => {
      const quantidade = Number(c.agendamentos?.quantidade ?? 0);
      const unidade = c.agendamentos?.liberacoes?.produtos?.unidade;
      return total + (unidade === "kg" ? quantidade / 1000 : quantidade);
    }, 0);
  };

  const { data: volumeHoje, isLoading: loadingVolumeHoje } = useQuery({
    queryKey: ["dash-arm-volume-hoje", armazemId, inicioHoje],
    queryFn: () => somarVolume(inicioHoje, fimHoje),
    enabled: habilitado,
    refetchInterval: 120_000,
  });

  const { data: volumeMes, isLoading: loadingVolumeMes } = useQuery({
    queryKey: ["dash-arm-volume-mes", armazemId, inicioMes],
    queryFn: () => somarVolume(inicioMes, fimHoje),
    enabled: habilitado,
    refetchInterval: 120_000,
  });

  const { data: documentacaoPendente, isLoading: loadingDocumentacaoPendente } = useQuery({
    queryKey: ["dash-arm-documentacao-pendente", armazemId],
    queryFn: async (): Promise<DocumentacaoPendenteItem[]> => {
      const { data, error } = await supabase
        .from("carregamentos")
        .select("id, etapa_5a_status, etapa_5b_status, etapa_5c_status, clientes(nome), armazens(nome)")
        .eq("armazem_id", armazemId!)
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
    enabled: habilitado,
    refetchInterval: 60_000,
  });

  const { data: proximosAgendamentos, isLoading: loadingProximosAgendamentos } = useQuery({
    queryKey: ["dash-arm-proximos-agendamentos", armazemId],
    queryFn: async (): Promise<ProximoAgendamentoItem[]> => {
      const { data, error } = await supabase
        .from("agendamentos")
        .select(
          "id, data_retirada, quantidade, clientes(nome), armazens(nome), liberacoes(pedido_interno, produtos(nome, unidade))"
        )
        .eq("armazem_id", armazemId!)
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
        pedidoInterno: a.liberacoes?.pedido_interno ?? "-",
        quantidade: Number(a.quantidade ?? 0),
        unidade: a.liberacoes?.produtos?.unidade ?? "",
      }));
    },
    enabled: habilitado,
    refetchInterval: 60_000,
  });

  const { data: estoqueBaixo, isLoading: loadingEstoqueBaixo } = useQuery({
    queryKey: ["dash-arm-estoque-baixo", armazemId],
    queryFn: async (): Promise<EstoqueBaixoItem[]> => {
      const { data, error } = await supabase
        .from("estoque")
        .select("id, quantidade, produtos(nome, unidade, estoque_minimo), armazens(nome)")
        .eq("armazem_id", armazemId!);
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
    enabled: habilitado,
    refetchInterval: 120_000,
  });

  const valor = (v: number | undefined, loading: boolean) => (loading ? "…" : v ?? 0);
  const formatarVolume = (v: number | undefined, loading: boolean) =>
    loading ? "…" : `${(v ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} t`;

  if (!permissionsLoading && !armazemId) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-6">
        <PageHeader title="Dashboard" subtitle="Visão geral das operações do armazém" icon={LayoutDashboard} />
        <p className="mt-6 text-sm text-muted-foreground">
          Nenhum armazém vinculado a este usuário. Entre em contato com a administração.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-6">
      <PageHeader title="Dashboard" subtitle="Visão geral das operações do armazém" icon={LayoutDashboard} />

      <div className="mt-6 space-y-8">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Agendamentos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <StatCard
              title="Agendamentos Hoje"
              value={valor(agendamentosHoje, loadingAgendamentosHoje)}
              icon={Calendar}
              variant="primary"
              tooltip="Retiradas agendadas para o dia de hoje."
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
            <StatCard
              title="Caminhões na Fila"
              value={valor(caminhoesNaFila, loadingCaminhoesNaFila)}
              icon={ListOrdered}
              variant="warning"
              tooltip="Caminhões que já confirmaram chegada e aguardam a vez de iniciar o carregamento."
              to="/carregamentos"
            />
          </div>
        </section>

        <section>
          <ProximosAgendamentosCard itens={proximosAgendamentos} isLoading={loadingProximosAgendamentos} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Carregamentos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <StatCard
              title="Carregamentos em Andamento"
              value={valor(carregamentosAndamento, loadingCarregamentosAndamento)}
              icon={Truck}
              variant="primary"
              tooltip="Carregamentos já iniciados, mas ainda não finalizados."
              to="/carregamentos"
            />
            <StatCard
              title="Finalizados Hoje"
              value={valor(carregamentosFinalizadosHoje, loadingCarregamentosFinalizadosHoje)}
              icon={CheckCircle2}
              variant="success"
              tooltip="Carregamentos finalizados hoje."
              to="/carregamentos"
            />
            <StatCard
              title="Operações Atrasadas"
              value={valor(operacoesAtrasadas, loadingOperacoesAtrasadas)}
              icon={AlertTriangle}
              variant="warning"
              tooltip="Carregamentos parados na etapa atual há mais tempo do que o limite configurado para essa etapa."
              to="/carregamentos"
            />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Tempos Médios (últimos 30 dias)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <StatCard
              title="Tempo de Espera"
              value={loadingTemposMedios ? "…" : formatarDuracaoMinutos(temposMedios?.tempoEspera ?? null)}
              icon={Timer}
              variant="default"
              tooltip="Tempo médio entre a chegada do caminhão no armazém e o início efetivo do carregamento."
            />
            <StatCard
              title="Tempo de Carregamento"
              value={loadingTemposMedios ? "…" : formatarDuracaoMinutos(temposMedios?.tempoCarregamento ?? null)}
              icon={Hourglass}
              variant="default"
              tooltip="Tempo da operação física de carregamento, desde o início até a finalização."
            />
            <StatCard
              title="Tempo Total do Processo"
              value={loadingTemposMedios ? "…" : formatarDuracaoMinutos(temposMedios?.tempoTotalProcesso ?? null)}
              icon={History}
              variant="default"
              tooltip="Tempo completo do processo, desde a chegada do caminhão até a finalização da documentação."
            />
            <StatCard
              title="Documentos de Retorno"
              value={loadingTemposMedios ? "…" : formatarDuracaoMinutos(temposMedios?.ateOPrimeiroDocumento ?? null)}
              icon={FileClock}
              variant="warning"
              tooltip="Tempo médio entre o carregamento ser finalizado e os documentos de retorno serem anexados."
            />
            <StatCard
              title="Documentos de Remessa"
              value={
                loadingTemposMedios ? "…" : formatarDuracaoMinutos(temposMedios?.docLogisticaAteFinalizacao ?? null)
              }
              icon={FileCheck2}
              variant="warning"
              tooltip="Tempo médio entre a logística anexar os documentos de venda e o armazém anexar os documentos de remessa, finalizando o processo."
            />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Volume</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              title="Volume Carregado Hoje"
              value={formatarVolume(volumeHoje, loadingVolumeHoje)}
              icon={Package}
              variant="primary"
              tooltip="Soma da quantidade dos carregamentos finalizados hoje."
            />
            <StatCard
              title="Volume Carregado no Mês"
              value={formatarVolume(volumeMes, loadingVolumeMes)}
              icon={PackageCheck}
              variant="primary"
              tooltip="Soma da quantidade dos carregamentos finalizados neste mês."
            />
          </div>
        </section>

        <section>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DocumentacaoPendenteCard
              itens={documentacaoPendente}
              isLoading={loadingDocumentacaoPendente}
              responsavelFilter={["armazem"]}
            />
            <EstoqueBaixoCard
              itens={estoqueBaixo}
              isLoading={loadingEstoqueBaixo}
              tooltip="Produtos com quantidade física abaixo do mínimo configurado."
            />
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardArmazem;
