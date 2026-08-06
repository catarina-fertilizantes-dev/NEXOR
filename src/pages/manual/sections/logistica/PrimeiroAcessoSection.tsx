import { Info, Shield, Key } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const PrimeiroAcessoSection = () => {
  return (
    <section id="primeiro-acesso" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">🆕 Primeiro Acesso</h2>
        <p className="text-muted-foreground">Como você recebe suas credenciais de acesso.</p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Como ter um usuário de Logística criado</h3>
        <div className="space-y-3">
          {[
            { step: "1", title: "Peça a um Administrador", desc: "Usuários de Logística são cadastrados por um Administrador, na página Colaboradores" },
            { step: "2", title: "Recebimento das credenciais", desc: "O Administrador define seu e-mail e uma senha diretamente no cadastro, e repassa essas credenciais a você" },
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

      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Sem troca obrigatória de senha</h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Diferente dos perfis Armazém, Cliente e Representante, os perfis Logística e Admin{" "}
                <strong>não são obrigados a trocar a senha no primeiro login</strong>. Você já pode acessar
                normalmente com a senha definida pelo Administrador.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Quer definir sua própria senha?</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Se preferir não usar a senha definida pelo Administrador, use a opção de recuperação de senha:
        </p>
        <div className="space-y-2">
          {[
            'Na tela de login, clique em "Esqueci minha senha"',
            "Digite o e-mail cadastrado pelo Administrador",
            "Um link de redefinição será enviado para esse e-mail",
            "Clique no link e cadastre a senha que preferir",
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
