# CHANGELOG — NEXOR Sistema Logístico

Todas as mudanças relevantes do projeto serão documentadas neste arquivo.

---

## [v0.5.0] — Refinamentos de UX/UI e Estabilidade

### Adicionado
- Componentes reutilizáveis: `ModalFooter`, `DocumentViewer`, `DocumentPreviewModal`,
  `CameraCapture`, `PasswordInput`
- Hooks utilitários: `useDocuments`, `useScrollToTop`, `useUnsavedChanges`, `usePhotoUpload`
- Utilitário de compressão de imagens (`imageCompression.ts`)
- Suporte a captura de foto diretamente pela câmera (`CameraCapture`, `PhotoCaptureMethod`)
- Suporte a upload de PDF e XML além de fotos em `CarregamentoDetalhe`
- Preview de XML formatado no `DocumentViewer`
- Alerta de alterações não salvas em todas as páginas principais
  (Agendamentos, Liberações, Colaboradores, Clientes, Armazéns, Produtos, Estoque)
- Identidade visual NEXOR: logo na sidebar e na tela de login, favicon personalizado
- Filtros com botão "Limpar Filtros" exibido apenas quando há filtros ativos
- `UserAvatar` com handler de signOut aprimorado e reposicionado no layout
- Página `NotFound` aprimorada com card layout e estilização
- GitHub Actions: workflow de build de inspeção (`.github/workflows/build-dist.yml`)

### Corrigido
- Responsividade: sidebar mobile, touch targets, breakpoints
- Limpeza de logs de debug em produção
- Múltiplas correções de bugs e restaurações de páginas com erro

---

## [v0.4.0] — Módulos Operacionais (Core do Sistema)

### Adicionado
- **Liberações** (`Liberacoes.tsx`): busca via Supabase, inserção, alteração de armazém,
  sistema de status, query universal com RPC
- Validação de estoque em Liberações antes de confirmar operação
- Navegação por parâmetros de URL entre Liberações e Estoque (deep link)
- **Agendamentos** (`Agendamentos.tsx`): integração com Supabase, query por role
  (cliente/representante), suporte ao role representante, campos obrigatórios atualizados
- **Carregamentos** (`Carregamentos.tsx`): substituição de dados mock por backend real,
  rastreamento de etapas, tracking de conclusão
- **CarregamentoDetalhe** (`CarregamentoDetalhe.tsx`): upload de fotos/documentos,
  visualização de arquivos, permissões por role, estatísticas,
  derivação visual de status das etapas

### Corrigido
- Fix de race condition no `usePermissions`
- Isolamento de dados por cliente

---

## [v0.3.0] — Módulos de Cadastro

### Adicionado
- **Armazéns** (`Armazens.tsx`): cadastro com campos de contato e capacidade,
  Edge Function `create-armazem-user`, estados de loading nas ações
- **Clientes** (`Clientes.tsx`): cadastro com validação de CNPJ/CPF,
  tratamento de duplicatas, normalização de CNPJ/CPF na camada de serviços,
  retorno de status 409 para CNPJ/CPF e e-mail duplicados,
  estados de loading nas ações
- **Representantes** (`Representantes.tsx`): listagem, gestão e filtro por cliente,
  dropdown de representante integrado na tela de Clientes
- **Produtos** (`Produtos.tsx`): cadastro com permissões por role, rota `/produtos`,
  políticas RLS restritas a admin/logística
  → Detalhes em [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
- **Estoque** (`Estoque.tsx` + `EstoqueDetalhe.tsx`): estoque por armazém,
  entradas, filtros, totalizadores
- Camada de serviços (`services layer`) para clientes e armazéns com
  tratamento de erros normalizado
- Link de acesso gerado e exibido no modal de credenciais ao criar usuário

### Alterado
- Removida tabela `profiles` — migração para modelo direto por entidade
  → Detalhes completos em [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
  → Resumo da refatoração em [REFACTOR_SUMMARY.md](./REFACTOR_SUMMARY.md)

### Removido
- Role `comercial` do sistema (0 usuários, não utilizado)
  → Migration: `supabase/migrations/20251124_remove_comercial_role.sql`
- Tabela legada `public.roles` (backup em `roles_backup_20251124`)
  → Migration: `supabase/migrations/20251124_drop_roles_table.sql`

---

## [v0.2.0] — Autenticação e Controle de Acesso

### Adicionado
- `AuthContext` com autenticação via Supabase
- Sistema de roles: admin, logística, armazém, cliente, representante
- Hook `usePermissions` para controle de acesso por perfil
- Tela de login (`AuthPage`) com logo NEXOR
- Tela de recuperação de senha (`ForgotPassword.tsx`) — fluxo base implementado
  ⚠️ processo com erros conhecidos, correção prevista no item 3.4 das pendências
- Troca de senha obrigatória no primeiro login (`ChangePassword`)
- Verificação de status ativo do usuário no login
- Validação de senha fraca sincronizada entre frontend e backend (`validationSchemas.ts`)
- Gestão de colaboradores (`Colaboradores.tsx`) com Edge Function `admin-users`
- `UserAvatar` component com handler de signOut

### Alterado
- Migração para modelo single-role

---

## [v0.1.0] — Estrutura Inicial do Projeto

### Adicionado
- Estrutura inicial do projeto React + Vite
- Configuração do Supabase (`supabase.ts`, `.env`, `.gitignore`)
- Configuração do Vercel (`vercel.json`)
- Componentes base: `AppSidebar`, `Layout`, `PageHeader`, `StatCard`
- Configuração de rotas em `App.tsx`
- README e documentação inicial

---

> ⚠️ Funcionalidades em desenvolvimento não estão incluídas neste log.
> Consulte o arquivo de pendências para funcionalidades planejadas.