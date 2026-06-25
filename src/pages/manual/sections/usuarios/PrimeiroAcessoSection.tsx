import { AlertCircle, Shield, Key } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const PrimeiroAcessoSection = () => {
  return (
    <section id="primeiro-acesso" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">🆕 Primeiro Acesso</h2>
        <p className="text-muted-foreground">Como receber e configurar suas credenciais no primeiro acesso.</p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Como você recebe suas credenciais</h3>
        <div className="space-y-3">
          {[
            { step: "1", title: "Cadastro pelo perfil Logística", desc: "Um usuário com perfil de Logística irá cadastrar você no sistema" },
            { step: "2", title: "Recebimento das credenciais", desc: "Você receberá um e-mail ou mensagem contendo: link de acesso, seu e-mail e senha provisória" },
          ].map((item) => (
            <Card key={item.step}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white font-bold text-sm shrink-0">
                  {item.step}
                </div>
                <div>
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-4">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 mb-2">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">Troca Obrigatória de Senha</span>
        </div>
        <p className="text-sm text-amber-700 dark:text-amber-300">
          <strong>IMPORTANTE:</strong> No primeiro login, você OBRIGATORIAMENTE deverá criar uma senha pessoal.
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Passos para trocar a senha</h3>
        <div className="space-y-2">
          {[
            "Acesse o link recebido",
            "Digite e-mail e senha provisória",
            'Você verá: "Bem-vindo. Você deve alterar sua senha."',
            "Será redirecionado para criar nova senha",
            'Digite sua nova senha no campo "Nova Senha"',
            'Repita a mesma senha no campo "Confirmar Nova Senha"',
            'Clique em "Alterar Senha"',
            "Faça login com sua nova senha",
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
        <h3 className="text-lg font-semibold text-foreground mb-3">⚠️ Requisitos da senha</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <Card>
            <CardContent className="p-4 space-y-2">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <Key className="h-4 w-4 text-primary" />
                Obrigatório
              </h4>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-600 dark:text-green-400">✅</span>
                <span className="text-foreground">Mínimo de 6 caracteres</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-red-600 dark:text-red-400">❌</span>
                <span className="text-muted-foreground">Evite: 123456, password, senha123, admin123</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 space-y-2">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Recomendações
              </h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>• Combine letras maiúsculas e minúsculas</p>
                <p>• Inclua números</p>
                <p>• Adicione caracteres especiais (@, #, $)</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Dicas de Segurança</h3>
        <div className="space-y-2">
          {[
            { icon: "🔒", text: "Não compartilhe sua senha" },
            { icon: "🔑", text: "Use uma senha diferente de outras contas" },
            { icon: "📝", text: "Não anote em locais visíveis" },
            { icon: "🔄", text: "Sempre faça logout ao terminar" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-foreground">
              <span>{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
