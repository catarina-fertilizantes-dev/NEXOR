import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ClipboardList,
  ClipboardX,
  Calendar,
  Truck,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Warehouse,
  Building2,
  Filter,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

// Normaliza uma data (string ISO ou DATE) para meia-noite local, para
// comparações de "dias decorridos" sem interferência de fuso/horário.
// (Mesmo helper duplicado em DashboardCliente.tsx — ver docs/DASHBOARDS.md.)
const paraMeiaNoite = (iso: string) => {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatT = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

const LIMITE_CARDS_ARMAZEM = 4;

const ETAPAS_BREAKDOWN: Array<{ id: number; label: string }> = [
  { id: 1, label: "Chegada" },
  { id: 2, label: "Início Carreg." },
  { id: 3, label: "Carregando" },
  { id: 4, label: "Carreg. Finalizado" },
  { id: 5, label: "Documentação" },
  { id: 6, label: "Finalizado" },
];

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

// ---------- Filtros (Armazém + Produto) ----------

function FiltrosDashboard({
  armazens,
  produtos,
  filtroArmazens,
  filtroProdutos,
  onToggleArmazem,
  onToggleProduto,
  onLimpar,
}: {
  armazens: Array<{ id: string; nome: string }>;
  produtos: Array<{ id: string; nome: string }>;
  filtroArmazens: string[];
  filtroProdutos: string[];
  onToggleArmazem: (id: string) => void;
  onToggleProduto: (id: string) => void;
  onLimpar: () => void;
}) {
  const totalAtivos = filtroArmazens.length + filtroProdutos.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2 min-h-[44px] max-md:min-h-[44px]">
          <Filter className="h-4 w-4" />
          Filtros
          {totalAtivos > 0 && (
            <Badge className="ml-0.5 bg-gradient-primary text-white px-1.5 py-0 h-5 min-w-5 justify-center">
              {totalAtivos}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold mb-2">Armazém</p>
            <div className="flex flex-wrap gap-1.5">
              {armazens.map((a) => {
                const active = filtroArmazens.includes(a.id);
                return (
                  <Badge
                    key={a.id}
                    onClick={() => onToggleArmazem(a.id)}
                    className={`cursor-pointer text-xs px-2 py-1 min-h-[28px] font-normal ${
                      active ? "bg-gradient-primary text-white hover:bg-gradient-primary" : "bg-muted text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {a.nome}
                  </Badge>
                );
              })}
              {armazens.length === 0 && <p className="text-xs text-muted-foreground">Nenhum armazém cadastrado.</p>}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Produto</p>
            <div className="flex flex-wrap gap-1.5">
              {produtos.map((p) => {
                const active = filtroProdutos.includes(p.id);
                return (
                  <Badge
                    key={p.id}
                    onClick={() => onToggleProduto(p.id)}
                    className={`cursor-pointer text-xs px-2 py-1 min-h-[28px] font-normal ${
                      active ? "bg-gradient-primary text-white hover:bg-gradient-primary" : "bg-muted text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {p.nome}
                  </Badge>
                );
              })}
              {produtos.length === 0 && <p className="text-xs text-muted-foreground">Nenhum produto cadastrado.</p>}
            </div>
          </div>
          {totalAtivos > 0 && (
            <button
              type="button"
              onClick={onLimpar}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
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
                        <Link to="/liberacoes" className="hover:underline underline-offset-2">
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

// ---------- Armazéns por Etapa (card completo ou tabela compacta) ----------

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
  const modoCard = armazensExibidos.length > 0 && armazensExibidos.length <= LIMITE_CARDS_ARMAZEM;

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
          tooltip="Quantidade de carregamentos em cada etapa, por armazém. Números diferentes de zero aparecem em destaque."
        />
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando…</p>
        ) : dados.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum armazém encontrado.</p>
        ) : modoCard ? (
          <div
            className={`grid grid-cols-1 gap-4 ${dados.length > 1 ? "md:grid-cols-2" : ""} ${
              dados.length > 2 ? "xl:grid-cols-3" : ""
            }`}
          >
            {dados.map((a) => (
              <div key={a.armazemId} className="rounded-lg border p-3">
                <Link to="/armazens" className="text-sm font-semibold hover:underline underline-offset-2">
                  {a.nome}
                </Link>
                <div className="mt-2 space-y-1">
                  {ETAPAS_BREAKDOWN.map((e) => {
                    const dado = a.porEtapa[e.id];
                    const count = dado?.count ?? 0;
                    return (
                      <div key={e.id} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{e.label}</span>
                        <span className={count > 0 ? "font-semibold text-foreground" : "text-muted-foreground"}>
                          {count}
                          {dado?.toneladas ? ` • ${formatT(dado.toneladas)} t` : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <TooltipProvider>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Armazém</TableHead>
                    {ETAPAS_BREAKDOWN.map((e) => (
                      <TableHead key={e.id} className="text-center text-xs">
                        {e.label}
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
                        const count = dado?.count ?? 0;
                        return (
                          <TableCell key={e.id} className="text-center text-sm">
                            <Tooltip delayDuration={100}>
                              <TooltipTrigger asChild>
                                <span
                                  className={`cursor-default ${count > 0 ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                                >
                                  {count}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{formatT(dado?.toneladas ?? 0)} t</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
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
  const inicioJanela30d = startOfDayISO(addDays(hoje, -30));

  const [filtroArmazens, setFiltroArmazens] = useState<string[]>([]);
  const [filtroProdutos, setFiltroProdutos] = useState<string[]>([]);

  const toggleArmazem = (id: string) =>
    setFiltroArmazens((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  const toggleProduto = (id: string) =>
    setFiltroProdutos((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  const limparFiltros = () => {
    setFiltroArmazens([]);
    setFiltroProdutos([]);
  };

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

  // "Carregando": carregamentos em Início Carregamento (2) ou Carregando (3).
  const { data: carregandoAtual, isLoading: loadingCarregandoAtual } = useQuery({
    queryKey: ["dash-carregando-atual", filtroArmazens, filtroProdutos],
    queryFn: async () => {
      let query = supabase
        .from("carregamentos")
        .select("etapa_atual, agendamentos(quantidade, liberacoes(produto_id))")
        .in("etapa_atual", [2, 3]);
      if (filtroArmazens.length) query = query.in("armazem_id", filtroArmazens);
      const { data, error } = await query;
      if (error) throw error;

      const filtrados = filtroProdutos.length
        ? (data ?? []).filter((c: any) => filtroProdutos.includes(c.agendamentos?.liberacoes?.produto_id))
        : data ?? [];

      return {
        contagem: filtrados.length,
        volume: filtrados.reduce((acc: number, c: any) => acc + Number(c.agendamentos?.quantidade ?? 0), 0),
      };
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

  // Funil por etapa (1-5, ativos): contagem + toneladas (soma da quantidade
  // do agendamento ligado a cada carregamento).
  const { data: funilEtapas, isLoading: loadingFunilEtapas } = useQuery({
    queryKey: ["dash-funil-etapas", filtroArmazens, filtroProdutos],
    queryFn: async () => {
      let query = supabase
        .from("carregamentos")
        .select("etapa_atual, agendamentos(quantidade, liberacoes(produto_id))")
        .lt("etapa_atual", 6);
      if (filtroArmazens.length) query = query.in("armazem_id", filtroArmazens);
      const { data, error } = await query;
      if (error) throw error;

      const filtrados = filtroProdutos.length
        ? (data ?? []).filter((c: any) => filtroProdutos.includes(c.agendamentos?.liberacoes?.produto_id))
        : data ?? [];

      const contagem: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      const toneladas: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      filtrados.forEach((c: any) => {
        contagem[c.etapa_atual] = (contagem[c.etapa_atual] ?? 0) + 1;
        toneladas[c.etapa_atual] = (toneladas[c.etapa_atual] ?? 0) + Number(c.agendamentos?.quantidade ?? 0);
      });

      return ETAPA_LABELS.map((label, index) => ({
        etapa: label,
        quantidade: contagem[index + 1] ?? 0,
        toneladas: toneladas[index + 1] ?? 0,
      }));
    },
    refetchInterval: 60_000,
  });

  // Breakdown por armazém x etapa (todas as 6 etapas, inclusive finalizados).
  const { data: armazensBreakdown, isLoading: loadingArmazensBreakdown } = useQuery({
    queryKey: ["dash-armazens-breakdown", filtroArmazens, filtroProdutos],
    queryFn: async (): Promise<ArmazemBreakdownRow[]> => {
      let query = supabase
        .from("carregamentos")
        .select("armazem_id, armazens(nome), etapa_atual, agendamentos(quantidade, liberacoes(produto_id))");
      if (filtroArmazens.length) query = query.in("armazem_id", filtroArmazens);
      const { data, error } = await query;
      if (error) throw error;

      const filtrados = filtroProdutos.length
        ? (data ?? []).filter((c: any) => filtroProdutos.includes(c.agendamentos?.liberacoes?.produto_id))
        : data ?? [];

      const porArmazem = new Map<string, ArmazemBreakdownRow>();
      filtrados.forEach((c: any) => {
        if (!c.armazem_id) return;
        if (!porArmazem.has(c.armazem_id)) {
          porArmazem.set(c.armazem_id, { armazemId: c.armazem_id, nome: c.armazens?.nome ?? "Armazém", porEtapa: {} });
        }
        const row = porArmazem.get(c.armazem_id)!;
        const atual = row.porEtapa[c.etapa_atual] ?? { count: 0, toneladas: 0 };
        atual.count += 1;
        atual.toneladas += Number(c.agendamentos?.quantidade ?? 0);
        row.porEtapa[c.etapa_atual] = atual;
      });

      return Array.from(porArmazem.values());
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
        .select("id, quantidade, produtos(nome, unidade, estoque_minimo), armazens(nome)");
      if (filtroArmazens.length) query = query.in("armazem_id", filtroArmazens);
      if (filtroProdutos.length) query = query.in("produto_id", filtroProdutos);
      const { data, error } = await query;
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

  return (
    <div className="container mx-auto px-4 md:px-6 py-6">
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral das operações de logística"
        icon={LayoutDashboard}
        actions={
          <FiltrosDashboard
            armazens={armazensList ?? []}
            produtos={produtosList ?? []}
            filtroArmazens={filtroArmazens}
            filtroProdutos={filtroProdutos}
            onToggleArmazem={toggleArmazem}
            onToggleProduto={toggleProduto}
            onLimpar={limparFiltros}
          />
        }
      />

      <div className="mt-6 space-y-8">
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              title="Em Aberto"
              value={loadingControlePedidos ? "…" : `${formatT(emAberto.saldo)} t`}
              subtitle={loadingControlePedidos ? undefined : `${emAberto.pedidos} pedido(s) em aberto`}
              icon={ClipboardList}
              variant="primary"
              tooltip="Saldo (liberado − retirado) das liberações que ainda não estão 100% agendadas ou retiradas."
              to="/liberacoes"
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
              tooltip="Liberações sem nenhum agendamento, criadas há mais dias do que o prazo configurado."
              to="/liberacoes"
            />
            <StatCard
              title="Agendados Hoje"
              value={loadingAgendadosHoje ? "…" : `${formatT(agendadosHoje?.volume ?? 0)} t`}
              subtitle={loadingAgendadosHoje ? undefined : `${agendadosHoje?.contagem ?? 0} agendamento(s)`}
              icon={Calendar}
              variant="primary"
              tooltip="Contagem e volume total das retiradas agendadas para hoje, em todos os armazéns."
              to="/agendamentos"
            />
            <StatCard
              title="Carregando"
              value={loadingCarregandoAtual ? "…" : `${formatT(carregandoAtual?.volume ?? 0)} t`}
              subtitle={loadingCarregandoAtual ? undefined : `${carregandoAtual?.contagem ?? 0} carregamento(s)`}
              icon={Truck}
              variant="primary"
              tooltip="Carregamentos em Início de Carregamento ou Carregando agora."
              to="/carregamentos"
            />
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* TODO(dashboard): card "Chegada" pendente de definição com o time —
                reservando o espaço até a especificação chegar. */}
            <StatCard
              title="Chegada"
              value="—"
              subtitle="Em definição"
              icon={MapPin}
              variant="default"
              tooltip="Card ainda em definição com o time. Em breve."
            />
            <StatCard
              title="Finalizados Hoje"
              value={loadingCarregamentosFinalizadosHoje ? "…" : carregamentosFinalizadosHoje ?? 0}
              icon={CheckCircle2}
              variant="success"
              tooltip="Carregamentos que foram finalizados hoje."
              to="/carregamentos"
            />
            <StatCard
              title="Carregamentos Atrasados"
              value={loadingCarregamentosAtrasados ? "…" : carregamentosAtrasados ?? 0}
              icon={AlertTriangle}
              variant="warning"
              tooltip="Carregamentos parados na etapa atual há mais tempo do que o limite configurado para essa etapa."
              to="/carregamentos"
            />
          </div>
        </section>

        <section>
          <ControlePedidosCard itens={controlePedidos} isLoading={loadingControlePedidos} />
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FunilEtapasCard data={funilEtapas} isLoading={loadingFunilEtapas} />
            <DocumentacaoPendenteCard itens={documentacaoPendente} isLoading={loadingDocumentacaoPendente} />
          </div>
        </section>

        <section>
          <ArmazensPorEtapaCard
            armazensExibidos={armazensExibidos}
            breakdown={armazensBreakdown}
            isLoading={loadingArmazensBreakdown}
          />
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
