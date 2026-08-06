// Changelog amigável exibido no sistema (menu do avatar). Para o histórico
// técnico completo, ver CHANGELOG.md na raiz do repositório.

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  highlights: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "2.0.0",
    date: "Julho de 2026",
    title: "Novos painéis, mais segurança e visual renovado",
    highlights: [
      "Painéis personalizados com indicadores para cada perfil (Logística, Armazém, Cliente/Representante)",
      "Cancelamento de liberação agora devolve o estoque automaticamente",
      "Visual renovado dos cards de Liberações, Agendamentos e Carregamentos",
      "Dicas explicativas disponíveis em qualquer parte da tela, inclusive no celular",
      "Etapa final do carregamento simplificada — o processo é concluído automaticamente",
      "Reforço na proteção dos dados entre clientes e usuários",
      "Diversas correções de estabilidade e usabilidade",
    ],
  },
  {
    version: "1.4.0",
    date: "Junho de 2026",
    title: "Estabilidade de sessão",
    highlights: ["Correção de instabilidade de sessão em algumas telas"],
  },
  {
    version: "1.3.0",
    date: "Abril de 2026",
    title: "Central de Manuais do Usuário",
    highlights: [
      "Novo Manual do Usuário disponível para todos os perfis, acessível pelo menu do avatar",
    ],
  },
  {
    version: "1.2.0",
    date: "Março de 2026",
    title: "Estabilização de Carregamentos, Estoque e Armazéns",
    highlights: [
      "Melhorias de estabilidade nas telas de Carregamentos, Estoque e Armazéns",
    ],
  },
  {
    version: "1.1.0",
    date: "Março de 2026",
    title: "Melhorias em Liberações e Estoque",
    highlights: [
      "Melhorias visuais na seleção de armazém ao criar ou alterar Liberações",
    ],
  },
  {
    version: "1.0.0",
    date: "2026",
    title: "Lançamento inicial do NEXOR",
    highlights: [
      "Liberações, Agendamentos e Carregamentos",
      "Cadastros de Clientes, Representantes, Armazéns e Produtos",
      "Controle de Estoque por armazém",
    ],
  },
];
