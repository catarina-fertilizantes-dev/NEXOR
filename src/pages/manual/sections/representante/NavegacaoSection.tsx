import { Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const NavegacaoSection = () => {
  return (
    <section id="navegacao" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">🧭 Navegação no Sistema</h2>
        <p className="text-muted-foreground">Conheça a estrutura e os elementos de navegação disponíveis para o perfil Representante.</p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Estrutura da Tela Principal</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { title: "Barra Superior", desc: "Contém o logo do sistema e o menu do seu perfil (avatar) no canto direito." },
            { title: "Menu Lateral", desc: "Localizado à esquerda, exibe apenas os recursos disponíveis para o perfil Representante." },
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
        <h3 className="text-lg font-semibold text-foreground mb-3">Menu Principal (Perfil Representante)</h3>
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
                { menu: "📋 Liberações", func: "Visualize as liberações de todos os clientes que você representa" },
                { menu: "📅 Agendamentos", func: "Crie e gerencie retiradas agendadas em nome dos clientes" },
                { menu: "🚚 Carregamentos", func: "Acompanhe o processo de carregamento em tempo real" },
                { menu: "📖 Manual", func: "Acesso a este manual de ajuda" },
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

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Glossário Básico</h3>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border px-4 py-2 text-left font-semibold">Termo</th>
                    <th className="border px-4 py-2 text-left font-semibold">Significado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border px-4 py-2 font-medium">Modal</td>
                    <td className="border px-4 py-2">Janela que abre sobre a tela atual para entrada de dados ou confirmação</td>
                  </tr>
                  <tr>
                    <td className="border px-4 py-2 font-medium">Filtro</td>
                    <td className="border px-4 py-2">Ferramenta para selecionar e exibir apenas os registros desejados</td>
                  </tr>
                  <tr>
                    <td className="border px-4 py-2 font-medium">Paginação</td>
                    <td className="border px-4 py-2">Divisão de uma lista em páginas para facilitar a visualização</td>
                  </tr>
                  <tr>
                    <td className="border px-4 py-2 font-medium">Status</td>
                    <td className="border px-4 py-2">Situação atual de um registro (ex: Pendente, Confirmado, Cancelado)</td>
                  </tr>
                  <tr>
                    <td className="border px-4 py-2 font-medium">Timestamp</td>
                    <td className="border px-4 py-2">Data e hora em que uma ação foi registrada no sistema</td>
                  </tr>
                  <tr>
                    <td className="border px-4 py-2 font-medium">Anexo</td>
                    <td className="border px-4 py-2">Arquivo (imagem, PDF) vinculado a um registro</td>
                  </tr>
                  <tr>
                    <td className="border px-4 py-2 font-medium">Placeholder</td>
                    <td className="border px-4 py-2">Texto de exemplo exibido em campos de entrada antes de digitar</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
