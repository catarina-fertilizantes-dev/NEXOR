import { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, Clock, User, Truck, Plus, X, Filter as FilterIcon, ChevronDown, ChevronUp, AlertCircle, ExternalLink, Info, Loader2, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import { ModalFooter } from "@/components/ui/modal-footer";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { UnsavedChangesAlert } from "@/components/UnsavedChangesAlert";

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
      status: "Finalizado",
      percentual: 100,
      cor: "bg-green-100 text-green-800",
      tooltip: "Documentação anexada e processo concluído"
    };
  }
};

const getAgendamentoStatusTooltip = (status: string) => {
  switch (status) {
    case "pendente":
      return "O carregamento referente à este agendamento ainda não foi iniciado";
    case "em_andamento":
      return "O carregamento referente à este agendamento está sendo realizado";
    case "concluido":
      return "O carregamento referente à este agendamento foi finalizado e o caminhão liberado";
    default:
      return "";
  }
};

const STATUS_AGENDAMENTO = [
  { id: "pendente", nome: "Pendente", cor: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200" },
  { id: "em_andamento", nome: "Em Andamento", cor: "bg-blue-100 text-blue-800 hover:bg-blue-200" },
  { id: "concluido", nome: "Concluído", cor: "bg-green-100 text-green-800 hover:bg-green-200" },
];

const EmptyStateCardWithAction = ({ 
  title, 
  description, 
  actionText, 
  actionUrl 
}: { 
  title: string; 
  description: string; 
  actionText: string; 
  actionUrl: string; 
}) => (
  <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-4 space-y-3">
    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
      <AlertCircle className="h-5 w-5 flex-shrink-0" />
      <span className="font-medium">{title}</span>
    </div>
    <p className="text-sm text-amber-700 dark:text-amber-300">
      {description}
    </p>
    <Button 
      size="sm" 
      className="w-full border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/20 min-h-[44px] max-md:min-h-[44px] btn-secondary"
      onClick={() => window.location.href = actionUrl}
    >
      <ExternalLink className="h-4 w-4 mr-2" />
      {actionText}
    </Button>
  </div>
);

const EmptyStateCardWithoutAction = ({ 
  title, 
  description 
}: { 
  title: string; 
  description: string; 
}) => (
  <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-4 space-y-3">
    <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
      <AlertCircle className="h-5 w-5 flex-shrink-0" />
      <span className="font-medium">{title}</span>
    </div>
    <p className="text-sm text-blue-700 dark:text-blue-300">
      {description}
    </p>
  </div>
);

function maskPlaca(value: string): string {
  let up = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (up.length > 7) up = up.slice(0, 7);
  if (up.length === 7) {
    if (/[A-Z]{3}[0-9][A-Z][0-9]{2}/.test(up)) {
      return up.replace(/^([A-Z]{3})([0-9][A-Z][0-9]{2})$/, "$1-$2");
    }
    return up.replace(/^([A-Z]{3})([0-9]{4})$/, "$1-$2");
  }
  if (up.length > 3) return `${up.slice(0, 3)}-${up.slice(3)}`;
  return up;
}

function formatPlaca(placa: string) {
  return maskPlaca(placa ?? "");
}

function maskCPF(value: string): string {
  let cleaned = value.replace(/\D/g, "").slice(0, 11);
  if (cleaned.length > 9)
    return cleaned.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2})$/, "$1.$2.$3-$4");
  if (cleaned.length > 6)
    return cleaned.replace(/^(\d{3})(\d{3})(\d{0,3})$/, "$1.$2.$3");
  if (cleaned.length > 3)
    return cleaned.replace(/^(\d{3})(\d{0,3})$/, "$1.$2");
  return cleaned;
}

function formatCPF(cpf: string) {
  const cleaned = (cpf ?? "").replace(/\D/g, "").slice(0, 11);
  if (cleaned.length < 11) return maskCPF(cleaned);
  return cleaned.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

// ✅ NOVAS FUNÇÕES PARA CNPJ
function maskCNPJ(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 14) {
    let cnpj = digits.slice(0, 14);
    if (cnpj.length > 12)
      return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})$/, "$1.$2.$3/$4-$5");
    if (cnpj.length > 8)
      return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})$/, "$1.$2.$3/$4");
    if (cnpj.length > 5)
      return cnpj.replace(/^(\d{2})(\d{3})(\d{0,3})$/, "$1.$2.$3");
    if (cnpj.length > 2)
      return cnpj.replace(/^(\d{2})(\d{0,3})$/, "$1.$2");
    return cnpj;
  }
  return value;
}

function formatCNPJ(cnpj: string): string {
  const cleaned = (cnpj ?? "").replace(/\D/g, "").slice(0, 14);
  if (cleaned.length < 14) return maskCNPJ(cleaned);
  return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

const parseDate = (d: string) => {
  const [dd, mm, yyyy] = d.split("/");
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
};

type AgendamentoStatus = "pendente" | "em_andamento" | "concluido";

// ✅ INTERFACE ATUALIZADA
interface AgendamentoItem {
  id: string;
  cliente: string;
  produto: string;
  quantidade: number;
  data: string;
  placa: string;
  motorista: string;
  documento: string;
  pedido: string;
  status: AgendamentoStatus;
  armazem: string;
  produto_id: string | null;
  armazem_id: string | null;
  liberacao_id: string | null;
  updated_at: string;
  // ✅ NOVOS CAMPOS:
  placa_carreta_1: string;
  placa_carreta_2: string | null;
  transportadora: string;
  cnpj_transportadora: string;
  observacoes: string | null;
  etapa_carregamento: number;
  status_carregamento: string;
  percentual_carregamento: number;
  cor_carregamento: string;
  tooltip_carregamento: string;
  finalizado: boolean;
}

// ✅ VALIDAÇÃO ATUALIZADA
const validateAgendamento = (ag: any, quantidadeDisponivel: number) => {
  const errors = [];
  if (!ag.liberacao) errors.push("Liberação");
  if (!ag.quantidade || Number(ag.quantidade) <= 0) errors.push("Quantidade");
  
  const qtdSolicitada = Number(ag.quantidade);
  if (qtdSolicitada > quantidadeDisponivel) {
    errors.push(`Quantidade excede o disponível (${quantidadeDisponivel}t)`);
  }
  
  if (!ag.data || isNaN(Date.parse(ag.data))) errors.push("Data");
  
  // Validação placa do caminhão
  const placaSemMascara = (ag.placa ?? "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
  if (placaSemMascara.length < 7) errors.push("Placa do veículo");
  if (!validatePlaca(placaSemMascara)) errors.push("Formato da placa inválido");
  
  // ✅ VALIDAÇÃO PLACA CARRETA 1 (obrigatória)
  const placaCarreta1SemMascara = (ag.placaCarreta1 ?? "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
  if (placaCarreta1SemMascara.length < 7) errors.push("Placa da Carreta 1");
  if (!validatePlaca(placaCarreta1SemMascara)) errors.push("Formato da Placa da Carreta 1 inválido");
  
  // ✅ VALIDAÇÃO PLACA CARRETA 2 (opcional, mas se preenchida deve ser válida)
  if (ag.placaCarreta2 && ag.placaCarreta2.trim()) {
    const placaCarreta2SemMascara = ag.placaCarreta2.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    if (placaCarreta2SemMascara.length < 7) errors.push("Placa da Carreta 2 incompleta");
    if (!validatePlaca(placaCarreta2SemMascara)) errors.push("Formato da Placa da Carreta 2 inválido");
  }
  
  if (!ag.motorista || ag.motorista.trim().length < 3) errors.push("Nome do motorista");
  if (!ag.documento || ag.documento.replace(/\D/g, "").length !== 11) errors.push("Documento (CPF) do motorista");
  
  // ✅ VALIDAÇÃO TRANSPORTADORA (obrigatória)
  if (!ag.transportadora || ag.transportadora.trim().length < 3) errors.push("Nome da transportadora");
  
  // ✅ VALIDAÇÃO CNPJ TRANSPORTADORA (obrigatória)
  const cnpjLimpo = (ag.cnpjTransportadora ?? "").replace(/\D/g, "");
  if (cnpjLimpo.length !== 14) errors.push("CNPJ da transportadora");
  
  return errors;
};

function validatePlaca(placa: string) {
  if (/^[A-Z]{3}[0-9]{4}$/.test(placa)) return true;
  if (/^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(placa)) return true;
  return false;
}

const Agendamentos = () => {
  useScrollToTop();
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasRole, userRole, user } = useAuth();
  const { representanteId, clientesDoRepresentante } = usePermissions();
  
  // ✅ Hook para controle de mudanças não salvas
  const {
    hasUnsavedChanges,
    showAlert,
    markAsChanged,
    markAsSaved,
    reset: resetUnsavedChanges,
    handleClose,
    confirmClose,
    cancelClose
  } = useUnsavedChanges();
  
  const canCreate = hasRole("admin") || hasRole("logistica") || hasRole("cliente") || hasRole("representante");
  const [isCreating, setIsCreating] = useState(false);
  const [detalhesAgendamento, setDetalhesAgendamento] = useState<AgendamentoItem | null>(null);
  const [secaoFinalizadosExpandida, setSecaoFinalizadosExpandida] = useState(false);

  const { data: currentCliente } = useQuery({
    queryKey: ["current-cliente", user?.id],
    queryFn: async () => {
      if (!user || userRole !== "cliente") return null;
      const { data, error } = await supabase
        .from("clientes")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && userRole === "cliente",
  });

  const { data: currentArmazem } = useQuery({
    queryKey: ["current-armazem", user?.id],
    queryFn: async () => {
      if (!user || userRole !== "armazem") return null;
      const { data, error } = await supabase
        .from("armazens")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && userRole === "armazem",
  });

  // 🚀 MIGRAÇÃO PARA FUNÇÃO UNIVERSAL
  const { data: agendamentosData, isLoading, error } = useQuery({
    queryKey: ["agendamentos", currentCliente?.id, currentArmazem?.id, representanteId, userRole],
    queryFn: async () => {
      console.log("🔍 [DEBUG] Query agendamentos executando:");
      console.log("- userRole:", userRole);
      console.log("- representanteId:", representanteId);
      console.log("- currentCliente?.id:", currentCliente?.id);
      console.log("- user:", user);
      
      // 🚀 USAR FUNÇÃO UNIVERSAL PARA TODOS OS ROLES
      const { data, error } = await supabase.rpc('get_agendamentos_universal', {
        p_user_role: userRole,
        p_user_id: user?.id,
        p_cliente_id: currentCliente?.id || null,
        p_armazem_id: currentArmazem?.id || null,
        p_representante_id: representanteId || null
      });
      
      console.log("🔍 [DEBUG] Resultado função universal:", { data, error });
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
    enabled: (() => {
      if (!user || !userRole) return false;
      if (userRole === "admin" || userRole === "logistica") return true;
      
      const clienteOk = userRole !== "cliente" || (currentCliente !== undefined);
      const armazemOk = userRole !== "armazem" || (currentArmazem !== undefined);
      const representanteOk = userRole !== "representante" || (representanteId !== undefined);
      
      console.log("🔍 [DEBUG] Enabled check:", { clienteOk, armazemOk, representanteOk });
      
      return clienteOk && armazemOk && representanteOk;
    })(),
  });

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(hoje.getDate() + 1);
  useQuery({
    queryKey: ["agendamentos-hoje", hoje.toISOString().split('T')[0]],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agendamentos")
        .select("id")
        .gte("data_retirada", hoje.toISOString())
        .lt("data_retirada", amanha.toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // ✅ USEMEMO ATUALIZADO COM NOVOS CAMPOS
  const agendamentos = useMemo(() => {
    if (!agendamentosData) return [];
    
    return agendamentosData.map((item: any): AgendamentoItem => {
      // ✅ Verificar se vem da função universal (tem campos calculados)
      const isFromFunction = !!item.cliente_nome;
      
      if (isFromFunction) {
        // ✅ Dados já calculados da função universal
        const etapaAtual = item.etapa_atual ?? 1;
        const statusInfo = getStatusCarregamento(etapaAtual);
        const finalizado = item.status === 'concluido';
        
        return {
          id: item.id,
          cliente: item.cliente_nome,
          produto: item.produto_nome,
          quantidade: item.quantidade,
          data: new Date(item.data_retirada).toLocaleDateString("pt-BR"),
          placa: item.placa_caminhao || "N/A",
          motorista: item.motorista_nome || "N/A",
          documento: item.motorista_documento || "N/A",
          pedido: item.pedido_interno,
          status: item.status as AgendamentoStatus,
          armazem: `${item.armazem_nome} - ${item.armazem_cidade}/${item.armazem_estado}`,
          produto_id: item.produto_id,
          armazem_id: item.armazem_id,
          liberacao_id: item.liberacao_id,
          updated_at: item.updated_at,
          // ✅ NOVOS CAMPOS:
          placa_carreta_1: item.placa_carreta_1 || "",
          placa_carreta_2: item.placa_carreta_2 || null,
          transportadora: item.transportadora || "",
          cnpj_transportadora: item.cnpj_transportadora || "",
          observacoes: item.observacoes,
          etapa_carregamento: etapaAtual,
          status_carregamento: statusInfo.status,
          percentual_carregamento: statusInfo.percentual,
          cor_carregamento: statusInfo.cor,
          tooltip_carregamento: statusInfo.tooltip,
          finalizado,
        };
      } else {
        // ❌ Fallback para dados da query tradicional (não deveria acontecer)
        let etapaAtual = 1;
        const carregamento = item.carregamentos?.[0];
        etapaAtual = carregamento?.etapa_atual ?? 1;
        
        const statusInfo = getStatusCarregamento(etapaAtual);
        const finalizado = item.status === 'concluido';
        
        return {
          id: item.id,
          cliente: item.liberacao?.clientes?.nome || "N/A",
          produto: item.liberacao?.produto?.nome || "N/A",
          quantidade: item.quantidade,
          data: item.data_retirada
            ? new Date(item.data_retirada).toLocaleDateString("pt-BR")
            : "",
          placa: item.placa_caminhao || "N/A",
          motorista: item.motorista_nome || "N/A",
          documento: item.motorista_documento || "N/A",
          pedido: item.liberacao?.pedido_interno || "N/A",
          status: item.status as AgendamentoStatus,
          armazem: item.liberacao?.armazem ? `${item.liberacao.armazem.nome} - ${item.liberacao.armazem.cidade}/${item.liberacao.armazem.estado}` : "N/A",
          produto_id: item.liberacao?.produto?.id,
          armazem_id: item.liberacao?.armazem?.id,
          liberacao_id: item.liberacao?.id,
          updated_at: item.updated_at,
          // ✅ NOVOS CAMPOS (fallback):
          placa_carreta_1: item.placa_carreta_1 || "",
          placa_carreta_2: item.placa_carreta_2 || null,
          transportadora: item.transportadora || "",
          cnpj_transportadora: item.cnpj_transportadora || "",
          observacoes: item.observacoes,
          etapa_carregamento: etapaAtual,
          status_carregamento: statusInfo.status,
          percentual_carregamento: statusInfo.percentual,
          cor_carregamento: statusInfo.cor,
          tooltip_carregamento: statusInfo.tooltip,
          finalizado,
        };
      }
    });
  }, [agendamentosData]);

  const [dialogOpen, setDialogOpen] = useState(false);
  
  // ✅ ESTADO ATUALIZADO
  const [novoAgendamento, setNovoAgendamento] = useState({
    liberacao: "",
    quantidade: "",
    data: "",
    placa: "",
    motorista: "",
    documento: "",
    // ✅ NOVOS CAMPOS:
    placaCarreta1: "",
    placaCarreta2: "",
    transportadora: "",
    cnpjTransportadora: "",
    observacoes: "",
  });
  
  const [formError, setFormError] = useState("");
  const [quantidadeDisponivel, setQuantidadeDisponivel] = useState<number>(0);
  const [validandoQuantidade, setValidandoQuantidade] = useState(false);

  // 🚀 MIGRAÇÃO PARA FUNÇÃO UNIVERSAL - LIBERAÇÕES DISPONÍVEIS
  const { data: liberacoesDisponiveis } = useQuery({
    queryKey: ["liberacoes-disponiveis", currentCliente?.id, representanteId, userRole],
    queryFn: async () => {
      console.log("🔍 [DEBUG] Query liberacoes-disponiveis executando:");
      console.log("- userRole:", userRole);
      console.log("- representanteId:", representanteId);
      console.log("- currentCliente?.id:", currentCliente?.id);
      
      // 🚀 USAR FUNÇÃO UNIVERSAL PARA LIBERAÇÕES DISPONÍVEIS
      const { data, error } = await supabase.rpc('get_liberacoes_universal', {
        p_user_role: userRole,
        p_user_id: user?.id,
        p_cliente_id: currentCliente?.id || null,
        p_armazem_id: null, // Para agendamentos, não filtramos por armazém específico
        p_representante_id: representanteId || null
      });
      
      console.log("🔍 [DEBUG] Resultado função universal liberações:", { data, error });
      
      if (error) throw error;
      
      // Filtrar apenas liberações disponíveis e calcular disponibilidade
      const liberacoesDisponiveis = (data || []).filter((lib: any) => 
        lib.status === 'disponivel' || lib.status === 'parcialmente_agendada'
      );

      const liberacoesComDisponibilidade = liberacoesDisponiveis.map((lib: any) => ({
        id: lib.id,
        pedido_interno: lib.pedido_interno,
        quantidade_liberada: lib.quantidade_liberada,
        quantidade_retirada: lib.quantidade_retirada,
        status: lib.status,
        cliente_id: lib.cliente_id,
        clientes: { nome: lib.cliente_nome },
        produto: { nome: lib.produto_nome },
        armazem: {
          id: lib.armazem_id,
          cidade: lib.armazem_cidade,
          estado: lib.armazem_estado,
          nome: lib.armazem_nome
        },
        quantidade_disponivel_real: lib.quantidade_disponivel || 
          (lib.quantidade_liberada - (lib.quantidade_retirada || 0) - (lib.quantidade_agendada || 0))
      }));
      
      return liberacoesComDisponibilidade.filter(lib => lib.quantidade_disponivel_real > 0);
    },
    enabled: (() => {
      if (!user || !userRole) return false;
      if (userRole === "admin" || userRole === "logistica") return true;
      
      const clienteOk = userRole !== "cliente" || (currentCliente !== undefined);
      const representanteOk = userRole !== "representante" || (representanteId !== undefined);
      
      console.log("🔍 [DEBUG] Liberações enabled check:", { clienteOk, representanteOk });
      
      return clienteOk && representanteOk;
    })(),
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('modal') === 'novo' && canCreate) {
      setDialogOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [canCreate]);

  // ✅ RESET FORM ATUALIZADO
  const resetFormNovoAgendamento = () => {
    setNovoAgendamento({
      liberacao: "",
      quantidade: "",
      data: "",
      placa: "",
      motorista: "",
      documento: "",
      // ✅ NOVOS CAMPOS:
      placaCarreta1: "",
      placaCarreta2: "",
      transportadora: "",
      cnpjTransportadora: "",
      observacoes: "",
    });
    setFormError("");
    setQuantidadeDisponivel(0);
    setValidandoQuantidade(false);
    resetUnsavedChanges(); // ✅ Limpar estado de mudanças
  };

  // ✅ Função para fechar modal com verificação
  const handleCloseModal = () => {
    handleClose(() => {
      setDialogOpen(false);
      resetFormNovoAgendamento(); // ✅ Limpar dados ao fechar
    });
  };

  const atualizarQuantidadeDisponivel = async (liberacaoId: string) => {
    if (!liberacaoId) {
      setQuantidadeDisponivel(0);
      return;
    }
    
    setValidandoQuantidade(true);
    try {
      const liberacao = liberacoesDisponiveis?.find(lib => lib.id === liberacaoId);
      if (!liberacao) {
        setQuantidadeDisponivel(0);
        return;
      }

      const { data: agendamentosPendentes, error } = await supabase
        .from("agendamentos")
        .select("quantidade")
        .eq("liberacao_id", liberacaoId)
        .in("status", ["pendente", "em_andamento"]);

      if (error) {
        setQuantidadeDisponivel(0);
        return;
      }

      const totalAgendado = (agendamentosPendentes || []).reduce(
        (total, agendamento) => total + (agendamento.quantidade || 0), 
        0
      );

      const quantidadeLiberada = liberacao.quantidade_liberada || 0;
      const quantidadeRetirada = liberacao.quantidade_retirada || 0;
      const disponivel = Math.max(0, quantidadeLiberada - quantidadeRetirada - totalAgendado);
      
      setQuantidadeDisponivel(disponivel);
      
    } catch (error) {
      setQuantidadeDisponivel(0);
    } finally {
      setValidandoQuantidade(false);
    }
  };

  // ✅ FUNÇÃO CREATE ATUALIZADA
  const handleCreateAgendamento = async () => {
    setFormError("");
    const erros = validateAgendamento(novoAgendamento, quantidadeDisponivel);
    if (erros.length > 0) {
      setFormError("Preencha: " + erros.join(", "));
      toast({
        variant: "destructive",
        title: "Campos obrigatórios ausentes ou inválidos",
        description: "Preencha: " + erros.join(", "),
      });
      return;
    }
    const qtdNum = Number(novoAgendamento.quantidade);
    if (Number.isNaN(qtdNum) || qtdNum <= 0) {
      setFormError("Quantidade inválida.");
      toast({ variant: "destructive", title: "Quantidade inválida" });
      return;
    }

    setIsCreating(true);

    try {
      const placaSemMascara = (novoAgendamento.placa ?? "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
      const cpfSemMascara = (novoAgendamento.documento ?? "").replace(/\D/g, "");
      
      // ✅ NOVOS CAMPOS LIMPOS
      const placaCarreta1SemMascara = (novoAgendamento.placaCarreta1 ?? "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
      const placaCarreta2SemMascara = novoAgendamento.placaCarreta2 
        ? novoAgendamento.placaCarreta2.replace(/[^A-Z0-9]/gi, "").toUpperCase() 
        : null;
      const cnpjSemMascara = (novoAgendamento.cnpjTransportadora ?? "").replace(/\D/g, "");

      const selectedLiberacao = liberacoesDisponiveis?.find((l) => l.id === novoAgendamento.liberacao);
      const clienteIdDaLiberacao = selectedLiberacao?.cliente_id || null;
      const armazemIdDaLiberacao = selectedLiberacao?.armazem?.id || null;

      const { data: userData } = await supabase.auth.getUser();
      
      // ✅ INSERT ATUALIZADO COM NOVOS CAMPOS
      const { data: agendData, error: errAgend } = await supabase
        .from("agendamentos")
        .insert({
          liberacao_id: novoAgendamento.liberacao,
          quantidade: qtdNum,
          data_retirada: novoAgendamento.data,
          placa_caminhao: placaSemMascara,
          motorista_nome: novoAgendamento.motorista.trim(),
          motorista_documento: cpfSemMascara,
          // ✅ NOVOS CAMPOS:
          placa_carreta_1: placaCarreta1SemMascara,
          placa_carreta_2: placaCarreta2SemMascara,
          transportadora: novoAgendamento.transportadora.trim(),
          cnpj_transportadora: cnpjSemMascara,
          observacoes: novoAgendamento.observacoes || null,
          created_by: userData.user?.id,
          cliente_id: clienteIdDaLiberacao,
          armazem_id: armazemIdDaLiberacao,
        })
        .select(`
          id,
          data_retirada,
          liberacao:liberacoes(
            pedido_interno,
            clientes(nome),
            produto:produtos(nome)
          )
        `)
        .single();

      if (errAgend) {
        if (
          errAgend.message?.includes("violates not-null constraint") ||
          errAgend.code === "23502"
        ) {
          setFormError("Erro do banco: campo obrigatório não enviado (verifique todos os campos).");
          toast({
            variant: "destructive",
            title: "Erro ao criar agendamento",
            description: "Erro do banco: campo obrigatório não enviado (verifique todos os campos).",
          });
        } else if (errAgend.message?.includes("Quantidade solicitada") && errAgend.message?.includes("excede o disponível")) {
          setFormError("Quantidade solicitada excede o disponível para esta liberação.");
          toast({
            variant: "destructive",
            title: "Quantidade inválida",
            description: "A quantidade solicitada excede o disponível para esta liberação.",
          });
        } else {
          setFormError(errAgend.message || "Erro desconhecido");
          toast({ variant: "destructive", title: "Erro ao criar agendamento", description: errAgend.message });
        }
        return;
      }

      markAsSaved(); // ✅ Marcar como salvo ANTES de resetar

      toast({
        title: "Agendamento criado com sucesso!",
        description: `${(agendData.liberacao as any)?.clientes?.nome ?? ""} - ${new Date(agendData.data_retirada).toLocaleDateString("pt-BR")} - ${qtdNum}t`
      });
      resetFormNovoAgendamento();
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["agendamentos"] });
      queryClient.invalidateQueries({ queryKey: ["liberacoes-disponiveis"] });
      queryClient.invalidateQueries({ queryKey: ["liberacoes"] });

    } catch (err: any) {
      setFormError(err.message || "Erro desconhecido.");
      if (err.message?.includes("violates not-null constraint")) {
        toast({
          variant: "destructive",
          title: "Erro ao criar agendamento",
          description: "Erro do banco: campo obrigatório não enviado (verifique todos os campos).",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao criar agendamento",
          description: err instanceof Error ? err.message : "Erro desconhecido"
        });
      }
    } finally {
      setIsCreating(false);
    }
  };

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<AgendamentoStatus[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const allStatuses: AgendamentoStatus[] = ["pendente", "em_andamento", "concluido"];
  const toggleStatus = (st: AgendamentoStatus) => setSelectedStatuses((prev) => (prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st]));
  const clearFilters = () => { setSearch(""); setSelectedStatuses([]); setDateFrom(""); setDateTo(""); };

  const { agendamentosAtivos, agendamentosFinalizados } = useMemo(() => {
    const filtered = agendamentos.filter((a) => {
      const term = search.trim().toLowerCase();
      if (term) {
        const hay = `${a.cliente} ${a.produto} ${a.pedido} ${a.motorista}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(a.status)) return false;
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (parseDate(a.data) < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (parseDate(a.data) > to) return false;
      }
      return true;
    });

    const ativos = filtered.filter(a => !a.finalizado);
    const finalizados = filtered.filter(a => a.finalizado);

    return { agendamentosAtivos: ativos, agendamentosFinalizados: finalizados };
  }, [agendamentos, search, selectedStatuses, dateFrom, dateTo]);

  useEffect(() => {
    if (search.trim() && agendamentosFinalizados.length > 0 && !secaoFinalizadosExpandida) {
      setSecaoFinalizadosExpandida(true);
    }
  }, [search, agendamentosFinalizados.length, secaoFinalizadosExpandida]);

  const showingCount = agendamentosAtivos.length + agendamentosFinalizados.length;
  const totalCount = agendamentos.length;
  const activeAdvancedCount = (selectedStatuses.length ? 1 : 0) + ((dateFrom || dateTo) ? 1 : 0);
  const hasActiveFilters = search.trim() || selectedStatuses.length > 0 || dateFrom || dateTo;
  const temLiberacoesDisponiveis = liberacoesDisponiveis && liberacoesDisponiveis.length > 0;

  const renderEmptyLiberacoesCard = () => {
    if (userRole === "cliente" || userRole === "representante") {
      return (
        <EmptyStateCardWithoutAction
          title="Nenhuma liberação disponível"
          description="Você não possui liberações disponíveis para agendamento no momento. Se acredita que isso é um erro, entre em contato com a equipe de operações para verificar o status dos seus pedidos."
        />
      );
    } else {
      return (
        <EmptyStateCardWithAction
          title="Nenhuma liberação disponível"
          description="Para criar agendamentos, você precisa ter liberações disponíveis primeiro."
          actionText="Criar Liberação"
          actionUrl="https://logi-sys-shiy.vercel.app/liberacoes?modal=novo"
        />
      );
    }
  };

  const quantidadeValida = useMemo(() => {
    const qtd = Number(novoAgendamento.quantidade);
    return !isNaN(qtd) && qtd > 0 && qtd <= quantidadeDisponivel;
  }, [novoAgendamento.quantidade, quantidadeDisponivel]);

  const getStatusColor = (status: AgendamentoStatus) => {
    switch (status) {
      case "pendente":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "em_andamento":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "concluido":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const getStatusLabel = (status: AgendamentoStatus) => {
    switch (status) {
      case "pendente":
        return "Pendente";
      case "em_andamento":
        return "Em Andamento";
      case "concluido":
        return "Concluído";
      default:
        return status;
    }
  };

  const renderAgendamentoCard = (ag: AgendamentoItem) => (
    <Card key={ag.id} className="transition-all hover:shadow-md cursor-pointer">
      <CardContent className="p-4 md:p-5">
        <div className="space-y-3">
          {/* Layout Mobile-First: Badge no topo em mobile, ao lado em desktop */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            {/* Badge - Primeiro em mobile, à direita em desktop */}
            <div className="flex justify-start sm:order-2 sm:justify-end">
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <div 
                    className="flex items-center gap-1 cursor-help"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Badge className={`${getStatusColor(ag.status)} text-xs px-2 py-1 text-center`}>
                      {getStatusLabel(ag.status)}
                    </Badge>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">{getAgendamentoStatusTooltip(ag.status)}</p>
                </TooltipContent>
              </Tooltip>
            </div>
  
            {/* Conteúdo principal - Segundo em mobile, à esquerda em desktop */}
            <div 
              className="flex items-start gap-3 md:gap-4 flex-1 min-w-0 sm:order-1"
              onClick={() => setDetalhesAgendamento(ag)}
            >
              <div className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-lg bg-gradient-primary shrink-0">
                <Calendar className="h-4 w-4 md:h-5 md:w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <h3 className="font-semibold text-foreground text-sm md:text-base break-words">Pedido: {ag.pedido}</h3>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p><span className="font-semibold">Cliente:</span> <span className="break-words">{ag.cliente}</span></p>
                  <p><span className="font-semibold">Produto:</span> <span className="break-words">{ag.produto}</span></p>
                  <p className="break-words"><span className="font-semibold">Armazém:</span> {ag.armazem}</p>
                </div>
                
                <div className="mt-2 text-xs text-muted-foreground">
                  <p className="whitespace-nowrap">
                    <span className="font-medium text-foreground">Quantidade:</span> {ag.quantidade.toLocaleString('pt-BR')}t
                  </p>
                </div>
              </div>
            </div>
          </div>
  
          {/* Grid de informações - Sempre abaixo do conteúdo principal */}
          <div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm pt-2"
            onClick={() => setDetalhesAgendamento(ag)}
          >
            <div className="
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">{ag.data}</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">{formatPlaca(ag.placa)}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">{ag.motorista}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">{formatCPF(ag.documento)}</span>
            </div>
          </div>

          {/* Barra de progresso - Sempre na parte inferior */}
          <div 
            className="pt-2 border-t"
            onClick={() => setDetalhesAgendamento(ag)}
          >
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-purple-600 shrink-0" />
              <span className="text-xs text-purple-600 font-medium shrink-0">Carregamento:</span>
              
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <div 
                    className="flex-1 bg-gray-200 rounded-full h-2 dark:bg-gray-700 cursor-help min-w-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div 
                      className="bg-purple-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${ag.percentual_carregamento}%` }}
                    ></div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">{ag.tooltip_carregamento}</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <div 
                    className="flex items-center gap-1 cursor-help shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Info className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium w-8 text-right">
                      {ag.percentual_carregamento}%
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">{ag.tooltip_carregamento}</p>
                </TooltipContent>
              </Tooltip>
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
          title="Agendamentos"
          subtitle="Gerencie os agendamentos de retirada"
          icon={Calendar}
        />
        <div className="text-center py-12">
          <div className="flex justify-center items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="text-muted-foreground">Carregando agendamentos...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 space-y-4 md:space-y-6">
        <PageHeader
          title="Agendamentos"
          subtitle="Gerencie os agendamentos de retirada"
          icon={Calendar}
        />
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="text-center text-destructive">
              <p className="font-semibold">Erro ao carregar agendamentos</p>
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
        
        {/* ✅ Componente de alerta */}
        <UnsavedChangesAlert 
          open={showAlert}
          onConfirm={confirmClose}
          onCancel={cancelClose}
        />

        <PageHeader
          title="Agendamentos"
          subtitle="Gerencie os agendamentos de retirada"
          icon={Calendar}
          actions={
            canCreate && (
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                if (!open && isCreating) return;
                if (!open) {
                  handleCloseModal(); // ✅ Usar nova função
                } else {
                  setDialogOpen(open);
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="btn-primary min-h-[44px] max-md:min-h-[44px]">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Agendamento
                  </Button>
                </DialogTrigger>
                
                {/* ✅ MODAL ATUALIZADO COM NOVOS CAMPOS */}
                <DialogContent className="max-w-[calc(100vw-2rem)] md:max-w-4xl max-h-[calc(100vh-8rem)] md:max-h-[calc(100vh-4rem)] overflow-y-auto my-4 md:my-8">
                  <DialogHeader className="pt-2 pb-3 border-b border-border pr-8">
                    <DialogTitle className="text-lg md:text-xl pr-2 mt-1">Novo Agendamento</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                      Agende a retirada de produtos liberados
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="py-4 px-1 space-y-6">
                    {!temLiberacoesDisponiveis ? (
                      renderEmptyLiberacoesCard()
                    ) : (
                      <div className="space-y-6">
                        {/* Seção 1: Liberação e Quantidade */}
                        <div className="space-y-4">
                          <h3 className="text-base font-semibold text-foreground border-b pb-2">📦 Produto e Quantidade</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                              <Label htmlFor="liberacao" className="text-sm font-medium">Liberação *</Label>
                              <Select
                                value={novoAgendamento.liberacao}
                                onValueChange={(value) => {
                                  setNovoAgendamento({ ...novoAgendamento, liberacao: value });
                                  markAsChanged(); // ✅ Marcar como alterado
                                  atualizarQuantidadeDisponivel(value);
                                }}
                                disabled={isCreating}
                              >
                                <SelectTrigger id="liberacao" className="min-h-[44px] max-md:min-h-[44px]">
                                  <SelectValue placeholder="Selecione uma liberação" />
                                </SelectTrigger>
                                <SelectContent>
                                  {liberacoesDisponiveis?.map((lib) => (
                                    <SelectItem key={lib.id} value={lib.id}>
                                      <div className="flex flex-col gap-1 py-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold">{lib.pedido_interno}</span>
                                          <Badge variant="outline" className="text-xs">
                                            {lib.quantidade_disponivel_real}t disponível
                                          </Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {lib.clientes?.nome} • {lib.produto?.nome}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {lib.armazem?.nome} - {lib.armazem?.cidade}/{lib.armazem?.estado}
                                        </div>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label htmlFor="quantidade" className="text-sm font-medium">Quantidade (t) *</Label>
                              <div className="relative">
                                <Input
                                  id="quantidade"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max={quantidadeDisponivel}
                                  value={novoAgendamento.quantidade}
                                  onChange={(e) => {
                                    setNovoAgendamento({ ...novoAgendamento, quantidade: e.target.value });
                                    markAsChanged(); // ✅ Marcar como alterado
                                  }}
                                  placeholder="0.00"
                                  disabled={isCreating || validandoQuantidade}
                                  className={`min-h-[44px] max-md:min-h-[44px] text-base max-md:text-base pr-10 ${
                                    novoAgendamento.quantidade && !quantidadeValida ? 'border-red-500' : ''
                                  }`}
                                />
                                {validandoQuantidade && (
                                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                                )}
                              </div>
                              {quantidadeDisponivel > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Disponível: <span className="font-semibold">{quantidadeDisponivel}t</span>
                                </p>
                              )}
                            </div>
                            
                            <div>
                              <Label htmlFor="data" className="text-sm font-medium">Data de Retirada *</Label>
                              <Input
                                id="data"
                                type="date"
                                value={novoAgendamento.data}
                                onChange={(e) => {
                                  setNovoAgendamento({ ...novoAgendamento, data: e.target.value });
                                  markAsChanged(); // ✅ Marcar como alterado
                                }}
                                disabled={isCreating}
                                className="min-h-[44px] max-md:min-h-[44px] text-base max-md:text-base"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Seção 2: Veículo e Carretas */}
                        <div className="space-y-4">
                          <h3 className="text-base font-semibold text-foreground border-b pb-2">🚛 Veículo e Carretas</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="placa" className="text-sm font-medium">Placa do Veículo *</Label>
                              <Input
                                id="placa"
                                value={novoAgendamento.placa}
                                onChange={(e) => {
                                  setNovoAgendamento({ ...novoAgendamento, placa: maskPlaca(e.target.value) });
                                  markAsChanged(); // ✅ Marcar como alterado
                                }}
                                placeholder="ABC-1234"
                                maxLength={8}
                                disabled={isCreating}
                                className="min-h-[44px] max-md:min-h-[44px] text-base max-md:text-base"
                              />
                            </div>
                            
                            {/* ✅ NOVO CAMPO: PLACA CARRETA 1 */}
                            <div>
                              <Label htmlFor="placaCarreta1" className="text-sm font-medium">Placa da Carreta 1 *</Label>
                              <Input
                                id="placaCarreta1"
                                value={novoAgendamento.placaCarreta1}
                                onChange={(e) => {
                                  setNovoAgendamento({ ...novoAgendamento, placaCarreta1: maskPlaca(e.target.value) });
                                  markAsChanged(); // ✅ Marcar como alterado
                                }}
                                placeholder="ABC-1234"
                                maxLength={8}
                                disabled={isCreating}
                                className="min-h-[44px] max-md:min-h-[44px] text-base max-md:text-base"
                              />
                            </div>
                            
                            {/* ✅ NOVO CAMPO: PLACA CARRETA 2 (OPCIONAL) */}
                            <div>
                              <Label htmlFor="placaCarreta2" className="text-sm font-medium">Placa da Carreta 2 (opcional)</Label>
                              <Input
                                id="placaCarreta2"
                                value={novoAgendamento.placaCarreta2}
                                onChange={(e) => {
                                  setNovoAgendamento({ ...novoAgendamento, placaCarreta2: maskPlaca(e.target.value) });
                                  markAsChanged(); // ✅ Marcar como alterado
                                }}
                                placeholder="ABC-1234"
                                maxLength={8}
                                disabled={isCreating}
                                className="min-h-[44px] max-md:min-h-[44px] text-base max-md:text-base"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Seção 3: Motorista */}
                        <div className="space-y-4">
                          <h3 className="text-base font-semibold text-foreground border-b pb-2">👤 Motorista</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="motorista" className="text-sm font-medium">Nome do Motorista *</Label>
                              <Input
                                id="motorista"
                                value={novoAgendamento.motorista}
                                onChange={(e) => {
                                  setNovoAgendamento({ ...novoAgendamento, motorista: e.target.value });
                                  markAsChanged(); // ✅ Marcar como alterado
                                }}
                                placeholder="Nome completo"
                                disabled={isCreating}
                                className="min-h-[44px] max-md:min-h-[44px] text-base max-md:text-base"
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor="documento" className="text-sm font-medium">CPF do Motorista *</Label>
                              <Input
                                id="documento"
                                value={novoAgendamento.documento}
                                onChange={(e) => {
                                  setNovoAgendamento({ ...novoAgendamento, documento: maskCPF(e.target.value) });
                                  markAsChanged(); // ✅ Marcar como alterado
                                }}
                                placeholder="000.000.000-00"
                                maxLength={14}
                                disabled={isCreating}
                                className="min-h-[44px] max-md:min-h-[44px] text-base max-md:text-base"
                              />
                            </div>
                          </div>
                        </div>

                        {/* ✅ SEÇÃO 4: TRANSPORTADORA */}
                        <div className="space-y-4">
                          <h3 className="text-base font-semibold text-foreground border-b pb-2">🏢 Transportadora</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="transportadora" className="text-sm font-medium">Nome da Transportadora *</Label>
                              <Input
                                id="transportadora"
                                value={novoAgendamento.transportadora}
                                onChange={(e) => {
                                  setNovoAgendamento({ ...novoAgendamento, transportadora: e.target.value });
                                  markAsChanged(); // ✅ Marcar como alterado
                                }}
                                placeholder="Nome da empresa transportadora"
                                disabled={isCreating}
                                className="min-h-[44px] max-md:min-h-[44px] text-base max-md:text-base"
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor="cnpjTransportadora" className="text-sm font-medium">CNPJ da Transportadora *</Label>
                              <Input
                                id="cnpjTransportadora"
                                value={novoAgendamento.cnpjTransportadora}
                                onChange={(e) => {
                                  setNovoAgendamento({ ...novoAgendamento, cnpjTransportadora: maskCNPJ(e.target.value) });
                                  markAsChanged(); // ✅ Marcar como alterado
                                }}
                                placeholder="00.000.000/0000-00"
                                maxLength={18}
                                disabled={isCreating}
                                className="min-h-[44px] max-md:min-h-[44px] text-base max-md:text-base"
                              />
                            </div>
                          </div>
                        </div>

                        {/* ✅ SEÇÃO 5: OBSERVAÇÕES */}
                        <div className="space-y-4">
                          <h3 className="text-base font-semibold text-foreground border-b pb-2">📝 Observações</h3>
                          <div>
                            <Label htmlFor="observacoes" className="text-sm font-medium">Observações (opcional)</Label>
                            <Input
                              id="observacoes"
                              value={novoAgendamento.observacoes}
                              onChange={(e) => {
                                setNovoAgendamento({ ...novoAgendamento, observacoes: e.target.value });
                                markAsChanged(); // ✅ Marcar como alterado
                              }}
                              placeholder="Informações adicionais sobre o agendamento"
                              disabled={isCreating}
                              className="min-h-[44px] max-md:min-h-[44px] text-base max-md:text-base"
                            />
                          </div>
                        </div>

                        {formError && (
                          <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 p-3">
                            <p className="text-sm text-red-800 dark:text-red-200">{formError}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Botões no final do conteúdo */}
                    <ModalFooter 
                      variant="double"
                      onClose={() => handleCloseModal()}
                      onConfirm={handleCreateAgendamento}
                      confirmText="Criar Agendamento"
                      confirmIcon={<Plus className="h-4 w-4" />}
                      isLoading={isCreating}
                      confirmDisabled={!temLiberacoesDisponiveis}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            )
          }
        />

        {/* Barra de filtros - Mobile otimizada */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Input 
              className="h-9 flex-1 min-h-[44px] max-md:min-h-[44px] text-base max-md:text-base" 
              placeholder="Buscar por cliente, produto, pedido ou motorista..." 
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
              <Label className="text-sm font-semibold mb-2 block">Status do Agendamento</Label>
              <div className="flex flex-wrap gap-2">
                {STATUS_AGENDAMENTO.map((status) => {
                  const active = selectedStatuses.includes(status.id as AgendamentoStatus);
                  return (
                    <Badge
                      key={status.id}
                      onClick={() => toggleStatus(status.id as AgendamentoStatus)}
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
                  placeholder="Data inicial"
                  className="min-h-[44px] max-md:min-h-[44px] text-base max-md:text-base"
                />
                <Input 
                  type="date" 
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  placeholder="Data final"
                  className="min-h-[44px] max-md:min-h-[44px] text-base max-md:text-base"
                />
              </div>
            </div>
          </div>
        )}

        {/* Lista de agendamentos */}
        <div className="space-y-6">
          {/* Agendamentos Ativos */}
          {agendamentosAtivos.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                Agendamentos Ativos ({agendamentosAtivos.length})
              </h2>
              <div className="grid gap-4">
                {agendamentosAtivos.map(renderAgendamentoCard)}
              </div>
            </div>
          )}

          {/* Agendamentos Finalizados */}
          {agendamentosFinalizados.length > 0 && (
            <div className="space-y-4">
              <Button
                onClick={() => setSecaoFinalizadosExpandida(!secaoFinalizadosExpandida)}
                className="w-full justify-between bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 min-h-[44px] max-md:min-h-[44px]"
              >
                <span className="text-sm font-medium">
                  Agendamentos Finalizados ({agendamentosFinalizados.length})
                </span>
                {secaoFinalizadosExpandida ? 
                  <ChevronUp className="h-4 w-4" /> : 
                  <ChevronDown className="h-4 w-4" />
                }
              </Button>
              
              {secaoFinalizadosExpandida && (
                <div className="grid gap-4">
                  {agendamentosFinalizados.map(renderAgendamentoCard)}
                </div>
              )}
            </div>
          )}

          {/* Estado vazio */}
          {agendamentos.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum agendamento encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  {canCreate 
                    ? "Comece criando seu primeiro agendamento de retirada."
                    : "Aguarde a criação de agendamentos pela equipe responsável."
                  }
                </p>
                {canCreate && (
                  <Button 
                    onClick={() => setDialogOpen(true)} 
                    className="btn-primary min-h-[44px] max-md:min-h-[44px]"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Agendamento
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Estado de filtros sem resultados */}
          {agendamentos.length > 0 && showingCount === 0 && (
            <Card>
              <CardContent className="p-6 text-center">
                <FilterIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum resultado encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  Ajuste os filtros para encontrar os agendamentos desejados.
                </p>
                <Button 
                  onClick={clearFilters} 
                  className="btn-secondary min-h-[44px] max-md:min-h-[44px]"
                >
                  <X className="mr-2 h-4 w-4" />
                  Limpar Filtros
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ✅ MODAL DE DETALHES ATUALIZADO */}
        {detalhesAgendamento && (
          <Dialog open={!!detalhesAgendamento} onOpenChange={() => setDetalhesAgendamento(null)}>
            <DialogContent className="max-w-[calc(100vw-2rem)] md:max-w-4xl max-h-[calc(100vh-8rem)] md:max-h-[calc(100vh-4rem)] overflow-y-auto my-4 md:my-8">
              <DialogHeader className="pt-2 pb-3 border-b border-border pr-8">
                <DialogTitle className="text-lg md:text-xl pr-2 mt-1">
                  Detalhes do Agendamento
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Pedido: {detalhesAgendamento.pedido}
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4 px-1 space-y-6">
                {/* Seção 1: Informações Gerais */}
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-foreground border-b pb-2">📋 Informações Gerais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Cliente</Label>
                      <p className="text-sm font-medium">{detalhesAgendamento.cliente}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Produto</Label>
                      <p className="text-sm font-medium">{detalhesAgendamento.produto}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Quantidade</Label>
                      <p className="text-sm font-medium">{detalhesAgendamento.quantidade.toLocaleString('pt-BR')}t</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Data de Retirada</Label>
                      <p className="text-sm font-medium">{detalhesAgendamento.data}</p>
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-sm font-medium text-muted-foreground">Armazém</Label>
                      <p className="text-sm font-medium">{detalhesAgendamento.armazem}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                      <Badge className={`${getStatusColor(detalhesAgendamento.status)} text-xs px-2 py-1 w-fit`}>
                        {getStatusLabel(detalhesAgendamento.status)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Seção 2: Veículo e Carretas */}
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-foreground border-b pb-2">🚛 Veículo e Carretas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Placa do Veículo</Label>
                      <p className="text-sm font-medium">{formatPlaca(detalhesAgendamento.placa)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Placa da Carreta 1</Label>
                      <p className="text-sm font-medium">
                        {detalhesAgendamento.placa_carreta_1 ? formatPlaca(detalhesAgendamento.placa_carreta_1) : "N/A"}
                      </p>
                    </div>
                    {detalhesAgendamento.placa_carreta_2 && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Placa da Carreta 2</Label>
                        <p className="text-sm font-medium">{formatPlaca(detalhesAgendamento.placa_carreta_2)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Seção 3: Motorista */}
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-foreground border-b pb-2">👤 Motorista</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Nome</Label>
                      <p className="text-sm font-medium">{detalhesAgendamento.motorista}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">CPF</Label>
                      <p className="text-sm font-medium">{formatCPF(detalhesAgendamento.documento)}</p>
                    </div>
                  </div>
                </div>

                {/* ✅ Seção 4: Transportadora */}
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-foreground border-b pb-2">🏢 Transportadora</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Nome da Transportadora</Label>
                      <p className="text-sm font-medium">
                        {detalhesAgendamento.transportadora || "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">CNPJ</Label>
                      <p className="text-sm font-medium">
                        {detalhesAgendamento.cnpj_transportadora ? formatCNPJ(detalhesAgendamento.cnpj_transportadora) : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ✅ Seção 5: Observações */}
                {detalhesAgendamento.observacoes && (
                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-foreground border-b pb-2">📝 Observações</h3>
                    <div>
                      <p className="text-sm">{detalhesAgendamento.observacoes}</p>
                    </div>
                  </div>
                )}

                {/* Seção 6: Status do Carregamento */}
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-foreground border-b pb-2">📦 Status do Carregamento</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Progresso</span>
                      <span className="text-sm font-medium">{detalhesAgendamento.percentual_carregamento}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
                      <div 
                        className="bg-purple-500 h-3 rounded-full transition-all duration-300" 
                        style={{ width: `${detalhesAgendamento.percentual_carregamento}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-muted-foreground">{detalhesAgendamento.tooltip_carregamento}</p>
                    
                    {/* Botão para acessar carregamento */}
                    <div className="pt-2">
                      <Button
                        onClick={() => {
                          window.location.href = `/carregamentos?agendamento=${detalhesAgendamento.id}`;
                        }}
                        className="w-full btn-secondary min-h-[44px] max-md:min-h-[44px]"
                      >
                        <ChevronRight className="h-4 w-4 mr-2" />
                        Acessar Carregamento
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              <DialogFooter className="border-t pt-4">
                <Button
                  onClick={() => setDetalhesAgendamento(null)}
                  className="w-full btn-secondary min-h-[44px] max-md:min-h-[44px]"
                >
                  Fechar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </TooltipProvider>
  );
};

export default Agendamentos;
