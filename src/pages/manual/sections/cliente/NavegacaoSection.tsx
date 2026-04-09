import { Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const NavegacaoSection = () => {
  return (
    <section id="navegacao" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">🧭 Navegação no Sistema</h2>
        <p className="text-muted-foreground">Conheça a estrutura e os elementos de navegação disponíveis para o perfil Cliente.</p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Estrutura da Tela Principal</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { title: "Barra Superior", desc: "Contém o logo do sistema e o menu do seu perfil (avatar) no canto direito." },
            { title: "Menu Lateral", desc: "Localizado à esquerda, exibe apenas os recursos disponíveis para o perfil Cliente." },
            { title: "Área de Conteúdo", desc: "Parte central da tela onde as informações e funcionalidades são exibidas." },
            { title: "Menu do Avatar", desc: "Clique no seu nome/foto no canto superior direito para acessar o manual e sair do sistema." },
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
        <h3 className="text-lg font-semibold text-foreground mb-3">Menu Principal (Perfil Cliente)</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2 font-medium text-foreground">Item do Menu</th>
                <th className="text-left p-2 font-medium text-foreground">Função</th>
              </tr>
            </thead>
            <tbody>
              {[
                { menu: "📋 Liberações", func: "Visualize suas compras liberadas pela Logística" },
                { menu: "📅 Agendamentos", func: "Crie e gerencie suas retiradas agendadas" },
                { menu: "🚚 Carregamentos", func: "Acompanhe o processo de carregamento em tempo real" },
                { menu: "📖 Manual", func: "Acesso a este manual de ajuda (via avatar)" },
              ].map((row, i) => (
                <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="p-2 text-foreground">{row.menu}</td>
                  <td className="p-2 text-muted-foreground">{row.func}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Como Navegar</h3>
        <div className="space-y-2">
          {[
            "Clique no item desejado no menu lateral para acessar a funcionalidade",
            "Use os botões e filtros disponíveis em cada tela para refinar as informações",
            "Navegue entre páginas usando os controles de paginação (quando disponível)",
            "Use o botão de voltar (←) para retornar à tela anterior",
            "No celular, toque no ícone ≡ para abrir/fechar o menu lateral",
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shrink-0 text-xs mt-0.5">
                {i + 1}
              </span>
              <span className="text-foreground">{tip}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Menu Lateral</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-foreground mb-2">🖥️ Web (Computador)</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Menu fixo à esquerda da tela</li>
                <li>• Pode ficar expandido (mostra ícones e textos) ou colapsado (mostra apenas ícones)</li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium text-foreground mb-2">📱 Mobile (Celular/Tablet)</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Menu fica oculto por padrão para aproveitar melhor o espaço da tela</li>
                <li>• Acesso através do ícone de menu (☰) no canto superior esquerdo</li>
                <li>• Fecha automaticamente ao selecionar uma opção</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-4">
        <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 mb-2">
          <Info className="h-5 w-5" />
          <span className="font-medium">Modo Escuro</span>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          O sistema suporta modo claro e escuro. A configuração segue automaticamente a preferência do seu dispositivo.
        </p>
      </div>
    </section>
  );
};
