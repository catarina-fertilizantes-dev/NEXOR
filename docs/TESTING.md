# NEXOR — Guia de Testes

## Visão Geral

O NEXOR possui três camadas de testes, cada uma com propósito e frequência diferentes:

```
┌─────────────────────────────────────────────────────┐
│  Camada 3 — UI (Playwright)                         │
│  O quê: fluxos reais no browser, por role           │
│  Quando: a cada push em develop (CI automático)     │
│  Onde: tests/ui/system/                             │
├─────────────────────────────────────────────────────┤
│  Camada 2 — Backend RLS (Node.js)                   │
│  O quê: permissões e lógica de negócio no banco     │
│  Quando: a cada push em develop/main (CI automático)│
│  Onde: tests/backend/                               │
├─────────────────────────────────────────────────────┤
│  Camada 1 — Build (Vite)                            │
│  O quê: compilação TypeScript sem erros             │
│  Quando: a cada push em main (CI automático)        │
│  Onde: workflow build-dist.yml                      │
└─────────────────────────────────────────────────────┘
```

---

## Como executar localmente

### Pré-requisitos
- Node.js 20+
- Microsoft Edge instalado (para testes UI locais)
- Acesso à internet (testes apontam para Supabase Dev e Vercel Preview)

### Testes de backend (RLS)
```bash
npm run test:rls
```
Roda `rls-full.mjs` (isolamento de dados por role) e `rls-security.mjs` (tentativas de acesso não autorizado). Não precisa de browser. Resultado em ~30 segundos.

### Testes de UI — fluxo normal
```bash
npm run test:ui
```
Roda navegação por role (03) e fluxo completo (04) contra `nexor-dev.vercel.app`. Abre o Edge com interface visível. Resultado em ~3–4 minutos.

### Testes de UI — relatório HTML
```bash
npx playwright show-report tests/ui/report
```
Abre o relatório detalhado do último teste no browser.

### Todos os testes
```bash
npm run test:all
```

---

## Quando executar cada teste

### Automático — GitHub Actions (sem ação sua)

| Evento | Testes disparados |
|--------|-------------------|
| Push em `develop` | RLS + UI (03 + 04) |
| Push em `main` | RLS + Build |
| Pull Request para `develop` ou `main` | RLS |

Os resultados aparecem no GitHub em **Actions → aba da execução**.

### Manual — quando você deve rodar

| Situação | Comando | Motivo |
|----------|---------|--------|
| Criou uma nova migration SQL | `npm run test:rls` | Verificar que RLS e funções continuam corretos |
| Vai fazer deploy para produção (`main`) | `npm run test:all` | Validação completa antes do merge |
| Banco Dev foi resetado/limpo | `npm run test:ui:setup` | Recriar dados de teste no banco |
| Mudou componente de UI ou página | `npm run test:ui` | Garantir que fluxos continuam funcionando |

### Quando resetar os dados de teste (test:ui:setup)

O setup (`01-admin-setup` + `02-change-passwords`) só precisa ser rodado quando o banco Dev for limpo ou quando os usuários/dados de teste forem deletados. Ele cria:
- 1 produto, 2 armazéns, 1 representante, 1 colaborador, 2 clientes
- Estoque nos dois armazéns
- 1 liberação (PEDIDO-TESTE-001)
- Realiza troca de senha do primeiro login para todos os usuários criados

Após o setup, as credenciais ficam salvas em `tests/ui/system/state.json`.

**Atenção:** nunca commite o `state.json` com senhas temporárias não trocadas. O CI usa o state.json do repositório.

---

## Cobertura atual dos testes

### Camada Backend (RLS) — `tests/backend/`

| Suite | O que testa | Status |
|-------|------------|--------|
| Isolamento de Estoque | Cada armazém/role vê apenas seu estoque | ✅ |
| Isolamento de Agendamentos | Cliente só vê seus próprios agendamentos | ✅ |
| Isolamento de Carregamentos | Isolamento por cliente/armazém | ✅ |
| Escritas não autorizadas em Produtos | Cliente/armazém não pode criar produto | ✅ |
| Leitura não autorizada de Colaboradores | Apenas admin lê colaboradores | ✅ |
| Escritas não autorizadas em Carregamentos | Cliente não pode alterar etapas diretamente | ✅ |
| RPCs sensíveis | alterar_armazem, cancelar_liberacao exigem role correto | ✅ |
| Lógica de estoque | Criação → liberação → cancelamento → invariantes | ✅ |

### Camada UI (Playwright) — `tests/ui/system/`

| Arquivo | Testes | O que cobre |
|---------|--------|------------|
| `01-admin-setup.spec.ts` | 12 | Cadastro completo via UI como admin |
| `02-change-passwords.spec.ts` | 5 | Troca de senha obrigatória no primeiro login |
| `03-navigation-by-role.spec.ts` | 12 | Menus visíveis e páginas acessíveis por role |
| `04-full-flow.spec.ts` | 8 | Isolamento de dados + fluxo Agendamento→Carregamento |
| `05-carregamento-etapas.spec.ts` | 9 | Progressão completa etapa 1→6; uploads de foto por etapa; sub-etapas 5a/5b/5c com diferentes roles; verificação de redução de estoque |
| `06-liberacao-cancelamento.spec.ts` | 5 | Cancelamento sem agendamentos; preview de impacto; cancelamento com agendamento ativo; acesso restrito (cliente não pode cancelar) |
| `07-agendamentos-avancados.spec.ts` | 6 | Representante cria agendamento; status parcialmente→totalmente agendada; validação de quantidade excessiva; isolamento rep vs clientes não-representados |
| `08-estoque-e-armazem.spec.ts` | 11 | Entrada de estoque (nova remessa com PDF+XML); verificação de aumento de quantidade; acesso restrito por role; alteração de armazém de liberação disponível; bloqueio para liberação totalmente agendada |

### Cenários ainda não cobertos por testes automatizados

Os itens abaixo devem ser **testados manualmente** antes de cada release (funcionalidades ainda não implementadas na UI):

- Cancelamento de agendamento
- Edição de cadastros (clientes, armazéns, produtos, representantes)

---

## Checklist de Release (antes de merge para `main`)

Execute este checklist antes de qualquer deploy para produção:

### Automático (verificar no GitHub Actions)
- [ ] Build passou sem erros de TypeScript
- [ ] Todos os testes de RLS estão verdes (57/57)
- [ ] Testes de UI passando (navegação + fluxo completo)

### Manual — Fluxos no nexor-dev.vercel.app

#### Carregamento completo
- [ ] Armazém avança carregamento da etapa 1 até 4
- [ ] Armazém faz upload de PDF+XML na etapa 5a (Docs. Retorno)
- [ ] Logística faz upload de PDF+XML na etapa 5b (Docs. Venda)
- [ ] Armazém faz upload de PDF+XML na etapa 5c (Docs. Remessa)
- [ ] Admin avança para etapa 6 (Finalizado)
- [ ] Verificar que estoque físico diminuiu no armazém correspondente

#### Cancelamento de liberação
- [ ] Cancelar liberação sem agendamentos → estoque retorna integral
- [ ] Cancelar liberação com agendamento pendente → desconta qty em andamento

#### Fluxo de representante
- [ ] Representante vê liberações dos clientes que representa
- [ ] Representante consegue criar agendamento para cliente que representa

#### Validações de formulários
- [ ] Liberação bloqueada quando quantidade > estoque disponível
- [ ] Agendamento bloqueado quando quantidade > quantidade disponível na liberação

---

## Adicionando novos testes

### Regra geral
- Toda nova **regra de RLS** ou **função SQL** → adicionar em `tests/backend/rls-full.mjs` ou `rls-security.mjs`
- Todo novo **fluxo de UI** ou **página** → adicionar em `tests/ui/system/`
- Após implementar cancelamento/edição de entidades via UI → adicionar em `04-full-flow.spec.ts` ou novo arquivo `05-*.spec.ts`

### Ao adicionar cenário de backend
```javascript
// Em rls-full.mjs ou rls-security.mjs
await test('Descrição do cenário', async () => {
  // login como role específico
  const { data, error } = await clienteClient
    .from('tabela')
    .select('*');
  assert(error !== null, 'Deve ser bloqueado por RLS');
});
```

### Ao adicionar cenário de UI
```typescript
// Em tests/ui/system/04-full-flow.spec.ts ou novo arquivo
test('Descrição do cenário', async ({ page }) => {
  await loginAs(page, state.users.cliente1!.email);
  // ... interações
  await expect(page.getByText('resultado esperado')).toBeVisible();
});
```

---

## Ambientes

| Ambiente | URL | Banco | Branch |
|----------|-----|-------|--------|
| Desenvolvimento | `nexor-dev.vercel.app` | Supabase Dev (`vxidpkrsfqyjwwdbvtwc`) | `develop` |
| Produção | URL Vercel prod | Supabase Prod (`sxfomgeddxokdxjazdtg`) | `main` |

**Os testes sempre rodam contra o ambiente Dev.** Nunca contra produção.
