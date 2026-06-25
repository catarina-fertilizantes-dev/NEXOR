import { Smartphone, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const AcessoMobileSection = () => {
  return (
    <section id="acesso-mobile" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">📱 Acesso Mobile</h2>
        <p className="text-muted-foreground">Como acessar e usar o NEXOR pelo celular ou tablet.</p>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-4">
        <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 mb-2">
          <Smartphone className="h-5 w-5" />
          <span className="font-medium">Sistema Web Responsivo</span>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          O NEXOR é acessado pelo navegador do celular — não é necessário instalar nenhum aplicativo. 
          O sistema se adapta automaticamente ao tamanho da tela.
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Como acessar pelo celular</h3>
        <div className="space-y-2">
          {[
            "Abra o navegador do seu celular (Chrome, Safari, Edge)",
            "Digite ou cole o link do sistema",
            "Faça login com seu e-mail e senha",
            'Recomendamos salvar como "Atalho na Tela Inicial" para acesso rápido',
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
        <h3 className="text-lg font-semibold text-foreground mb-3">Diferenças no Mobile</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { title: "Menu Lateral", desc: "No celular, o menu lateral fica oculto. Toque no ícone ≡ para abri-lo." },
            { title: "Toque em vez de Clique", desc: "Use o toque nos botões e links. Botões são maiores para facilitar o uso." },
            { title: "Rolagem", desc: "Role a tela verticalmente para ver mais conteúdo em listas e tabelas longas." },
            { title: "Tabelas", desc: "Tabelas com muitas colunas podem ser roladas horizontalmente." },
          ].map((item, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <h4 className="font-medium text-foreground mb-1">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Adicionar à Tela Inicial</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-foreground mb-2">🤖 Android (Chrome)</h4>
              <ol className="text-sm text-muted-foreground space-y-1">
                <li>1. Toque nos 3 pontos (⋮) no canto superior</li>
                <li>2. Selecione "Adicionar à tela inicial"</li>
                <li>3. Confirme tocando em "Adicionar"</li>
              </ol>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-foreground mb-2">🍎 iPhone (Safari)</h4>
              <ol className="text-sm text-muted-foreground space-y-1">
                <li>1. Toque no ícone de compartilhar (□↑)</li>
                <li>2. Role e selecione "Adicionar à Tela de Início"</li>
                <li>3. Toque em "Adicionar"</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-4">
        <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 mb-2">
          <Info className="h-5 w-5" />
          <span className="font-medium">Dica de Desempenho</span>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Use Wi-Fi sempre que possível para melhor desempenho. Em conexões móveis (4G/5G), o sistema funciona 
          normalmente, mas pode ser mais lento em áreas com sinal fraco.
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Compatibilidade</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-foreground mb-2">🌐 Navegadores compatíveis</h4>
              <div className="space-y-1">
                {[
                  "Google Chrome (recomendado)",
                  "Safari (iOS/Mac)",
                  "Firefox",
                  "Microsoft Edge",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                    <span className="text-green-600 dark:text-green-400">✅</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-foreground mb-2">💻 Sistemas operacionais</h4>
              <div className="space-y-1">
                {[
                  "Android 8.0 ou superior",
                  "iOS 12 ou superior",
                  "Windows 10 ou superior",
                  "macOS 10.14 ou superior",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                    <span className="text-green-600 dark:text-green-400">✅</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};
