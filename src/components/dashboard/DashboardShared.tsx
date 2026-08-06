import { useState } from "react";
import { Link } from "react-router-dom";
import { Info, LucideIcon, Users, Warehouse } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// ---------- Helpers de data ----------

export const startOfDayISO = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString();
};
export const endOfDayISO = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy.toISOString();
};
export const addDays = (d: Date, n: number) => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
};

export const formatarDataHora = (iso: string) => {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm} ${hh}:${min}`;
};

// Formata uma data DATE-only ("YYYY-MM-DD", sem horário) lendo os componentes
// diretamente da string — evita o bug de `new Date("YYYY-MM-DD")` ser
// interpretado como UTC-meia-noite e exibir a data/hora errada em fusos
// horários negativos (ex: UTC-3 mostraria 21h do dia anterior).
export const formatarData = (isoDate: string) => {
  const [, mes, dia] = isoDate.slice(0, 10).split("-");
  return `${dia}/${mes}`;
};

// Formata minutos como "Xh Ymin" (ou só "Ymin" se < 1h). null = sem amostras.
export const formatarDuracaoMinutos = (minutos: number | null) => {
  if (minutos == null) return "Sem dados";
  const horas = Math.floor(minutos / 60);
  const min = Math.round(minutos % 60);
  if (horas === 0) return `${min}min`;
  return `${horas}h ${min}min`;
};

export const media = (valores: number[]) => (valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null);

// Janelas de "atraso" pra carregamentos em andamento — usado em
// "Carregamentos Atrasados" (DashboardLogistica) e "Operações Atrasadas"
// (DashboardArmazem). Só 3 janelas, cada uma ancorada numa ação única e
// deliberada (ver [[project_nexor_etapa_atual_semantics]] memória):
//
//   Espera        chegada → início do carregamento     (etapa_atual = 2)
//   Carregamento  início → carregamento finalizado      (etapa_atual = 3 ou 4)
//   Documentação  carregamento finalizado → documentação (etapa_atual = 5)
//
// etapa_atual 3 e 4 caem na MESMA janela "Carregamento", ambas ancoradas em
// data_inicio — nunca usar data_carregando como âncora de prazo: é o
// timestamp de uma foto tirada em algum momento arbitrário durante o
// carregamento físico (transição 3→4), sem corresponder a um marco real de
// início ou fim de nada; usá-la fazia o "atraso" da etapa 4 depender de
// quando a foto foi tirada, não de quanto tempo o carregamento realmente
// levou. `etapaConfig` é a chave em `config_tempo_etapas` (2, 3 ou 5 — a
// etapa 4 não tem linha própria, reaproveita o limite da 3).
// Etapa 1 (aguardando chegada) não entra aqui: é um estado de espera
// controlado pela data agendada, não um cronômetro desde a criação do
// registro.
export interface JanelaAtraso {
  label: string;
  etapaConfig: number;
  entradaField: "data_chegada" | "data_inicio" | "data_finalizacao";
}

export const JANELA_POR_ETAPA: Record<number, JanelaAtraso> = {
  2: { label: "Espera", etapaConfig: 2, entradaField: "data_chegada" },
  3: { label: "Carregamento", etapaConfig: 3, entradaField: "data_inicio" },
  4: { label: "Carregamento", etapaConfig: 3, entradaField: "data_inicio" },
  5: { label: "Documentação", etapaConfig: 5, entradaField: "data_finalizacao" },
};

export const NOMES_VISIVEIS = 6;

// ---------- Título com tooltip ----------

export function TitleWithInfo({ title, tooltip, className }: { title: string; tooltip: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`flex items-center gap-1.5 ${className ?? ""}`}>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Info
            className="h-3.5 w-3.5 text-muted-foreground/70 cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen((o) => !o);
            }}
          />
        </PopoverTrigger>
        <PopoverContent className="w-auto max-w-[220px] p-2">
          <p className="text-sm">{tooltip}</p>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ---------- Card com contagem + lista de nomes ----------

export function EntityListCard({
  title,
  tooltip,
  icon: Icon,
  names,
  isLoading,
  emptyLabel,
  to,
  hrefFor,
}: {
  title: string;
  tooltip: string;
  icon: LucideIcon;
  names: string[] | undefined;
  isLoading: boolean;
  emptyLabel: string;
  to?: string;
  /** Opcional: se passado, cada badge vira um link individual (ex: pro carregamento daquele armazém/cliente) em vez de badge estático. */
  hrefFor?: (nome: string) => string | undefined;
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
            <p className="mt-2 text-3xl font-bold text-foreground">{isLoading ? "…" : lista.length}</p>
          </div>
          <div className="rounded-xl p-3 bg-muted-foreground">
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>

        {!isLoading && lista.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {visiveis.map((nome) => {
              const href = hrefFor?.(nome);
              const badge = (
                <Badge variant="secondary" className={`font-normal ${href ? "hover:bg-secondary/70" : ""}`}>
                  {nome}
                </Badge>
              );
              return href ? (
                <Link key={nome} to={href} onClick={(e) => e.stopPropagation()}>
                  {badge}
                </Link>
              ) : (
                <span key={nome}>{badge}</span>
              );
            })}
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

        {!isLoading && lista.length === 0 && <p className="mt-4 text-xs text-muted-foreground">{emptyLabel}</p>}
      </CardContent>
    </Card>
  );
}

// ---------- Documentação Pendente ----------

export type Responsavel = "armazem" | "logistica";

export const RESPONSAVEL_STYLE: Record<Responsavel, { className: string; icon: LucideIcon; label: string }> = {
  armazem: { className: "bg-amber-100 text-amber-800 hover:bg-amber-100", icon: Warehouse, label: "Armazém" },
  logistica: { className: "bg-indigo-100 text-indigo-800 hover:bg-indigo-100", icon: Users, label: "Logística" },
};

export const SUB_ETAPAS_DOCUMENTACAO: Array<{
  campo: "etapa_5a_status" | "etapa_5b_status" | "etapa_5c_status";
  label: string;
  responsavel: Responsavel;
}> = [
  { campo: "etapa_5a_status", label: "Docs. Retorno", responsavel: "armazem" },
  { campo: "etapa_5b_status", label: "Docs. Venda", responsavel: "logistica" },
  { campo: "etapa_5c_status", label: "Docs. Remessa", responsavel: "armazem" },
];

export interface DocumentacaoPendenteItem {
  id: string;
  cliente: string;
  armazem: string;
  pedido: string;
  pendencias: Array<{ label: string; responsavel: Responsavel }>;
}

// Carregamentos parados na etapa 5 com pelo menos um documento faltando,
// destacando visualmente de quem é a responsabilidade (armazém ou logística).
// Quando responsavelFilter é passado, só mostra/considera as pendências desse(s)
// responsável(is) — usado no dashboard de armazém para não poluir com pendências
// que não são acionáveis por quem está olhando (ex: Docs. Venda é da logística).
export function DocumentacaoPendenteCard({
  itens,
  isLoading,
  responsavelFilter,
}: {
  itens: DocumentacaoPendenteItem[] | undefined;
  isLoading: boolean;
  responsavelFilter?: Responsavel[];
}) {
  const listaCompleta = itens ?? [];
  const lista = responsavelFilter
    ? listaCompleta
        .map((item) => ({
          ...item,
          pendencias: item.pendencias.filter((p) => responsavelFilter.includes(p.responsavel)),
        }))
        .filter((item) => item.pendencias.length > 0)
    : listaCompleta;
  const legendaRoles = responsavelFilter ?? (Object.keys(RESPONSAVEL_STYLE) as Responsavel[]);

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <TitleWithInfo
            title="Documentação Pendente"
            tooltip="Carregamentos na etapa de Documentação com pelo menos um dos documentos ainda não anexado."
          />
          <span className="text-2xl font-bold text-foreground">{isLoading ? "…" : lista.length}</span>
        </div>
        {legendaRoles.length > 1 && (
          <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
            {legendaRoles.map((role) => {
              const style = RESPONSAVEL_STYLE[role];
              const RIcon = style.icon;
              return (
                <span key={role} className="flex items-center gap-1">
                  <RIcon className={`h-3 w-3 ${role === "armazem" ? "text-amber-600" : "text-indigo-600"}`} />{" "}
                  {style.label}
                </span>
              );
            })}
          </div>
        )}
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
              className="flex flex-col gap-1.5 rounded border p-2.5 hover:bg-muted/50 transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm min-w-0">
                <span className="min-w-0">
                  <span className="font-medium">{item.cliente}</span>
                  <span className="text-muted-foreground"> • {item.armazem}</span>
                </span>
                <span className="text-xs text-muted-foreground shrink-0">Pedido {item.pedido}</span>
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

// ---------- Funil de Carregamentos por Etapa ----------

// Rótulos por etapa_atual (1-6). Ver [[project_nexor_etapa_atual_semantics]]
// (memória) pro raciocínio completo: um rótulo de UMA palavra reaproveitado
// do nome "corrente" da etapa (ex.: "Chegada" pra etapa_atual=1, quando o
// caminhão na verdade ainda NÃO chegou) é ambíguo fora do contexto visual do
// stepper — por isso aqui usamos frase completa (Funil, tem espaço) e rótulo
// curto + dica clicável com a frase completa (tabelas/badges compactos).
// Index 0-5 = etapa_atual 1-6, sempre nessa ordem.
export const ETAPA_LABELS_COMPLETO = [
  "Aguardando chegada do caminhão",
  "Caminhão chegou ao pátio",
  "Início do carregamento confirmado",
  "Carregamento do caminhão em andamento",
  "Carregamento do caminhão finalizado",
  "Documentação concluída — processo finalizado",
];

export const ETAPA_LABELS_CURTO = [
  "Aguard. Chegada",
  "No Pátio",
  "Início Confirmado",
  "Em Carregamento",
  "Carreg. Finalizado",
  "Processo Finalizado",
];

export interface EstiloEtapa {
  icon: LucideIcon;
  corIcone: string;
  corBarra: string;
}

// Quantos carregamentos ativos (etapa < 6) estão em cada etapa agora —
// mostra visualmente onde a operação está represada. `toneladas` é opcional
// (soma da quantidade dos agendamentos ligados) e soma assumindo que todo
// produto está em toneladas — hoje é o caso real; se produtos em kg entrarem
// em uso, essa soma bruta passa a precisar de conversão. `estilos` é uma
// lista paralela a `data` (mesma ordem/tamanho), pra manter o mesmo
// ícone/cor usado nos outros cards de etapa (ex: Armazéns por Etapa).
export function FunilEtapasCard({
  data,
  isLoading,
  estilos,
}: {
  data: Array<{ etapa: string; quantidade: number; toneladas?: number }> | undefined;
  isLoading: boolean;
  estilos?: EstiloEtapa[];
}) {
  const chartData = data ?? [];
  const semDados = chartData.every((d) => d.quantidade === 0);
  const maxQuantidade = Math.max(1, ...chartData.map((d) => d.quantidade));

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <TitleWithInfo
          title="Funil de Carregamentos (ton/carga)"
          tooltip="Quantidade de cargas em cada etapa e o volume em toneladas — etapas ativas mostram o estado atual; 'Processo Finalizado' mostra só os de hoje."
        />
      </CardHeader>
      <CardContent>
        {!isLoading && semDados ? (
          <p className="text-xs text-muted-foreground">Nenhum carregamento em andamento no momento.</p>
        ) : (
          <div className="space-y-3">
            {chartData.map((d, i) => {
              const estilo = estilos?.[i];
              const Icon = estilo?.icon;
              const pct = Math.round((d.quantidade / maxQuantidade) * 100);
              return (
                <div key={d.etapa} className="space-y-1">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      {Icon && <Icon className={`h-3.5 w-3.5 shrink-0 ${estilo?.corIcone ?? ""}`} />}
                      {d.etapa}
                    </span>
                    <span className="font-medium text-foreground shrink-0">
                      {d.quantidade} carga{d.quantidade === 1 ? "" : "s"}
                      {d.toneladas != null
                        ? ` • ${d.toneladas.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} t`
                        : ""}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${estilo?.corBarra ?? "bg-primary"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- Próximos Agendamentos ----------

export interface ProximoAgendamentoItem {
  id: string;
  cliente: string;
  armazem: string;
  produto: string;
  dataRetirada: string;
  pedidoInterno: string;
  quantidade: number;
  unidade: string;
}

// Próximas retiradas agendadas, para não precisar sair do dashboard para ver o que vem a seguir.
export function ProximosAgendamentosCard({
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
              to={`/agendamentos?agendamentoId=${item.id}`}
              className="flex items-center justify-between gap-3 rounded border p-2.5 hover:bg-muted/50 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.cliente}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.produto} • {item.armazem}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  Pedido {item.pedidoInterno} •{" "}
                  {item.quantidade.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} {item.unidade}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0 font-normal">
                {formatarData(item.dataRetirada)}
              </Badge>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Estoque Baixo ----------

export interface EstoqueBaixoItem {
  id: string;
  produtoId: string;
  armazemId: string;
  produto: string;
  armazem: string;
  quantidade: number;
  minimo: number;
  unidade: string;
}

// Produtos com estoque físico abaixo do mínimo cadastrado, por armazém.
// Só aparece aqui o produto que tiver "estoque_minimo" configurado no cadastro de Produtos.
export function EstoqueBaixoCard({
  itens,
  isLoading,
  tooltip = "Produtos com quantidade física abaixo do mínimo configurado, em algum armazém.",
}: {
  itens: EstoqueBaixoItem[] | undefined;
  isLoading: boolean;
  tooltip?: string;
}) {
  const lista = itens ?? [];

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <TitleWithInfo title="Estoque Baixo" tooltip={tooltip} />
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
              to={`/estoque/${item.produtoId}/${item.armazemId}`}
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
