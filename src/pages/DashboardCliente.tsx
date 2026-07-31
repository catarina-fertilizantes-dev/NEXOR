import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ClipboardList,
  Calendar,
  Truck,
  CheckCircle2,
  CalendarCheck,
  PackageCheck,
  PackageOpen,
  Warehouse,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  startOfDayISO,
  endOfDayISO,
  addDays,
  EntityListCard,
  ProximosAgendamentosCard,
  ProximoAgendamentoItem,
  TitleWithInfo,
  formatarDataHora,
  formatarData,
} from "@/components/dashboard/DashboardShared";
import { parseDateOnly } from "@/lib/utils";

const formatarPlaca = (placa?: string | null) => {
  if (!placa) return "—";
  const up = placa.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (up.length === 7) {
    if (/^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(up)) return up.replace(/^([A-Z]{3})([0-9][A-Z][0-9]{2})$/, "$1-$2");
    return up.replace(/^([A-Z]{3})([0-9]{4})$/, "$1-$2");
  }
  return up;
};

// Normaliza uma data (string ISO ou DATE) para meia-noite local, para
// comparações de "dias decorridos" sem interferência de fuso/horário.
// Colunas DATE-only ("YYYY-MM-DD") precisam de parse manual — `new
// Date("YYYY-MM-DD")` é lido como UTC-meia-noite e viraria o dia anterior
// em fusos negativos (ex: UTC-3) mesmo depois do setHours local.
// (Mesmo helper duplicado em DashboardLogistica.tsx — ver docs/DASHBOARDS.md.)
const paraMeiaNoite = (iso: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return parseDateOnly(iso);
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d;
};

interface LiberacaoAtrasoItem {
  id: string;
  clienteId: string;
  cliente: string;
  pedido: string;
  produto: string;
  unidade: string;
  quantidadeRestante: number;
  diasRestantes: number;
}

// Liberações ainda abertas (com saldo não retirado) que estão perto do prazo
// máximo de retirada ou já vencidas. Considera só quantidade_retirada — um
// agendamento criado não garante que a retirada vai acontecer na data prevista.
function LiberacoesEmAtrasoCard({
  itens,
  isLoading,
  mostrarCliente,
}: {
  itens: LiberacaoAtrasoItem[] | undefined;
  isLoading: boolean;
  mostrarCliente: boolean;
}) {
  const lista = itens ?? [];

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <TitleWithInfo
            title="Liberações em Atraso"
            tooltip="Liberações com saldo ainda não retirado que já venceram ou estão perto do prazo máximo de retirada."
          />
          <span className="text-2xl font-bold text-foreground">{isLoading ? "…" : lista.length}</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {!isLoading && lista.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhuma liberação perto do prazo ou vencida.</p>
        )}
        <div className="space-y-2">
          {lista.map((item) => {
            const vencida = item.diasRestantes < 0;
            return (
              <Link
                key={item.id}
                to="/liberacoes"
                className="flex flex-wrap items-center justify-between gap-2 rounded border p-2.5 hover:bg-muted/50 transition-colors"
              >
                <div className="text-sm min-w-0">
                  <span className="font-medium">{item.produto}</span>
                  <span className="text-muted-foreground"> • Pedido {item.pedido}</span>
                  {mostrarCliente && <span className="text-muted-foreground"> • {item.cliente}</span>}
                  <div className="text-xs text-muted-foreground">
                    Restam {item.quantidadeRestante.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}{" "}
                    {item.unidade} para retirar
                  </div>
                </div>
                <Badge
                  className={`font-normal shrink-0 ${
                    vencida ? "bg-red-100 text-red-800 hover:bg-red-100" : "bg-amber-100 text-amber-800 hover:bg-amber-100"
                  }`}
                >
                  {vencida
                    ? `Prazo esgotado há ${Math.abs(item.diasRestantes)}d`
                    : `Faltam ${item.diasRestantes}d para o prazo`}
                </Badge>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

interface VeiculoAgendadoItem {
  id: string;
  cliente: string;
  armazem: string;
  motorista: string;
  placa: string;
  transportadora: string;
  dataRetirada: string;
}

// Caminhões e motoristas agendados para hoje — visão operacional rápida de
// quem está chegando, sem precisar abrir cada agendamento.
function VeiculosAgendadosCard({
  itens,
  isLoading,
  mostrarCliente,
}: {
  itens: VeiculoAgendadoItem[] | undefined;
  isLoading: boolean;
  mostrarCliente: boolean;
}) {
  const lista = itens ?? [];

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <TitleWithInfo title="Veículos Agendados Hoje" tooltip="Caminhões e motoristas agendados para hoje." />
      </CardHeader>
      <CardContent className="pt-0">
        {!isLoading && lista.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum veículo agendado para hoje.</p>
        )}
        <div className="space-y-2">
          {lista.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2.5">
              <div className="text-sm min-w-0">
                <span className="font-medium">{formatarPlaca(item.placa)}</span>
                <span className="text-muted-foreground"> • {item.motorista}</span>
                {mostrarCliente && <span className="text-muted-foreground"> • {item.cliente}</span>}
                <div className="text-xs text-muted-foreground">
                  {item.transportadora} • {item.armazem}
                </div>
              </div>
              <Badge variant="secondary" className="shrink-0 font-normal">
                {formatarData(item.dataRetirada)}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface UltimaRetiradaItem {
  id: string;
  cliente: string;
  armazem: string;
  produto: string;
  dataFinalizacao: string;
}

// Últimos carregamentos finalizados — complementa Próximos Agendamentos com
// uma visão do que já aconteceu recentemente.
function UltimasRetiradasCard({
  itens,
  isLoading,
}: {
  itens: UltimaRetiradaItem[] | undefined;
  isLoading: boolean;
}) {
  const lista = itens ?? [];

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <TitleWithInfo
          title="Últimas Retiradas"
          tooltip="Os últimos carregamentos finalizados, do mais recente para o mais antigo."
        />
      </CardHeader>
      <CardContent className="pt-0">
        {!isLoading && lista.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhuma retirada finalizada ainda.</p>
        )}
        <div className="space-y-2">
          {lista.map((item) => (
            <Link
              key={item.id}
              to="/carregamentos"
              className="flex items-center justify-between gap-3 rounded border p-2.5 hover:bg-muted/50 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.cliente}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.produto} • {item.armazem}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0 font-normal">
                {formatarDataHora(item.dataFinalizacao)}
              </Badge>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface PorClienteRow {
  clienteId: string;
  nome: string;
  liberacoesAbertas: number;
  liberacoesAtraso: number;
  quantidadeDisponivel: number;
  totalRetiradoMes: number;
}

// Quebra por cliente das 4 métricas mais úteis para o representante comparar
// entre os clientes que ele atende.
function PorClienteTable({ dados, isLoading }: { dados: PorClienteRow[] | undefined; isLoading: boolean }) {
  const linhas = dados ?? [];

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <TitleWithInfo
          title="Por Cliente"
          tooltip="Liberações em aberto, liberações em atraso, quantidade disponível para retirada e total retirado no mês, por cliente."
        />
      </CardHeader>
      <CardContent className="pt-0">
        {!isLoading && linhas.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum cliente vinculado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Liberações Abertas</TableHead>
                <TableHead className="text-right">Liberações em Atraso</TableHead>
                <TableHead className="text-right">Disponível p/ Retirada</TableHead>
                <TableHead className="text-right">Retirado no Mês</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-xs text-muted-foreground">
                    Carregando…
                  </TableCell>
                </TableRow>
              ) : (
                linhas.map((row) => (
                  <TableRow key={row.clienteId}>
                    <TableCell className="font-medium">
                      <Link to="/clientes" className="hover:underline underline-offset-2">
                        {row.nome}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right text-sm">{row.liberacoesAbertas}</TableCell>
                    <TableCell className="text-right text-sm">
                      {row.liberacoesAtraso > 0 ? (
                        <span className="text-destructive font-medium">{row.liberacoesAtraso}</span>
                      ) : (
                        0
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {row.quantidadeDisponivel.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} t
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {row.totalRetiradoMes.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} t
                    </TableCell>
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

const DashboardCliente = () => {
  const { userRole } = useAuth();
  const { clienteId, clientesDoRepresentante, loading: permissionsLoading } = usePermissions();
  const isRepresentante = userRole === "representante";

  const clienteIds = useMemo(() => {
    if (isRepresentante) return clientesDoRepresentante;
    return clienteId ? [clienteId] : [];
  }, [isRepresentante, clienteId, clientesDoRepresentante]);

  const hoje = useMemo(() => new Date(), []);
  const inicioHoje = startOfDayISO(hoje);
  const fimHoje = endOfDayISO(hoje);
  const inicioMes = startOfDayISO(new Date(hoje.getFullYear(), hoje.getMonth(), 1));

  const habilitado = !permissionsLoading && clienteIds.length > 0;

  const { data: agendamentosHoje, isLoading: loadingAgendamentosHoje } = useQuery({
    queryKey: ["dash-cli-agendamentos-hoje", clienteIds],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("agendamentos")
        .select("id", { count: "exact", head: true })
        .in("cliente_id", clienteIds)
        .gte("data_retirada", inicioHoje)
        .lte("data_retirada", fimHoje)
        .neq("status", "cancelado");
      if (error) throw error;
      return count ?? 0;
    },
    enabled: habilitado,
    refetchInterval: 60_000,
  });

  const { data: carregamentosAndamento, isLoading: loadingCarregamentosAndamento } = useQuery({
    queryKey: ["dash-cli-carregamentos-andamento", clienteIds],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("carregamentos")
        .select("id", { count: "exact", head: true })
        .in("cliente_id", clienteIds)
        .lt("etapa_atual", 6);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: habilitado,
    refetchInterval: 60_000,
  });

  const { data: carregamentosFinalizadosHoje, isLoading: loadingCarregamentosFinalizadosHoje } = useQuery({
    queryKey: ["dash-cli-carregamentos-finalizados-hoje", clienteIds],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("carregamentos")
        .select("id", { count: "exact", head: true })
        .in("cliente_id", clienteIds)
        .eq("etapa_atual", 6)
        .gte("data_documentacao", inicioHoje)
        .lte("data_documentacao", fimHoje);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: habilitado,
    refetchInterval: 60_000,
  });

  const { data: carregamentosFinalizadosMes, isLoading: loadingCarregamentosFinalizadosMes } = useQuery({
    queryKey: ["dash-cli-carregamentos-finalizados-mes", clienteIds],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("carregamentos")
        .select("id", { count: "exact", head: true })
        .in("cliente_id", clienteIds)
        .eq("etapa_atual", 6)
        .gte("data_documentacao", inicioMes)
        .lte("data_documentacao", fimHoje);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: habilitado,
    refetchInterval: 60_000,
  });

  // Total retirado no mês, quebrado por cliente (representante compara entre
  // clientes; a soma de todos os clientes é o número agregado exibido no topo).
  const { data: retiradoMesData, isLoading: loadingRetiradoMes } = useQuery({
    queryKey: ["dash-cli-retirado-mes", clienteIds, inicioMes],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("carregamentos")
        .select("cliente_id, clientes(nome), agendamentos(quantidade, liberacoes(produtos(unidade)))")
        .in("cliente_id", clienteIds)
        .gte("data_finalizacao", inicioMes)
        .lte("data_finalizacao", fimHoje);
      if (error) throw error;

      const porCliente = new Map<string, { nome: string; total: number }>();
      (data ?? []).forEach((c: any) => {
        if (!c.cliente_id) return;
        const quantidade = Number(c.agendamentos?.quantidade ?? 0);
        const unidade = c.agendamentos?.liberacoes?.produtos?.unidade;
        const emToneladas = unidade === "kg" ? quantidade / 1000 : quantidade;
        if (!porCliente.has(c.cliente_id)) {
          porCliente.set(c.cliente_id, { nome: c.clientes?.nome ?? "Cliente", total: 0 });
        }
        porCliente.get(c.cliente_id)!.total += emToneladas;
      });

      const porClienteArr = Array.from(porCliente.entries()).map(([clienteId, { nome, total }]) => ({
        clienteId,
        nome,
        total,
      }));

      return { total: porClienteArr.reduce((s, c) => s + c.total, 0), porCliente: porClienteArr };
    },
    enabled: habilitado,
    refetchInterval: 120_000,
  });

  // Liberações em aberto, quebradas por cliente.
  const { data: liberacoesAbertasData, isLoading: loadingLiberacoesAbertas } = useQuery({
    queryKey: ["dash-cli-liberacoes-abertas", clienteIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("liberacoes")
        .select("cliente_id, clientes(nome)")
        .in("cliente_id", clienteIds)
        .in("status", ["disponivel", "parcialmente_agendada", "totalmente_agendada"]);
      if (error) throw error;

      const porCliente = new Map<string, { nome: string; count: number }>();
      (data ?? []).forEach((l: any) => {
        if (!l.cliente_id) return;
        if (!porCliente.has(l.cliente_id)) {
          porCliente.set(l.cliente_id, { nome: l.clientes?.nome ?? "Cliente", count: 0 });
        }
        porCliente.get(l.cliente_id)!.count++;
      });

      const porClienteArr = Array.from(porCliente.entries()).map(([clienteId, { nome, count }]) => ({
        clienteId,
        nome,
        count,
      }));

      return { total: data?.length ?? 0, porCliente: porClienteArr };
    },
    enabled: habilitado,
    refetchInterval: 60_000,
  });

  // Quantidade disponível para retirada = liberada - retirada - agendada
  // ativa (ainda não retirada). Não conta só pelo que já foi retirado, porque
  // essa métrica representa o que ainda pode ser agendado, não o saldo bruto.
  const { data: disponivelData, isLoading: loadingDisponivel } = useQuery({
    queryKey: ["dash-cli-disponivel", clienteIds],
    queryFn: async () => {
      const { data: liberacoes, error: liberacoesError } = await supabase
        .from("liberacoes")
        .select("id, cliente_id, clientes(nome), quantidade_liberada, quantidade_retirada, produtos(unidade)")
        .in("cliente_id", clienteIds)
        .in("status", ["disponivel", "parcialmente_agendada", "totalmente_agendada"]);
      if (liberacoesError) throw liberacoesError;

      const liberacaoIds = (liberacoes ?? []).map((l: any) => l.id);
      const agendadoPorLiberacao = new Map<string, number>();

      if (liberacaoIds.length > 0) {
        const { data: agendamentos, error: agendamentosError } = await supabase
          .from("agendamentos")
          .select("liberacao_id, quantidade")
          .in("liberacao_id", liberacaoIds)
          .neq("status", "cancelado");
        if (agendamentosError) throw agendamentosError;

        (agendamentos ?? []).forEach((a) => {
          agendadoPorLiberacao.set(a.liberacao_id, (agendadoPorLiberacao.get(a.liberacao_id) ?? 0) + Number(a.quantidade));
        });
      }

      const porCliente = new Map<string, { nome: string; total: number }>();
      (liberacoes ?? []).forEach((l: any) => {
        if (!l.cliente_id) return;
        const agendado = agendadoPorLiberacao.get(l.id) ?? 0;
        const restante = Math.max(0, Number(l.quantidade_liberada) - Number(l.quantidade_retirada) - agendado);
        const unidade = l.produtos?.unidade;
        const emToneladas = unidade === "kg" ? restante / 1000 : restante;
        if (!porCliente.has(l.cliente_id)) {
          porCliente.set(l.cliente_id, { nome: l.clientes?.nome ?? "Cliente", total: 0 });
        }
        porCliente.get(l.cliente_id)!.total += emToneladas;
      });

      const porClienteArr = Array.from(porCliente.entries()).map(([clienteId, { nome, total }]) => ({
        clienteId,
        nome,
        total,
      }));

      return { total: porClienteArr.reduce((s, c) => s + c.total, 0), porCliente: porClienteArr };
    },
    enabled: habilitado,
    refetchInterval: 120_000,
  });

  const { data: armazensComLiberacao, isLoading: loadingArmazensComLiberacao } = useQuery({
    queryKey: ["dash-cli-armazens-liberacao", clienteIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("liberacoes")
        .select("armazem_id, armazens(nome)")
        .in("cliente_id", clienteIds)
        .in("status", ["disponivel", "parcialmente_agendada", "totalmente_agendada"]);
      if (error) throw error;

      const nomes = new Map<string, string>();
      (data ?? []).forEach((l: any) => {
        if (l.armazem_id && l.armazens?.nome) nomes.set(l.armazem_id, l.armazens.nome);
      });
      return Array.from(nomes.values()).sort((a, b) => a.localeCompare(b));
    },
    enabled: habilitado,
    refetchInterval: 120_000,
  });

  // Prazo configurável de retirada (config_liberacao_prazo) e liberações perto
  // do vencimento ou já vencidas, considerando só quantidade_retirada.
  const { data: liberacoesAtrasoData, isLoading: loadingLiberacoesAtraso } = useQuery({
    queryKey: ["dash-cli-liberacoes-atraso", clienteIds],
    queryFn: async () => {
      const [{ data: config, error: configError }, { data: liberacoes, error: liberacoesError }] = await Promise.all([
        supabase.from("config_liberacao_prazo").select("prazo_maximo_dias, dias_alerta").limit(1).maybeSingle(),
        supabase
          .from("liberacoes")
          .select(
            "id, cliente_id, clientes(nome), pedido_interno, produtos(nome, unidade), quantidade_liberada, quantidade_retirada, data_liberacao, created_at"
          )
          .in("cliente_id", clienteIds)
          .in("status", ["disponivel", "parcialmente_agendada", "totalmente_agendada"]),
      ]);
      if (configError) throw configError;
      if (liberacoesError) throw liberacoesError;

      const prazoMaximoDias = config?.prazo_maximo_dias ?? 10;
      const diasAlerta = config?.dias_alerta ?? 5;
      const hojeMeiaNoite = paraMeiaNoite(new Date().toISOString());

      const itens: LiberacaoAtrasoItem[] = (liberacoes ?? [])
        .map((l: any) => {
          const quantidadeRestante = Number(l.quantidade_liberada) - Number(l.quantidade_retirada);
          const dataBase = paraMeiaNoite(l.data_liberacao ?? l.created_at);
          const diasDecorridos = Math.round((hojeMeiaNoite.getTime() - dataBase.getTime()) / (1000 * 60 * 60 * 24));
          const diasRestantes = prazoMaximoDias - diasDecorridos;
          return {
            id: l.id as string,
            clienteId: l.cliente_id as string,
            cliente: l.clientes?.nome ?? "Cliente",
            pedido: l.pedido_interno ?? "-",
            produto: l.produtos?.nome ?? "Produto",
            unidade: l.produtos?.unidade ?? "",
            quantidadeRestante,
            diasRestantes,
          };
        })
        .filter((item) => item.quantidadeRestante > 0 && item.diasRestantes <= diasAlerta)
        .sort((a, b) => a.diasRestantes - b.diasRestantes);

      const porCliente = new Map<string, { nome: string; count: number }>();
      itens.forEach((item) => {
        if (!porCliente.has(item.clienteId)) porCliente.set(item.clienteId, { nome: item.cliente, count: 0 });
        porCliente.get(item.clienteId)!.count++;
      });
      const porClienteArr = Array.from(porCliente.entries()).map(([clienteId, { nome, count }]) => ({
        clienteId,
        nome,
        count,
      }));

      return { itens, porCliente: porClienteArr };
    },
    enabled: habilitado,
    refetchInterval: 120_000,
  });

  const { data: proximosAgendamentos, isLoading: loadingProximosAgendamentos } = useQuery({
    queryKey: ["dash-cli-proximos-agendamentos", clienteIds],
    queryFn: async (): Promise<ProximoAgendamentoItem[]> => {
      const { data, error } = await supabase
        .from("agendamentos")
        .select(
          "id, data_retirada, quantidade, clientes(nome), armazens(nome), liberacoes(pedido_interno, produtos(nome, unidade))"
        )
        .in("cliente_id", clienteIds)
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

  const { data: ultimasRetiradas, isLoading: loadingUltimasRetiradas } = useQuery({
    queryKey: ["dash-cli-ultimas-retiradas", clienteIds],
    queryFn: async (): Promise<UltimaRetiradaItem[]> => {
      const { data, error } = await supabase
        .from("carregamentos")
        .select("id, data_documentacao, clientes(nome), armazens(nome), agendamentos(liberacoes(produtos(nome)))")
        .in("cliente_id", clienteIds)
        .eq("etapa_atual", 6)
        .order("data_documentacao", { ascending: false })
        .limit(5);
      if (error) throw error;

      return (data ?? []).map((c: any) => ({
        id: c.id as string,
        cliente: c.clientes?.nome ?? "Cliente",
        armazem: c.armazens?.nome ?? "Armazém",
        produto: c.agendamentos?.liberacoes?.produtos?.nome ?? "Produto",
        dataFinalizacao: c.data_documentacao as string,
      }));
    },
    enabled: habilitado,
    refetchInterval: 60_000,
  });

  const { data: veiculosAgendados, isLoading: loadingVeiculosAgendados } = useQuery({
    queryKey: ["dash-cli-veiculos-agendados", clienteIds],
    queryFn: async (): Promise<VeiculoAgendadoItem[]> => {
      const { data, error } = await supabase
        .from("agendamentos")
        .select(
          "id, data_retirada, motorista_nome, placa_caminhao, transportadora, clientes(nome), armazens(nome)"
        )
        .in("cliente_id", clienteIds)
        .gte("data_retirada", inicioHoje)
        .lte("data_retirada", fimHoje)
        .neq("status", "cancelado")
        .order("data_retirada", { ascending: true });
      if (error) throw error;

      return (data ?? []).map((a: any) => ({
        id: a.id as string,
        cliente: a.clientes?.nome ?? "Cliente",
        armazem: a.armazens?.nome ?? "Armazém",
        motorista: a.motorista_nome ?? "-",
        placa: a.placa_caminhao ?? "",
        transportadora: a.transportadora ?? "-",
        dataRetirada: a.data_retirada as string,
      }));
    },
    enabled: habilitado,
    refetchInterval: 60_000,
  });

  // Tabela "por Cliente" combina os 4 recortes acima em uma linha por cliente.
  const porClienteRows: PorClienteRow[] = useMemo(() => {
    const nomes = new Map<string, string>();
    const liberacoesAbertas = new Map<string, number>();
    const liberacoesAtraso = new Map<string, number>();
    const disponivel = new Map<string, number>();
    const retiradoMes = new Map<string, number>();

    (liberacoesAbertasData?.porCliente ?? []).forEach((c) => {
      nomes.set(c.clienteId, c.nome);
      liberacoesAbertas.set(c.clienteId, c.count);
    });
    (liberacoesAtrasoData?.porCliente ?? []).forEach((c) => {
      nomes.set(c.clienteId, c.nome);
      liberacoesAtraso.set(c.clienteId, c.count);
    });
    (disponivelData?.porCliente ?? []).forEach((c) => {
      nomes.set(c.clienteId, c.nome);
      disponivel.set(c.clienteId, c.total);
    });
    (retiradoMesData?.porCliente ?? []).forEach((c) => {
      nomes.set(c.clienteId, c.nome);
      retiradoMes.set(c.clienteId, c.total);
    });

    return Array.from(nomes.entries())
      .map(([clienteId, nome]) => ({
        clienteId,
        nome,
        liberacoesAbertas: liberacoesAbertas.get(clienteId) ?? 0,
        liberacoesAtraso: liberacoesAtraso.get(clienteId) ?? 0,
        quantidadeDisponivel: disponivel.get(clienteId) ?? 0,
        totalRetiradoMes: retiradoMes.get(clienteId) ?? 0,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [liberacoesAbertasData, liberacoesAtrasoData, disponivelData, retiradoMesData]);

  const loadingPorCliente =
    loadingLiberacoesAbertas || loadingLiberacoesAtraso || loadingDisponivel || loadingRetiradoMes;

  const valor = (v: number | undefined, loading: boolean) => (loading ? "…" : v ?? 0);
  const formatarVolume = (v: number | undefined, loading: boolean) =>
    loading ? "…" : `${(v ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} t`;

  if (!permissionsLoading && clienteIds.length === 0) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-6">
        <PageHeader title="Dashboard" subtitle="Visão geral das suas operações" icon={LayoutDashboard} />
        <p className="mt-6 text-sm text-muted-foreground">
          {isRepresentante
            ? "Nenhum cliente vinculado a este representante. Entre em contato com a administração."
            : "Nenhum cliente vinculado a este usuário. Entre em contato com a administração."}
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-6">
      <PageHeader
        title="Dashboard"
        subtitle={isRepresentante ? "Visão geral das operações dos seus clientes" : "Visão geral das suas operações"}
        icon={LayoutDashboard}
      />

      <div className="mt-6 space-y-8">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Atividade</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <StatCard
              title="Agendamentos Hoje"
              value={valor(agendamentosHoje, loadingAgendamentosHoje)}
              icon={Calendar}
              variant="primary"
              tooltip="Retiradas agendadas para o dia de hoje."
              to="/agendamentos"
            />
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
              title="Finalizados no Mês"
              value={valor(carregamentosFinalizadosMes, loadingCarregamentosFinalizadosMes)}
              icon={CalendarCheck}
              variant="success"
              tooltip="Carregamentos finalizados neste mês."
              to="/carregamentos"
            />
            <StatCard
              title="Total Retirado no Mês"
              value={formatarVolume(retiradoMesData?.total, loadingRetiradoMes)}
              icon={PackageCheck}
              variant="primary"
              tooltip="Soma da quantidade dos carregamentos finalizados neste mês."
            />
          </div>
        </section>

        <section>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ProximosAgendamentosCard itens={proximosAgendamentos} isLoading={loadingProximosAgendamentos} />
            <UltimasRetiradasCard itens={ultimasRetiradas} isLoading={loadingUltimasRetiradas} />
          </div>
        </section>

        <section>
          <VeiculosAgendadosCard
            itens={veiculosAgendados}
            isLoading={loadingVeiculosAgendados}
            mostrarCliente={isRepresentante}
          />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Liberações</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              title="Liberações em Aberto"
              value={valor(liberacoesAbertasData?.total, loadingLiberacoesAbertas)}
              icon={ClipboardList}
              variant="primary"
              tooltip="Liberações que ainda têm quantidade disponível para ser agendada ou retirada."
              to="/liberacoes"
            />
            <StatCard
              title="Quantidade Disponível para Retirada"
              value={formatarVolume(disponivelData?.total, loadingDisponivel)}
              icon={PackageOpen}
              variant="primary"
              tooltip="Quantidade ainda não agendada das liberações em aberto."
            />
          </div>
          <div className="mt-4">
            <EntityListCard
              title="Armazéns com Liberação Aberta"
              tooltip="Armazéns onde há liberações em aberto para retirada."
              icon={Warehouse}
              names={armazensComLiberacao}
              isLoading={loadingArmazensComLiberacao}
              emptyLabel="Nenhum armazém com liberação aberta."
              to="/armazens"
            />
          </div>
          <div className="mt-4">
            <LiberacoesEmAtrasoCard
              itens={liberacoesAtrasoData?.itens}
              isLoading={loadingLiberacoesAtraso}
              mostrarCliente={isRepresentante}
            />
          </div>
        </section>

        {isRepresentante && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Por Cliente
            </h2>
            <PorClienteTable dados={porClienteRows} isLoading={loadingPorCliente} />
          </section>
        )}
      </div>
    </div>
  );
};

export default DashboardCliente;
