import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { DocumentViewer } from "@/components/DocumentViewer";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { ModalFooter } from "@/components/ui/modal-footer";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { UnsavedChangesAlert } from "@/components/UnsavedChangesAlert";
import { formatFileSize, BUCKET_UPLOAD_LIMITS } from "@/lib/uploadValidation";
import { TransferenciaClienteField, type TransferenciaClienteValue } from "@/components/TransferenciaClienteField";
import {
  Loader2,
  ArrowLeft,
  Package,
  MapPin,
  Filter as FilterIcon,
  X,
  ChevronDown,
  ChevronUp,
  Archive,
  Layers,
  ArrowRightLeft,
  Undo2,
  Building2,
  FileText
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatarCpfCnpj } from "@/lib/documentValidation";

interface RemessaItem {
  id: string;
  quantidade_original: number;
  numero_remessa: string | null;
  observacoes: string | null;
  url_nota_remessa: string | null;
  url_xml_remessa: string | null;
  created_at: string;
  created_by: string | null;
}

interface TransferenciaItem {
  id: string;
  quantidade: number;
  numero_pedido: string;
  data_transferencia: string;
  url_nota: string | null;
  url_xml: string | null;
  status: "ativa" | "cancelada";
  created_at: string;
  cliente_id: string | null;
  cliente_cnpj_texto: string | null;
  cliente_razao_social_texto: string | null;
  cliente: { nome: string; cnpj_cpf: string } | null;
}

interface EstoqueDetalhes {
  produto: {
    id: string;
    nome: string;
    unidade: string;
  };
  armazem: {
    id: string;
    nome: string;
    cidade: string;
    estado: string;
  };
  quantidade_total: number;
  quantidade_disponivel: number;
  remessas: RemessaItem[];
  transferencias: TransferenciaItem[];
}

const formatarDataHora = (data: string) => {
  return new Date(data).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit", 
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const parseDate = (d: string) => {
  return new Date(d);
};

const EstoqueDetalhe = () => {
  useScrollToTop();
  
  const { produtoId, armazemId } = useParams<{ produtoId: string; armazemId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, userRole } = useAuth();

  const canGerenciarTransferencias = userRole === "admin" || userRole === "logistica";

  // Registro de Transferência de Propriedade — produto e armazém já vêm fixos
  // desta página (o usuário chega aqui sabendo exatamente qual estoque quer
  // transferir, vindo da nota/pedido do ERP), sem seleção nenhuma no formulário.
  const {
    showAlert,
    markAsChanged,
    markAsSaved,
    reset: resetUnsavedChanges,
    handleClose,
    confirmClose,
    cancelClose
  } = useUnsavedChanges();

  const [transferenciaDialogOpen, setTransferenciaDialogOpen] = useState(false);
  const [isRegistrandoTransferencia, setIsRegistrandoTransferencia] = useState(false);
  const [transferenciaForm, setTransferenciaForm] = useState({
    quantidade: "",
    numeroPedido: "",
    dataTransferencia: new Date().toISOString().slice(0, 10),
  });
  const [transferenciaCliente, setTransferenciaCliente] = useState<TransferenciaClienteValue>({
    clienteId: null,
    cnpjTexto: null,
    razaoSocialTexto: null,
  });
  const [notaTransferenciaFile, setNotaTransferenciaFile] = useState<File | null>(null);
  const [xmlTransferenciaFile, setXmlTransferenciaFile] = useState<File | null>(null);

  const { data: clientesAtivos } = useQuery({
    queryKey: ["clientes-ativos-transferencia"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome, cnpj_cpf")
        .eq("ativo", true)
        .order("nome");
      if (error) {
        toast({ variant: "destructive", title: "Erro ao buscar clientes", description: error.message });
        return [];
      }
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: canGerenciarTransferencias && !!user?.id,
  });

  // Deep-link vindo do dashboard (card "Transferências de Propriedade"):
  // ?transferenciaId=X abre a seção de transferências já expandida e
  // destaca/rola até a transferência específica — numero_pedido não é único
  // (sem constraint na tabela), então não dá pra confiar só nele pra apontar
  // pra UMA transferência; o id é usado pra isso, o pedido só pré-popula a
  // busca (convenção, estreita a lista, mas não é a fonte da precisão).
  // Lido só uma vez (useState/useRef inicial) — os params somem da URL logo
  // a seguir (ver efeito abaixo).
  const transferenciaIdParaAbrir = useRef(searchParams.get("transferenciaId"));
  const transferenciaPedidoParaAbrir = useRef(searchParams.get("transferenciaPedido"));

  // Estados das duas seções colapsáveis (fechadas por padrão)
  const [remessasExpandida, setRemessasExpandida] = useState(false);
  const [transferenciasExpandida, setTransferenciasExpandida] = useState(
    !!(transferenciaIdParaAbrir.current || transferenciaPedidoParaAbrir.current)
  );

  // Estados para filtros — Histórico de Remessas
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [quantidadeMin, setQuantidadeMin] = useState("");
  const [quantidadeMax, setQuantidadeMax] = useState("");

  const clearFilters = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setQuantidadeMin("");
    setQuantidadeMax("");
  };

  // Estados para filtros — Transferências de Propriedade
  const [transfFiltersOpen, setTransfFiltersOpen] = useState(false);
  const [transfSearch, setTransfSearch] = useState(transferenciaPedidoParaAbrir.current ?? "");
  const [transfDateFrom, setTransfDateFrom] = useState("");
  const [transfDateTo, setTransfDateTo] = useState("");
  const [transfQuantidadeMin, setTransfQuantidadeMin] = useState("");
  const [transfQuantidadeMax, setTransfQuantidadeMax] = useState("");

  const clearTransfFilters = () => {
    setTransfSearch("");
    setTransfDateFrom("");
    setTransfDateTo("");
    setTransfQuantidadeMin("");
    setTransfQuantidadeMax("");
  };

  // Limpa os params de deep-link da URL logo no mount, pra não sobreviver a um
  // refresh nem interferir se o usuário decidir limpar os filtros depois.
  useEffect(() => {
    if (!transferenciaIdParaAbrir.current && !transferenciaPedidoParaAbrir.current) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("transferenciaId");
        next.delete("transferenciaPedido");
        return next;
      },
      { replace: true }
    );
  }, []);

  // Estado do dialog de estorno de transferência
  const [cancelandoTransferencia, setCancelandoTransferencia] = useState<TransferenciaItem | null>(null);
  const [cancelPreview, setCancelPreview] = useState<{ pode_cancelar: boolean; motivo_bloqueio: string | null } | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);

  const { data: currentArmazem } = useQuery({
    queryKey: ["current-armazem-detalhe", user?.id],
    queryFn: async () => {
      if (!user || userRole !== "armazem") return null;
      const { data, error } = await supabase
        .from("armazens")
        .select("id, nome, cidade, estado")
        .eq("user_id", user.id)
        .eq("ativo", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && userRole === "armazem",
  });

  console.log("🔍 [DEBUG] EstoqueDetalhe.jsx - Renderização iniciada");
  console.log("🔍 [DEBUG] EstoqueDetalhe.jsx - produtoId (URL):", produtoId);
  console.log("🔍 [DEBUG] EstoqueDetalhe.jsx - armazemId (URL):", armazemId);
  console.log("🔍 [DEBUG] EstoqueDetalhe.jsx - userRole:", userRole);
  console.log("🔍 [DEBUG] EstoqueDetalhe.jsx - user?.id:", user?.id);
  console.log("🔍 [DEBUG] EstoqueDetalhe.jsx - currentArmazem:", currentArmazem);

  const handleGoBack = () => {
    navigate("/estoque");
  };

  const { data: estoqueDetalhes, isLoading, error } = useQuery({
    queryKey: ["estoque-detalhe", produtoId, armazemId, user?.id],
    queryFn: async () => {
      console.log("🔍 [DEBUG] EstoqueDetalhe.jsx - queryFn executada");
      console.log("🔍 [DEBUG] EstoqueDetalhe.jsx - Parâmetros:", { 
        produtoId, 
        armazemId, 
        userId: user?.id, 
        userRole, 
        currentArmazem 
      });
      
      if (userRole === "armazem" && currentArmazem && currentArmazem.id !== armazemId) {
        console.log("❌ [ERROR] EstoqueDetalhe.jsx - Sem permissão para este armazém");
        throw new Error("Sem permissão para visualizar este armazém");
      }

      const { data: estoqueData, error: estoqueError } = await supabase
        .from("estoque")
        .select(`
          quantidade,
          quantidade_disponivel,
          produto:produtos(id, nome, unidade),
          armazem:armazens(id, nome, cidade, estado)
        `)
        .eq("produto_id", produtoId)
        .eq("armazem_id", armazemId)
        .maybeSingle();

      if (estoqueError) {
        console.error("❌ [ERROR] EstoqueDetalhe - Erro ao buscar estoque:", estoqueError);
        throw estoqueError;
      }

      if (!estoqueData) {
        throw new Error("Estoque não encontrado");
      }

      const { data: remessasData, error: remessasError } = await supabase
        .from("estoque_remessas")
        .select(`
          id,
          quantidade_original,
          numero_remessa,
          observacoes,
          url_nota_remessa,
          url_xml_remessa,
          created_at,
          created_by
        `)
        .eq("produto_id", produtoId)
        .eq("armazem_id", armazemId)
        .order("created_at", { ascending: false });

      if (remessasError) {
        console.error("❌ [ERROR] EstoqueDetalhe - Erro ao buscar remessas:", remessasError);
        throw remessasError;
      }

      const { data: transferenciasData, error: transferenciasError } = await supabase
        .from("estoque_transferencias")
        .select(`
          id,
          quantidade,
          numero_pedido,
          data_transferencia,
          url_nota,
          url_xml,
          status,
          created_at,
          cliente_id,
          cliente_cnpj_texto,
          cliente_razao_social_texto,
          cliente:clientes(nome, cnpj_cpf)
        `)
        .eq("produto_id", produtoId)
        .eq("armazem_id", armazemId)
        .order("created_at", { ascending: false });

      if (transferenciasError) {
        console.error("❌ [ERROR] EstoqueDetalhe - Erro ao buscar transferências:", transferenciasError);
        throw transferenciasError;
      }

      const resultado: EstoqueDetalhes = {
        produto: estoqueData.produto,
        armazem: estoqueData.armazem,
        quantidade_total: estoqueData.quantidade,
        quantidade_disponivel: estoqueData.quantidade_disponivel,  // ✅ ADICIONAR
        remessas: remessasData || [],
        transferencias: (transferenciasData || []) as unknown as TransferenciaItem[]
      };

      console.log("✅ [SUCCESS] EstoqueDetalhe - Dados carregados:", resultado);
      return resultado;
    },
    enabled: (() => {
      const enabled = !!produtoId && !!armazemId && !!user?.id && 
                     (userRole !== "armazem" || !!currentArmazem);
      console.log("🔍 [DEBUG] EstoqueDetalhe.jsx - Query enabled:", {
        produtoId: !!produtoId,
        armazemId: !!armazemId,
        userId: !!user?.id,
        userRole,
        currentArmazem: !!currentArmazem,
        enabled
      });
      return enabled;
    })(),
  });

  // Rola até a transferência apontada pelo deep-link assim que a seção
  // expandida renderiza o card correspondente (id só existe no DOM depois
  // que os dados carregam e a seção está expandida).
  useEffect(() => {
    if (!transferenciaIdParaAbrir.current || !transferenciasExpandida) return;
    const el = document.getElementById(`transferencia-${transferenciaIdParaAbrir.current}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [transferenciasExpandida, estoqueDetalhes]);

  useEffect(() => {
    console.log("🔍 [DEBUG] EstoqueDetalhe.jsx - useEffect permissão disparado");
    console.log("🔍 [DEBUG] EstoqueDetalhe.jsx - Condições verificação:", {
      isLoading,
      estoqueDetalhes: !!estoqueDetalhes,
      userId: !!user?.id,
      userRole,
      currentArmazem,
      armazemId
    });
    
    if (!isLoading && estoqueDetalhes && user?.id) {
      console.log("🔍 [DEBUG] EstoqueDetalhe.jsx - Entrando na verificação de permissão");
      
      if (userRole === "armazem" && !currentArmazem) {
        console.log("🔍 [DEBUG] EstoqueDetalhe.jsx - Aguardando currentArmazem ser carregado");
        return;
      }
      
      const hasPermission = 
        userRole === "admin" ||
        userRole === "logistica" ||
        (userRole === "armazem" && currentArmazem?.id === armazemId);
      
      console.log("🔍 [DEBUG] EstoqueDetalhe.jsx - Verificação de permissão:", {
        userRole,
        isAdmin: userRole === "admin",
        isLogistica: userRole === "logistica",
        isArmazem: userRole === "armazem",
        currentArmazemId: currentArmazem?.id,
        armazemIdFromUrl: armazemId,
        armazemMatch: currentArmazem?.id === armazemId,
        hasPermission
      });
      
      if (!hasPermission) {
        console.log("❌ [ERROR] EstoqueDetalhe - Sem permissão, redirecionando");
        navigate("/estoque");
      } else {
        console.log("✅ [SUCCESS] EstoqueDetalhe - Permissão concedida");
      }
    }
  }, [isLoading, estoqueDetalhes, user?.id, userRole, currentArmazem, armazemId, navigate]);

  const aplicarFiltros = (remessas: RemessaItem[]): RemessaItem[] => {
    return remessas.filter(remessa => {
      if (search.trim()) {
        const termo = search.trim().toLowerCase();
        const numeroRemessa = (remessa.numero_remessa || '').toLowerCase();
        const idRemessa = remessa.id.toLowerCase();
        if (!numeroRemessa.includes(termo) && !idRemessa.includes(termo)) {
          return false;
        }
      }

      if (dateFrom) {
        const dataRemessa = parseDate(remessa.created_at);
        const dataInicio = new Date(dateFrom);
        if (dataRemessa < dataInicio) return false;
      }

      if (dateTo) {
        const dataRemessa = parseDate(remessa.created_at);
        const dataFim = new Date(dateTo);
        dataFim.setHours(23, 59, 59, 999);
        if (dataRemessa > dataFim) return false;
      }

      if (quantidadeMin.trim()) {
        const qtdMin = parseFloat(quantidadeMin);
        if (!isNaN(qtdMin) && remessa.quantidade_original < qtdMin) return false;
      }

      if (quantidadeMax.trim()) {
        const qtdMax = parseFloat(quantidadeMax);
        if (!isNaN(qtdMax) && remessa.quantidade_original > qtdMax) return false;
      }

      return true;
    });
  };

  const remessasFiltradas = estoqueDetalhes ? aplicarFiltros(estoqueDetalhes.remessas) : [];
  const numeroRemessasFiltradas = remessasFiltradas.length;

  const activeFiltersCount =
    (search.trim() ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0) +
    (quantidadeMin.trim() || quantidadeMax.trim() ? 1 : 0);

  const hasActiveFilters = search.trim() || dateFrom || dateTo || quantidadeMin.trim() || quantidadeMax.trim();

  const nomeClienteTransferencia = (t: TransferenciaItem) =>
    t.cliente?.nome || t.cliente_razao_social_texto || "—";
  const documentoClienteTransferencia = (t: TransferenciaItem) =>
    t.cliente?.cnpj_cpf || t.cliente_cnpj_texto || "";

  const aplicarFiltrosTransferencias = (transferencias: TransferenciaItem[]): TransferenciaItem[] => {
    return transferencias.filter(transf => {
      if (transfSearch.trim()) {
        const termo = transfSearch.trim().toLowerCase();
        const cliente = nomeClienteTransferencia(transf).toLowerCase();
        const documento = documentoClienteTransferencia(transf).toLowerCase();
        const pedido = transf.numero_pedido.toLowerCase();
        if (!cliente.includes(termo) && !documento.includes(termo) && !pedido.includes(termo)) {
          return false;
        }
      }

      if (transfDateFrom) {
        const dataTransf = parseDate(transf.data_transferencia);
        const dataInicio = new Date(transfDateFrom);
        if (dataTransf < dataInicio) return false;
      }

      if (transfDateTo) {
        const dataTransf = parseDate(transf.data_transferencia);
        const dataFim = new Date(transfDateTo);
        dataFim.setHours(23, 59, 59, 999);
        if (dataTransf > dataFim) return false;
      }

      if (transfQuantidadeMin.trim()) {
        const qtdMin = parseFloat(transfQuantidadeMin);
        if (!isNaN(qtdMin) && transf.quantidade < qtdMin) return false;
      }

      if (transfQuantidadeMax.trim()) {
        const qtdMax = parseFloat(transfQuantidadeMax);
        if (!isNaN(qtdMax) && transf.quantidade > qtdMax) return false;
      }

      return true;
    });
  };

  const transferenciasFiltradas = estoqueDetalhes ? aplicarFiltrosTransferencias(estoqueDetalhes.transferencias) : [];
  const numeroTransferenciasFiltradas = transferenciasFiltradas.length;

  const activeTransfFiltersCount =
    (transfSearch.trim() ? 1 : 0) +
    (transfDateFrom || transfDateTo ? 1 : 0) +
    (transfQuantidadeMin.trim() || transfQuantidadeMax.trim() ? 1 : 0);

  const hasActiveTransfFilters = transfSearch.trim() || transfDateFrom || transfDateTo || transfQuantidadeMin.trim() || transfQuantidadeMax.trim();

  const abrirCancelamento = async (transf: TransferenciaItem) => {
    setCancelandoTransferencia(transf);
    setCancelPreview(null);
    const { data, error } = await supabase.rpc("calcular_cancelamento_transferencia", {
      p_transferencia_id: transf.id,
    });
    if (error || !(data as { success?: boolean })?.success) {
      toast({ variant: "destructive", title: "Erro ao verificar transferência", description: error?.message || (data as { error?: string })?.error });
      setCancelandoTransferencia(null);
      return;
    }
    setCancelPreview(data as { pode_cancelar: boolean; motivo_bloqueio: string | null });
  };

  const confirmarCancelamento = async () => {
    if (!cancelandoTransferencia) return;
    setIsCanceling(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase.rpc("cancelar_transferencia_propriedade", {
        p_transferencia_id: cancelandoTransferencia.id,
        p_user_id: userData.user?.id,
      });

      if (error || !(data as { success?: boolean })?.success) {
        toast({ variant: "destructive", title: "Erro ao estornar transferência", description: error?.message || (data as { error?: string })?.error });
        return;
      }

      toast({ title: "Transferência estornada com sucesso!", description: "A quantidade foi devolvida ao estoque." });
      setCancelandoTransferencia(null);
      setCancelPreview(null);
      queryClient.invalidateQueries({ queryKey: ["estoque-detalhe"] });
      queryClient.invalidateQueries({ queryKey: ["estoque"] });
    } finally {
      setIsCanceling(false);
    }
  };

  const quantidadeTransferenciaValida = useMemo(() => {
    const qtd = Number(transferenciaForm.quantidade);
    const disponivel = estoqueDetalhes?.quantidade_disponivel ?? 0;
    return !isNaN(qtd) && qtd > 0 && qtd <= disponivel;
  }, [transferenciaForm.quantidade, estoqueDetalhes?.quantidade_disponivel]);

  const resetFormTransferencia = () => {
    setTransferenciaForm({
      quantidade: "",
      numeroPedido: "",
      dataTransferencia: new Date().toISOString().slice(0, 10),
    });
    setTransferenciaCliente({ clienteId: null, cnpjTexto: null, razaoSocialTexto: null });
    setNotaTransferenciaFile(null);
    setXmlTransferenciaFile(null);
    resetUnsavedChanges();
  };

  const handleCloseTransferenciaModal = () => {
    handleClose(() => {
      setTransferenciaDialogOpen(false);
      resetFormTransferencia();
    });
  };

  const handleFileChangeTransferencia = (
    file: File | null,
    allowedTypes: string[],
    allowedExtensions: string[],
    setterFunction: (file: File | null) => void,
    inputElement: HTMLInputElement
  ) => {
    if (!file) {
      setterFunction(null);
      markAsChanged();
      return;
    }

    const fileExtension = file.name.toLowerCase().split('.').pop();
    const isValidExtension = allowedExtensions.includes(`.${fileExtension}`);
    const isValidMimeType = allowedTypes.includes(file.type);

    if (!isValidExtension || !isValidMimeType) {
      toast({
        variant: "destructive",
        title: "Tipo de arquivo inválido",
        description: `Selecione apenas arquivos ${allowedExtensions.join(' ou ')}.`
      });
      inputElement.value = '';
      setterFunction(null);
      return;
    }

    const maxSizeBytes = BUCKET_UPLOAD_LIMITS['estoque-documentos'].maxSizeBytes;
    if (file.size > maxSizeBytes) {
      toast({
        variant: "destructive",
        title: "Arquivo muito grande",
        description: `O arquivo "${file.name}" tem ${formatFileSize(file.size)} — o limite é ${formatFileSize(maxSizeBytes)}.`
      });
      inputElement.value = '';
      setterFunction(null);
      return;
    }

    setterFunction(file);
    markAsChanged();
  };

  const uploadDocumentosTransferencia = async () => {
    const uploads: { campo: string; url: string }[] = [];

    if (notaTransferenciaFile) {
      const fileName = `${produtoId}_${armazemId}_transferencia_nota_${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('estoque-documentos')
        .upload(fileName, notaTransferenciaFile);
      if (uploadError) {
        throw new Error(`Erro ao fazer upload da nota: ${uploadError.message}`);
      }
      const { data: urlData } = supabase.storage.from('estoque-documentos').getPublicUrl(fileName);
      uploads.push({ campo: 'url_nota', url: urlData.publicUrl });
    }

    if (xmlTransferenciaFile) {
      const fileName = `${produtoId}_${armazemId}_transferencia_xml_${Date.now()}.xml`;
      const { error: uploadError } = await supabase.storage
        .from('estoque-documentos')
        .upload(fileName, xmlTransferenciaFile);
      if (uploadError) {
        throw new Error(`Erro ao fazer upload do XML: ${uploadError.message}`);
      }
      const { data: urlData } = supabase.storage.from('estoque-documentos').getPublicUrl(fileName);
      uploads.push({ campo: 'url_xml', url: urlData.publicUrl });
    }

    return uploads;
  };

  const handleRegistrarTransferencia = async () => {
    const { quantidade, numeroPedido, dataTransferencia } = transferenciaForm;
    const qtdNum = Number(quantidade);
    const disponivel = estoqueDetalhes?.quantidade_disponivel ?? 0;

    if (!quantidade || !numeroPedido.trim() || !dataTransferencia) {
      toast({ variant: "destructive", title: "Preencha todos os campos obrigatórios" });
      return;
    }
    if (!transferenciaCliente.clienteId && !(transferenciaCliente.cnpjTexto && transferenciaCliente.razaoSocialTexto)) {
      toast({ variant: "destructive", title: "Informe o cliente", description: "Selecione um cliente cadastrado ou informe CNPJ/CPF e Razão Social válidos." });
      return;
    }
    if (Number.isNaN(qtdNum) || qtdNum <= 0) {
      toast({ variant: "destructive", title: "Valor inválido", description: "Digite uma quantidade numérica maior que zero." });
      return;
    }
    if (qtdNum > disponivel) {
      toast({ variant: "destructive", title: "Estoque insuficiente", description: `Quantidade solicitada (${qtdNum.toLocaleString('pt-BR')}t) excede o estoque disponível (${disponivel.toLocaleString('pt-BR')}t).` });
      return;
    }
    if (!notaTransferenciaFile || !xmlTransferenciaFile) {
      toast({ variant: "destructive", title: "Documentos obrigatórios", description: "Anexe a Nota (PDF) e o arquivo XML." });
      return;
    }

    setIsRegistrandoTransferencia(true);
    const arquivosUpload: string[] = [];

    try {
      const { data: userData } = await supabase.auth.getUser();

      const uploads = await uploadDocumentosTransferencia();
      const urlNota = uploads.find(u => u.campo === 'url_nota')?.url || null;
      const urlXml = uploads.find(u => u.campo === 'url_xml')?.url || null;
      if (urlNota) arquivosUpload.push(urlNota);
      if (urlXml) arquivosUpload.push(urlXml);

      const { data, error } = await supabase.rpc('registrar_transferencia_propriedade', {
        p_produto_id: produtoId,
        p_armazem_id: armazemId,
        p_quantidade: qtdNum,
        p_cliente_id: transferenciaCliente.clienteId,
        p_cliente_cnpj_texto: transferenciaCliente.cnpjTexto,
        p_cliente_razao_social_texto: transferenciaCliente.razaoSocialTexto,
        p_numero_pedido: numeroPedido.trim(),
        p_data_transferencia: dataTransferencia,
        p_url_nota: urlNota,
        p_url_xml: urlXml,
        p_user_id: userData.user?.id,
      });

      if (error || !(data as { success?: boolean })?.success) {
        const mensagem = error?.message || (data as { error?: string })?.error || "Erro desconhecido";
        for (const url of arquivosUpload) {
          const fileName = url.split('/').pop();
          if (fileName) await supabase.storage.from('estoque-documentos').remove([fileName]);
        }
        toast({ variant: "destructive", title: "Erro ao registrar transferência", description: mensagem });
        return;
      }

      markAsSaved();
      toast({
        title: "Transferência de Propriedade registrada!",
        description: `-${qtdNum.toLocaleString('pt-BR')}${estoqueDetalhes?.produto.unidade || ""} de ${estoqueDetalhes?.produto.nome || "produto"}. Documentos anexados.`,
      });
      resetFormTransferencia();
      setTransferenciaDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["estoque-detalhe"] });
      queryClient.invalidateQueries({ queryKey: ["estoque"] });
    } catch (err: unknown) {
      for (const url of arquivosUpload) {
        const fileName = url.split('/').pop();
        if (fileName) await supabase.storage.from('estoque-documentos').remove([fileName]);
      }
      toast({
        variant: "destructive",
        title: "Erro inesperado",
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsRegistrandoTransferencia(false);
    }
  };

  const renderRemessaCard = (remessa: RemessaItem) => (
    <Card key={remessa.id} className="transition-all hover:shadow-md">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header da remessa - Layout responsivo */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-lg bg-gradient-primary flex-shrink-0">
                <Package className="h-4 w-4 md:h-5 md:w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm md:text-base text-foreground leading-tight break-words">
                  {remessa.numero_remessa || `Remessa ${remessa.id.slice(-8)}`}
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Quantidade: <span className="font-semibold">{remessa.quantidade_original.toLocaleString('pt-BR')} {estoqueDetalhes?.produto.unidade}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Registrada em: {formatarDataHora(remessa.created_at)}
                </p>
              </div>
            </div>
            
            <Badge variant="secondary" className="text-xs self-start sm:self-auto">
              Remessa
            </Badge>
          </div>

          {/* Observações (se houver) */}
          {remessa.observacoes && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Observações:</p>
              <p className="text-xs md:text-sm bg-muted p-2 rounded-md break-words">{remessa.observacoes}</p>
            </div>
          )}

          {/* Documentos - Layout responsivo */}
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">Documentos:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <DocumentViewer
                url={remessa.url_nota_remessa}
                type="pdf"
                bucket="estoque-documentos"
                title="Nota de Remessa"
                description="PDF"
                variant="button"
                size="md"
                showPreview={true}
              />

              <DocumentViewer
                url={remessa.url_xml_remessa}
                type="xml"
                bucket="estoque-documentos"
                title="Arquivo XML"
                description="XML"
                variant="button"
                size="md"
                showPreview={true}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderTransferenciaCard = (transf: TransferenciaItem) => (
    <Card
      key={transf.id}
      id={`transferencia-${transf.id}`}
      className={`transition-all hover:shadow-md ${transf.status === "cancelada" ? "opacity-60" : ""} ${
        transferenciaIdParaAbrir.current === transf.id ? "ring-2 ring-primary" : ""
      }`}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-lg bg-gradient-primary flex-shrink-0">
                <ArrowRightLeft className="h-4 w-4 md:h-5 md:w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm md:text-base text-foreground leading-tight break-words">
                  Pedido {transf.numero_pedido}
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3 flex-shrink-0" />
                  {nomeClienteTransferencia(transf)}
                  {documentoClienteTransferencia(transf) && ` - ${formatarCpfCnpj(documentoClienteTransferencia(transf))}`}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Quantidade: <span className="font-semibold">{transf.quantidade.toLocaleString('pt-BR')} {estoqueDetalhes?.produto.unidade}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Data da transferência: {new Date(transf.data_transferencia + "T00:00:00").toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>

            <Badge variant={transf.status === "cancelada" ? "destructive" : "secondary"} className="text-xs self-start sm:self-auto">
              {transf.status === "cancelada" ? "Estornada" : "Ativa"}
            </Badge>
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">Documentos:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <DocumentViewer
                url={transf.url_nota}
                type="pdf"
                bucket="estoque-documentos"
                title="Nota Fiscal"
                description="PDF"
                variant="button"
                size="md"
                showPreview={true}
              />
              <DocumentViewer
                url={transf.url_xml}
                type="xml"
                bucket="estoque-documentos"
                title="Arquivo XML"
                description="XML"
                variant="button"
                size="md"
                showPreview={true}
              />
            </div>
          </div>

          {canGerenciarTransferencias && transf.status === "ativa" && (
            <div className="pt-2 border-t flex justify-end">
              <Button
                size="sm"
                className="btn-secondary min-h-[40px] gap-1"
                onClick={() => abrirCancelamento(transf)}
              >
                <Undo2 className="h-3.5 w-3.5" />
                Estornar
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-background p-4 md:p-6 space-y-4 md:space-y-6">
          <PageHeader
            title="Detalhes do Estoque"
            backButton={
              <Button
                size="sm"
                onClick={handleGoBack}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground mr-2 min-h-[44px] max-md:min-h-[44px] btn-secondary"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Voltar</span>
              </Button>
            }
          />
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="ml-3 text-muted-foreground">Carregando detalhes...</p>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  if (error || !estoqueDetalhes) {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-background p-4 md:p-6 space-y-4 md:space-y-6">
          <PageHeader 
            title="Detalhes do Estoque"
            backButton={
              <Button
                size="sm"
                onClick={handleGoBack}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground mr-2 min-h-[44px] max-md:min-h-[44px] btn-secondary"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Voltar</span>
              </Button>
            }
          />
          <Card className="border-destructive">
            <CardContent className="p-4 md:p-6">
              <div className="text-center text-destructive">
                <p className="font-semibold">Erro ao carregar detalhes do estoque</p>
                <p className="text-sm mt-2">
                  {error instanceof Error
                    ? error.message
                    : "Erro desconhecido ou sem permissão"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <UnsavedChangesAlert
        open={showAlert}
        onConfirm={confirmClose}
        onCancel={cancelClose}
      />
      <div className="min-h-screen bg-background p-4 md:p-6 space-y-4 md:space-y-6">
        <PageHeader
          title="Detalhes do Estoque"
          subtitle={`${estoqueDetalhes.produto.nome} - ${estoqueDetalhes.armazem.nome}`}
          backButton={
            <Button
              size="sm"
              onClick={handleGoBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mr-2 min-h-[44px] max-md:min-h-[44px] btn-secondary"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Button>
          }
          actions={
            canGerenciarTransferencias ? (
              <Dialog open={transferenciaDialogOpen} onOpenChange={(open) => {
                if (!open && isRegistrandoTransferencia) return;
                if (!open) {
                  handleCloseTransferenciaModal();
                } else {
                  setTransferenciaDialogOpen(open);
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="btn-primary min-h-[44px] max-md:min-h-[44px]">
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    Transferência de Propriedade
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-w-[calc(100vw-2rem)] md:max-w-2xl max-h-[calc(100vh-8rem)] md:max-h-[calc(100vh-4rem)] overflow-y-auto my-4 md:my-8">
                  <DialogHeader className="pt-2 pb-3 border-b border-border pr-8">
                    <DialogTitle className="text-lg md:text-xl pr-2 mt-1">Registrar Transferência de Propriedade</DialogTitle>
                  </DialogHeader>

                  <div className="py-4 px-1 space-y-6">
                    <div className="space-y-4">
                      <div className="rounded-md border bg-muted/30 p-3 grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Produto</p>
                          <p className="text-sm font-medium break-words">{estoqueDetalhes.produto.nome}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Armazém</p>
                          <p className="text-sm font-medium break-words">{estoqueDetalhes.armazem.nome} — {estoqueDetalhes.armazem.cidade}/{estoqueDetalhes.armazem.estado}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="transferencia-quantidade" className="text-sm font-medium">Quantidade *</Label>
                          <p className={`text-sm ${estoqueDetalhes.quantidade_disponivel > 0 ? "text-green-600" : "text-red-600"}`}>
                            Estoque disponível: {estoqueDetalhes.quantidade_disponivel.toLocaleString('pt-BR')}{estoqueDetalhes.produto.unidade}
                          </p>
                          <Input
                            id="transferencia-quantidade"
                            type="number"
                            step="0.01"
                            min="0"
                            max={estoqueDetalhes.quantidade_disponivel || undefined}
                            placeholder="Ex: 1000"
                            value={transferenciaForm.quantidade}
                            onChange={(e) => {
                              setTransferenciaForm((s) => ({ ...s, quantidade: e.target.value }));
                              markAsChanged();
                            }}
                            disabled={isRegistrandoTransferencia}
                            className={`min-h-[44px] max-md:min-h-[44px] text-base max-md:text-base ${
                              transferenciaForm.quantidade && !quantidadeTransferenciaValida
                                ? "border-red-500 focus:border-red-500"
                                : transferenciaForm.quantidade && quantidadeTransferenciaValida
                                ? "border-green-500 focus:border-green-500"
                                : ""
                            }`}
                          />
                          {transferenciaForm.quantidade && !quantidadeTransferenciaValida && (
                            <p className="text-xs text-red-600">
                              {Number(transferenciaForm.quantidade) > estoqueDetalhes.quantidade_disponivel
                                ? `Quantidade excede o estoque disponível (${estoqueDetalhes.quantidade_disponivel.toLocaleString('pt-BR')}${estoqueDetalhes.produto.unidade})`
                                : "Quantidade deve ser maior que zero"}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="transferencia-data" className="text-sm font-medium">Data da Transferência *</Label>
                          <Input
                            id="transferencia-data"
                            type="date"
                            value={transferenciaForm.dataTransferencia}
                            onChange={(e) => {
                              setTransferenciaForm((s) => ({ ...s, dataTransferencia: e.target.value }));
                              markAsChanged();
                            }}
                            disabled={isRegistrandoTransferencia}
                            className="min-h-[44px] max-md:min-h-[44px] text-base max-md:text-base"
                          />
                        </div>
                      </div>

                      <TransferenciaClienteField
                        clientesAtivos={clientesAtivos || []}
                        value={transferenciaCliente}
                        onChange={(v) => {
                          setTransferenciaCliente(v);
                          markAsChanged();
                        }}
                        disabled={isRegistrandoTransferencia}
                      />

                      <div className="space-y-2">
                        <Label htmlFor="transferencia-pedido" className="text-sm font-medium">Número do Pedido *</Label>
                        <Input
                          id="transferencia-pedido"
                          type="text"
                          placeholder="Ex: PED-001"
                          value={transferenciaForm.numeroPedido}
                          onChange={(e) => {
                            setTransferenciaForm((s) => ({ ...s, numeroPedido: e.target.value }));
                            markAsChanged();
                          }}
                          disabled={isRegistrandoTransferencia}
                          className="min-h-[44px] max-md:min-h-[44px] text-base max-md:text-base"
                        />
                      </div>

                      <div className="border-t pt-4 space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold text-base">Documentos Obrigatórios</h3>
                        </div>

                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor="transferencia-nota" className="flex items-center gap-2 text-sm font-medium">
                              <FileText className="h-4 w-4" />
                              Nota Fiscal (PDF) *
                            </Label>
                            <div className="flex flex-col gap-2">
                              <Input
                                id="transferencia-nota"
                                type="file"
                                accept=".pdf"
                                onChange={(e) => {
                                  const file = e.target.files?.[0] ?? null;
                                  handleFileChangeTransferencia(
                                    file,
                                    ['application/pdf'],
                                    ['.pdf'],
                                    setNotaTransferenciaFile,
                                    e.target
                                  );
                                }}
                                className="min-h-[44px] max-md:min-h-[44px]"
                                disabled={isRegistrandoTransferencia}
                              />
                              {notaTransferenciaFile && (
                                <Badge variant="secondary" className="text-xs break-all self-start">
                                  ✓ {notaTransferenciaFile.name}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="transferencia-xml" className="flex items-center gap-2 text-sm font-medium">
                              <FileText className="h-4 w-4" />
                              Arquivo XML *
                            </Label>
                            <div className="flex flex-col gap-2">
                              <Input
                                id="transferencia-xml"
                                type="file"
                                accept=".xml"
                                onChange={(e) => {
                                  const file = e.target.files?.[0] ?? null;
                                  handleFileChangeTransferencia(
                                    file,
                                    ['application/xml', 'text/xml'],
                                    ['.xml'],
                                    setXmlTransferenciaFile,
                                    e.target
                                  );
                                }}
                                className="min-h-[44px] max-md:min-h-[44px]"
                                disabled={isRegistrandoTransferencia}
                              />
                              {xmlTransferenciaFile && (
                                <Badge variant="secondary" className="text-xs break-all self-start">
                                  ✓ {xmlTransferenciaFile.name}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        * Campos obrigatórios
                      </p>
                    </div>

                    <ModalFooter
                      variant="double"
                      onClose={() => handleCloseTransferenciaModal()}
                      onConfirm={handleRegistrarTransferencia}
                      confirmText="Salvar"
                      isLoading={isRegistrandoTransferencia}
                      disabled={
                        !quantidadeTransferenciaValida ||
                        !transferenciaForm.numeroPedido.trim() ||
                        !notaTransferenciaFile ||
                        !xmlTransferenciaFile ||
                        isRegistrandoTransferencia
                      }
                    />
                  </div>
                </DialogContent>
              </Dialog>
            ) : null
          }
        />
        <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
          {/* Card de informações gerais - Otimizado para mobile */}
          <Card className="shadow-sm">
            <CardContent className="p-4 md:p-6">
              <h2 className="text-base md:text-lg font-semibold mb-4">Informações do Estoque</h2>
              
              {/* Layout otimizado responsivo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Produto */}
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs md:text-sm text-muted-foreground">Produto:</p>
                    <p className="font-semibold text-sm md:text-base break-words">{estoqueDetalhes.produto.nome}</p>
                  </div>
                </div>
  
                {/* Armazém */}
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs md:text-sm text-muted-foreground">Armazém:</p>
                    <p className="font-semibold text-sm md:text-base break-words">{estoqueDetalhes.armazem.nome}</p>
                  </div>
                </div>
  
                {/* Nº de Remessas */}
                <div className="flex items-center gap-3">
                  <Layers className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs md:text-sm text-muted-foreground">Nº de Remessas:</p>
                    <p className="font-semibold text-sm md:text-base">{numeroRemessasFiltradas}</p>
                  </div>
                </div>
  
                {/* Localização */}
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs md:text-sm text-muted-foreground">Localização:</p>
                    <p className="font-semibold text-sm md:text-base break-words">{estoqueDetalhes.armazem.cidade}/{estoqueDetalhes.armazem.estado}</p>
                  </div>
                </div>
              </div>
  
              {/* Totalizadores - Layout responsivo */}
              <div className="pt-4 border-t mt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Estoque Físico */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <div className="bg-blue-50 p-3 md:p-4 rounded-lg border border-blue-200 cursor-pointer">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-4 w-4 md:h-5 md:w-5 text-blue-600 flex-shrink-0" />
                          <span className="font-medium text-blue-800 text-sm md:text-base">Estoque Físico</span>
                        </div>
                        <p className="text-base md:text-xl font-bold text-blue-700 break-words">
                          {estoqueDetalhes.quantidade_total.toLocaleString('pt-BR')} {estoqueDetalhes.produto.unidade}
                        </p>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto max-w-xs p-2">
                      <p className="text-sm">
                        Quantidade real presente no armazém neste momento. Reduz apenas quando o produto sai fisicamente (carregamento finalizado).
                      </p>
                    </PopoverContent>
                  </Popover>

                  {/* Estoque Disponível */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <div className="bg-green-50 p-3 md:p-4 rounded-lg border border-green-200 cursor-pointer">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-4 w-4 md:h-5 md:w-5 text-green-600 flex-shrink-0" />
                          <span className="font-medium text-green-800 text-sm md:text-base">Estoque Disponível</span>
                        </div>
                        <p className="text-base md:text-xl font-bold text-green-700 break-words">
                          {estoqueDetalhes.quantidade_disponivel.toLocaleString('pt-BR')} {estoqueDetalhes.produto.unidade}
                        </p>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto max-w-xs p-2">
                      <p className="text-sm">
                        Quantidade livre para novas liberações. Desconta valores já liberados, mesmo que ainda não retirados do armazém.
                      </p>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>
  
          {/* Seção colapsável: Histórico de Remessas */}
          <div className="space-y-3">
            <Button
              onClick={() => setRemessasExpandida(!remessasExpandida)}
              className="w-full justify-between bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 min-h-[44px] max-md:min-h-[44px] dark:bg-blue-950/20 dark:hover:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400"
            >
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                <span className="text-sm font-medium">
                  Histórico de Remessas ({estoqueDetalhes.remessas.length})
                </span>
              </div>
              {remessasExpandida ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>

            {remessasExpandida && (
              <div className="space-y-4">
                {/* Barra de filtros - Mobile otimizada */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <Input
                      className="h-9 flex-1 min-h-[44px] max-md:min-h-[44px] text-base max-md:text-base"
                      placeholder="Buscar por número da remessa..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <Button
                      size="sm"
                      onClick={() => setFiltersOpen(!filtersOpen)}
                      className="whitespace-nowrap min-h-[44px] max-md:min-h-[44px] btn-secondary"
                    >
                      <FilterIcon className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Filtros</span>
                      {activeFiltersCount ? ` (${activeFiltersCount})` : ""}
                      {filtersOpen ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                    </Button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      Mostrando <span className="font-medium">{numeroRemessasFiltradas}</span> de <span className="font-medium">{estoqueDetalhes.remessas.length}</span>
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

                {/* Filtros avançados - Mobile otimizado */}
                {filtersOpen && (
                  <div className="rounded-md border p-3 space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">Período</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="min-h-[44px] max-md:min-h-[44px]"
                            placeholder="De"
                          />
                          <Input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="min-h-[44px] max-md:min-h-[44px]"
                            placeholder="Até"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-semibold mb-2 block">
                          Quantidade ({estoqueDetalhes.produto.unidade})
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={quantidadeMin}
                            onChange={(e) => setQuantidadeMin(e.target.value)}
                            className="min-h-[44px] max-md:min-h-[44px] text-base max-md:text-base"
                            placeholder="Mín"
                          />
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={quantidadeMax}
                            onChange={(e) => setQuantidadeMax(e.target.value)}
                            className="min-h-[44px] max-md:min-h-[44px] text-base max-md:text-base"
                            placeholder="Máx"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {remessasFiltradas.length > 0 ? (
                    remessasFiltradas.map(renderRemessaCard)
                  ) : hasActiveFilters ? (
                    <Card className="border-dashed">
                      <CardContent className="p-6 md:p-8 text-center">
                        <FilterIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold text-muted-foreground mb-2">
                          Nenhuma remessa encontrada
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Nenhuma remessa corresponde aos filtros aplicados.
                        </p>
                        <Button
                          size="sm"
                          onClick={clearFilters}
                          className="min-h-[44px] max-md:min-h-[44px] btn-secondary"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Limpar Filtros
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="p-6 md:p-8 text-center">
                        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold text-muted-foreground mb-2">
                          Nenhuma remessa encontrada
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Não há remessas registradas para este produto neste armazém.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Seção colapsável: Transferências de Propriedade */}
          <div className="space-y-3">
            <Button
              onClick={() => setTransferenciasExpandida(!transferenciasExpandida)}
              className="w-full justify-between bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 min-h-[44px] max-md:min-h-[44px] dark:bg-violet-950/20 dark:hover:bg-violet-950/30 dark:border-violet-800 dark:text-violet-400"
            >
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                <span className="text-sm font-medium">
                  Transferências de Propriedade ({estoqueDetalhes.transferencias.length})
                </span>
              </div>
              {transferenciasExpandida ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>

            {transferenciasExpandida && (
              <div className="space-y-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <Input
                      className="h-9 flex-1 min-h-[44px] max-md:min-h-[44px] text-base max-md:text-base"
                      placeholder="Buscar por cliente ou nº do pedido..."
                      value={transfSearch}
                      onChange={(e) => setTransfSearch(e.target.value)}
                    />
                    <Button
                      size="sm"
                      onClick={() => setTransfFiltersOpen(!transfFiltersOpen)}
                      className="whitespace-nowrap min-h-[44px] max-md:min-h-[44px] btn-secondary"
                    >
                      <FilterIcon className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Filtros</span>
                      {activeTransfFiltersCount ? ` (${activeTransfFiltersCount})` : ""}
                      {transfFiltersOpen ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                    </Button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      Mostrando <span className="font-medium">{numeroTransferenciasFiltradas}</span> de <span className="font-medium">{estoqueDetalhes.transferencias.length}</span>
                    </span>
                    {hasActiveTransfFilters && (
                      <Button
                        size="sm"
                        onClick={clearTransfFilters}
                        className="gap-1 min-h-[44px] max-md:min-h-[44px] btn-secondary"
                      >
                        <X className="h-4 w-4" />
                        Limpar Filtros
                      </Button>
                    )}
                  </div>
                </div>

                {transfFiltersOpen && (
                  <div className="rounded-md border p-3 space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">Período (data da transferência)</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Input
                            type="date"
                            value={transfDateFrom}
                            onChange={(e) => setTransfDateFrom(e.target.value)}
                            className="min-h-[44px] max-md:min-h-[44px]"
                            placeholder="De"
                          />
                          <Input
                            type="date"
                            value={transfDateTo}
                            onChange={(e) => setTransfDateTo(e.target.value)}
                            className="min-h-[44px] max-md:min-h-[44px]"
                            placeholder="Até"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-semibold mb-2 block">
                          Quantidade ({estoqueDetalhes.produto.unidade})
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={transfQuantidadeMin}
                            onChange={(e) => setTransfQuantidadeMin(e.target.value)}
                            className="min-h-[44px] max-md:min-h-[44px] text-base max-md:text-base"
                            placeholder="Mín"
                          />
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={transfQuantidadeMax}
                            onChange={(e) => setTransfQuantidadeMax(e.target.value)}
                            className="min-h-[44px] max-md:min-h-[44px] text-base max-md:text-base"
                            placeholder="Máx"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {transferenciasFiltradas.length > 0 ? (
                    transferenciasFiltradas.map(renderTransferenciaCard)
                  ) : hasActiveTransfFilters ? (
                    <Card className="border-dashed">
                      <CardContent className="p-6 md:p-8 text-center">
                        <FilterIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold text-muted-foreground mb-2">
                          Nenhuma transferência encontrada
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Nenhuma transferência corresponde aos filtros aplicados.
                        </p>
                        <Button
                          size="sm"
                          onClick={clearTransfFilters}
                          className="min-h-[44px] max-md:min-h-[44px] btn-secondary"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Limpar Filtros
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="p-6 md:p-8 text-center">
                        <ArrowRightLeft className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold text-muted-foreground mb-2">
                          Nenhuma transferência encontrada
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Não há transferências de propriedade registradas para este produto neste armazém.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialog de confirmação de estorno */}
      <Dialog open={!!cancelandoTransferencia} onOpenChange={(open) => !open && !isCanceling && setCancelandoTransferencia(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Estornar Transferência de Propriedade</DialogTitle>
          </DialogHeader>
          {cancelPreview ? (
            cancelPreview.pode_cancelar ? (
              <div className="space-y-3 text-sm">
                <p>
                  Isso vai devolver <span className="font-semibold">{cancelandoTransferencia?.quantidade.toLocaleString('pt-BR')} {estoqueDetalhes?.produto.unidade}</span> ao estoque físico e disponível deste produto/armazém.
                </p>
                <p className="text-muted-foreground">Esta ação não pode ser desfeita.</p>
              </div>
            ) : (
              <p className="text-sm text-destructive">{cancelPreview.motivo_bloqueio}</p>
            )
          ) : (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              className="btn-secondary min-h-[44px] w-full sm:w-auto"
              onClick={() => setCancelandoTransferencia(null)}
              disabled={isCanceling}
            >
              Cancelar
            </Button>
            {cancelPreview?.pode_cancelar && (
              <Button
                className="btn-primary min-h-[44px] w-full sm:w-auto"
                onClick={confirmarCancelamento}
                disabled={isCanceling}
              >
                {isCanceling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Undo2 className="h-4 w-4 mr-2" />}
                Confirmar Estorno
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};

export default EstoqueDetalhe;
