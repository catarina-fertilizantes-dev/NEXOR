import { AlertCircle, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const CarregamentosSection = () => {
  return (
    <section id="carregamentos" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">🚚 Carregamentos</h2>
        <p className="text-muted-foreground">Gerencie e acompanhe os carregamentos do seu armazém.</p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">O que são Carregamentos?</h3>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              Carregamentos são registros de saída de produtos do armazém. Cada carregamento está associado 
              a um agendamento aprovado e representa a retirada física de mercadorias por uma transportadora.
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Permissões de Carregamentos</h3>
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
                { action: "Visualizar carregamentos do seu armazém", allowed: true },
                { action: "Ver detalhes de cada carregamento", allowed: true },
                { action: "Registrar carregamentos", allowed: true },
                { action: "Atualizar status do carregamento", allowed: true },
                { action: "Excluir carregamentos", allowed: false },
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
        <h3 className="text-lg font-semibold text-foreground mb-3">Como registrar um carregamento</h3>
        <div className="space-y-2">
          {[
            'Acesse "Carregamentos" no menu lateral',
            "Localize o agendamento correspondente",
            'Clique em "Registrar Carregamento" ou no botão de ação',
            "Preencha as informações solicitadas (placa, motorista, quantidade)",
            'Confirme os dados e clique em "Salvar"',
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

      <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 p-4">
        <div className="flex items-center gap-2 text-red-800 dark:text-red-200 mb-2">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">⚠️ Atenção — Perda de Dados</span>
        </div>
        <p className="text-sm text-red-700 dark:text-red-300">
          <strong>Não feche o navegador ou recarregue a página</strong> durante o preenchimento de um carregamento. 
          Dados não salvos serão perdidos permanentemente e não poderão ser recuperados.
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Status dos Carregamentos</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { status: "Em andamento", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400", desc: "Carregamento iniciado mas não finalizado" },
            { status: "Concluído", color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400", desc: "Carregamento finalizado com sucesso" },
            { status: "Cancelado", color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400", desc: "Carregamento foi cancelado" },
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
          Mantenha os dados de carregamento atualizados em tempo real para garantir que o estoque reflita 
          corretamente as saídas de mercadorias.
        </p>
      </div>
    </section>
  );
};
