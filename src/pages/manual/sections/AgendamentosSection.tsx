import { Info, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const AgendamentosSection = () => {
  return (
    <section id="agendamentos" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">📅 Agendamentos</h2>
        <p className="text-muted-foreground">Visualize e acompanhe os agendamentos de carregamento do seu armazém.</p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Permissões de Agendamentos</h3>
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
                { action: "Visualizar agendamentos do seu armazém", allowed: true },
                { action: "Filtrar por data, status ou transportadora", allowed: true },
                { action: "Ver detalhes de cada agendamento", allowed: true },
                { action: "Criar novos agendamentos", allowed: false },
                { action: "Editar agendamentos existentes", allowed: false },
                { action: "Cancelar agendamentos", allowed: false },
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
        <h3 className="text-lg font-semibold text-foreground mb-3">Como visualizar agendamentos</h3>
        <div className="space-y-2">
          {[
            'Acesse "Agendamentos" no menu lateral',
            "Você verá a lista de agendamentos do seu armazém",
            "Use os filtros no topo para refinar a busca por data, status ou transportadora",
            "Clique em um agendamento para ver os detalhes completos",
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
        <h3 className="text-lg font-semibold text-foreground mb-3">Status dos Agendamentos</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { status: "Pendente", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400", desc: "Agendamento registrado, aguardando confirmação" },
            { status: "Confirmado", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400", desc: "Agendamento aprovado e confirmado" },
            { status: "Realizado", color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400", desc: "Carregamento já foi realizado" },
            { status: "Cancelado", color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400", desc: "Agendamento foi cancelado" },
          ].map((item, i) => (
            <Card key={i}>
              <CardContent className="p-3 flex items-start gap-3">
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
          <span className="font-medium">Dica</span>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Se precisar criar ou cancelar um agendamento, entre em contato com o usuário de Logística responsável.
        </p>
      </div>
    </section>
  );
};
