import { Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const EstoqueSection = () => {
  return (
    <section id="estoque" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">📦 Estoque</h2>
        <p className="text-muted-foreground">Consulte e acompanhe o estoque do seu armazém.</p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Sobre o Estoque</h3>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              O módulo de Estoque exibe a quantidade atual de cada produto armazenado no seu armazém. 
              O saldo é atualizado automaticamente conforme os carregamentos são registrados.
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Como consultar o estoque</h3>
        <div className="space-y-2">
          {[
            'Acesse "Estoque" no menu lateral',
            "Você verá a lista de produtos com suas respectivas quantidades",
            "Use os filtros para buscar por produto específico",
            "Clique em um produto para ver o histórico de movimentações",
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
        <h3 className="text-lg font-semibold text-foreground mb-3">Exemplo Prático — Leitura do Estoque</h3>
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
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Permissões de Estoque</h3>
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
                { action: "Visualizar estoque do seu armazém", allowed: true },
                { action: "Exportar relatório de estoque", allowed: true },
                { action: "Ajustar manualmente o estoque", allowed: false },
                { action: "Excluir movimentações", allowed: false },
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
          <span className="font-medium">Como o estoque é atualizado?</span>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          O saldo do estoque é atualizado automaticamente quando um carregamento é confirmado. 
          Ajustes manuais devem ser solicitados ao usuário de Logística.
        </p>
      </div>
    </section>
  );
};
