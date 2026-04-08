import { HelpCircle, AlertCircle, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const DicasSuporteSection = () => {
  return (
    <section id="dicas-suporte" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">🆘 Dicas e Suporte</h2>
        <p className="text-muted-foreground">Resolução de problemas comuns e canais de suporte.</p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Problemas Frequentes</h3>
        <div className="space-y-3">
          {[
            {
              problem: "Não consigo fazer login",
              solution: "Verifique se Caps Lock está desativado. Tente recuperar a senha. Se persistir, contate a Logística.",
              type: "warning"
            },
            {
              problem: "A tela está em branco ou com erro",
              solution: "Recarregue a página (F5 ou Ctrl+R). Limpe o cache do navegador. Tente outro navegador.",
              type: "warning"
            },
            {
              problem: "Dados não aparecem / lista vazia",
              solution: "Verifique se há filtros ativos. Aguarde alguns segundos e recarregue. Verifique sua conexão.",
              type: "info"
            },
            {
              problem: "Botão não funciona ao tocar no celular",
              solution: "Toque diretamente no centro do botão. Verifique se o celular está com touch screen funcionando.",
              type: "info"
            },
            {
              problem: "Sessão expirou / redirecionado para login",
              solution: "Por segurança, sessões expiram após inatividade. Faça login novamente normalmente.",
              type: "info"
            },
          ].map((item, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {item.type === "warning" ? (
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <HelpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium text-foreground text-sm">{item.problem}</p>
                    <p className="text-sm text-muted-foreground mt-1">{item.solution}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Boas Práticas</h3>
        <div className="space-y-2">
          {[
            "Sempre faça logout ao terminar de usar o sistema em computadores compartilhados",
            "Não compartilhe seu acesso com outras pessoas",
            "Mantenha seu navegador atualizado",
            "Use conexão estável de internet ao registrar carregamentos",
            "Em caso de dúvida sobre uma operação, consulte este manual antes de executar",
            "Relate problemas ou sugestões ao responsável de Logística",
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="text-green-600 dark:text-green-400 shrink-0">✅</span>
              <span className="text-foreground">{tip}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-4">
        <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 mb-2">
          <Info className="h-5 w-5" />
          <span className="font-medium">Precisa de Suporte?</span>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Em caso de problemas não resolvidos, entre em contato com o usuário de Logística ou Administrador 
          do sistema. Descreva o problema com detalhes: qual tela estava usando, o que tentou fazer e qual 
          mensagem de erro apareceu (se houver).
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Glossário Complementar</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2 font-medium text-foreground">Termo</th>
                <th className="text-left p-2 font-medium text-foreground">Significado</th>
              </tr>
            </thead>
            <tbody>
              {[
                { term: "Cache", meaning: "Dados temporários armazenados pelo navegador. Limpar o cache pode resolver problemas de exibição." },
                { term: "Sessão", meaning: "Período de acesso ao sistema desde o login até o logout ou expiração automática." },
                { term: "Logout", meaning: "Ação de sair do sistema de forma segura." },
                { term: "Filtro", meaning: "Parâmetro usado para exibir apenas registros que atendam a critérios específicos." },
                { term: "Modal", meaning: "Janela sobreposta à tela principal para entrada de dados ou confirmação de ações." },
                { term: "Timestamp", meaning: "Data e hora registradas automaticamente em cada operação do sistema." },
                { term: "Anexo", meaning: "Arquivo (imagem, PDF, etc.) vinculado a um registro do sistema." },
                { term: "Placeholder", meaning: "Texto de exemplo exibido em campos de formulário antes do preenchimento." },
              ].map((row, i) => (
                <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="p-2 font-medium text-foreground">{row.term}</td>
                  <td className="p-2 text-muted-foreground">{row.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
