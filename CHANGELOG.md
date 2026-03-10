# CHANGELOG — NEXOR Sistema Logístico

Todas as mudanças relevantes do projeto serão documentadas neste arquivo.

---

## [v0.5.0] — Refinamentos de UX/UI e Estabilidade

### Adicionado
- Componentes reutilizáveis: `ModalFooter`, `DocumentViewer`, `DocumentPreviewModal`,
  `CameraCapture`, `PasswordInput`
- Hooks utilitários: `useDocuments`, `useScrollToTop`, `useUnsavedChanges`, `usePhotoUpload`
- Utilitário de compressão de imagens (`imageCompression.ts`)
- Alerta de alterações não salvas em Agendamentos, Liberações e Colaboradores
- Identidade visual NEXOR: logo na sidebar e na tela de login, favicon personalizado
- Filtros com botão "Limpar Filtros" em todas as páginas
- Página `NotFound` aprimorada

### Corrigido
- Responsividade: sidebar mobile, touch targets, breakpoints
- Limpeza de logs de debug em produção
- Múltiplas correções de bugs e restaurações de páginas com erro

---

## [v0.4.0] — Módulos Operacionais (Core do Sistema)

### Adicionado
- **Liberações** (`Liberacoes.tsx`): busca via Supabase, inserção, alteração de armazém,
  sistema de status, query universal com RPC
- **Agendamentos** (`Agendamentos.tsx`): integração com Supabase, query por role
  (cliente/representante), campos obrigatórios atualizados
- **Carregamentos** (`Carregamentos.tsx`): substituição de dados mock por backend real,
  rastreamento de etapas, tracking de conclusão
- **CarregamentoDetalhe** (`CarregamentoDetalhe.tsx`): upload de fotos/documentos,
  visualização de arquivos, permissões por role, estatísticas

### Corrigido
- Fix de race condition no `usePermissions`
- Isolamento de dados por cliente

---

## [v0.3.0] — Módulos de Cadastro

### Adicionado
- **Armazéns** (`Armazens.tsx`): cadastro com campos de contato e capacidade,
  Edge Function `create-armazem-user`
- **Clientes** (`Clientes.tsx`): cadastro com validação de CNPJ/CPF,
  tratamento de duplicatas
- **Representantes** (`Representantes.tsx`): listagem e gestão
- **Produtos** (`Produtos.tsx`): cadastro com permissões por role, rota `/produtos`
  Políticas RLS restritas a admin/logística
  → Detalhes em [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
- **Estoque** (`Estoque.tsx` + `EstoqueDetalhe.tsx`): estoque por armazém,
  entradas, filtros, totalizadores

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
- Troca de senha obrigatória no primeiro login (`ChangePassword`)
- Verificação de status ativo do usuário no login
- Gestão de colaboradores (`Colaboradores.tsx`) com Edge Function `admin-users`

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