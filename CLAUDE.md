# NEXOR — Guia de Contexto para Claude Code

## O que é NEXOR?

Sistema de gestão logística que coordena o fluxo completo de liberação, agendamento e carregamento de produtos entre clientes, representantes comerciais, armazéns e equipe de logística.

**Stack:**
- Frontend: React 18 + TypeScript + Vite + shadcn/ui + Tailwind CSS
- Backend: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- State: TanStack React Query
- Forms: React Hook Form + Zod
- Routing: React Router v6

## Ambientes

| Branch | Supabase | Vercel |
|--------|----------|--------|
| `main` | NEXOR Prod (`sxfomgeddxokdxjazdtg`) | Production |
| `develop` | NEXOR Dev (`vxidpkrsfqyjwwdbvtwc`) | Preview |

Credenciais locais em `.env.local`. Supabase CLI instalado.

## Papéis de Usuário (user_role)

| Role | Descrição | Acesso |
|------|-----------|--------|
| `admin` | Acesso total | Tudo (CRUD) — único role que acessa `/colaboradores` |
| `logistica` | Equipe interna | CRUD em Liberações, Agendamentos, Carregamentos, Clientes, Representantes, Armazéns, Produtos, Estoque. Sem acesso a Colaboradores (página admin-only). |
| `armazem` | Operador de armazém | Agendamentos (read) + Carregamentos (read/update) + Estoque (read). Sem acesso a Liberações, Clientes, Representantes, Colaboradores, Produtos. |
| `cliente` | Cliente externo | Liberações (read, próprias) + Agendamentos (create/read, próprios) + Carregamentos (read, próprios). Sem acesso a Estoque, Clientes, Representantes, Colaboradores, Produtos. |
| `representante` | Representante comercial | Mesmas permissões que `cliente`, mas aplicadas a todos os clientes que representa. Pode criar Agendamentos e visualizar Liberações/Carregamentos de todos os seus clientes. |

Permissões granulares reforçadas por RLS no banco. Cada role vê no menu lateral apenas as páginas às quais tem acesso.

## Entidades Principais

### Fluxo Operacional (ordem de execução)

```
Liberação → Agendamento → Carregamento
```

1. **Liberação** — Admin/Logística autoriza uma quantidade de produto para um cliente retirar de um armazém.
   - Statuses: `disponivel` → `parcialmente_agendada` → `totalmente_agendada` → `finalizada` / `cancelada`
   - Campos chave: `quantidade_liberada`, `quantidade_retirada`, `pedido_interno`
   - Validação inline: a quantidade da liberação não pode exceder o estoque disponível no armazém selecionado

2. **Agendamento** — Cliente ou representante agenda a data/horário de retirada com dados do caminhão e motorista.
   - Statuses: `pendente` → `em_andamento` → `concluido` → `cancelado`
   - Campos obrigatórios: `data_retirada`, `placa` (caminhão), `placaCarreta1`, `motorista_nome`, `motorista_documento` (CPF), `transportadora`, `cnpj_transportadora`
   - Campo opcional: `placaCarreta2`, `observacoes`
   - Ao criar um agendamento, o sistema cria automaticamente o Carregamento correspondente via trigger `insert_carregamento_from_agendamento` (SECURITY DEFINER)

3. **Carregamento** — Operação física de carregamento no armazém. Avança por 6 etapas:
   - `1 - Chegada` → `2 - Início Carregamento` → `3 - Carregando` → `4 - Carregamento Finalizado` → `5 - Documentação` → `6 - Finalizado`
   - A etapa 5 (Documentação) tem 3 sub-etapas com upload obrigatório de PDF + XML por role específico:
     - `5a - Docs. Retorno`: armazém anexa Nota de Retorno + XML
     - `5b - Docs. Venda`: logística/admin anexa Nota de Venda + XML
     - `5c - Docs. Remessa`: armazém anexa Nota de Remessa + XML
   - Ao atingir etapa 6 (Finalizado), o trigger reduz o `quantidade` (físico) do estoque
   - Suporta upload de fotos em cada etapa

### Entidades de Cadastro

- **Produtos** — Catálogo com unidade (`t` toneladas ou `kg`), gerenciado por admin/logística
- **Armazéns** — Localizações físicas, cada uma linkada a um usuário `armazem`
- **Clientes** — Organizações clientes, cada uma pode ter um usuário `cliente`; opcionalmente vinculados a um representante
- **Representantes** — Vendedores externos; podem representar múltiplos clientes
- **Colaboradores** — Staff interno (admin/logística); página acessível **somente por admin**
- **Estoque** — Tabela junction `produto_id + armazem_id`, dois campos distintos:
  - `quantidade` — estoque físico real (decrementado ao finalizar carregamento)
  - `quantidade_disponivel` — físico menos comprometimentos de liberações ativas (decrementado ao criar liberação, restaurado ao cancelar)
  - Entrada de estoque requer: Número da Remessa, Nota de Remessa (PDF) e Arquivo XML da Remessa

## Documentação de Referência

- **`docs/UI-STANDARDS.md`** — Padrões visuais e de UX do sistema. Consultar **sempre** antes de implementar qualquer componente, página ou funcionalidade nova. Cobre: textos e variantes de botões, empty states, alertas, badges de status, listas colapsáveis, toasts, tooltips, formulários, ícones por entidade e checklist pré-PR.
- **`docs/TESTING.md`** — Estratégia de testes, quando rodar cada suite, cobertura atual e checklist de release.

## Arquitetura de Arquivos

```
src/
  pages/           # Uma página por entidade principal
  components/      # Componentes reutilizáveis
  components/ui/   # shadcn/ui components (não editar)
  contexts/        # AuthContext (auth state global)
  hooks/           # usePermissions, useDocuments, etc.
  integrations/supabase/  # client.ts + types gerados
  lib/             # utils, validationSchemas
```

## Padrões de Código

- Queries via `useQuery` do TanStack React Query com `supabase` client
- Permissões verificadas com `usePermissions()` → `canAccess(resource, action)`
- Toast via `sonner` para feedback ao usuário
- Formulários com `react-hook-form` + schemas Zod em `src/lib/validationSchemas.ts`
- Tipos do banco gerados em `src/integrations/supabase/types.ts` — regenerar com `supabase gen types` após migrations
- Formulários de criação estão em Dialogs (não inline na página) — sempre clicar no botão trigger antes de preencher campos

## Criação de Usuários

Usuários de `armazem`, `cliente` e `representante` criados via Edge Functions com senha temporária:
- `create-customer-user`, `create-armazem-user`, `create-representante-user`
- Geram senha temporária aleatória + setam metadata `force_password_change: true`
- Primeiro login redireciona para `/change-password`
- Após trocar a senha, o sistema faz sign out e redireciona para `/auth` — o usuário deve logar novamente com a nova senha

Usuários de `admin` e `logistica` (Colaboradores) criados diretamente na página `/colaboradores` (admin-only):
- Senha definida diretamente no formulário (sem senha temporária, sem force_password_change)
- Usa a Edge Function `admin-users` internamente

## Funções SQL Importantes

- `get_quantidade_disponivel_liberacao(liberacao_uuid uuid)` — quantidade não agendada de uma liberação
- `alterar_armazem_liberacao(id, novo_armazem_id)` — mover liberação entre armazéns
- `check_user_active_status(user_id)` — valida se usuário está ativo no login
- `cancelar_liberacao(id)` — cancela liberação e retorna `quantidade_liberada − quantidade_retirada − qty_em_andamento` ao `quantidade_disponivel` do estoque
- `calcular_cancelamento_liberacao(id)` — preview read-only do cálculo de cancelamento (sem side effects)
- `can_upload_foto_for_carregamento(id)` — RLS para uploads de fotos
- `insert_carregamento_from_agendamento()` — trigger SECURITY DEFINER; cria carregamento automaticamente ao inserir agendamento

## Comandos Úteis

```bash
# Gerar tipos após mudança no schema
supabase gen types typescript --project-id vxidpkrsfqyjwwdbvtwc > src/integrations/supabase/types.ts

# Nova migration
supabase migration new nome_da_migration

# Aplicar migrations no Dev
supabase db push --linked

# Ver diff entre local e dev
supabase db diff --linked

# Dev server
npm run dev
```
