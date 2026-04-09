import { HelpCircle, AlertCircle, Info, Shield, Zap, Camera, MessageSquare, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const DicasSuporteSection = () => {
  return (
    <section id="dicas-suporte" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">🆘 Dicas e Suporte</h2>
        <p className="text-muted-foreground">Boas práticas, perguntas frequentes e canais de suporte.</p>
      </div>

      {/* 9.1 Dicas e Boas Práticas */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Dicas e Boas Práticas</h3>

        <div className="space-y-4">
          {/* Segurança */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Segurança
              </h4>
              <div className="space-y-1">
                {[
                  "Sempre faça logout ao terminar de usar o sistema em computadores compartilhados",
                  "Não compartilhe seu acesso com outras pessoas",
                  "Use uma senha forte e diferente de outras contas",
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-green-600 dark:text-green-400 shrink-0">✅</span>
                    <span className="text-foreground">{tip}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Uso Eficiente */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Uso Eficiente
              </h4>
              <div className="space-y-1">
                {[
                  "Mantenha seu navegador atualizado para melhor desempenho",
                  "Use conexão estável de internet ao registrar carregamentos",
                  "Em caso de dúvida sobre uma operação, consulte este manual antes de executar",
                  "Aguarde 30 segundos antes de recarregar a página — o sistema atualiza automaticamente",
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-green-600 dark:text-green-400 shrink-0">✅</span>
                    <span className="text-foreground">{tip}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Qualidade dos Anexos */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" />
                Qualidade dos Anexos
              </h4>
              <div className="space-y-1">
                {[
                  "Fotos: use boa iluminação e enquadramento claro (placa visível nas fotos do veículo)",
                  "Documentos PDF/XML: certifique-se que o arquivo não está corrompido antes de enviar",
                  "Verifique o tamanho: fotos até 5MB, documentos até 7MB",
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-green-600 dark:text-green-400 shrink-0">✅</span>
                    <span className="text-foreground">{tip}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Comunicação */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Comunicação
              </h4>
              <div className="space-y-1">
                {[
                  "Relate problemas ou sugestões ao responsável de Logística",
                  "Ao reportar um problema, descreva: qual tela, o que tentou fazer e qual erro apareceu",
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-green-600 dark:text-green-400 shrink-0">✅</span>
                    <span className="text-foreground">{tip}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Problemas Comuns */}
          <div>
            <h4 className="font-medium text-foreground mb-2">Problemas Comuns</h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-2 font-medium text-foreground">Problema</th>
                    <th className="text-left p-2 font-medium text-foreground">Solução</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { prob: '"Não consigo fazer login"', sol: 'Verifique e-mail e senha / Use "Esqueci minha senha" / Contate Logística' },
                    { prob: '"Sistema está lento"', sol: "Verifique internet / Pressione F5 / Feche outras abas / Limpe cache" },
                    { prob: '"Não consigo fazer upload"', sol: "Verifique formato (Fotos: JPG/PNG/WebP, Docs: PDF/XML) / Verifique tamanho / Teste internet" },
                    { prob: '"Não consigo avançar etapa"', sol: "Verifique se anexou foto obrigatória / Confirme que é a etapa atual / Não está na 5B (Logística)" },
                    { prob: '"Página não atualizou"', sol: "Aguarde 30s (atualização automática) / Pressione F5" },
                    { prob: '"Menu não abre (mobile)"', sol: "Recarregue a página, verifique a conexão" },
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="p-2 text-foreground font-medium">{row.prob}</td>
                      <td className="p-2 text-muted-foreground">{row.sol}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 9.2 Perguntas Frequentes */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Perguntas Frequentes</h3>

        <div className="space-y-4">
          {/* Sobre Acesso e Senha */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-primary" />
                Sobre Acesso e Senha
              </h4>
              <div className="space-y-3">
                {[
                  { q: "Esqueci minha senha. O que faço?", a: 'Na tela de login, clique em "Esqueci minha senha". Um link de redefinição será enviado para seu e-mail cadastrado.' },
                  { q: "Posso usar o sistema em vários dispositivos?", a: "Sim. O NEXOR é acessado pelo navegador e funciona em qualquer dispositivo com internet." },
                  { q: "Minha sessão expirou. É normal?", a: "Sim. Por segurança, sessões expiram após inatividade. Faça login novamente normalmente." },
                ].map((item, i) => (
                  <div key={i} className="border-b border-border pb-3 last:border-0 last:pb-0">
                    <p className="text-sm font-medium text-foreground mb-1"><strong>P: {item.q}</strong></p>
                    <p className="text-sm text-muted-foreground">R: {item.a}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sobre Carregamentos */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-primary" />
                Sobre Carregamentos
              </h4>
              <div className="space-y-3">
                {[
                  { q: "Posso editar um carregamento após finalizar?", a: "Não. Carregamentos finalizados não podem ser editados. Entre em contato com a Logística se necessário." },
                  { q: "Por que não consigo avançar para a próxima etapa?", a: "Verifique se a foto obrigatória foi anexada. Todas as etapas exigem foto para prosseguir." },
                  { q: "O que acontece na etapa 5B?", a: "A subetapa 5B é exclusiva da Logística. Você verá a mensagem de aguardando e não pode fazer upload. Aguarde a Logística concluir para liberar a 5C." },
                  { q: "Posso criar ou cancelar carregamentos?", a: "Não. A criação e cancelamento são realizados pela equipe de Logística." },
                ].map((item, i) => (
                  <div key={i} className="border-b border-border pb-3 last:border-0 last:pb-0">
                    <p className="text-sm font-medium text-foreground mb-1"><strong>P: {item.q}</strong></p>
                    <p className="text-sm text-muted-foreground">R: {item.a}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sobre Estoque */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-primary" />
                Sobre Estoque
              </h4>
              <div className="space-y-3">
                {[
                  { q: "Vejo outros armazéns?", a: "Não, apenas o seu." },
                  { q: 'O que significa "Estoque Baixo"?', a: "Indica que a quantidade em estoque está abaixo do nível mínimo e requer atenção." },
                  { q: 'Qual a diferença entre "Estoque Físico" e "Estoque Disponível"?', a: "Estoque Físico é a quantidade real presente no armazém neste momento. Estoque Disponível é a quantidade livre para novas liberações, descontando valores já liberados (mesmo que ainda não retirados)." },
                  { q: "Por que o Estoque Disponível é menor que o Estoque Físico?", a: "Porque existem liberações aprovadas pela Logística que ainda não foram retiradas fisicamente do armazém. O produto está lá, mas já está comprometido para um cliente." },
                  { q: "O Estoque Físico diminui quando crio uma liberação?", a: "Não. O Estoque Físico só diminui quando o produto sai fisicamente do armazém (carregamento finalizado). Já o Estoque Disponível diminui assim que a liberação é criada." },
                ].map((item, i) => (
                  <div key={i} className="border-b border-border pb-3 last:border-0 last:pb-0">
                    <p className="text-sm font-medium text-foreground mb-1"><strong>P: {item.q}</strong></p>
                    <p className="text-sm text-muted-foreground">R: {item.a}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Glossário */}
          <div>
            <h4 className="font-medium text-foreground mb-2">Glossário</h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
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
                    { term: "Badge", meaning: "Etiqueta colorida que indica o status de um registro (ex: Pendente, Finalizado)." },
                    { term: "Estoque Físico", meaning: "Quantidade real de produto presente no armazém neste momento." },
                    { term: "Estoque Disponível", meaning: "Quantidade livre para novas liberações, descontando o que já foi comprometido." },
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
        </div>
      </div>

      {/* 9.3 Suporte */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Suporte</h3>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Equipe de Logística
                </h4>
                <p className="text-sm text-muted-foreground">
                  Para dúvidas sobre agendamentos, carregamentos, liberações de estoque ou procedimentos operacionais. 
                  Entre em contato com o responsável de Logística da sua unidade.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  Suporte Técnico
                </h4>
                <p className="text-sm text-muted-foreground">
                  Para problemas técnicos com o sistema (erros, falhas, acessos). 
                  Entre em contato com o Suporte Técnico informado pela equipe de Logística.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-4">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 mb-2">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Ao reportar um problema</span>
            </div>
            <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
              <li>• Qual tela estava usando</li>
              <li>• O que tentou fazer</li>
              <li>• Qual mensagem de erro apareceu (se houver)</li>
              <li>• Horário aproximado em que ocorreu</li>
            </ul>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-4">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 mb-2">
              <Info className="h-5 w-5" />
              <span className="font-medium">Sugestões e melhorias</span>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Tem sugestões para melhorar o sistema? Compartilhe com a equipe de Logística ou Suporte Técnico. 
              Seu feedback é valioso para evoluirmos o sistema!
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
