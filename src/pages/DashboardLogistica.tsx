import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
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
  Users,
  LucideIcon,
  Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

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

const NOMES_VISIVEIS = 6;

// Título com ícone de informação + tooltip, reutilizado nos cards do dashboard.
function TitleWithInfo({ title, tooltip, className }: { title: string; tooltip: string; className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${className ?? ""}`}>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <TooltipProvider>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <Info
              className="h-3.5 w-3.5 text-muted-foreground/70 cursor-help"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-[220px]">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

// Card com contagem + lista de nomes (armazéns/clientes com operação hoje).
function EntityListCard({
  title,
  tooltip,
  icon: Icon,
  names,
  isLoading,
  emptyLabel,
  to,
}: {
  title: string;
  tooltip: string;
  icon: LucideIcon;
  names: string[] | undefined;
  isLoading: boolean;
  emptyLabel: string;
  to?: string;
}) {
  const [expandido, setExpandido] = useState(false);
  const lista = names ?? [];
  const visiveis = expandido ? lista : lista.slice(0, NOMES_VISIVEIS);
  const restantes = lista.length - visiveis.length;

  return (
    <Card className={`overflow-hidden transition-all hover:shadow-md ${to ? "hover:border-primary/40" : ""}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {to ? (
              <Link to={to} className="inline-flex hover:underline underline-offset-2">
                <TitleWithInfo title={title} tooltip={tooltip} />
              </Link>
            ) : (
              <TitleWithInfo title={title} tooltip={tooltip} />
            )}
            <p className="mt-2 text-3xl font-bold text-foreground">
              {isLoading ? "…" : lista.length}
            </p>
          </div>
          <div className="rounded-xl p-3 bg-muted">
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>

        {!isLoading && lista.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {visiveis.map((nome) => (
              <Badge key={nome} variant="secondary" className="font-normal">
                {nome}
              </Badge>
            ))}
            {restantes > 0 && (
              <button
                type="button"
                onClick={() => setExpandido(true)}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                +{restantes} mais
              </button>
            )}
            {expandido && lista.length > NOMES_VISIVEIS && (
              <button
                type="button"
                onClick={() => setExpandido(false)}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                mostrar menos
              </button>
            )}
          </div>
        )}

        {!isLoading && lista.length === 0 && (
          <p className="mt-4 text-xs text-muted-foreground">{emptyLabel}</p>
        )}
      </CardContent>
    </Card>
  );
}

type Responsavel = "armazem" | "logistica";

const RESPONSAVEL_STYLE: Record<Responsavel, { className: string; icon: LucideIcon }> = {
  armazem: { className: "bg-amber-100 text-amber-800 hover:bg-amber-100", icon: Warehouse },
  logistica: { className: "bg-indigo-100 text-indigo-800 hover:bg-indigo-100", icon: Users },
};

const SUB_ETAPAS_DOCUMENTACAO: Array<{ campo: "etapa_5a_status" | "etapa_5b_status" | "etapa_5c_status"; label: string; responsavel: Responsavel }> = [
  { campo: "etapa_5a_status", label: "Docs. Retorno", responsavel: "armazem" },
  { campo: "etapa_5b_status", label: "Docs. Venda", responsavel: "logistica" },
  { campo: "etapa_5c_status", label: "Docs. Remessa", responsavel: "armazem" },
];

interface DocumentacaoPendenteItem {
  id: string;
  cliente: string;
  armazem: string;
  pendencias: Array<{ label: string; responsavel: Responsavel }>;
}

// Carregamentos parados na etapa 5 com pelo menos um dos 3 documentos faltando,
// destacando visualmente de quem é a responsabilidade (armazém ou logística).
function DocumentacaoPendenteCard({
  itens,
  isLoading,
}: {
  itens: DocumentacaoPendenteItem[] | undefined;
  isLoading: boolean;
}) {
  const lista = itens ?? [];

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <TitleWithInfo
            title="Documentação Pendente"
            tooltip="Carregamentos na etapa de Documentação com pelo menos um dos 3 documentos ainda não anexado."
          />
          <span className="text-2xl font-bold text-foreground">{isLoading ? "…" : lista.length}</span>
        </div>
        <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Warehouse className="h-3 w-3 text-amber-600" /> Armazém
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3 text-indigo-600" /> Logística
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {!isLoading && lista.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhuma documentação pendente.</p>
        )}
        <div className="space-y-2">
          {lista.map((item) => (
            <Link
              key={item.id}
              to={`/carregamentos/${item.id}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded border p-2.5 hover:bg-muted/50 transition-colors"
            >
              <div className="text-sm min-w-0">
                <span className="font-medium">{item.cliente}</span>
                <span className="text-muted-foreground"> • {item.armazem}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {item.pendencias.map((p) => {
                  const style = RESPONSAVEL_STYLE[p.responsavel];
                  const RIcon = style.icon;
                  return (
                    <Badge key={p.label} className={`${style.className} gap-1 font-normal`}>
                      <RIcon className="h-3 w-3" />
                      {p.label}
                    </Badge>
                  );
                })}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

const ETAPA_LABELS = ["Chegada", "Início", "Carregando", "Finalizado", "Documentação"];

const funilChartConfig: ChartConfig = {
  quantidade: { label: "Carregamentos" },
};

// Quantos carregamentos ativos (etapa < 6) estão em cada etapa agora —
// mostra visualmente onde a operação está represada.
function FunilEtapasCard({
  data,
  isLoading,
}: {
  data: Array<{ etapa: string; quantidade: number }> | undefined;
  isLoading: boolean;
}) {
  const chartData = data ?? [];
  const semDados = chartData.every((d) => d.quantidade === 0);

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <TitleWithInfo
          title="Funil de Carregamentos por Etapa"
          tooltip="Quantidade de carregamentos ativos (ainda não finalizados) em cada etapa do processo, agora."
        />
      </CardHeader>
      <CardContent>
        {!isLoading && semDados ? (
          <p className="text-xs text-muted-foreground">Nenhum carregamento em andamento no momento.</p>
        ) : (
          <ChartContainer config={funilChartConfig} className="aspect-auto h-[220px] w-full">
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="etapa" tickLine={false} axisLine={false} width={90} />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="quantidade" radius={4}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.etapa}
                    fill={entry.etapa === "Documentação" ? "hsl(var(--warning))" : "hsl(var(--primary))"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

const formatarDataHora = (iso: string) => {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm} ${hh}:${min}`;
};

interface ProximoAgendamentoItem {
  id: string;
  cliente: string;
  armazem: string;
  produto: string;
  dataRetirada: string;
}

// Próximas retiradas agendadas, para não precisar sair do dashboard para ver o que vem a seguir.
function ProximosAgendamentosCard({
  itens,
  isLoading,
}: {
  itens: ProximoAgendamentoItem[] | undefined;
  isLoading: boolean;
}) {
  const lista = itens ?? [];

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <TitleWithInfo
          title="Próximos Agendamentos"
          tooltip="As próximas retiradas agendadas, da mais próxima para a mais distante."
        />
      </CardHeader>
      <CardContent className="pt-0">
        {!isLoading && lista.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum agendamento futuro.</p>
        )}
        <div className="space-y-2">
          {lista.map((item) => (
            <Link
              key={item.id}
              to="/agendamentos"
              className="flex items-center justify-between gap-3 rounded border p-2.5 hover:bg-muted/50 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.cliente}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.produto} • {item.armazem}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0 font-normal">
                {formatarDataHora(item.dataRetirada)}
              </Badge>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface EstoqueBaixoItem {
  id: string;
  produto: string;
  armazem: string;
  quantidade: number;
  minimo: number;
  unidade: string;
}

// Produtos com estoque físico abaixo do mínimo cadastrado, por armazém.
// Só aparece aqui o produto que tiver "estoque_minimo" configurado (produtos.tsx ainda não tem esse campo no formulário).
function EstoqueBaixoCard({ itens, isLoading }: { itens: EstoqueBaixoItem[] | undefined; isLoading: boolean }) {
  const lista = itens ?? [];

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <TitleWithInfo
            title="Estoque Baixo"
            tooltip="Produtos com quantidade física abaixo do mínimo configurado, em algum armazém."
          />
          <span className="text-2xl font-bold text-foreground">{isLoading ? "…" : lista.length}</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {!isLoading && lista.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum produto abaixo do mínimo configurado.</p>
        )}
        <div className="space-y-2">
          {lista.map((item) => (
            <Link
              key={item.id}
              to="/estoque"
              className="flex items-center justify-between gap-3 rounded border p-2.5 hover:bg-muted/50 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.produto}</p>
                <p className="text-xs text-muted-foreground truncate">{item.armazem}</p>
              </div>
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                <Badge className="bg-red-100 text-red-800 hover:bg-red-100 font-normal">
                  {item.quantidade} {item.unidade} em estoque
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  mínimo configurado: {item.minimo} {item.unidade}
                </span>
              </div>
            </Link>
          ))}
        </div>
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
