import { Info, AlertCircle, Eye, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const CarregamentosSection = () => {
  return (
    <section id="carregamentos" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">🚚 Carregamentos</h2>
        <p className="text-muted-foreground">Acompanhe o processo completo de carregamento em tempo real.</p>
      </div>

      <Card>
        <CardContent className="p-4 md:p-5">
          <h4 className="font-medium text-foreground mb-2">O que é um Carregamento?</h4>
          <p className="text-sm text-muted-foreground mb-3">
            É o <strong>registro do processo físico</strong> de carregamento do caminhão no armazém, desde a chegada
            até a saída com documentação. Ao criar um agendamento, o sistema cria um carregamento automaticamente.
            No dia da retirada, o armazém atualiza as etapas e você acompanha em tempo real.
          </p>
          <div className="rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-3">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              💡 <strong>Importante:</strong> Você pode visualizar todas as etapas e baixar documentos,
              mas <strong>não pode editar</strong> nenhuma informação do carregamento.
            </p>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">As 6 Etapas do Carregamento</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-2 font-medium text-foreground">Etapa</th>
                <th className="text-left p-2 font-medium text-foreground">Nome</th>
                <th className="text-left p-2 font-medium text-foreground">O que acontece</th>
                <th className="text-left p-2 font-medium text-foreground">Você pode</th>
              </tr>
            </thead>
            <tbody>
              {[
                { etapa: "1️⃣", nome: "Chegada", desc: "Caminhão chega ao armazém" },
                { etapa: "2️⃣", nome: "Início Carregamento", desc: "Armazém inicia o carregamento" },
                { etapa: "3️⃣", nome: "Carregando", desc: "Processo de carregamento em curso" },
                { etapa: "4️⃣", nome: "Carreg. Finalizado", desc: "Carregamento concluído" },
              ].map((row, i) => (
                <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="p-2 text-center">{row.etapa}</td>
                  <td className="p-2 font-medium text-foreground">{row.nome}</td>
                  <td className="p-2 text-muted-foreground">{row.desc}</td>
                  <td className="p-2 text-foreground">
                    <ul className="space-y-0.5 list-none">
                      <li>👁️ Ver foto</li>
                      <li>📥 Baixar foto</li>
                      <li>📄 Ver observações</li>
                    </ul>
                  </td>
                </tr>
              ))}
              <tr className="border-b border-border hover:bg-muted/30 transition-colors">
                <td className="p-2 text-center">5️⃣</td>
                <td className="p-2 font-medium text-foreground">Documentação</td>
                <td className="p-2 text-muted-foreground">Anexo de 3 tipos de documentos</td>
                <td className="p-2 text-foreground">
                  <ul className="space-y-0.5 list-none">
                    <li>👁️ Ver documentos</li>
                    <li>📥 Baixar 6 arquivos</li>
                    <li>(3 PDFs + 3 XMLs)</li>
                  </ul>
                </td>
              </tr>
              <tr className="border-b border-border hover:bg-muted/30 transition-colors">
                <td className="p-2 text-center">6️⃣</td>
                <td className="p-2 font-medium text-foreground">Finalizado</td>
                <td className="p-2 text-muted-foreground">Processo completo encerrado</td>
                <td className="p-2 text-foreground">✅ Tudo concluído</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">📸 Como Visualizar e Baixar Fotos (Etapas 1-4)</h3>

        <p className="text-muted-foreground">
          As etapas 1, 2, 3 e 4 possuem fotos anexadas pelo armazém. Você pode visualizá-las 
          e baixá-las para seus registros.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="p-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Visualizar Foto
              </h4>
              <ol className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <li>1. Acesse o carregamento (clique no card)</li>
                <li>2. Clique na etapa desejada (1, 2, 3 ou 4)</li>
                <li>3. Se a etapa foi concluída pelo armazém, o botão <strong>"Ver Foto"</strong> aparece</li>
                <li>4. Clique para visualizar a foto em tela cheia</li>
                <li>5. Observações do armazém são exibidas junto com a foto</li>
              </ol>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardContent className="p-4">
              <h4 className="font-semibold text-green-900 dark:text-green-100 mb-3 flex items-center gap-2">
                <Download className="h-5 w-5" />
                Baixar Foto
              </h4>
              <ol className="space-y-2 text-sm text-green-800 dark:text-green-200">
                <li>1. Com a foto aberta em tela cheia (visualização)</li>
                <li>2. Clique no botão <strong>"Baixar Foto"</strong> ou ícone de download</li>
                <li>3. A imagem será salva na pasta de downloads do seu dispositivo</li>
              </ol>
              <Alert className="mt-3 bg-white dark:bg-gray-800 border-green-300">
                <Info className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-xs text-green-700 dark:text-green-300">
                  <strong>Dica:</strong> Organize as fotos baixadas por pedido e data para facilitar consultas futuras.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">📥 Etapa 5 – Documentação (Download)</h3>
        <p className="text-sm text-muted-foreground mb-3">
          A Etapa 5 tem <strong>3 sub-etapas</strong>, cada uma com <strong>PDF + XML</strong>:
        </p>
        <div className="grid gap-3 sm:grid-cols-3 mb-4">
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">5A – Docs. Retorno</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 mb-2">
                <li>📄 Nota Fiscal de Retorno (PDF)</li>
                <li>📄 XML da Nota de Retorno</li>
              </ul>
              <p className="text-xs text-blue-700 dark:text-blue-300">🔧 Responsável: <strong>Armazém</strong></p>
            </CardContent>
          </Card>
          <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/20">
            <CardContent className="p-4">
              <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2">5B – Docs. Venda</h4>
              <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-1 mb-2">
                <li>📄 Nota Fiscal de Venda (PDF)</li>
                <li>📄 XML da Nota de Venda</li>
              </ul>
              <p className="text-xs text-purple-700 dark:text-purple-300">🔧 Responsável: <strong>Logística</strong></p>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardContent className="p-4">
              <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">5C – Docs. Remessa</h4>
              <ul className="text-sm text-green-800 dark:text-green-200 space-y-1 mb-2">
                <li>📄 Nota Fiscal de Remessa (PDF)</li>
                <li>📄 XML da Nota de Remessa</li>
              </ul>
              <p className="text-xs text-green-700 dark:text-green-300">🔧 Responsável: <strong>Armazém</strong></p>
            </CardContent>
          </Card>
        </div>

        <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 mb-4">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          <AlertDescription className="text-orange-800 dark:text-orange-200 ml-2">
            <strong>Importante:</strong> Os documentos só ficam disponíveis para download após cada responsável concluir a sub-etapa correspondente. Aguarde todas as 3 sub-etapas (5A, 5B e 5C) com badge verde antes de baixar.
          </AlertDescription>
        </Alert>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Como Baixar Documentos</h3>
        <div className="space-y-2 mb-4">
          {[
            "Acesse o carregamento (clique no card na lista)",
            "Vá até a Etapa 5 – Documentação",
            "Aguarde as 3 sub-etapas serem concluídas (5A, 5B e 5C com badge verde)",
            'Clique nos botões "Nota Fiscal (PDF)" ou "Arquivo XML"',
            "O documento será baixado automaticamente",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shrink-0 text-xs mt-0.5">
                {i + 1}
              </span>
              <span className="text-foreground">{step}</span>
            </div>
          ))}
        </div>

        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="p-4">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
              <Download className="h-5 w-5" />
              Dica: Organize seus Documentos
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
              Sugerimos organizar os documentos baixados em pastas por pedido:
            </p>
            <div className="bg-white dark:bg-gray-800 rounded-md p-3 font-mono text-xs text-foreground space-y-1">
              <p>📁 Pedidos/</p>
              <p className="ml-4">📁 PED-2024-001/</p>
              <p className="ml-8">📁 Agendamento-1/</p>
              <p className="ml-12">📄 NF-Retorno.pdf</p>
              <p className="ml-12">📄 NF-Retorno.xml</p>
              <p className="ml-12">📄 NF-Venda.pdf</p>
              <p className="ml-12">📄 NF-Venda.xml</p>
              <p className="ml-12">📄 NF-Remessa.pdf</p>
              <p className="ml-12">📄 NF-Remessa.xml</p>
              <p className="ml-8">📁 Agendamento-2/</p>
              <p className="ml-12">📄 ...</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Permissões em Carregamentos</h3>
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
                { action: "Visualizar todos os seus carregamentos", allowed: true },
                { action: "Acompanhar progresso em tempo real (6 etapas)", allowed: true },
                { action: "Visualizar e baixar fotos das Etapas 1-4 (após conclusão pelo armazém)", allowed: true },
                { action: "Visualizar e baixar documentos da Etapa 5 (3 PDFs + 3 XMLs)", allowed: true },
                { action: "Filtrar por período, status ou busca", allowed: true },
                { action: "Registrar chegada de caminhões", allowed: false },
                { action: "Anexar fotos das etapas", allowed: false },
                { action: "Anexar documentos", allowed: false },
                { action: "Avançar etapas do processo", allowed: false },
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

      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-4">
        <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 mb-2">
          <Info className="h-5 w-5" />
          <span className="font-medium">Fluxo do Dia da Retirada</span>
        </div>
        <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <p>1. Seu caminhão sai para o armazém → Status: <strong>Aguardando (0%)</strong></p>
          <p>2. Caminhão chega → Armazém registra Etapa 1 (20%)</p>
          <p>3. Inicia carregamento → Etapa 2 (40%)</p>
          <p>4. Carregando → Etapa 3 (60%)</p>
          <p>5. Finaliza carregamento → Etapa 4 (80%)</p>
          <p>6. Docs. Retorno / Venda / Remessa → Etapa 5 (5A, 5B, 5C)</p>
          <p>7. Processo finalizado → Etapa 6 (100%) ✅</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Situações Especiais</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-2 font-medium text-foreground">Situação</th>
                <th className="text-left p-2 font-medium text-foreground">O que fazer</th>
              </tr>
            </thead>
            <tbody>
              {[
                { sit: "Carregamento parado há muito tempo", acao: "Contate o armazém ou a Logística" },
                { sit: "Documento faltando na Etapa 5", acao: "Aguarde ou contate a Logística" },
                { sit: "Informação incorreta (placa, motorista)", acao: "Contate a Logística para correção" },
                { sit: "Foto não aparece", acao: "Atualize a página ou contate o suporte" },
              ].map((row, i) => (
                <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="p-2 font-medium text-foreground">{row.sit}</td>
                  <td className="p-2 text-muted-foreground">{row.acao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-4">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 mb-2">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">Dicas Importantes</span>
        </div>
        <div className="space-y-1">
          {[
            "A página atualiza automaticamente a cada 30 segundos",
            "Guarde os documentos baixados para a contabilidade da sua empresa",
            "Use os filtros para encontrar carregamentos antigos no histórico",
            "Em caso de inconsistências, contate a Logística",
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
              <span className="shrink-0">•</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
