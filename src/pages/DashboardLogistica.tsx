import { useMemo } from "react";
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

const startOfDayISO = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString();
};
const endOfDayISO = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy.toISOString();
};
const addDays = (d: Date, n: number) => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
};

// Timestamp de entrada em cada etapa: o campo_data da etapa N-1 marca a
// conclusão de N-1 e, portanto, a entrada em N. A etapa 1 usa created_at.
const ENTRADA_ETAPA_FIELD: Record<number, string | null> = {
  1: null, // usa created_at
  2: "data_chegada",
  3: "data_inicio",
  4: "data_carregando",
  5: "data_finalizacao",
};

const DashboardLogistica = () => {
  const hoje = useMemo(() => new Date(), []);
  const inicioHoje = startOfDayISO(hoje);
  const fimHoje = endOfDayISO(hoje);
  const inicioAmanha = startOfDayISO(addDays(hoje, 1));
  const fimAmanha = endOfDayISO(addDays(hoje, 1));
  const fimSemana = endOfDayISO(addDays(hoje, 6));

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

  const { data: carregamentosAtrasados, isLoading: loadingCarregamentosAtrasados } = useQuery({
    queryKey: ["dash-carregamentos-atrasados"],
    queryFn: async () => {
      const [{ data: config, error: configError }, { data: emAndamento, error: carregamentosError }] =
        await Promise.all([
          supabase.from("config_tempo_etapas").select("etapa,tempo_maximo_minutos"),
          supabase
            .from("carregamentos")
            .select("id,etapa_atual,created_at,data_chegada,data_inicio,data_carregando,data_finalizacao")
            .lt("etapa_atual", 6),
        ]);
      if (configError) throw configError;
      if (carregamentosError) throw carregamentosError;

      const limites = new Map((config ?? []).map((c) => [c.etapa, c.tempo_maximo_minutos]));
      const agora = Date.now();

      return (emAndamento ?? []).filter((c) => {
        const limiteMinutos = limites.get(c.etapa_atual);
        if (!limiteMinutos) return false;
        const campoEntrada = ENTRADA_ETAPA_FIELD[c.etapa_atual];
        const entradaISO = campoEntrada ? (c as any)[campoEntrada] : c.created_at;
        if (!entradaISO) return false;
        const minutosDecorridos = (agora - new Date(entradaISO).getTime()) / 60_000;
        return minutosDecorridos > limiteMinutos;
      }).length;
    },
    refetchInterval: 60_000,
  });

  const { data: armazensOperando, isLoading: loadingArmazensOperando } = useQuery({
    queryKey: ["dash-armazens-operando"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("armazens")
        .select("id", { count: "exact", head: true })
        .eq("ativo", true);
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 300_000,
  });

  const { data: clientesComOperacoesHoje, isLoading: loadingClientesComOperacoesHoje } = useQuery({
    queryKey: ["dash-clientes-operacoes-hoje"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agendamentos")
        .select("cliente_id")
        .gte("data_retirada", inicioHoje)
        .lte("data_retirada", fimHoje)
        .neq("status", "cancelado");
      if (error) throw error;
      const idsUnicos = new Set((data ?? []).map((a) => a.cliente_id).filter(Boolean));
      return idsUnicos.size;
    },
    refetchInterval: 60_000,
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
            />
            <StatCard
              title="Liberações sem Agendamento"
              value={valor(liberacoesSemAgendamento, loadingLiberacoesSemAgendamento)}
              icon={ClipboardX}
              variant="warning"
            />
            <StatCard
              title="Agendamentos Hoje"
              value={valor(agendamentosHoje, loadingAgendamentosHoje)}
              icon={Calendar}
              variant="primary"
            />
            <StatCard
              title="Agendamentos Amanhã"
              value={valor(agendamentosAmanha, loadingAgendamentosAmanha)}
              icon={CalendarDays}
              variant="default"
            />
            <StatCard
              title="Agendamentos da Semana"
              value={valor(agendamentosSemana, loadingAgendamentosSemana)}
              icon={CalendarRange}
              variant="default"
            />
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
            />
            <StatCard
              title="Finalizados Hoje"
              value={valor(carregamentosFinalizadosHoje, loadingCarregamentosFinalizadosHoje)}
              icon={CheckCircle2}
              variant="success"
            />
            <StatCard
              title="Carregamentos Atrasados"
              value={valor(carregamentosAtrasados, loadingCarregamentosAtrasados)}
              icon={AlertTriangle}
              variant="warning"
            />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Visão Geral
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              title="Armazéns Operando"
              value={valor(armazensOperando, loadingArmazensOperando)}
              icon={Warehouse}
              variant="default"
            />
            <StatCard
              title="Clientes com Operações Hoje"
              value={valor(clientesComOperacoesHoje, loadingClientesComOperacoesHoje)}
              icon={Building2}
              variant="default"
            />
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardLogistica;
