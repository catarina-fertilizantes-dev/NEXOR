import { AlertCircle, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const LoginRecuperacaoSection = () => {
  return (
    <section id="login-recuperacao" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">🔑 Login e Recuperação de Senha</h2>
        <p className="text-muted-foreground">Como acessar o sistema e recuperar sua senha em caso de esquecimento.</p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Como fazer login</h3>
        <div className="space-y-2">
          {[
            "Acesse o link do sistema no navegador",
            "Digite seu e-mail no campo indicado",
            "Digite sua senha",
            'Clique em "Entrar"',
            "Você será redirecionado para a tela principal",
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

      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-4">
        <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 mb-2">
          <Info className="h-5 w-5" />
          <span className="font-medium">Dica</span>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Mantenha o navegador atualizado para melhor desempenho. Recomendamos Google Chrome ou Microsoft Edge.
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Recuperação de Senha</h3>
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-4 mb-4">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 mb-2">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Esqueceu sua senha?</span>
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Na tela de login, clique em "Esqueci minha senha". Um link de redefinição será enviado para seu e-mail.
          </p>
        </div>
        <div className="space-y-2">
          {[
            'Na tela de login, clique em "Esqueci minha senha"',
            "Digite seu e-mail cadastrado",
            'Clique em "Enviar link de recuperação"',
            "Verifique seu e-mail (incluindo spam)",
            "Clique no link recebido",
            "Digite e confirme sua nova senha",
            "Faça login com a nova senha",
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
        <h3 className="text-lg font-semibold text-foreground mb-3">Problemas com acesso?</h3>
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-sm text-muted-foreground">Se ainda não conseguir acessar após a recuperação de senha:</p>
            <ul className="text-sm text-foreground space-y-1">
              <li>• Verifique se o Caps Lock está desativado</li>
              <li>• Certifique-se de usar o e-mail correto</li>
              <li>• Tente outro navegador</li>
              <li>• Entre em contato com o responsável pela Logística</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Dicas importantes</h3>
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-4">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 mb-3">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Caso não receba o e-mail de recuperação:</span>
          </div>
          <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1 mb-4">
            <li>• Verifique se o e-mail digitado está correto</li>
            <li>• Confira sua pasta de spam/lixo eletrônico</li>
            <li>• Aguarde alguns minutos (o e-mail pode demorar)</li>
            <li>• Tente reenviar o link de recuperação</li>
          </ul>
          <p className="text-sm text-amber-800 dark:text-amber-200 font-medium mb-2">Se o problema persistir:</p>
          <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
            <li>• Entre em contato com a equipe de Logística</li>
            <li>• Contacte o Suporte Técnico (veja seção 9 - Dicas e Suporte)</li>
          </ul>
        </div>
      </div>
    </section>
  );
};
