import { Info, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const LiberacoesSection = () => {
  return (
    <section id="liberacoes" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">📋 Liberações</h2>
        <p className="text-muted-foreground">Visualize e acompanhe as liberações cadastradas pela Logística para os clientes que você representa.</p>
      </div>

      <Card>
        <CardContent className="p-4 md:p-5">
          <h4 className="font-medium text-foreground mb-2">O que é uma Liberação?</h4>
          <p className="text-sm text-muted-foreground">
            Quando um cliente realiza uma <strong>compra</strong>, o time de <strong>Logística</strong> cadastra uma liberação
            no sistema, informando o número do pedido, o produto adquirido, o armazém de retirada e a quantidade total.
            A partir daí, você pode criar agendamentos em nome do cliente para retirar o produto em parcelas.
          </p>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Fluxo da Liberação</h3>
        <div className="space-y-2">
          {[
            "Compra realizada → Logística cadastra a liberação",
            "Liberação criada → Você visualiza no sistema com status Disponível",
            "Você cria agendamentos em nome do cliente → Uma ou mais retiradas parciais",
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

      <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">🔍 Visualização Multi-Cliente</h4>
              <p className="text-sm text-orange-800 dark:text-orange-200">
                Como representante, você visualiza liberações de <strong>TODOS os clientes que representa</strong>. Cada card de liberação exibe o nome do cliente, permitindo identificar facilmente a qual cliente a liberação pertence.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">💡 Dica: Use a busca</h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Se você representa vários clientes, use o campo de busca para filtrar por nome do cliente e encontrar rapidamente as liberações que procura.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
                { action: "Visualizar liberações de todos os clientes que representa", allowed: true },
                { action: "Consultar quantidade disponível para agendamento", allowed: true },
                { action: "Filtrar por produto, pedido, status ou período", allowed: true },
                { action: "Criar liberações", allowed: false },
                { action: "Editar quantidade ou produto da liberação", allowed: false },
                { action: "Alterar o armazém da liberação", allowed: false },
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

      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-4">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 mb-2">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">Exemplo Prático</span>
        </div>
        <p className="text-sm text-amber-700 dark:text-amber-300">
          O cliente que você representa comprou <strong>250 toneladas de Ureia</strong>. A Logística cadastra: Liberação #PED-2024-001 | 250t |
          Armazém São Paulo. Você visualiza a liberação com status <strong>Disponível</strong> e quantidade disponível
          para agendamento de <strong>250t</strong>. Agora você pode criar agendamentos em nome deste cliente conforme necessário.
        </p>
      </div>
    </section>
  );
};
