import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Truck, X, Filter as FilterIcon, ChevronDown, ChevronUp, Info, ChevronRight, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import { formatDateOnlyBR } from "@/lib/utils";

const getStatusCarregamento = (etapaAtual: number) => {
  if (etapaAtual === 1) {
    return {
      status: "Aguardando",
      percentual: 0,
      cor: "bg-yellow-100 text-yellow-800",
      tooltip: "Aguardando chegada do veículo"
    };
  } else if (etapaAtual >= 2 && etapaAtual <= 5) {
    const percentual = Math.round(((etapaAtual - 1) / 5) * 100);
    let tooltip = "";
    
    switch (etapaAtual) {
      case 2:
        tooltip = "Carregamento do caminhão iniciado";
        break;
      case 3:
        tooltip = "Carregando o caminhão";
        break;
      case 4:
        tooltip = "Carregamento do caminhão finalizado";
        break;
      case 5:
        tooltip = "Anexando documentação";
        break;
      default:
        tooltip = `Etapa ${etapaAtual} em andamento`;
    }
    
    return {
      status: "Em Andamento",
      percentual,
      cor: "bg-blue-100 text-blue-800",
      tooltip
    };
  } else {
    return {
      status: "Processo Finalizado",
      percentual: 100,
      cor: "bg-green-100 text-green-800",
      tooltip: "Documentação anexada e processo concluído"
    };
  }
};

function formatPlaca(placa: string) {
  if (!placa || placa === "N/A") return placa;
  const cleaned = placa.replace(/[^A-Z0-9]/g, "");
  if (cleaned.length === 7) {
    if (/[A-Z]{3}[0-9][A-Z][0-9]{2}/.test(cleaned)) {
      return cleaned.replace(/^([A-Z]{3})([0-9][A-Z][0-9]{2})$/, "$1-$2");
    }
    return cleaned.replace(/^([A-Z]{3})([0-9]{4})$/, "$1-$2");
  }
  return placa;
}

function formatCPF(cpf: string) {
  if (!cpf || cpf === "N/A") return cpf;
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length === 11) {
    return cleaned.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  }
  return cpf;
}

interface CarregamentoItem {
  id: string;
  cliente: string;
  produto: string;
  pedido: string;
  armazem: string;
  quantidade: number;
  placa: string;
  motorista: string;
  documento: string;
  transportadora: string;
  data_retirada: string;
  etapa_atual: number;
  fotosTotal: number;
  numero_nf: string | null;
  cliente_id: string | null;
  armazem_id: string | null;
  status_carregamento: string;
  cor_carregamento: string;
  tooltip_carregamento: string;
  percentual_carregamento: number;
  finalizado: boolean;
  data_documentacao: string | null;
}

const STATUS_CARREGAMENTO = [
  { id: "Aguardando", nome: "Aguardando", cor: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200" },
  { id: "Em Andamento", nome: "Em Andamento", cor: "bg-blue-100 text-blue-800 hover:bg-blue-200" },
  { id: "Processo Finalizado", nome: "Processo Finalizado", cor: "bg-green-100 text-green-800 hover:bg-green-200" },
];

const Carregamentos = () => {
  useScrollToTop();
  const navigate = useNavigate();

  const { userRole, user } = useAuth();
  const { clienteId, armazemId, representanteId } = usePermissions();
  
  // ✅ LOGS DE DEBUG EXPANDIDOS
  console.log("🔍 [DEBUG] Carregamentos - Estado atual:");
  console.log("- userRole:", userRole);
  console.log("- representanteId:", representanteId);
  console.log("- representanteId type:", typeof representanteId);
  console.log("- user:", user);
  console.log("- clienteId:", clienteId);
  console.log("- armazemId:", armazemId);
  
  const [secaoFinalizadosExpandida, setSecaoFinalizadosExpandida] = useState(false);

  useEffect(() => {
    if (window.scrollY > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // 🚀 MIGRAÇÃO PARA FUNÇÃO UNIVERSAL
  const { data: carregamentosData, isLoading, error } = useQuery({
    queryKey: ["carregamentos", clienteId, armazemId, representanteId, userRole],
    queryFn: async () => {
      console.log("🔍 [DEBUG] Query carregamentos executando:");
      console.log("- userRole:", userRole);
      console.log("- representanteId:", representanteId);
      console.log("- clienteId:", clienteId);
      console.log("- armazemId:", armazemId);
      console.log("- user:", user);
      
      // 🚀 USAR FUNÇÃO UNIVERSAL PARA TODOS OS ROLES
      const { data, error } = await supabase.rpc('get_carregamentos_universal', {
        p_user_role: userRole,
        p_user_id: user?.id,
        p_cliente_id: clienteId || null,
        p_armazem_id: armazemId || null,
        p_representante_id: representanteId || null
      });
      
      console.log("🔍 [DEBUG] Resultado função universal:", { data, error });
      
      if (error) throw error;
      return data || [];
    },
    enabled: (() => {
      if (!user || !userRole) return false;
      if (userRole === "admin" || userRole === "logistica") return true;
      
      const clienteOk = userRole !== "cliente" || (clienteId !== undefined);
      const armazemOk = userRole !== "armazem" || (armazemId !== undefined);
      const representanteOk = userRole !== "representante" || (representanteId !== undefined);
      
      console.log("🔍 [DEBUG] Enabled check:", { clienteOk, armazemOk, representanteOk });
      
      return clienteOk && armazemOk && representanteOk;
    })(),
    refetchInterval: 30000,
  });

  // ✅ USEMEMO HÍBRIDO - SUPORTA FUNÇÃO UNIVERSAL E FALLBACK
  const carregamentos = useMemo<CarregamentoItem[]>(() => {
    if (!carregamentosData) return [];
    
    return carregamentosData.map((item: any) => {
      // ✅ Verificar se vem da função universal (tem campos calculados)
      const isFromFunction = !!item.cliente_nome;
      
      if (isFromFunction) {
        // ✅ Dados já calculados da função universal
        const fotosCount = [
          item.url_foto_chegada,
          item.url_foto_inicio,
          item.url_foto_carregando,
          item.url_foto_finalizacao
        ].filter(url => url && url.trim() !== '').length;

        const etapaAtual = item.etapa_atual ?? 1;
        const statusInfo = getStatusCarregamento(etapaAtual);
        const finalizado = etapaAtual === 6;

        return {
          id: item.id,
          cliente: item.cliente_nome,
          produto: item.produto_nome,
          pedido: item.pedido_interno,
          armazem: `${item.armazem_nome} - ${item.armazem_cidade}/${item.armazem_estado}`,
          quantidade: item.quantidade,
          placa: item.placa_caminhao || "N/A",
          motorista: item.motorista_nome || "N/A",
          documento: item.motorista_documento || "N/A",
          transportadora: item.transportadora || "N/A",
          data_retirada: item.data_retirada || "N/A",
          etapa_atual: etapaAtual,
          fotosTotal: fotosCount,
          numero_nf: item.numero_nf || null,
          cliente_id: item.cliente_id ?? null,
          armazem_id: item.armazem_id ?? null,
          status_carregamento: statusInfo.status,
          cor_carregamento: statusInfo.cor,
          tooltip_carregamento: statusInfo.tooltip,
          percentual_carregamento: statusInfo.percentual,
          finalizado,
          data_documentacao: item.data_documentacao ?? null,
        };
      } else {
        // ❌ Fallback para dados da query tradicional (não deveria acontecer)
        const fotosCount = [
          item.url_foto_chegada,
          item.url_foto_inicio,
          item.url_foto_carregando,
          item.url_foto_finalizacao
        ].filter(url => url && url.trim() !== '').length;

        const etapaAtual = item.etapa_atual ?? 1;
        const statusInfo = getStatusCarregamento(etapaAtual);
        const finalizado = etapaAtual === 6;

        return {
          id: item.id,
          cliente: item.agendamento?.liberacao?.clientes?.nome || "N/A",
          produto: item.agendamento?.liberacao?.produto?.nome || "N/A",
          pedido: item.agendamento?.liberacao?.pedido_interno || "N/A",
          armazem: item.agendamento?.liberacao?.armazem 
            ? `${item.agendamento.liberacao.armazem.nome} - ${item.agendamento.liberacao.armazem.cidade}/${item.agendamento.liberacao.armazem.estado}`
            : "N/A",
          quantidade: item.agendamento?.quantidade || 0,
          placa: item.agendamento?.placa_caminhao || "N/A",
          motorista: item.agendamento?.motorista_nome || "N/A",
          documento: item.agendamento?.motorista_documento || "N/A",
          transportadora: item.agendamento?.transportadora || "N/A",
          data_retirada: item.agendamento?.data_retirada || "N/A",
          etapa_atual: etapaAtual,
          fotosTotal: fotosCount,
          numero_nf: item.numero_nf || null,
          cliente_id: item.cliente_id ?? null,
          armazem_id: item.armazem_id ?? null,
          status_carregamento: statusInfo.status,
          cor_carregamento: statusInfo.cor,
          tooltip_carregamento: statusInfo.tooltip,
          percentual_carregamento: statusInfo.percentual,
          finalizado,
          data_documentacao: item.data_documentacao ?? null,
        };
      }
    });
  }, [carregamentosData]);

  const [searchParams, setSearchParams] = useSearchParams();
  // Deep-links vindos do dashboard:
  // - ?status=finalizado: pré-seleciona o filtro de status.
  // - ?finalizadoHoje=1: filtra pela data REAL de finalização (data_documentacao)
  //   sendo hoje — separado do filtro de período existente (dateFrom/dateTo),
  //   que filtra por data_retirada (agendada), não pela finalização.
  // - ?armazemId= / ?clienteId=: filtra pelo armazém/cliente específico (ex:
  //   clique num item de "Armazéns/Clientes com Operação Hoje" no dashboard).
  // Todos lidos só uma vez (useState inicial) — os params somem da URL logo
  // a seguir. Sem isso, "Limpar Filtros" não tinha o que limpar (o valor
  // seria relido da URL a cada render) e o filtro ficava travado mesmo após
  // limpar ou dar refresh.
  const filtroInicialStatus = searchParams.get("status") === "finalizado" ? ["Processo Finalizado"] : [];
  const filtroInicialFinalizadoHoje = searchParams.get("finalizadoHoje") === "1";
  const filtroInicialArmazemId = searchParams.get("armazemId");
  const filtroInicialClienteId = searchParams.get("clienteId");

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string[]>(filtroInicialStatus);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [finalizadoHoje, setFinalizadoHoje] = useState(filtroInicialFinalizadoHoje);
  const [filtroArmazemId, setFiltroArmazemId] = useState(filtroInicialArmazemId);
  const [filtroClienteId, setFiltroClienteId] = useState(filtroInicialClienteId);

  useEffect(() => {
    if (
      searchParams.has("status") ||
      searchParams.has("finalizadoHoje") ||
      searchParams.has("armazemId") ||
      searchParams.has("clienteId")
    ) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("status");
          next.delete("finalizadoHoje");
          next.delete("armazemId");
          next.delete("clienteId");
          return next;
        },
        { replace: true }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleStatus = (status: string) =>
    setSelectedStatus((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));

  const clearFilters = () => {
    setSearch("");
    setSelectedStatus([]);
    setDateFrom("");
    setDateTo("");
    setFinalizadoHoje(false);
    setFiltroArmazemId(null);
    setFiltroClienteId(null);
  };

  const { carregamentosAtivos, carregamentosFinalizados } = useMemo(() => {
    const agora = new Date();
    const mesmoDiaLocal = (isoString: string) => {
      const d = new Date(isoString);
      return (
        d.getFullYear() === agora.getFullYear() &&
        d.getMonth() === agora.getMonth() &&
        d.getDate() === agora.getDate()
      );
    };
    const filtered = carregamentos.filter((c) => {
      const term = search.trim().toLowerCase();
      if (term) {
        const hay = `${c.cliente} ${c.motorista} ${c.placa} ${c.pedido}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (selectedStatus.length > 0 && !selectedStatus.includes(c.status_carregamento)) return false;
      if (finalizadoHoje && (!c.data_documentacao || !mesmoDiaLocal(c.data_documentacao))) return false;
      if (filtroArmazemId && c.armazem_id !== filtroArmazemId) return false;
      if (filtroClienteId && c.cliente_id !== filtroClienteId) return false;
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (new Date(c.data_retirada) < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(c.data_retirada) > to) return false;
      }
      return true;
    });

    const ativos = filtered.filter(c => !c.finalizado);
    const finalizados = filtered.filter(c => c.finalizado);

    return { carregamentosAtivos: ativos, carregamentosFinalizados: finalizados };
  }, [carregamentos, search, selectedStatus, dateFrom, dateTo, finalizadoHoje, filtroArmazemId, filtroClienteId]);

  useEffect(() => {
    if (
      (search.trim() || selectedStatus.includes("Processo Finalizado")) &&
      carregamentosFinalizados.length > 0 &&
      !secaoFinalizadosExpandida
    ) {
      setSecaoFinalizadosExpandida(true);
    }
  }, [search, selectedStatus, carregamentosFinalizados.length, secaoFinalizadosExpandida]);

  const showingCount = carregamentosAtivos.length + carregamentosFinalizados.length;
  const totalCount = carregamentos.length;
  const activeAdvancedCount =
    (selectedStatus.length ? 1 : 0) +
    ((dateFrom || dateTo) ? 1 : 0) +
    (finalizadoHoje ? 1 : 0) +
    (filtroArmazemId ? 1 : 0) +
    (filtroClienteId ? 1 : 0);

  const hasActiveFilters =
    search.trim() ||
    selectedStatus.length > 0 ||
    dateFrom ||
    dateTo ||
    finalizadoHoje ||
    filtroArmazemId ||
    filtroClienteId;

  const renderCarregamentoCard = (carr: CarregamentoItem) => (
    <Card
      key={carr.id}
      className="border-l-4 border-l-amber-500 dark:border-l-amber-400 transition-all hover:shadow-md cursor-pointer"
      onClick={() => navigate(`/carregamentos/${carr.id}`)}
    >
      <CardContent className="p-4 md:p-5">
        <div className="space-y-3">
          {/* Cabeçalho: ícone + pedido + status + fotos */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30 shrink-0">
                <Truck className="h-4 w-4 md:h-5 md:w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground text-sm md:text-base break-words">Pedido: {carr.pedido}</h3>
                <p className="text-xs text-muted-foreground font-mono">{formatPlaca(carr.placa)}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Popover>
                <PopoverTrigger asChild>
                  <div className="flex items-center gap-1 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                    <Badge className={`${carr.cor_carregamento} border-0 font-medium text-xs px-2 py-1 text-center`}>
                      {carr.status_carregamento}
                    </Badge>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-auto max-w-[240px] p-2" onClick={(e) => e.stopPropagation()}>
                  <p className="text-sm">{carr.tooltip_carregamento}</p>
                </PopoverContent>
              </Popover>
              <div className="text-xs text-muted-foreground">Fotos: <span className="font-semibold">{carr.fotosTotal}</span></div>
            </div>
          </div>

          {/* Informações em 2 colunas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <p className="truncate" title={carr.cliente}><span className="font-medium text-foreground">Cliente:</span> {carr.cliente}</p>
            <p className="truncate" title={carr.produto}><span className="font-medium text-foreground">Produto:</span> {carr.produto}</p>
            <p className="truncate" title={carr.armazem}><span className="font-medium text-foreground">Armazém:</span> {carr.armazem}</p>
            <p className="truncate"><span className="font-medium text-foreground">Quantidade:</span> {carr.quantidade.toLocaleString('pt-BR')}t</p>
            <p className="truncate"><span className="font-medium text-foreground">Retirada:</span> {carr.data_retirada !== "N/A" ? formatDateOnlyBR(carr.data_retirada) : "N/A"}</p>
            <p className="truncate"><span className="font-medium text-foreground">Caminhão:</span> {formatPlaca(carr.placa)}</p>
            <p className="truncate" title={carr.motorista}><span className="font-medium text-foreground">Motorista:</span> {carr.motorista}</p>
            <p className="truncate" title={carr.transportadora}><span className="font-medium text-foreground">Transportadora:</span> {carr.transportadora || "N/A"}</p>
            {carr.numero_nf && (
              <p className="truncate sm:col-span-2"><span className="font-medium text-foreground">Nº NF:</span> {carr.numero_nf}</p>
            )}
          </div>

          {/* Barra de progresso - Sempre na parte inferior */}
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-purple-600 shrink-0" />
              <span className="text-xs text-purple-600 font-medium shrink-0">Carregamento:</span>

              <Popover>
                <PopoverTrigger asChild>
                  <div className="flex-1 bg-gray-200 rounded-full h-2 dark:bg-gray-700 cursor-pointer min-w-0" onClick={(e) => e.stopPropagation()}>
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${carr.percentual_carregamento}%` }}
                    ></div>
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-auto max-w-[240px] p-2" onClick={(e) => e.stopPropagation()}>
                  <p className="text-sm">{carr.tooltip_carregamento}</p>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <div className="flex items-center gap-1 cursor-pointer shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Info className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium w-8 text-right">
                      {carr.percentual_carregamento}%
                    </span>
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-auto max-w-[240px] p-2" onClick={(e) => e.stopPropagation()}>
                  <p className="text-sm">{carr.tooltip_carregamento}</p>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 space-y-4 md:space-y-6">
        <PageHeader
          title="Carregamentos"
          subtitle="Acompanhe o progresso dos carregamentos"
          icon={Truck}
        />
        <div className="text-center py-12">
          <div className="flex justify-center items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="text-muted-foreground">Carregando carregamentos...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 space-y-4 md:space-y-6">
        <PageHeader
          title="Carregamentos"
          subtitle="Acompanhe o progresso dos carregamentos"
          icon={Truck}
        />
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="text-center text-destructive">
              <p className="font-semibold">Erro ao carregar carregamentos</p>
              <p className="text-sm mt-2">{error instanceof Error ? error.message : "Erro desconhecido"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background p-4 md:p-6 space-y-4 md:space-y-6">
        <PageHeader
          title="Carregamentos"
          subtitle="Acompanhe o progresso dos carregamentos"
          icon={Truck}
        />

        {/* Barra de filtros - Mobile otimizada */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Input 
              className="h-9 flex-1 min-h-[44px] max-md:min-h-[44px] text-base max-md:text-base" 
              placeholder="Buscar por cliente, placa, motorista ou pedido..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
            <Button 
              size="sm" 
              onClick={() => setFiltersOpen((v) => !v)} 
              className="whitespace-nowrap min-h-[44px] max-md:min-h-[44px] btn-secondary"
            >
              <FilterIcon className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Filtros</span>
              {activeAdvancedCount ? ` (${activeAdvancedCount})` : ""}
              {filtersOpen ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Mostrando <span className="font-medium">{showingCount}</span> de <span className="font-medium">{totalCount}</span>
            </span>
            {hasActiveFilters && (
              <Button 
                size="sm" 
                onClick={clearFilters} 
                className="gap-1 min-h-[44px] max-md:min-h-[44px] btn-secondary"
              >
                <X className="h-4 w-4" /> 
                Limpar Filtros
              </Button>
            )}
          </div>
        </div>

        {/* Filtros expandidos - Mobile otimizado */}
        {filtersOpen && (
          <div className="rounded-md border p-3 space-y-4">
            <div>
              <Label className="text-sm font-semibold mb-2 block">Status do Carregamento</Label>
              <div className="flex flex-wrap gap-2">
                {STATUS_CARREGAMENTO.map((status) => {
                  const active = selectedStatus.includes(status.id);
                  return (
                    <Badge
                      key={status.id}
                      onClick={() => toggleStatus(status.id)}
                      className={`cursor-pointer text-xs px-2 py-1 border-0 min-h-[32px] ${
                        active 
                          ? "bg-gradient-primary text-white"
                          : status.cor
                      }`}>
                      {status.nome}
                    </Badge>
                  );
                })}
              </div>
            </div>
            
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Período</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input 
                  type="date" 
                  value={dateFrom} 
                  onChange={(e) => setDateFrom(e.target.value)} 
                  className="min-h-[44px] max-md:min-h-[44px]" 
                  placeholder="Data inicial"
                />
                <Input 
                  type="date" 
                  value={dateTo} 
                  onChange={(e) => setDateTo(e.target.value)} 
                  className="min-h-[44px] max-md:min-h-[44px]" 
                  placeholder="Data final"
                />
              </div>
            </div>
          </div>
        )}

        {/* Lista de Carregamentos Ativos - Mobile Otimizada */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <h2 className="text-base md:text-lg font-semibold">Carregamentos Ativos ({carregamentosAtivos.length})</h2>
          </div>
          
          <div className="grid gap-3">
            {carregamentosAtivos.map(renderCarregamentoCard)}
            {carregamentosAtivos.length === 0 && carregamentosFinalizados.length > 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                <div className="rounded-full bg-muted p-3">
                  <Truck className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {hasActiveFilters
                    ? "Nenhum carregamento ativo encontrado com os filtros aplicados."
                    : "Nenhum carregamento ativo no momento."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Seção de Carregamentos Finalizados - Mobile Otimizada */}
        {carregamentosFinalizados.length > 0 && (
          <div className="space-y-4">
            <Button
              onClick={() => setSecaoFinalizadosExpandida(!secaoFinalizadosExpandida)}
              className="w-full justify-between bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 min-h-[44px] max-md:min-h-[44px] dark:bg-green-950/20 dark:hover:bg-green-950/30 dark:border-green-800 dark:text-green-400"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">
                  Carregamentos Finalizados ({carregamentosFinalizados.length})
                </span>
              </div>
              {secaoFinalizadosExpandida ?
                <ChevronUp className="h-4 w-4" /> :
                <ChevronDown className="h-4 w-4" />
              }
            </Button>

            {secaoFinalizadosExpandida && (
              <div className="grid gap-4 rounded-lg bg-green-50/50 dark:bg-green-950/10 p-3">
                {carregamentosFinalizados.map(renderCarregamentoCard)}
              </div>
            )}
          </div>
        )}

        {/* Estado vazio geral - Mobile Otimizado */}
        {carregamentosAtivos.length === 0 && carregamentosFinalizados.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="rounded-full bg-muted p-4">
              <Truck className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground">
                {hasActiveFilters ? "Nenhum carregamento encontrado" : "Nenhum carregamento registrado"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters
                  ? "Nenhum carregamento encontrado com os filtros aplicados"
                  : "Os carregamentos são criados automaticamente quando um agendamento é registrado."}
              </p>
            </div>
            {hasActiveFilters && (
              <Button
                size="sm"
                onClick={clearFilters}
                className="min-h-[44px] max-md:min-h-[44px] btn-secondary"
              >
                <X className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default Carregamentos;
