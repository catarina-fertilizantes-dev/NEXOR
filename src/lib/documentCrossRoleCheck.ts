import { supabase } from "@/integrations/supabase/client";

// Checagem cross-papel de CPF/CNPJ: informa quando um documento já está
// cadastrado em OUTRO tipo de cadastro (ex.: digitando um CNPJ de Armazém
// que já é Cliente). Não bloqueia — só avisa, o mesmo padrão de
// detectar+confirmar já usado na Transferência de Propriedade
// (TransferenciaClienteField), porque não existe um "reaproveitar cadastro"
// aqui: são entidades diferentes por natureza.

export type TabelaComDocumento = "clientes" | "representantes" | "armazens";

export interface DocumentoEncontrado {
  tabela: TabelaComDocumento;
  label: string;
  nome: string;
}

async function buscarEmClientes(documento: string): Promise<DocumentoEncontrado | null> {
  const { data } = await supabase
    .from("clientes")
    .select("nome, cnpj_cpf")
    .eq("cnpj_cpf", documento)
    .eq("ativo", true)
    .maybeSingle();
  return data ? { tabela: "clientes", label: "Cliente", nome: data.nome } : null;
}

async function buscarEmRepresentantes(documento: string): Promise<DocumentoEncontrado | null> {
  const { data } = await supabase
    .from("representantes")
    .select("nome, cpf")
    .eq("cpf", documento)
    .eq("ativo", true)
    .maybeSingle();
  return data ? { tabela: "representantes", label: "Representante", nome: data.nome } : null;
}

async function buscarEmArmazens(documento: string): Promise<DocumentoEncontrado | null> {
  const { data } = await supabase
    .from("armazens")
    .select("nome, cnpj_cpf")
    .eq("cnpj_cpf", documento)
    .eq("ativo", true)
    .maybeSingle();
  return data ? { tabela: "armazens", label: "Armazém", nome: data.nome } : null;
}

export async function buscarDocumentoEmOutrosCadastros(
  documentoNormalizado: string,
  tabelaAtual: TabelaComDocumento
): Promise<DocumentoEncontrado[]> {
  const buscas: Promise<DocumentoEncontrado | null>[] = [];
  if (tabelaAtual !== "clientes") buscas.push(buscarEmClientes(documentoNormalizado));
  if (tabelaAtual !== "representantes") buscas.push(buscarEmRepresentantes(documentoNormalizado));
  if (tabelaAtual !== "armazens") buscas.push(buscarEmArmazens(documentoNormalizado));

  const resultados = await Promise.all(buscas);
  return resultados.filter((r): r is DocumentoEncontrado => r !== null);
}
