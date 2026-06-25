import { Info, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export const LiberacoesSection = () => {
  return (
    <section id="liberacoes" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">📋 Liberações</h2>
        <p className="text-muted-foreground">Crie e gerencie todas as liberações do sistema, habilitando clientes e representantes a agendarem retiradas.</p>
      </div>

      <Card>
        <CardContent className="p-4 md:p-5">
          <h4 className="font-medium text-foreground mb-2">O que é uma Liberação?</h4>
          <p className="text-sm text-muted-foreground mb-2">
            Quando um cliente realiza uma <strong>compra</strong>, o time de <strong>Logística</strong> cadastra uma liberação
            no sistema, informando o número do pedido, o produto adquirido, o armazém de retirada e a quantidade total.
            A partir daí, clientes ou representantes podem criar agendamentos para retirar o produto em parcelas.
          </p>
          <p className="text-sm text-muted-foreground">
            Como Logística, <strong>VOCÊ é responsável por cadastrá-las no sistema</strong>.
          </p>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Fluxo da Liberação</h3>
        <div className="space-y-2">
          {[
            "Compra realizada → VOCÊ cadastra a liberação no sistema",
            "Liberação criada → Cliente/Representante visualiza com status Disponível",
            "Cliente/Representante cria agendamentos → Uma ou mais retiradas parciais",
            "Caminhões enviados → Conforme os agendamentos",
            "Armazém carrega → Atualiza o carregamento etapa a etapa",
            "Documentação anexada → Processo finalizado",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shrink-0 text-xs mt-0.5">
                {i + 1}
              </span>
              <span className="text-foreground">{step}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Como Criar uma Liberação</h3>
        <div className="space-y-2 mb-4">
          {[
            'Acesse "Liberações" no menu',
            'Clique em "Nova Liberação"',
            "Preencha os campos obrigatórios (descritos abaixo)",
            'Clique em "Criar Liberação"',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shrink-0 text-xs mt-0.5">
                {i + 1}
              </span>
              <span className="text-foreground">{step}</span>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto mb-4">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-2 font-medium text-foreground">Campo</th>
                <th className="text-left p-2 font-medium text-foreground">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {[
                { campo: "Produto *", desc: "Select de produtos ativos" },
                { campo: "Armazém *", desc: "Select de armazéns ativos" },
                { campo: "Cliente *", desc: "Select de clientes ativos" },
                { campo: "Pedido Interno *", desc: "Número do pedido" },
                { campo: "Quantidade *", desc: "Deve ser ≤ estoque disponível no armazém selecionado" },
              ].map((row, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="p-2 font-medium text-foreground">{row.campo}</td>
                  <td className="p-2 text-muted-foreground">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          <div className="ml-2">
            <AlertTitle className="text-orange-900 dark:text-orange-100 font-semibold mb-1">
              ⚠️ Validação de Estoque
            </AlertTitle>
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              O sistema verifica automaticamente o estoque disponível no armazém selecionado. Não é possível liberar
              uma quantidade superior ao estoque disponível.
            </AlertDescription>
          </div>
        </Alert>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Alterar Armazém de uma Liberação</h3>
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 mb-3">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Quando está disponível?</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• A liberação <strong>não</strong> está totalmente agendada</li>
                  <li>• A liberação <strong>não</strong> está finalizada</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-2">
          {[
            "Clique na liberação que deseja alterar",
            'Clique em "Alterar Armazém" no modal de detalhes',
            "Selecione o novo armazém",
            "O sistema valida se o novo armazém tem estoque suficiente",
            'Confirme a alteração clicando em "Salvar"',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shrink-0 text-xs mt-0.5">
                {i + 1}
              </span>
              <span className="text-foreground">{step}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Permissões em Liberações</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2 font-medium text-foreground">Ação</th>
                <th className="text-left p-2 font-medium text-foreground">Você pode?</th>
              </tr>
            </thead>
            <tbody>
              {[
                { action: "Criar liberações", allowed: true },
                { action: "Visualizar TODAS as liberações do sistema", allowed: true },
                { action: "Alterar armazém (com restrições)", allowed: true },
                { action: "Consultar quantidade disponível para agendamento", allowed: true },
                { action: "Filtrar por produto, pedido, status ou período", allowed: true },
                { action: "Excluir liberações", allowed: false },
              ].map((row, i) => (
                <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="p-2 text-foreground">{row.action}</td>
                  <td className="p-2">
                    {row.allowed ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">✅ Sim</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">❌ Não</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Informações Exibidas em Cada Card</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-2 font-medium text-foreground">Campo</th>
                <th className="text-left p-2 font-medium text-foreground">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {[
                { campo: "Pedido", desc: "Número do pedido interno" },
                { campo: "Cliente", desc: "Nome da empresa do cliente" },
                { campo: "Produto", desc: "Nome do produto adquirido" },
                { campo: "Armazém", desc: "Local de retirada (cidade/estado)" },
                { campo: "Quantidade Liberada", desc: "Total comprado" },
                { campo: "Quantidade Agendada", desc: "Já agendado para retirada" },
                { campo: "Quantidade Retirada", desc: "Já retirado do armazém" },
                { campo: "Status", desc: "Disponível / Parcialmente Agendada / Totalmente Agendada" },
                { campo: "Barra de Progresso", desc: "Visual do percentual agendado" },
              ].map((row, i) => (
                <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="p-2 font-medium text-foreground">{row.campo}</td>
                  <td className="p-2 text-muted-foreground">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Status das Liberações</h3>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { status: "Disponível", color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400", desc: "Há quantidade disponível para agendar" },
            { status: "Parcialmente Agendada", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400", desc: "Parte foi agendada, ainda há saldo disponível" },
            { status: "Totalmente Agendada", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400", desc: "Toda a quantidade foi agendada" },
          ].map((item, i) => (
            <Card key={i}>
              <CardContent className="p-3 space-y-2">
                <Badge className={item.color}>{item.status}</Badge>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Filtros Disponíveis</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { filtro: "Busca por texto", desc: "Pesquise por pedido, produto, cliente ou armazém" },
            { filtro: "Status", desc: "Filtre por Disponível, Parcialmente Agendada ou Totalmente Agendada" },
            { filtro: "Por Armazém", desc: "Veja liberações de um armazém específico" },
            { filtro: "Período", desc: "Filtre por data de início e fim" },
          ].map((item, i) => (
            <Card key={i}>
              <CardContent className="p-3">
                <p className="font-medium text-foreground text-sm">{item.filtro}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-4">
        <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 mb-2">
          <Info className="h-5 w-5" />
          <span className="font-medium">Barra de Progresso Azul</span>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          A barra de progresso azul mostra quanto da liberação já foi <strong>agendado</strong> para retirada,
          mas não necessariamente carregado. Acompanhe os carregamentos para ver o que já foi efetivamente retirado.
        </p>
      </div>
    </section>
  );
};
