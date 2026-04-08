import { Info, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const EstoqueSection = () => {
  return (
    <section id="estoque" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">📦 Estoque</h2>
        <p className="text-muted-foreground">Visualize o estoque do seu armazém e histórico de movimentações.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            A funcionalidade de Estoque possui duas páginas principais: a <strong className="text-foreground">Lista de Estoque</strong>, onde você 
            visualiza todos os produtos do armazém, e os <strong className="text-foreground">Detalhes do Estoque</strong>, onde você consulta 
            informações completas, totalizadores e histórico de remessas.
          </p>
        </CardContent>
      </Card>

      {/* 7.2 Lista de Estoque */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Lista de Estoque</h3>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-foreground mb-2">O que você pode fazer</h4>
            <div className="space-y-1">
              {[
                "Visualizar todos os produtos do armazém",
                "Filtrar por produto, status ou quantidade",
                "Acessar detalhes de cada produto",
                "Consultar histórico de movimentações",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                  <span className="text-green-600 dark:text-green-400">✅</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-2">Cards de produtos mostram</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { title: "Nome do produto", desc: "Identificação do fertilizante ou insumo" },
                { title: "Quantidade em estoque", desc: "Saldo atual disponível no armazém" },
                { title: "Status do estoque", desc: "Normal, Baixo ou Zerado" },
                { title: "Última movimentação", desc: "Data da última entrada ou saída registrada" },
              ].map((item, i) => (
                <Card key={i}>
                  <CardContent className="p-3">
                    <p className="font-medium text-foreground text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-2">Entendendo os Status de Estoque</h4>
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
        </div>
      </div>

      {/* 7.3 Detalhes do Estoque */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Detalhes do Estoque</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Ao clicar em um produto, você acessa informações completas sobre ele.
        </p>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Informações do Produto
              </h4>
              <p className="text-sm text-muted-foreground">
                Nome completo, código, unidade de medida, armazém e dados cadastrais do produto.
              </p>
            </CardContent>
          </Card>

          {/* Totalizadores */}
          <div>
            <h4 className="font-medium text-foreground mb-3">Totalizadores (Estoque Físico e Disponível)</h4>
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

                <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-3 mb-4">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    💡 <strong>Dica:</strong> Passe o mouse sobre cada totalizador para ver uma explicação detalhada do que ele representa.
                  </p>
                </div>

                <div>
                  <h5 className="font-medium text-foreground mb-2">Entendendo a diferença — Exemplo prático:</h5>
                  <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
                    <p className="text-sm text-foreground">• Você tem <strong>1000t</strong> de fertilizante no armazém (Estoque Físico)</p>
                    <p className="text-sm text-foreground">• A Logística liberou <strong>300t</strong> para um cliente que ainda não buscou</p>
                    <p className="text-sm text-foreground">• Seu <strong>Estoque Disponível</strong> será <strong>700t</strong> (1000t - 300t)</p>
                    <p className="text-sm text-foreground">• O <strong>Estoque Físico</strong> continua <strong>1000t</strong> (produto ainda está no armazém)</p>
                    <p className="text-sm text-foreground">• Quando o caminhão carregar e sair, <strong>ambos os valores diminuirão</strong></p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Histórico de Remessas */}
          <div>
            <h4 className="font-medium text-foreground mb-2">Histórico de Remessas</h4>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Lista cronológica de todas as movimentações do produto, incluindo entradas e saídas.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left p-2 font-medium text-foreground">Produto</th>
                        <th className="text-left p-2 font-medium text-foreground">Quantidade (t)</th>
                        <th className="text-left p-2 font-medium text-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { product: "NPK 10-10-10", qty: "500", status: "Normal", color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" },
                        { product: "Ureia", qty: "120", status: "Baixo", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400" },
                        { product: "MAP", qty: "0", status: "Zerado", color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400" },
                      ].map((row, i) => (
                        <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="p-2 text-foreground">{row.product}</td>
                          <td className="p-2 text-foreground">{row.qty}</td>
                          <td className="p-2">
                            <Badge className={row.color}>{row.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-2">* Exemplo ilustrativo. Os dados reais variam conforme seu armazém.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-4">
        <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 mb-2">
          <Info className="h-5 w-5" />
          <span className="font-medium">Como o estoque é atualizado?</span>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          O Estoque Físico é atualizado automaticamente quando um carregamento é finalizado (produto sai fisicamente). 
          O Estoque Disponível é atualizado quando a Logística cria uma liberação. Ajustes manuais devem ser solicitados ao usuário de Logística.
        </p>
      </div>
    </section>
  );
};
