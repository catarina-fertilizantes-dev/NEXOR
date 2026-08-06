# CHANGELOG — NEXOR Sistema Logístico

Todas as mudanças relevantes do projeto serão documentadas neste arquivo.

> Changelog técnico (uso interno/dev). Para a versão resumida em linguagem
> simples exibida dentro do sistema, ver `src/data/changelog.ts`.

---

## [v2.0.0] — Dashboards, Segurança e Padronização de UX (em desenvolvimento, ainda não publicado em produção)

### Adicionado
- Dashboards personalizados por perfil: **Logística/Admin** (`DashboardLogistica.tsx`),
  **Armazém** (`DashboardArmazem.tsx`) e **Cliente/Representante**, com widgets,
  tooltips, listas de nomes e cards clicáveis com deep-link para as páginas relacionadas
- Redesenho do dashboard de Logística alinhado ao mockup de referência (seções,
  títulos e formato), com rótulos descritivos por etapa no Funil/Armazéns por Etapa
- Cancelamento de Liberação com devolução de estoque (`cancelar_liberacao`),
  incluindo bloqueio quando já há carregamento iniciado e opção de apenas
  alterar a quantidade nesse caso
- Identidade visual por página (Liberações/Agendamentos/Carregamentos) com cards
  compactos e hierarquia visual de botões (primário/secundário)
- Dicas e tooltips clicáveis estendidos a toda a interface (cards, dashboards,
  estoque, produtos, detalhe de carregamento), incluindo suporte a toque em mobile
- Suíte completa de testes automatizados: RLS/backend (`tests/backend/`) e UI via
  Playwright (`tests/ui/system/`), com workflow de CI (`.github/workflows/`)
- Documentação: `docs/UI-STANDARDS.md` (padrões visuais) e `docs/TESTING.md`
  (estratégia de testes)
- Auditoria e remoção de 5 funções mortas do Supabase

### Alterado
- Timeline de Carregamento simplificada: etapa visual 6 removida do stepper,
  painel "Processo Finalizado" exibido automaticamente ao concluir a etapa 5;
  status renomeado de "Finalizado" para "Processo Finalizado" na listagem
- Status "finalizada" da Liberação agora é persistido no banco (antes era só
  calculado na tela)
- RPCs `get_*_universal` reescritas para derivar autorização de `auth.uid()`
  em vez de parâmetro recebido do cliente
- Estados vazios, ícones de alerta e botões de modal padronizados conforme
  `UI-STANDARDS.md` em todas as páginas principais

### Corrigido
- 8 vulnerabilidades críticas de RLS/RPC corrigidas: escalonamento de
  privilégio em `update_user_role` e vazamento de dados entre clientes via
  RPCs `get_*_universal`
- Upload de fotos das etapas de carregamento (RLS bloqueava nomes de arquivo
  com subpasta)
- Loop de reabertura de modal via deep-link, filtros presos na URL e métricas
  incorretas no dashboard
- Validação de tamanho e tipo de arquivo antes do upload para o Storage
- Credenciais de teste (Playwright) movidas de valores hardcoded para
  variáveis de ambiente/secrets

---

## [v1.4.0] — Estabilidade de Sessão

### Corrigido
- Reatribuição de sessão após renovação de token (refresh token) na página
  de Clientes, evitando erro de sessão expirada durante o uso

---

## [v1.3.0] — Central de Manuais do Usuário

### Adicionado
- Manual do Usuário completo para os 4 perfis com acesso: **Armazém**,
  **Cliente**, **Representante** e **Logística**, com navegação por seções,
  busca (Ctrl+F) e âncoras de URL
- Estrutura de seções reorganizada em pastas por perfil
  (`src/pages/manual/sections/{armazem,cliente,representante,logistica,shared,usuarios}`)
- Acesso aos manuais a partir do menu do avatar, condicional por perfil

### Corrigido
- Diversas correções de conteúdo nas seções de Introdução, Navegação,
  Agendamentos e Carregamentos do Manual do Cliente
- Re-exports quebrados substituídos por conteúdo real nas seções
  compartilhadas e de usuários

---

## [v1.2.0] — Estabilização de Carregamentos, Estoque e Armazéns

### Corrigido
- Validação de perfil de usuário (`userRole`) para valores nulos em
  `CarregamentoDetalhe`
- Simplificação da lógica de renderização da página de Detalhe de Carregamento
  após instabilidade identificada em produção
- Refinamentos na atualização de estoque disponível (`quantidade_disponivel`)
  em `Estoque.tsx`, incluindo validação do campo "Número da Remessa"
- Ajustes no fluxo de criação de Armazém (validação e tratamento de erros)
- Nome de exibição do usuário (armazém/cliente/representante) buscado
  diretamente da tabela da entidade em `UserAvatar`

---

## [v1.1.0] — Refinamento de UX em Liberações e Estoque

### Alterado
- Combobox de armazém em Liberações (Nova Liberação e Alteração de Armazém)
  passa a exibir o nome em linha única com truncamento dinâmico
- Ajustes de layout em diálogos e campos de seleção (`SelectTrigger`,
  `SelectContent`, `DialogContent`) para melhor responsividade

### Corrigido
- Bug de truncamento no combobox de armazém em Nova Liberação
- URLs absolutas fixas (hardcoded) substituídas por rotas relativas em Liberações

---

## [v1.0.0] — Lançamento Inicial

> Consolida o que antes era documentado como v0.1.0–v0.5.0: primeira versão
> do NEXOR colocada em produção.

### Estrutura Inicial do Projeto
- Estrutura inicial React + Vite, configuração do Supabase (`supabase.ts`,
  `.env`, `.gitignore`) e do Vercel (`vercel.json`)
- Componentes base: `AppSidebar`, `Layout`, `PageHeader`, `StatCard`
- Configuração de rotas em `App.tsx`

### Autenticação e Controle de Acesso
- `AuthContext` com autenticação via Supabase e sistema de roles: admin,
  logística, armazém, cliente, representante
- Hook `usePermissions` para controle de acesso por perfil
- Tela de login (`AuthPage`), recuperação de senha (`ForgotPassword.tsx`) e
  troca de senha obrigatória no primeiro login (`ChangePassword`)
- Verificação de status ativo do usuário no login
- Gestão de colaboradores (`Colaboradores.tsx`) com Edge Function `admin-users`
- Migração para modelo single-role

### Módulos de Cadastro
- **Armazéns**: cadastro com campos de contato e capacidade, Edge Function
  `create-armazem-user`
- **Clientes**: cadastro com validação de CNPJ/CPF, tratamento de duplicatas
- **Representantes**: listagem, gestão e filtro por cliente
- **Produtos**: cadastro com permissões por role, políticas RLS restritas a
  admin/logística
- **Estoque**: estoque por armazém, entradas, filtros, totalizadores
- Camada de serviços (`services layer`) para clientes e armazéns
- Remoção da tabela `profiles` — migração para modelo direto por entidade
- Remoção do role `comercial` e da tabela legada `public.roles`

### Módulos Operacionais (Core do Sistema)
- **Liberações**: busca via Supabase, inserção, alteração de armazém, sistema
  de status, validação de estoque antes de confirmar operação
- **Agendamentos**: integração com Supabase, query por role
  (cliente/representante), campos obrigatórios
- **Carregamentos**: rastreamento de etapas, tracking de conclusão
- **CarregamentoDetalhe**: upload de fotos/documentos, permissões por role,
  derivação visual de status das etapas

### Refinamentos de UX/UI e Estabilidade
- Componentes reutilizáveis: `ModalFooter`, `DocumentViewer`,
  `DocumentPreviewModal`, `CameraCapture`, `PasswordInput`
- Suporte a captura de foto pela câmera e upload de PDF/XML em
  `CarregamentoDetalhe`, com preview de XML formatado
- Alerta de alterações não salvas nas páginas principais
- Identidade visual NEXOR: logo na sidebar e no login, favicon personalizado
- Responsividade: sidebar mobile, touch targets, breakpoints

---

> ⚠️ Funcionalidades em desenvolvimento não estão incluídas neste log até
> serem mergeadas em produção.
