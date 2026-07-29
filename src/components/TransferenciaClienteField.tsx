import { useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import { normalizeDocumento, validarCpfOuCnpj, formatarCpfCnpj } from "@/lib/documentValidation";

export interface ClienteAtivo {
  id: string;
  nome: string;
  cnpj_cpf: string;
}

export interface TransferenciaClienteValue {
  clienteId: string | null;
  cnpjTexto: string | null;
  razaoSocialTexto: string | null;
}

interface Props {
  clientesAtivos: ClienteAtivo[];
  value: TransferenciaClienteValue;
  onChange: (value: TransferenciaClienteValue) => void;
  disabled?: boolean;
}

export function TransferenciaClienteField({ clientesAtivos, value, onChange, disabled }: Props) {
  const [modo, setModo] = useState<"cadastrado" | "livre">(value.clienteId ? "cadastrado" : "cadastrado");
  const [cnpjInput, setCnpjInput] = useState(value.cnpjTexto || "");
  const [razaoSocialInput, setRazaoSocialInput] = useState(value.razaoSocialTexto || "");
  const [cnpjErro, setCnpjErro] = useState<string | null>(null);
  const [clienteDuplicado, setClienteDuplicado] = useState<ClienteAtivo | null>(null);
  const [verificandoDuplicidade, setVerificandoDuplicidade] = useState(false);

  const trocarParaModo = (novoModo: "cadastrado" | "livre") => {
    setModo(novoModo);
    setCnpjErro(null);
    if (novoModo === "cadastrado") {
      onChange({ clienteId: value.clienteId, cnpjTexto: null, razaoSocialTexto: null });
    } else {
      onChange({ clienteId: null, cnpjTexto: normalizeDocumento(cnpjInput) || null, razaoSocialTexto: razaoSocialInput.trim() || null });
    }
  };

  const verificarDuplicidade = async (documentoNormalizado: string) => {
    setVerificandoDuplicidade(true);
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome, cnpj_cpf")
        .eq("cnpj_cpf", documentoNormalizado)
        .eq("ativo", true)
        .maybeSingle();

      if (!error && data) {
        setClienteDuplicado(data);
      }
    } finally {
      setVerificandoDuplicidade(false);
    }
  };

  const handleCnpjBlur = () => {
    const documento = normalizeDocumento(cnpjInput);
    if (!documento) {
      setCnpjErro(null);
      return;
    }
    if (!validarCpfOuCnpj(documento)) {
      setCnpjErro("CNPJ/CPF inválido — confira os números digitados.");
      onChange({ clienteId: null, cnpjTexto: null, razaoSocialTexto: razaoSocialInput.trim() || null });
      return;
    }
    setCnpjErro(null);
    onChange({ clienteId: null, cnpjTexto: documento, razaoSocialTexto: razaoSocialInput.trim() || null });
    verificarDuplicidade(documento);
  };

  const usarCadastroExistente = () => {
    if (!clienteDuplicado) return;
    setModo("cadastrado");
    setCnpjInput("");
    setRazaoSocialInput("");
    setCnpjErro(null);
    onChange({ clienteId: clienteDuplicado.id, cnpjTexto: null, razaoSocialTexto: null });
    setClienteDuplicado(null);
  };

  const manterDadosDigitados = () => {
    setClienteDuplicado(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium flex-1">Cliente *</Label>
        <div className="flex rounded-md border overflow-hidden text-xs">
          <button
            type="button"
            disabled={disabled}
            onClick={() => trocarParaModo("cadastrado")}
            className={`px-3 py-1.5 min-h-[32px] ${modo === "cadastrado" ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}
          >
            Cliente cadastrado
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => trocarParaModo("livre")}
            className={`px-3 py-1.5 min-h-[32px] ${modo === "livre" ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}
          >
            CNPJ/CPF livre
          </button>
        </div>
      </div>

      {modo === "cadastrado" ? (
        <Select
          value={value.clienteId || ""}
          onValueChange={(id) => onChange({ clienteId: id, cnpjTexto: null, razaoSocialTexto: null })}
          disabled={disabled}
        >
          <SelectTrigger className="min-h-[44px] max-md:min-h-[44px]">
            <SelectValue placeholder="Selecione o cliente" />
          </SelectTrigger>
          <SelectContent className="max-h-[200px]">
            {clientesAtivos.map((cliente) => (
              <SelectItem key={cliente.id} value={cliente.id}>
                <span className="break-words">{cliente.nome} - {formatarCpfCnpj(cliente.cnpj_cpf)}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Input
              placeholder="CNPJ ou CPF"
              value={cnpjInput}
              onChange={(e) => setCnpjInput(e.target.value)}
              onBlur={handleCnpjBlur}
              disabled={disabled || verificandoDuplicidade}
              className="min-h-[44px] max-md:min-h-[44px] text-base max-md:text-base"
            />
            {cnpjErro && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                {cnpjErro}
              </p>
            )}
          </div>
          <Input
            placeholder="Razão Social"
            value={razaoSocialInput}
            onChange={(e) => {
              setRazaoSocialInput(e.target.value);
              onChange({ clienteId: null, cnpjTexto: value.cnpjTexto, razaoSocialTexto: e.target.value.trim() || null });
            }}
            disabled={disabled}
            className="min-h-[44px] max-md:min-h-[44px] text-base max-md:text-base"
          />
        </div>
      )}

      {clienteDuplicado && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 pointer-events-auto"
          onClick={manterDadosDigitados}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold leading-none tracking-tight">
              Já existe um cliente cadastrado com este documento
            </h2>
            <div className="space-y-3 text-sm">
              <div className="rounded-md border p-3 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Cadastrado no sistema:</p>
                <p className="font-medium">{clienteDuplicado.nome}</p>
                <p className="text-muted-foreground">{formatarCpfCnpj(clienteDuplicado.cnpj_cpf)}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground mb-1">Digitado agora:</p>
                <p className="font-medium">{razaoSocialInput || "—"}</p>
                <p className="text-muted-foreground">{formatarCpfCnpj(cnpjInput)}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
              <Button className="btn-secondary min-h-[44px] w-full sm:w-auto" onClick={manterDadosDigitados}>
                Manter dados digitados
              </Button>
              <Button className="btn-primary min-h-[44px] w-full sm:w-auto" onClick={usarCadastroExistente}>
                Usar cadastro existente
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
