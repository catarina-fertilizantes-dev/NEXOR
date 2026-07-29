import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ClipboardList,
  ClipboardX,
  Calendar,
  MapPin,
  PlayCircle,
  Truck,
  PackageCheck,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Warehouse,
  Building2,
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  Info,
  LucideIcon,
  ArrowRightLeft,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  ETAPA_LABELS_COMPLETO,
  ETAPA_LABELS_CURTO,
  EstiloEtapa,
  ProximosAgendamentosCard,
  ProximoAgendamentoItem,
  EstoqueBaixoCard,
  EstoqueBaixoItem,
  TitleWithInfo,
  formatarDuracaoMinutos,
  media,
} from "@/components/dashboard/DashboardShared";

// Normaliza uma data (string ISO ou DATE) para meia-noite local, para
// comparações de "dias decorridos" sem interferência de fuso/horário.
// (Mesmo helper duplicado em DashboardCliente.tsx — ver docs/DASHBOARDS.md.)
const paraMeiaNoite = (iso: string) => {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Data de corte (hoje - N dias) em "YYYY-MM-DD", pro deep-link de "Sem
// Agendamento" pré-preencher o filtro de período de Liberações.
const formatarCutoffISO = (diasAtras: number) => {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  return d.toISOString().slice(0, 10);
};

const formatT = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

// Rótulo curto (cabeçalho de coluna) + completo (dica ao clicar) por etapa_atual
// 1-6 — ver ETAPA_LABELS_CURTO/COMPLETO em DashboardShared.tsx. Cores
// reaproveitadas de ETAPAS[].cor de CarregamentoDetalhe.tsx, pra manter a
// mesma identidade visual por etapa no sistema.
const ETAPAS_BREAKDOWN: Array<{
  id: number;
  label: string;
  labelCompleto: string;
  icon: LucideIcon;
  corIcone: string;
  corBarra: string;
}> = [
  { id: 1, label: ETAPA_LABELS_CURTO[0], labelCompleto: ETAPA_LABELS_COMPLETO[0], icon: MapPin, corIcone: "text-orange-600", corBarra: "bg-orange-500" },
  { id: 2, label: ETAPA_LABELS_CURTO[1], labelCompleto: ETAPA_LABELS_COMPLETO[1], icon: PlayCircle, corIcone: "text-blue-600", corBarra: "bg-blue-500" },
  { id: 3, label: ETAPA_LABELS_CURTO[2], labelCompleto: ETAPA_LABELS_COMPLETO[2], icon: Truck, corIcone: "text-purple-600", corBarra: "bg-purple-500" },
  { id: 4, label: ETAPA_LABELS_CURTO[3], labelCompleto: ETAPA_LABELS_COMPLETO[3], icon: PackageCheck, corIcone: "text-indigo-600", corBarra: "bg-indigo-500" },
  { id: 5, label: ETAPA_LABELS_CURTO[4], labelCompleto: ETAPA_LABELS_COMPLETO[4], icon: FileText, corIcone: "text-amber-600", corBarra: "bg-amber-500" },
  { id: 6, label: ETAPA_LABELS_CURTO[5], labelCompleto: ETAPA_LABELS_COMPLETO[5], icon: CheckCircle2, corIcone: "text-green-600", corBarra: "bg-green-500" },
];
const FUNIL_ESTILOS: EstiloEtapa[] = ETAPAS_BREAKDOWN.map((e) => ({
  icon: e.icon,
  corIcone: e.corIcone,
  corBarra: e.corBarra,
}));

interface ControlePedidoItem {
  id: string;
  cliente: string;
  pedido: string;
  produto: string;
  unidade: string;
  volume: number;
  retirada: number;
  saldo: number;
  dias: number;
}

interface CarregamentoAtivoRow {
  armazemId: string | null;
  armazemNome?: string;
  etapa: number;
  toneladas: number;
}

interface ArmazemEtapaContagem {
  count: number;
  toneladas: number;
}

interface ArmazemBreakdownRow {
  armazemId: string;
  nome: string;
  porEtapa: Record<number, ArmazemEtapaContagem>;
}

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

interface CarregamentoAtrasadoItem {
  id: string;
  cliente: string;
  armazem: string;
  etapaLabel: string;
  minutosDecorridos: number;
  limiteMinutos: number;
  toneladas: number;
}

// ---------- Controle de Pedidos ----------

function ControlePedidosCard({ itens, isLoading }: { itens: ControlePedidoItem[] | undefined; isLoading: boolean }) {
  const lista = itens ?? [];

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <TitleWithInfo
          title="Controle de Pedidos"
          tooltip="Uma linha por liberação em aberto (ainda não 100% agendada ou retirada), com o saldo restante e há quantos dias está aberta."
        />
      </CardHeader>
      <CardContent className="pt-0">
        {!isLoading && lista.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma liberação em aberto.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right">Retirada</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-right">Dias em aberto</TableHead>
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
                  lista.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <Link to={`/liberacoes?liberacaoId=${item.id}`} className="hover:underline underline-offset-2">
                          {item.cliente}
                        </Link>
                      </TableCell>
                      <TableCell>{item.pedido}</TableCell>
                      <TableCell>{item.produto}</TableCell>
                      <TableCell className="text-right">
                        {formatT(item.volume)} {item.unidade}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatT(item.retirada)} {item.unidade}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatT(item.saldo)} {item.unidade}
                      </TableCell>
                      <TableCell className="text-right">{item.dias}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- Armazéns por Etapa (sempre tabela; clique mostra toneladas) ----------

function CelulaComToneladas({ count, toneladas, corBarra }: { count: number; toneladas: number; corBarra: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen((o) => !o);
          }}
          className="flex w-full items-center justify-center py-1.5"
        >
          {count > 0 ? (
            <span
              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white ${corBarra}`}
            >
              {count}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">0</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="center">
        <p className="text-sm">{formatT(toneladas)} t</p>
      </PopoverContent>
    </Popover>
  );
}

function ArmazensPorEtapaCard({
  armazensExibidos,
  breakdown,
  isLoading,
}: {
  armazensExibidos: Array<{ id: string; nome: string }>;
  breakdown: ArmazemBreakdownRow[] | undefined;
  isLoading: boolean;
}) {
  const mapaBreakdown = useMemo(() => new Map((breakdown ?? []).map((r) => [r.armazemId, r])), [breakdown]);

  const dados = armazensExibidos.map((a) => ({
    armazemId: a.id,
    nome: a.nome,
    porEtapa: mapaBreakdown.get(a.id)?.porEtapa ?? {},
  }));

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <TitleWithInfo
          title="Armazéns por Etapa"
          tooltip="Quantidade de carregamentos em cada etapa, por armazém. Clique num número pra ver o total em toneladas."
        />
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando…</p>
        ) : dados.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum armazém encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Armazém</TableHead>
                  {ETAPAS_BREAKDOWN.map((e) => (
                    <TableHead key={e.id} className="text-center text-xs">
                      <span className="inline-flex items-center gap-1">
                        <e.icon className={`h-3.5 w-3.5 ${e.corIcone}`} />
                        <ColunaComDica label={e.label} dica={e.labelCompleto} />
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {dados.map((a) => (
                  <TableRow key={a.armazemId}>
                    <TableCell className="font-medium">
                      <Link to="/armazens" className="hover:underline underline-offset-2">
                        {a.nome}
                      </Link>
                    </TableCell>
                    {ETAPAS_BREAKDOWN.map((e) => {
                      const dado = a.porEtapa[e.id];
                      return (
                        <TableCell key={e.id} className="text-center text-sm p-0">
                          <CelulaComToneladas count={dado?.count ?? 0} toneladas={dado?.toneladas ?? 0} corBarra={e.corBarra} />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- Título de coluna com dica clicável (sem hover, funciona em touch) ----------

function ColunaComDica({ label, dica }: { label: string; dica: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Info
            className="h-3 w-3 text-muted-foreground/70 cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen((o) => !o);
            }}
          />
        </PopoverTrigger>
        <PopoverContent className="w-auto max-w-[220px] p-2">
          <p className="text-xs">{dica}</p>
        </PopoverContent>
      </Popover>
    </span>
  );
}

// Médias dos últimos 30 dias, quebradas por armazém, para a logística
// identificar rapidamente qual armazém está com gargalo em qual etapa.
function PerformancePorArmazemCard({ dados, isLoading }: { dados: TemposArmazemRow[] | undefined; isLoading: boolean }) {
  const linhas = dados ?? [];

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <TitleWithInfo
          title="Performance por Armazém"
          tooltip="Tempo médio de operação e de documentação de cada armazém nos últimos 30 dias, para identificar onde há gargalo."
        />
      </CardHeader>
      <CardContent className="pt-0">
        {!isLoading && linhas.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum carregamento finalizado nos últimos 30 dias.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead rowSpan={2} className="align-bottom">
                    Armazém
                  </TableHead>
                  <TableHead colSpan={2} className="text-center border-l">
                    Carregamento (min)
                  </TableHead>
                  <TableHead colSpan={3} className="text-center border-l">
                    Documentação (min)
                  </TableHead>
                  <TableHead rowSpan={2} className="text-center border-l align-bottom">
                    <ColunaComDica
                      label="Total (min)"
                      dica="Tempo total do processo: da chegada do caminhão até a finalização (último documento anexado, quando o carregamento passa da etapa 5 - Documentação para a etapa 6 - Finalizado)."
                    />
                  </TableHead>
                </TableRow>
                <TableRow>
                  <TableHead className="border-l text-xs">
                    <ColunaComDica label="Espera" dica="Chegada até início do carregamento" />
                  </TableHead>
                  <TableHead className="text-xs">
                    <ColunaComDica label="Carregamento" dica="Início até finalização do carregamento" />
                  </TableHead>
                  <TableHead className="border-l text-xs">
                    <ColunaComDica label="Finalizado → 1º Doc" dica="Carregamento finalizado até o 1º documento (armazém)" />
                  </TableHead>
                  <TableHead className="text-xs">
                    <ColunaComDica label="1º → 2º Doc" dica="1º documento (armazém) até 2º documento (logística)" />
                  </TableHead>
                  <TableHead className="text-xs">
                    <ColunaComDica label="2º Doc → Fim" dica="2º documento (logística) até a finalização (armazém)" />
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
                      <TableCell className="border-l text-sm">
                        {formatarDuracaoMinutos(row.finalizadoAte1Doc)}
                      </TableCell>
                      <TableCell className="text-sm">{formatarDuracaoMinutos(row.doc1AteDoc2)}</TableCell>
                      <TableCell className="text-sm">{formatarDuracaoMinutos(row.doc2AteFinalizacao)}</TableCell>
                      <TableCell className="border-l text-sm font-medium">
                        {formatarDuracaoMinutos(row.tempoTotalProcesso)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const DashboardLogistica = () => {
  const hoje = useMemo(() => new Date(), []);
  const inicioHoje = startOfDayISO(hoje);
  const fimHoje = endOfDayISO(hoje);
  const inicioJanela30d = startOfDayISO(addDays(hoje, -30));

  const [filtroArmazens, setFiltroArmazens] = useState<string[]>([]);
  const [filtroProdutos, setFiltroProdutos] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [modalAtrasadosOpen, setModalAtrasadosOpen] = useState(false);

  const toggleArmazem = (id: string) =>
    setFiltroArmazens((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  const toggleProduto = (id: string) =>
    setFiltroProdutos((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  const limparFiltros = () => {
    setFiltroArmazens([]);
    setFiltroProdutos([]);
  };
  const totalFiltrosAtivos = filtroArmazens.length + filtroProdutos.length;

  const { data: armazensList } = useQuery({
    queryKey: ["dash-armazens-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("armazens").select("id, nome").eq("ativo", true).order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: produtosList } = useQuery({
    queryKey: ["dash-produtos-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("produtos").select("id, nome").eq("ativo", true).order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const armazensExibidos = useMemo(() => {
    const todos = armazensList ?? [];
    return filtroArmazens.length ? todos.filter((a) => filtroArmazens.includes(a.id)) : todos;
  }, [armazensList, filtroArmazens]);

  // Controle de Pedidos: uma linha por liberação em aberto. "Em aberto" (saldo
  // + contagem) é derivado desses mesmos dados, para não duplicar a query.
  // Soma bruta assume que todo produto está em toneladas — hoje é o caso real
  // (ver decisão registrada na conversa); se produtos em kg entrarem em uso,
  // essa soma passa a precisar de conversão antes de somar.
  const { data: controlePedidos, isLoading: loadingControlePedidos } = useQuery({
    queryKey: ["dash-controle-pedidos", filtroArmazens, filtroProdutos],
    queryFn: async (): Promise<ControlePedidoItem[]> => {
      let query = supabase
        .from("liberacoes")
        .select(
          "id, pedido_interno, quantidade_liberada, quantidade_retirada, data_liberacao, created_at, clientes(nome), produtos(nome, unidade)"
        )
        .in("status", ["disponivel", "parcialmente_agendada", "totalmente_agendada"])
        .order("data_liberacao", { ascending: true });
      if (filtroArmazens.length) query = query.in("armazem_id", filtroArmazens);
      if (filtroProdutos.length) query = query.in("produto_id", filtroProdutos);
      const { data, error } = await query;
      if (error) throw error;

      const hojeMeiaNoite = paraMeiaNoite(new Date().toISOString());
      return (data ?? []).map((l: any) => {
        const volume = Number(l.quantidade_liberada);
        const retirada = Number(l.quantidade_retirada);
        const dataBase = paraMeiaNoite(l.data_liberacao ?? l.created_at);
        const dias = Math.round((hojeMeiaNoite.getTime() - dataBase.getTime()) / 86_400_000);
        return {
          id: l.id as string,
          cliente: l.clientes?.nome ?? "Cliente",
          pedido: l.pedido_interno as string,
          produto: l.produtos?.nome ?? "Produto",
          unidade: l.produtos?.unidade ?? "",
          volume,
          retirada,
          saldo: volume - retirada,
          dias,
        };
      });
    },
    refetchInterval: 60_000,
  });

  const emAberto = useMemo(() => {
    const lista = controlePedidos ?? [];
    return { saldo: lista.reduce((acc, l) => acc + l.saldo, 0), pedidos: lista.length };
  }, [controlePedidos]);

  // Alerta: liberações sem NENHUM agendamento ainda, criadas há mais dias do
  // que o prazo configurado em config_liberacao_prazo (mesma config já usada
  // no dashboard do cliente, lá para medir atraso de retirada — aqui mede
  // atraso de agendamento). status = 'disponivel' já implica zero agendamentos
  // vinculados neste modelo de dados (qualquer agendamento move o status pra
  // frente).
  const { data: semAgendamento, isLoading: loadingSemAgendamento } = useQuery({
    queryKey: ["dash-sem-agendamento", filtroArmazens, filtroProdutos],
    queryFn: async () => {
      let liberacoesQuery = supabase
        .from("liberacoes")
        .select("id, data_liberacao, created_at")
        .eq("status", "disponivel");
      if (filtroArmazens.length) liberacoesQuery = liberacoesQuery.in("armazem_id", filtroArmazens);
      if (filtroProdutos.length) liberacoesQuery = liberacoesQuery.in("produto_id", filtroProdutos);

      const [{ data: config, error: configError }, { data: liberacoes, error: liberacoesError }] = await Promise.all([
        supabase.from("config_liberacao_prazo").select("prazo_maximo_dias").limit(1).maybeSingle(),
        liberacoesQuery,
      ]);
      if (configError) throw configError;
      if (liberacoesError) throw liberacoesError;

      const prazoMaximoDias = config?.prazo_maximo_dias ?? 10;
      const hojeMeiaNoite = paraMeiaNoite(new Date().toISOString());

      const count = (liberacoes ?? []).filter((l: any) => {
        const dataBase = paraMeiaNoite(l.data_liberacao ?? l.created_at);
        const dias = Math.round((hojeMeiaNoite.getTime() - dataBase.getTime()) / 86_400_000);
        return dias > prazoMaximoDias;
      }).length;

      return { count, prazoMaximoDias };
    },
    refetchInterval: 60_000,
  });

  // Contagem + volume dos agendamentos para hoje, em todos os armazéns
  // (filtro de armazém aplicado direto na query; produto exige ir até
  // liberações, então é filtrado depois de buscar).
  const { data: agendadosHoje, isLoading: loadingAgendadosHoje } = useQuery({
    queryKey: ["dash-agendados-hoje", inicioHoje, fimHoje, filtroArmazens, filtroProdutos],
    queryFn: async () => {
      let query = supabase
        .from("agendamentos")
        .select("quantidade, liberacoes(produto_id)")
        .gte("data_retirada", inicioHoje)
        .lte("data_retirada", fimHoje)
        .neq("status", "cancelado");
      if (filtroArmazens.length) query = query.in("armazem_id", filtroArmazens);
      const { data, error } = await query;
      if (error) throw error;

      const filtrados = filtroProdutos.length
        ? (data ?? []).filter((a: any) => filtroProdutos.includes(a.liberacoes?.produto_id))
        : data ?? [];

      return {
        contagem: filtrados.length,
        volume: filtrados.reduce((acc: number, a: any) => acc + Number(a.quantidade), 0),
      };
    },
    refetchInterval: 60_000,
  });

  // Base única pra Funil / Armazéns por Etapa / Finalizados Hoje: etapas 1-5
  // são estado ATUAL (não filtradas por data — um carregamento "Carregando"
  // não tem uma "data" própria, é um estado momentâneo). Etapa 6 (Finalizado)
  // é a única com um evento datado (data_documentacao), e enquanto o
  // dashboard não tem filtro de período próprio, ela fica sempre restrita a
  // HOJE — senão o card/coluna "Finalizado" cresceria pra sempre e deixaria
  // de refletir "o que está acontecendo agora/hoje" (única exceção combinada
  // é Performance por Armazém, que é uma média de 30 dias por definição).
  const { data: carregamentosAtivos, isLoading: loadingCarregamentosAtivos } = useQuery({
    queryKey: ["dash-carregamentos-ativos", filtroArmazens, filtroProdutos, inicioHoje, fimHoje],
    queryFn: async (): Promise<CarregamentoAtivoRow[]> => {
      let query = supabase
        .from("carregamentos")
        .select("armazem_id, armazens(nome), etapa_atual, agendamentos(quantidade, liberacoes(produto_id))")
        .or(`etapa_atual.lt.6,and(etapa_atual.eq.6,data_documentacao.gte.${inicioHoje},data_documentacao.lte.${fimHoje})`);
      if (filtroArmazens.length) query = query.in("armazem_id", filtroArmazens);
      const { data, error } = await query;
      if (error) throw error;

      const filtrados = filtroProdutos.length
        ? (data ?? []).filter((c: any) => filtroProdutos.includes(c.agendamentos?.liberacoes?.produto_id))
        : data ?? [];

      return filtrados.map((c: any) => ({
        armazemId: c.armazem_id ?? null,
        armazemNome: c.armazens?.nome,
        etapa: c.etapa_atual as number,
        toneladas: Number(c.agendamentos?.quantidade ?? 0),
      }));
    },
    refetchInterval: 60_000,
  });

  const armazensBreakdown = useMemo((): ArmazemBreakdownRow[] => {
    const porArmazem = new Map<string, ArmazemBreakdownRow>();
    (carregamentosAtivos ?? []).forEach((c) => {
      if (!c.armazemId) return;
      if (!porArmazem.has(c.armazemId)) {
        porArmazem.set(c.armazemId, { armazemId: c.armazemId, nome: c.armazemNome ?? "Armazém", porEtapa: {} });
      }
      const row = porArmazem.get(c.armazemId)!;
      const atual = row.porEtapa[c.etapa] ?? { count: 0, toneladas: 0 };
      atual.count += 1;
      atual.toneladas += c.toneladas;
      row.porEtapa[c.etapa] = atual;
    });
    return Array.from(porArmazem.values());
  }, [carregamentosAtivos]);

  // ETAPA_LABELS_COMPLETO já tem as 6 posições (etapa_atual 1-6) — a etapa 6
  // (Processo Finalizado) só considera os de hoje, ver query base acima.
  const funilEtapas = useMemo(() => {
    const contagem: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const toneladas: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    (carregamentosAtivos ?? []).forEach((c) => {
      contagem[c.etapa] = (contagem[c.etapa] ?? 0) + 1;
      toneladas[c.etapa] = (toneladas[c.etapa] ?? 0) + c.toneladas;
    });
    return ETAPA_LABELS_COMPLETO.map((label, index) => ({
      etapa: label,
      quantidade: contagem[index + 1] ?? 0,
      toneladas: toneladas[index + 1] ?? 0,
    }));
  }, [carregamentosAtivos]);

  // Derivado da mesma base (etapa 6 já vem restrita a hoje).
  const finalizadosHoje = useMemo(() => {
    let count = 0;
    let volume = 0;
    (carregamentosAtivos ?? []).forEach((c) => {
      if (c.etapa === 6) {
        count += 1;
        volume += c.toneladas;
      }
    });
    return { count, volume };
  }, [carregamentosAtivos]);

  // Etapa 1 (Chegada, ainda não confirmada) não entra nessa métrica:
  // data_retirada do agendamento é um DATE (sem horário), então não dá pra
  // medir atraso em minutos com precisão — e a chegada em si não é uma ação
  // já registrada nessa etapa. Só etapas 2-5, com timestamp exato (ver
  // ENTRADA_ETAPA_FIELD), contam.
  const { data: atrasadosInfo, isLoading: loadingCarregamentosAtrasados } = useQuery({
    queryKey: ["dash-carregamentos-atrasados"],
    queryFn: async () => {
      const [{ data: config, error: configError }, { data: emAndamento, error: carregamentosError }] =
        await Promise.all([
          supabase.from("config_tempo_etapas").select("etapa,tempo_maximo_minutos"),
          supabase
            .from("carregamentos")
            .select(
              "id,etapa_atual,data_chegada,data_inicio,data_carregando,data_finalizacao,clientes(nome),armazens(nome),agendamentos(quantidade)"
            )
            .gte("etapa_atual", 2)
            .lt("etapa_atual", 6),
        ]);
      if (configError) throw configError;
      if (carregamentosError) throw carregamentosError;

      const limites = new Map((config ?? []).map((c) => [c.etapa, c.tempo_maximo_minutos]));
      const agora = Date.now();

      const itens: CarregamentoAtrasadoItem[] = (emAndamento ?? [])
        .map((c: any) => {
          const limiteMinutos = limites.get(c.etapa_atual);
          if (!limiteMinutos) return null;
          const entradaISO = c[ENTRADA_ETAPA_FIELD[c.etapa_atual] as string];
          if (!entradaISO) return null;
          const minutosDecorridos = (agora - new Date(entradaISO).getTime()) / 60_000;
          if (minutosDecorridos <= limiteMinutos) return null;
          return {
            id: c.id as string,
            cliente: c.clientes?.nome ?? "Cliente",
            armazem: c.armazens?.nome ?? "Armazém",
            etapaLabel: ETAPA_LABELS_CURTO[c.etapa_atual - 1] ?? `Etapa ${c.etapa_atual}`,
            minutosDecorridos: Math.round(minutosDecorridos),
            limiteMinutos,
            toneladas: Number(c.agendamentos?.quantidade ?? 0),
          };
        })
        .filter((x: CarregamentoAtrasadoItem | null): x is CarregamentoAtrasadoItem => x !== null);

      const limitesPorEtapa = ETAPA_LABELS_CURTO.map((label, index) => ({
        label,
        minutos: limites.get(index + 1) ?? null,
      })).filter((l): l is { label: string; minutos: number } => l.minutos != null);

      return { itens, limitesPorEtapa };
    },
    refetchInterval: 60_000,
  });

  // Armazéns/clientes com operação hoje: agendamento marcado para hoje OU
  // carregamento atualmente em andamento (etapa < 6, independente de quando começou).
  const { data: operacoesHoje, isLoading: loadingOperacoesHoje } = useQuery({
    queryKey: ["dash-operacoes-hoje", filtroArmazens],
    queryFn: async () => {
      let agQuery = supabase
        .from("agendamentos")
        .select("armazem_id, cliente_id, armazens(nome), clientes(nome)")
        .gte("data_retirada", inicioHoje)
        .lte("data_retirada", fimHoje)
        .neq("status", "cancelado");
      let carQuery = supabase
        .from("carregamentos")
        .select("armazem_id, cliente_id, armazens(nome), clientes(nome)")
        .lt("etapa_atual", 6);
      if (filtroArmazens.length) {
        agQuery = agQuery.in("armazem_id", filtroArmazens);
        carQuery = carQuery.in("armazem_id", filtroArmazens);
      }
      const [{ data: agHoje, error: agError }, { data: carAndamento, error: carError }] = await Promise.all([
        agQuery,
        carQuery,
      ]);
      if (agError) throw agError;
      if (carError) throw carError;

      const armazensMap = new Map<string, string>();
      const clientesMap = new Map<string, string>();

      [...(agHoje ?? []), ...(carAndamento ?? [])].forEach((row: any) => {
        if (row.armazem_id && row.armazens?.nome) armazensMap.set(row.armazem_id, row.armazens.nome);
        if (row.cliente_id && row.clientes?.nome) clientesMap.set(row.cliente_id, row.clientes.nome);
      });

      const porNome = (m: Map<string, string>) =>
        Array.from(m.entries())
          .map(([id, nome]) => ({ id, nome }))
          .sort((a, b) => a.nome.localeCompare(b.nome));

      return {
        armazens: porNome(armazensMap),
        clientes: porNome(clientesMap),
      };
    },
    refetchInterval: 60_000,
  });

  const { data: documentacaoPendente, isLoading: loadingDocumentacaoPendente } = useQuery({
    queryKey: ["dash-documentacao-pendente"],
    queryFn: async (): Promise<DocumentacaoPendenteItem[]> => {
      const { data, error } = await supabase
        .from("carregamentos")
        .select(
          "id, etapa_5a_status, etapa_5b_status, etapa_5c_status, clientes(nome), armazens(nome), agendamentos(liberacoes(pedido_interno))"
        )
        .eq("etapa_atual", 5);
      if (error) throw error;

      return (data ?? [])
        .map((c: any) => ({
          id: c.id as string,
          cliente: c.clientes?.nome ?? "Cliente",
          armazem: c.armazens?.nome ?? "Armazém",
          pedido: c.agendamentos?.liberacoes?.pedido_interno ?? "-",
          pendencias: SUB_ETAPAS_DOCUMENTACAO.filter((sub) => c[sub.campo] !== "concluida").map((sub) => ({
            label: sub.label,
            responsavel: sub.responsavel,
          })),
        }))
        .filter((item) => item.pendencias.length > 0);
    },
    refetchInterval: 60_000,
  });

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
        .select(
          "id, data_retirada, quantidade, clientes(nome), armazens(nome), liberacoes(pedido_interno, produtos(nome, unidade))"
        )
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
    refetchInterval: 60_000,
  });

  const { data: estoqueBaixo, isLoading: loadingEstoqueBaixo } = useQuery({
    queryKey: ["dash-estoque-baixo", filtroArmazens, filtroProdutos],
    queryFn: async (): Promise<EstoqueBaixoItem[]> => {
      let query = supabase
        .from("estoque")
        .select("id, produto_id, armazem_id, quantidade, produtos(nome, unidade, estoque_minimo), armazens(nome)");
      if (filtroArmazens.length) query = query.in("armazem_id", filtroArmazens);
      if (filtroProdutos.length) query = query.in("produto_id", filtroProdutos);
      const { data, error } = await query;
      if (error) throw error;

      return (data ?? [])
        .filter((e: any) => e.produtos?.estoque_minimo != null && Number(e.quantidade) < Number(e.produtos.estoque_minimo))
        .map((e: any) => ({
          id: e.id as string,
          produtoId: e.produto_id as string,
          armazemId: e.armazem_id as string,
          produto: e.produtos?.nome ?? "Produto",
          armazem: e.armazens?.nome ?? "Armazém",
          quantidade: Number(e.quantidade),
          minimo: Number(e.produtos.estoque_minimo),
          unidade: e.produtos?.unidade ?? "",
        }));
    },
    refetchInterval: 120_000,
  });

  const { data: transferenciasStats, isLoading: loadingTransferencias } = useQuery({
    queryKey: ["dash-transferencias-propriedade", filtroArmazens, filtroProdutos],
    queryFn: async () => {
      const inicioMes = new Date();
      inicioMes.setDate(1);
      const inicioMesISO = inicioMes.toISOString().slice(0, 10);

      let query = supabase
        .from("estoque_transferencias")
        .select("quantidade, produto_id, armazem_id")
        .eq("status", "ativa")
        .gte("data_transferencia", inicioMesISO);
      if (filtroArmazens.length) query = query.in("armazem_id", filtroArmazens);
      if (filtroProdutos.length) query = query.in("produto_id", filtroProdutos);

      const { data, error } = await query;
      if (error) throw error;

      return {
        count: data?.length ?? 0,
        totalQuantidade: (data ?? []).reduce((acc, t) => acc + Number(t.quantidade), 0),
      };
    },
    refetchInterval: 120_000,
  });

  const dicaAtrasados =
    !loadingCarregamentosAtrasados && atrasadosInfo?.limitesPorEtapa.length
      ? `Prazo por etapa: ${atrasadosInfo.limitesPorEtapa.map((l) => `${l.label} ${l.minutos}min`).join(" • ")}`
      : "Carregamentos parados na etapa atual além do limite configurado para essa etapa.";

  return (
    <div className="container mx-auto px-4 md:px-6 py-6">
      <PageHeader title="Dashboard" subtitle="Visão geral das operações de logística" icon={LayoutDashboard} />

      <div className="mt-6">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Button
            size="sm"
            className="whitespace-nowrap min-h-[44px] max-md:min-h-[44px] btn-secondary"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filtros
            {totalFiltrosAtivos ? ` (${totalFiltrosAtivos})` : ""}
            {filtersOpen ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
          </Button>
          {totalFiltrosAtivos > 0 && (
            <Button size="sm" onClick={limparFiltros} className="gap-1 min-h-[44px] max-md:min-h-[44px] btn-secondary">
              <X className="h-4 w-4" />
              Limpar Filtros
            </Button>
          )}
        </div>

        {filtersOpen && (
          <div className="rounded-md border p-3 space-y-4 mb-6">
            <div>
              <Label className="text-sm font-semibold mb-2 block">Armazém</Label>
              <div className="flex flex-wrap gap-2">
                {(armazensList ?? []).map((a) => {
                  const active = filtroArmazens.includes(a.id);
                  return (
                    <Badge
                      key={a.id}
                      onClick={() => toggleArmazem(a.id)}
                      className={`cursor-pointer text-xs px-2 py-1 min-h-[32px] break-words ${
                        active ? "bg-gradient-primary text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {a.nome}
                    </Badge>
                  );
                })}
                {(armazensList ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum armazém cadastrado.</p>
                )}
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold mb-2 block">Produto</Label>
              <div className="flex flex-wrap gap-2">
                {(produtosList ?? []).map((p) => {
                  const active = filtroProdutos.includes(p.id);
                  return (
                    <Badge
                      key={p.id}
                      onClick={() => toggleProduto(p.id)}
                      className={`cursor-pointer text-xs px-2 py-1 min-h-[32px] break-words ${
                        active ? "bg-gradient-primary text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.nome}
                    </Badge>
                  );
                })}
                {(produtosList ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum produto cadastrado.</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Gestão de Armazéns
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard
                title="Agendados Hoje"
                value={loadingAgendadosHoje ? "…" : `${formatT(agendadosHoje?.volume ?? 0)} t`}
                subtitle={loadingAgendadosHoje ? undefined : `${agendadosHoje?.contagem ?? 0} agendamento(s)`}
                icon={Calendar}
                variant="primary"
                tooltip="Contagem e volume total das retiradas agendadas para hoje, em todos os armazéns."
                to={agendadosHoje?.contagem ? "/agendamentos?data=hoje" : undefined}
              />
              <StatCard
                title="Finalizados Hoje"
                value={loadingCarregamentosAtivos ? "…" : `${formatT(finalizadosHoje.volume)} t`}
                subtitle={loadingCarregamentosAtivos ? undefined : `${finalizadosHoje.count} carregamento(s)`}
                icon={CheckCircle2}
                variant="success"
                highlightBg
                tooltip="Processos de carregamento finalizados hoje (não é a quantidade de caminhões — cada carregamento é um processo completo, do agendamento à documentação)."
                to={finalizadosHoje.count ? "/carregamentos?status=finalizado&finalizadoHoje=1" : undefined}
              />
              <StatCard
                title="Carregamentos Atrasados"
                value={
                  loadingCarregamentosAtrasados
                    ? "…"
                    : `${formatT((atrasadosInfo?.itens ?? []).reduce((acc, i) => acc + i.toneladas, 0))} t`
                }
                subtitle={loadingCarregamentosAtrasados ? undefined : `${atrasadosInfo?.itens.length ?? 0} carregamento(s)`}
                icon={AlertTriangle}
                variant="warning"
                highlightBg
                tooltip={dicaAtrasados}
                onClick={atrasadosInfo?.itens.length ? () => setModalAtrasadosOpen(true) : undefined}
              />
            </div>

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <FunilEtapasCard data={funilEtapas} isLoading={loadingCarregamentosAtivos} estilos={FUNIL_ESTILOS} />
              <DocumentacaoPendenteCard itens={documentacaoPendente} isLoading={loadingDocumentacaoPendente} />
            </div>

            <div className="mt-4">
              <ArmazensPorEtapaCard
                armazensExibidos={armazensExibidos}
                breakdown={armazensBreakdown}
                isLoading={loadingCarregamentosAtivos}
              />
            </div>

            <div className="mt-4">
              <PerformancePorArmazemCard dados={temposPorArmazem} isLoading={loadingTemposPorArmazem} />
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <EntityListCard
                title="Armazéns com Operação Hoje"
                tooltip="Armazéns que têm agendamento para hoje ou carregamento em andamento. Clique num armazém pra ver os carregamentos dele."
                icon={Warehouse}
                names={operacoesHoje?.armazens.map((a) => a.nome)}
                isLoading={loadingOperacoesHoje}
                emptyLabel="Nenhum armazém com operação hoje."
                hrefFor={(nome) => {
                  const id = operacoesHoje?.armazens.find((a) => a.nome === nome)?.id;
                  return id ? `/carregamentos?armazemId=${id}` : undefined;
                }}
              />
              <EntityListCard
                title="Clientes com Operação Hoje"
                tooltip="Clientes que têm agendamento para hoje ou carregamento em andamento. Clique num cliente pra ver os carregamentos dele."
                icon={Building2}
                names={operacoesHoje?.clientes.map((c) => c.nome)}
                isLoading={loadingOperacoesHoje}
                emptyLabel="Nenhum cliente com operação hoje."
                hrefFor={(nome) => {
                  const id = operacoesHoje?.clientes.find((c) => c.nome === nome)?.id;
                  return id ? `/carregamentos?clienteId=${id}` : undefined;
                }}
              />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Gestão de Pedidos
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard
                title="Em Aberto"
                value={loadingControlePedidos ? "…" : `${formatT(emAberto.saldo)} t`}
                subtitle={loadingControlePedidos ? undefined : `${emAberto.pedidos} pedido(s) em aberto`}
                icon={ClipboardList}
                variant="primary"
                tooltip="Saldo (liberado − retirado) das liberações que ainda não estão 100% agendadas ou retiradas."
                to={emAberto.pedidos ? "/liberacoes" : undefined}
              />
              <StatCard
                title="Sem Agendamento"
                value={loadingSemAgendamento ? "…" : semAgendamento?.count ?? 0}
                subtitle={
                  loadingSemAgendamento
                    ? undefined
                    : `Liberadas há mais de ${semAgendamento?.prazoMaximoDias ?? 10} dias sem agendamento`
                }
                icon={ClipboardX}
                variant="warning"
                tooltip={
                  loadingSemAgendamento
                    ? "Liberações sem nenhum agendamento, além do prazo configurado."
                    : `Liberações sem nenhum agendamento, criadas há mais de ${semAgendamento?.prazoMaximoDias ?? 10} dias.`
                }
                to={
                  semAgendamento?.count
                    ? `/liberacoes?status=disponivel&antesDe=${formatarCutoffISO(semAgendamento.prazoMaximoDias)}`
                    : undefined
                }
              />
            </div>

            <div className="mt-4">
              <ControlePedidosCard itens={controlePedidos} isLoading={loadingControlePedidos} />
            </div>

            <div className="mt-4">
              <ProximosAgendamentosCard itens={proximosAgendamentos} isLoading={loadingProximosAgendamentos} />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Gestão de Estoques
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <StatCard
                title="Transferências de Propriedade"
                value={loadingTransferencias ? "…" : transferenciasStats?.count ?? 0}
                subtitle={loadingTransferencias ? undefined : `${formatT(transferenciasStats?.totalQuantidade ?? 0)}t este mês`}
                icon={ArrowRightLeft}
                variant="primary"
                tooltip="Saídas de estoque por Transferência de Propriedade (sem Liberação/Agendamento/Carregamento) registradas este mês."
                to="/estoque"
              />
            </div>
            <EstoqueBaixoCard itens={estoqueBaixo} isLoading={loadingEstoqueBaixo} />
          </section>
        </div>
      </div>

      <Dialog open={modalAtrasadosOpen} onOpenChange={setModalAtrasadosOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] md:max-w-lg max-h-[calc(100vh-8rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Carregamentos Atrasados</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {(atrasadosInfo?.itens.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum carregamento atrasado no momento.</p>
            ) : (
              atrasadosInfo!.itens.map((item) => (
                <Link
                  key={item.id}
                  to={`/carregamentos/${item.id}`}
                  onClick={() => setModalAtrasadosOpen(false)}
                  className="flex items-center justify-between gap-3 rounded border p-2.5 hover:bg-muted/50 transition-colors"
                >
                  <div className="text-sm min-w-0">
                    <span className="font-medium">{item.cliente}</span>
                    <span className="text-muted-foreground"> • {item.armazem}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 font-normal">
                      {item.etapaLabel}
                    </Badge>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {item.minutosDecorridos}min (limite {item.limiteMinutos}min)
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardLogistica;
