import { Info, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const EstoqueSection = () => {
  return (
    <section id="estoque" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">📦 Estoque</h2>
        <p className="text-muted-foreground">Visualize e gerencie o estoque de todos os armazéns e registre entradas de produtos.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            A funcionalidade de Estoque permite visualizar e controlar as quantidades físicas disponíveis em cada
            armazém, registrar entradas de produtos (remessas), realizar transferências de propriedade e
            acompanhar o histórico de movimentações.
          </p>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">O que é o Estoque?</h3>
        <p className="text-sm text-muted-foreground mb-3">
          O estoque representa o controle da quantidade física de produtos disponível em cada armazém.
          O sistema mantém dois valores distintos para cada produto:
        </p>

        <div>
          <h4 className="font-medium text-foreground mb-3">Estoque Físico vs Estoque Disponível</h4>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-4">
                O sistema exibe duas métricas importantes para controle do estoque:
              </p>
              <div className="overflow-x-auto mb-4">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-2 font-medium text-foreground">Métrica</th>
                      <th className="text-left p-2 font-medium text-foreground">Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="p-2 font-medium text-foreground">Estoque Físico 📦</td>
                      <td className="p-2 text-muted-foreground">Quantidade real presente no armazém neste momento. Reduz apenas quando o produto sai fisicamente (carregamento finalizado).</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="p-2 font-medium text-foreground">Estoque Disponível ✅</td>
                      <td className="p-2 text-muted-foreground">Quantidade livre para novas liberações. Desconta valores já liberados, mesmo que ainda não retirados do armazém.</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <h5 className="font-medium text-foreground mb-2">Entendendo a diferença — Exemplo prático:</h5>
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
                  <p className="text-sm text-foreground">• Você tem <strong>1000t</strong> de fertilizante no armazém (Estoque Físico)</p>
                  <p className="text-sm text-foreground">• Ao criar uma liberação de <strong>300t</strong> para um cliente, só o <strong>Estoque Disponível</strong> cai — para <strong>700t</strong> (1000t - 300t)</p>
                  <p className="text-sm text-foreground">• O <strong>Estoque Físico</strong> continua <strong>1000t</strong> (produto ainda está no armazém, nada saiu ainda)</p>
                  <p className="text-sm text-foreground">• Só quando um caminhão retira parte da carga (carregamento finalizado) é que o <strong>Estoque Físico</strong> cai — na mesma proporção do que foi retirado</p>
                  <p className="text-sm text-foreground">• Quando todas as retiradas dessa liberação forem concluídas, o Estoque Físico volta a ficar igual ao Estoque Disponível</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">🌐 Visão Global: Você vê TODOS os Armazéns</h4>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                Diferente do perfil Armazém que só vê seu próprio estoque, como Logística você tem acesso
                ao estoque de todos os armazéns cadastrados no sistema:
              </p>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• <strong>Perfil Armazém:</strong> vê apenas seu próprio estoque</li>
                <li>• <strong>Perfil Logística:</strong> vê estoque de todos os armazéns</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Como Navegar no Estoque</h3>
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-foreground mb-1">📋 Lista por Armazém</p>
                <p className="text-muted-foreground">Estoque organizado em cards expansíveis por armazém. Clique no armazém para expandir e ver os produtos.</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">📦 Detalhes do Produto</p>
                <p className="text-muted-foreground">Clique em um produto para ver informações completas, totalizadores e histórico de remessas.</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">🔍 Busca</p>
                <p className="text-muted-foreground">Busque por nome do armazém ou produto</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">🔄 Atualização</p>
                <p className="text-muted-foreground">A página atualiza automaticamente a cada 30 segundos. Pressione F5 para atualizar manualmente.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Como Registrar Entrada de Estoque (Remessa)</h3>
        <div className="space-y-2 mb-4">
          {[
            'Acesse "Estoque"',
            'Clique em "Entrada de Estoque"',
            "Preencha os campos obrigatórios (descritos abaixo)",
            'Clique em "Salvar"',
            "O sistema soma a quantidade informada tanto ao Estoque Físico quanto ao Estoque Disponível do produto neste armazém",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shrink-0 text-xs mt-0.5">
                {i + 1}
              </span>
              <span className="text-foreground">{step}</span>
            </div>
          ))}
        </div>

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
                { campo: "Produto *", desc: "Select de produtos ativos" },
                { campo: "Armazém *", desc: "Select de armazéns ativos" },
                { campo: "Quantidade *", desc: "Número positivo" },
                { campo: "Unidade", desc: "t (toneladas) ou kg (quilos)" },
                { campo: "Número da Remessa *", desc: "Texto — obrigatório" },
                { campo: "Nota de Remessa (PDF) *", desc: "Upload obrigatório" },
                { campo: "Arquivo XML da Remessa *", desc: "Upload obrigatório" },
                { campo: "Observações", desc: "Texto opcional" },
              ].map((row, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="p-2 font-medium text-foreground">{row.campo}</td>
                  <td className="p-2 text-muted-foreground">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Transferência de Propriedade</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Permite registrar a venda/transferência de um lote de estoque para um cliente <strong>sem que o produto
          saia fisicamente do armazém</strong> — o produto continua guardado ali, mas passa a pertencer a outro
          cliente. Disponível apenas para Admin e Logística, a partir da tela de <strong>Detalhe do Estoque</strong>
          (clique no produto dentro de um armazém), já com produto e armazém fixados pelo contexto.
        </p>
        <div className="space-y-2 mb-4">
          {[
            'No Detalhe do Estoque, clique em "Transferência de Propriedade"',
            "Informe quantidade e data da transferência",
            "Selecione o cliente (ou informe CNPJ/razão social manualmente, se ainda não cadastrado)",
            "Informe o número do pedido",
            "Anexe a Nota Fiscal (PDF) e o XML correspondentes — ambos obrigatórios",
            'Clique em "Registrar Transferência"',
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
            <p className="text-sm text-blue-800 dark:text-blue-200">
              As transferências registradas ficam listadas na seção "Transferências de Propriedade" do Detalhe do
              Estoque. Uma transferência ativa pode ser <strong>estornada</strong> por Admin/Logística, o que devolve
              a quantidade ao estoque físico e disponível do produto/armazém.
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Filtros Disponíveis</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { filtro: "Busca por texto", desc: "Pesquise por armazém ou produto" },
            { filtro: "Por Armazéns", desc: "Filtre por armazéns específicos" },
            { filtro: "Por Produtos", desc: "Filtre por produtos específicos" },
            { filtro: "Por Status", desc: "Normal, Baixo ou Zerado" },
            { filtro: "Por Período", desc: "Filtre por data de início e fim" },
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

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Entendendo os Status de Estoque</h3>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { status: "Normal", color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400", desc: "Quantidade acima do nível mínimo" },
            { status: "Baixo", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400", desc: "Abaixo do nível mínimo — requer atenção" },
            { status: "Zerado", color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400", desc: "Sem estoque disponível" },
          ].map((item, i) => (
            <Card key={i}>
              <CardContent className="p-3 space-y-1">
                <Badge className={item.color}>{item.status}</Badge>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Permissões em Estoque</h3>
        <div className="space-y-1">
          {[
            { text: "Ver estoque de todos os armazéns", allowed: true },
            { text: "Ver detalhes completos de qualquer produto", allowed: true },
            { text: "Registrar entrada de estoque (remessa)", allowed: true },
            { text: "Registrar e estornar Transferência de Propriedade", allowed: true },
            { text: "Editar/excluir registros antigos", allowed: false },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className={item.allowed ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                {item.allowed ? "✅" : "❌"}
              </span>
              <span className="text-foreground">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-4">
        <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 mb-2">
          <Info className="h-5 w-5" />
          <span className="font-medium">Como o estoque é atualizado?</span>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          O Estoque Físico é atualizado automaticamente quando um carregamento é finalizado (produto sai fisicamente).
          O Estoque Disponível é atualizado quando você cria uma liberação.
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Perguntas Frequentes</h3>
        <div className="space-y-3">
          {[
            {
              pergunta: "Quando o Estoque Físico diminui?",
              resposta: "Quando a Etapa 5 (Documentação) é concluída e o carregamento vira \"Processo Finalizado\". O produto sai fisicamente do armazém e o estoque é reduzido automaticamente.",
            },
            {
              pergunta: "Posso editar uma entrada de estoque já registrada?",
              resposta: "Não. Entre em contato com o administrador do sistema se necessário.",
            },
            {
              pergunta: "Por que o Estoque Disponível é menor que o Físico?",
              resposta: "Porque existem liberações ativas para esse produto nesse armazém. A diferença representa a quantidade já comprometida em liberações, mas ainda não retirada.",
            },
          ].map((faq, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <Package className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground text-sm mb-1">P: {faq.pergunta}</p>
                    <p className="text-sm text-muted-foreground">R: {faq.resposta}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
