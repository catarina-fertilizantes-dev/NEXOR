import { Info, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export const AgendamentosSection = () => {
  return (
    <section id="agendamentos" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">📅 Agendamentos</h2>
        <p className="text-muted-foreground">Crie e acompanhe agendamentos de retirada de produtos no armazém em nome dos clientes que você representa.</p>
      </div>

      <Card>
        <CardContent className="p-4 md:p-5">
          <h4 className="font-medium text-foreground mb-2">O que é um Agendamento?</h4>
          <p className="text-sm text-muted-foreground">
            Um agendamento é o <strong>registro de uma retirada</strong> que você planeja fazer no armazém. Uma
            liberação pode ter <strong>vários agendamentos</strong>, pois cada caminhão comporta uma quantidade
            limitada de toneladas e você pode retirar em dias diferentes.
            Como representante, você cria agendamentos em nome dos clientes que representa.
          </p>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-4">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 mb-2">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">Exemplo Prático – 250t de Ureia</span>
        </div>
        <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
          Para uma liberação de <strong>250 toneladas de Ureia</strong>, você pode criar múltiplos agendamentos:
        </p>
        <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
          <li>✅ 2 agendamentos de 30t para o dia 10/04</li>
          <li>✅ 3 agendamentos de 30t para o dia 15/04</li>
          <li>✅ 2 agendamentos de 40t para o dia 20/04</li>
          <li>✅ 1 agendamento de 30t para o dia 25/04</li>
          <li className="font-medium mt-2">Total: 250t agendadas em 8 retiradas diferentes</li>
        </ul>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Como Criar um Novo Agendamento</h3>
        <div className="space-y-2 mb-4">
          {[
            'Acesse "Agendamentos" no menu lateral',
            'Clique no botão "Novo Agendamento" (canto superior direito)',
            "Preencha os campos obrigatórios (descritos abaixo)",
            'Clique em "Criar Agendamento"',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shrink-0 text-xs mt-0.5">
                {i + 1}
              </span>
              <span className="text-foreground">{step}</span>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-foreground mb-3">📦 Produto e Quantidade</h4>

              <Alert className="mb-4 border-red-200 bg-red-50 dark:bg-red-950/20">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div className="ml-2">
                  <AlertTitle className="text-red-900 dark:text-red-100 font-semibold mb-2">
                    ⚠️ ATENÇÃO: SELEÇÃO DA LIBERAÇÃO
                  </AlertTitle>
                  <AlertDescription className="text-red-800 dark:text-red-200 space-y-3">
                    <p>
                      Como representante, você verá no dropdown de liberações <strong>TODAS as liberações dos clientes que representa</strong>, não apenas de um único cliente.
                    </p>
                    <p className="font-semibold">🎯 VERIFIQUE SEMPRE O CLIENTE CORRETO!</p>
                    <p>Cada liberação no dropdown exibe:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Nome do Cliente</li>
                      <li>Número do Pedido (ex: PED-2024-001)</li>
                      <li>Produto (ex: Ureia)</li>
                      <li>Armazém (ex: São Paulo - SP)</li>
                      <li>Quantidade disponível para agendamento</li>
                    </ul>
                  </AlertDescription>
                </div>
              </Alert>

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
                      { campo: "Liberação *", desc: "Selecione qual liberação usar. ATENÇÃO: Verifique o nome do cliente!" },
                      { campo: "Quantidade (t) *", desc: "Quantas toneladas neste agendamento" },
                      { campo: "Data de Retirada *", desc: "Quando o caminhão vai ao armazém" },
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="p-2 font-medium text-foreground">{row.campo}</td>
                        <td className="p-2 text-muted-foreground">{row.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3">
                <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                  <CardContent className="p-3">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>💡 Dica Importante:</strong> Antes de confirmar o agendamento, certifique-se de que selecionou a liberação do cliente correto. O nome do cliente é exibido claramente em cada opção do dropdown.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-3">
                <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <div className="ml-2">
                    <AlertTitle className="text-orange-900 dark:text-orange-100 font-semibold mb-2">
                      ⚠️ ATENÇÃO AO ARMAZÉM DE RETIRADA
                    </AlertTitle>
                    <AlertDescription className="text-orange-800 dark:text-orange-200 space-y-3">
                      <p>
                        Ao selecionar a liberação, o sistema <strong>destaca em um card azul</strong> o armazém 
                        onde você deve retirar o produto neste agendamento.
                      </p>

                      <div className="space-y-2">
                        <p className="font-semibold">🔄 IMPORTANTE:</p>
                        <p>
                          O time de Logística pode modificar o armazém entre agendamentos, dependendo de:
                        </p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                          <li>Disponibilidade de estoque</li>
                          <li>Movimento e capacidade do armazém</li>
                          <li>Logística de distribuição</li>
                        </ul>
                      </div>

                      <div className="space-y-2">
                        <p className="font-semibold">💡 Isso significa:</p>
                        <ul className="space-y-1">
                          <li>✅ Agendamento 1 → Retirada no Armazém São Paulo</li>
                          <li>✅ Agendamento 2 → Retirada no Armazém Campinas (pode ser diferente!)</li>
                          <li>✅ Agendamento 3 → Retirada no Armazém São Paulo (pode voltar!)</li>
                        </ul>
                      </div>

                      <div className="space-y-2">
                        <p className="font-semibold">🎯 O QUE VOCÊ DEVE FAZER:</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>⚠️ <strong>Sempre verifique o card azul</strong> antes de confirmar o agendamento</li>
                          <li>📍 <strong>Confirme o armazém de destino</strong> com a transportadora</li>
                          <li>🚚 <strong>Envie o caminhão para o local correto</strong> indicado no sistema</li>
                        </ol>
                      </div>
                    </AlertDescription>
                  </div>
                </Alert>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-foreground mb-3">🚛 Veículo e Carretas</h4>
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
                      { campo: "Placa do Veículo *", desc: "Placa do caminhão (ex: ABC-1234)" },
                      { campo: "Placa da Carreta 1 *", desc: "Placa da primeira carreta (ex: XYZ-5678)" },
                      { campo: "Placa da Carreta 2", desc: "Placa da segunda carreta (opcional)" },
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="p-2 font-medium text-foreground">{row.campo}</td>
                        <td className="p-2 text-muted-foreground">{row.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-foreground mb-3">👤 Motorista e Transportadora</h4>
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
                      { campo: "Nome do Motorista *", desc: "Nome completo do motorista" },
                      { campo: "CPF do Motorista *", desc: "CPF com máscara (ex: 123.456.789-00)" },
                      { campo: "Nome da Transportadora *", desc: "Razão social da transportadora" },
                      { campo: "CNPJ da Transportadora *", desc: "CNPJ com máscara (ex: 12.345.678/0001-90)" },
                      { campo: "Observações", desc: "Campo livre para informações adicionais (opcional)" },
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="p-2 font-medium text-foreground">{row.campo}</td>
                        <td className="p-2 text-muted-foreground">{row.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-4">
        <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 mb-2">
          <Info className="h-5 w-5" />
          <span className="font-medium">Após Criar o Agendamento</span>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Assim que você cadastra um agendamento, o sistema <strong>cria automaticamente</strong> o registro do
          carregamento correspondente. Você poderá acompanhá-lo no menu <strong>"Carregamentos"</strong>, inicialmente
          sem etapas concluídas, aguardando a atualização pelo armazém no dia da retirada.
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Barra de Progresso do Carregamento</h3>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-4">
              Cada card de agendamento exibe uma barra de progresso roxa mostrando o andamento do carregamento:
            </p>
            <div className="space-y-2">
              {[
                { pct: "0%", label: "Aguardando chegada do veículo" },
                { pct: "20%", label: "Caminhão chegou ao armazém" },
                { pct: "40%", label: "Carregamento iniciado" },
                { pct: "60%", label: "Carregando" },
                { pct: "80%", label: "Carregamento finalizado" },
                { pct: "100%", label: "Documentação anexada – Concluído" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 shrink-0 w-12 justify-center">
                    {item.pct}
                  </Badge>
                  <span className="text-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Permissões em Agendamentos</h3>
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
                { action: "Criar novos agendamentos", allowed: true },
                { action: "Visualizar agendamentos ativos e finalizados de todos os clientes que representa", allowed: true },
                { action: "Ver detalhes de cada agendamento", allowed: true },
                { action: "Filtrar por período, status ou busca", allowed: true },
                { action: "Editar agendamentos após criação", allowed: false },
                { action: "Cancelar agendamentos", allowed: false },
                { action: "Atualizar etapas de carregamento", allowed: false },
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
        <h3 className="text-lg font-semibold text-foreground mb-3">💡 Dicas Importantes</h3>
        <div className="space-y-2">
          {[
            "Crie agendamentos com antecedência para garantir disponibilidade no armazém",
            "Verifique se há quantidade disponível na liberação antes de agendar",
            "Confirme que está criando o agendamento para o cliente correto",
            "Não precisa retirar tudo no mesmo dia – distribua em múltiplos agendamentos",
            "Acompanhe a tela de Carregamentos para ver o andamento no dia da retirada",
            "Baixe os documentos finais após a conclusão da Etapa 5",
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="text-green-600 dark:text-green-400 shrink-0">✅</span>
              <span className="text-foreground">{tip}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
