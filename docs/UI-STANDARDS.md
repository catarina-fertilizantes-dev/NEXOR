# NEXOR — Padrões de UI/UX

Documento de referência para manter consistência visual e de experiência em todo o sistema. Toda nova implementação deve seguir estes padrões. Toda modificação de componente existente deve verificar se está em conformidade.

---

## 1. Botões

### 1.1 Variantes

| Uso | Variante / Classe | Exemplo |
|-----|-------------------|---------|
| Ação principal (criar, salvar, confirmar) | `className="btn-primary"` | "Criar Liberação", "Salvar" |
| Ação secundária (fechar, cancelar, voltar) | `className="btn-secondary"` | "Fechar", "Cancelar" |
| Ação destrutiva (excluir, cancelar permanentemente) | `variant="destructive"` | "Confirmar Cancelamento", "Excluir" |

> Não misturar `className="btn-*"` com `variant="*"` no mesmo contexto. Botões destrutivos sempre usam `variant="destructive"` do shadcn/ui.

### 1.2 Texto dos botões por contexto

**Formulários de criação (dentro de Dialog):**
- Confirmar: `"Criar [Entidade]"` — ex: "Criar Liberação", "Criar Agendamento", "Criar Produto"
- Desistir: `"Cancelar"`

**Modais de confirmação de ação destrutiva** (cancelar liberação, excluir registro):
- Confirmar: `"Confirmar [Ação]"` — ex: "Confirmar Cancelamento"
- Desistir: `"Cancelar"` (btn-secondary)

**Modais informativos / de detalhe** (visualização de dados, detalhes sem ação):
- Fechar: `"Fechar"` (btn-secondary)

**Páginas de detalhe** (CarregamentoDetalhe, EstoqueDetalhe — são páginas completas, não modais):
- Navegação de retorno: `"Voltar"` (btn-secondary) via prop `backButton` do PageHeader

### 1.3 Tamanho mínimo (mobile-first)
Todos os botões devem ter `min-h-[44px] max-md:min-h-[44px]` para garantir área de toque adequada em dispositivos móveis.

---

## 2. Estados Vazios (Empty State)

### 2.1 Regra geral
Toda listagem sem registros deve exibir um **rich empty state**: mensagem explicativa + botão de ação inline (quando o usuário pode criar registros naquele contexto).

### 2.2 Quando incluir botão de ação inline

| Página | Tem CTA inline? | Motivo |
|--------|----------------|--------|
| Liberações | Sim — "Nova Liberação" | Usuário cria liberações |
| Agendamentos | Sim — "Novo Agendamento" | Usuário cria agendamentos |
| Estoque | Sim — "Entrada de Estoque" | Usuário registra entradas |
| Produtos | Sim — "Novo Produto" | Usuário cria produtos |
| Clientes | Sim — "Novo Cliente" | Usuário cria clientes |
| Representantes | Sim — "Novo Representante" | Usuário cria representantes |
| Armazéns | Sim — "Novo Armazém" | Usuário cria armazéns |
| Colaboradores | Sim — "Novo Colaborador" | Usuário cria colaboradores |
| Carregamentos | Não | Carregamentos são criados automaticamente pelo sistema |

### 2.3 Estrutura do empty state

```tsx
// Estrutura padrão
<div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
  <div className="rounded-full bg-muted p-4">
    <[IconeDaEntidade] className="h-8 w-8 text-muted-foreground" />
  </div>
  <div className="space-y-1">
    <h3 className="font-semibold text-foreground">Nenhum(a) [entidade] encontrado(a)</h3>
    <p className="text-sm text-muted-foreground">
      [Texto explicativo curto sobre o que fazer]
    </p>
  </div>
  {/* Somente quando há CTA */}
  <Button className="btn-primary" onClick={abrirModal}>
    <Plus className="h-4 w-4 mr-2" />
    [Ação]
  </Button>
</div>
```

### 2.4 Empty state em sublistas (ex: lista filtrada sem resultados)
Usar texto simples sem botão:
```tsx
<p className="text-center text-sm text-muted-foreground py-8">
  Nenhum resultado encontrado para os filtros aplicados.
</p>
```

---

## 3. Alertas e Avisos dentro de Modais

### 3.1 Regra por gravidade

| Tipo | Cor de fundo | Ícone | Cor do ícone | Quando usar |
|------|-------------|-------|-------------|-------------|
| **Destrutivo** | `bg-red-50 border-red-200` | `XCircle` | `text-red-600` | Ações irreversíveis: cancelar liberação, excluir registros |
| **Atenção** | `bg-amber-50 border-amber-200` | `AlertTriangle` | `text-amber-600` | Avisos importantes sem destruir dados: alterar armazém, reatribuir |
| **Informativo** | `bg-blue-50 border-blue-200` | `AlertCircle` | `text-blue-600` | Informações neutras relevantes para a ação |

### 3.2 Estrutura do bloco de aviso

```tsx
<div className="p-3 bg-[cor]-50 border border-[cor]-200 rounded-lg">
  <div className="flex items-start gap-2">
    <[Ícone] className="h-4 w-4 text-[cor]-600 shrink-0 mt-0.5" />
    <div className="text-sm">
      <p className="font-medium text-[cor]-800">[Título curto]</p>
      <p className="text-[cor]-700 text-xs mt-1">[Descrição detalhada]</p>
      {/* ou lista */}
      <ul className="text-[cor]-700 text-xs space-y-1 list-disc list-inside mt-1">
        <li>[Item 1]</li>
      </ul>
    </div>
  </div>
</div>
```

---

## 4. Badges de Status

### 4.1 Padrão de cores (sem dark mode por ora)

**Liberações:**
| Status | Classes |
|--------|---------|
| `disponivel` | `bg-green-100 text-green-800` |
| `parcialmente_agendada` | `bg-yellow-100 text-yellow-800` |
| `totalmente_agendada` | `bg-blue-100 text-blue-800` |
| `finalizada` | `bg-gray-100 text-gray-600` |
| `cancelada` | `bg-red-100 text-red-800` |

**Agendamentos:**
| Status | Classes |
|--------|---------|
| `pendente` | `bg-yellow-100 text-yellow-800` |
| `em_andamento` | `bg-blue-100 text-blue-800` |
| `concluido` | `bg-green-100 text-green-800` |
| `cancelado` | `bg-red-100 text-red-800` |

**Carregamentos (por etapa):**
| Etapa | Classes |
|-------|---------|
| 1–2 (chegada/início) | `bg-yellow-100 text-yellow-800` |
| 3–4 (carregando/finalizado) | `bg-blue-100 text-blue-800` |
| 5 (documentação) | `bg-amber-100 text-amber-800` |
| 6 (finalizado) | `bg-green-100 text-green-800` |

### 4.2 Regra semântica de cores
- **Verde** (`green`) — concluído, disponível, aprovado
- **Amarelo** (`yellow`) — pendente, aguardando ação
- **Azul** (`blue`) — em andamento, em processo
- **Âmbar** (`amber`) — atenção, etapa intermediária
- **Vermelho** (`red`) — cancelado, erro, bloqueado
- **Cinza** (`gray`) — finalizado/arquivado, inativo

---

## 5. Listas Colapsáveis (Finalizados / Cancelados)

### 5.1 Regra
- **Itens finalizados**: exibidos em seção colapsável no final da listagem, colapsada por padrão.
- **Itens cancelados**: exibidos em seção colapsável no final, colapsada por padrão. Apenas em páginas onde o cancelamento é uma ação do usuário (atualmente: Liberações). Agendamentos e Carregamentos cancelados via cancelamento de liberação não precisam ser exibidos.

### 5.2 Estrutura padrão do header colapsável

```tsx
// Header de "Finalizados"
<button
  onClick={() => setExpandido(!expandido)}
  className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
>
  <div className="flex items-center gap-2">
    <CheckCircle className="h-4 w-4 text-gray-500" />
    <span className="text-sm font-medium text-gray-700">
      Finalizados ({count})
    </span>
  </div>
  <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${expandido ? 'rotate-180' : ''}`} />
</button>

// Header de "Cancelados"
<button
  onClick={() => setExpandido(!expandido)}
  className="w-full flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
>
  <div className="flex items-center gap-2">
    <XCircle className="h-4 w-4 text-red-500" />
    <span className="text-sm font-medium text-red-700">
      Cancelados ({count})
    </span>
  </div>
  <ChevronDown className={`h-4 w-4 text-red-500 transition-transform ${expandido ? 'rotate-180' : ''}`} />
</button>
```

---

## 6. Toasts de Feedback

### 6.1 Formato padrão

**Sucesso:**
```ts
toast({
  title: "[Entidade] [ação] com sucesso!",
  // Ex: "Liberação criada com sucesso!", "Estoque atualizado com sucesso!"
  description: "[Detalhe relevante — nome, pedido, quantidade]",
});
```

**Erro:**
```ts
toast({
  title: "Erro ao [ação]",
  // Ex: "Erro ao criar liberação", "Erro ao cancelar agendamento"
  description: error.message || "Tente novamente ou contate o suporte.",
  variant: "destructive",
});
```

**Aviso (sem ser erro):**
```ts
toast({
  title: "[Situação]",
  description: "[O que o usuário deve fazer]",
});
```

### 6.2 Regras de tom
- Sempre em português
- Título: curto, assertivo, sem pontuação excessiva além do "!"
- Descrição: uma linha, contextual — não repetir o título
- Nunca expor stack traces ou mensagens técnicas ao usuário

---

## 7. PageHeader

### 7.1 Uso em páginas de listagem

```tsx
<PageHeader
  title="[Nome da Página]"
  subtitle="[Descrição curta ou contagem de registros]"
  icon={[IconeRelevante]}
  actions={
    <Button className="btn-primary" onClick={abrirModal}>
      <Plus className="h-4 w-4 mr-2" />
      [Ação principal]
    </Button>
  }
/>
```

### 7.2 Uso em páginas de detalhe (CarregamentoDetalhe, EstoqueDetalhe)

```tsx
<PageHeader
  title="[Título do detalhe]"
  subtitle="[Identificador ou descrição]"
  icon={[Ícone]}
  backButton  // prop booleana — renderiza botão "Voltar" integrado
/>
```

> Páginas de detalhe usam `backButton`, não incluem `actions` com botão de voltar.

---

## 8. Tooltips

### 8.1 Quando usar
- Em campos com valores que podem ser ambíguos (ex: "Estoque Físico" vs "Estoque Disponível")
- Em badges de status para explicar o que significa cada estado
- Em ícones de ação sem label visível
- Em barras de progresso e métricas

### 8.2 Quando não usar
- Em botões com label textual claro
- Em campos com label e placeholder descritivos
- Em textos que já são auto-explicativos

### 8.3 Padrão de implementação
```tsx
<TooltipProvider>
  <Tooltip delayDuration={100}>
    <TooltipTrigger asChild>
      <span>[Conteúdo que recebe tooltip]</span>
    </TooltipTrigger>
    <TooltipContent>
      <p>[Explicação curta e clara]</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

---

## 9. Formulários

### 9.1 Campos obrigatórios
- Label deve ter `*` ao final: `"Nome do Cliente *"`
- O campo de formulário sem preenchimento deve manter o botão de submit desabilitado
- Não usar mensagens de erro inline durante digitação — só após tentativa de submit ou blur

### 9.2 Placeholders
Todo campo de input deve ter `placeholder` descritivo:
- Input de texto: `placeholder="Ex: [exemplo real]"`
- Select: `placeholder="Selecione [o quê]"`
- Textarea: `placeholder="Digite [o quê]..."`

### 9.3 Labels
Todo campo deve ter `<Label>` associado com `htmlFor` correspondente ao `id` do input.

### 9.4 Upload de arquivos
- Campos de arquivo (PDF, XML, imagem) devem exibir confirmação visual após seleção:
  ```tsx
  {arquivo && (
    <Badge variant="secondary">✓ {arquivo.name}</Badge>
  )}
  ```
- Botão de upload deve mudar texto após seleção: "Anexar PDF" → "Alterar PDF"

---

## 10. Ícones por Entidade

Usar ícones consistentes para cada entidade em todo o sistema (PageHeader, empty states, menus, badges):

| Entidade | Ícone |
|----------|-------|
| Liberações | `FileText` |
| Agendamentos | `Calendar` |
| Carregamentos | `Truck` |
| Estoque | `Package` |
| Produtos | `Tag` |
| Armazéns | `Warehouse` |
| Clientes | `Building2` |
| Representantes | `UserTie` ou `Users` |
| Colaboradores | `Shield` |
| Dashboard | `LayoutDashboard` |

---

## Checklist para novas implementações

Antes de abrir PR com nova página ou funcionalidade, verificar:

- [ ] Botões de criar usam `"Criar [Entidade]"` e `btn-primary`
- [ ] Botões de desistir em modais usam `"Cancelar"` e `btn-secondary`
- [ ] Botões de fechar em modais informativos usam `"Fechar"` e `btn-secondary`
- [ ] Página de detalhe usa `backButton` no PageHeader (não botão "Voltar" manual)
- [ ] Estado vazio tem rich empty state com botão inline (se aplicável)
- [ ] Avisos destrutivos: `bg-red-50` + `XCircle`
- [ ] Avisos de atenção: `bg-amber-50` + `AlertTriangle`
- [ ] Avisos informativos: `bg-blue-50` + `AlertCircle`
- [ ] Badges de status seguem tabela de cores deste documento
- [ ] Toasts de sucesso: "Entidade ação com sucesso!" + descrição contextual
- [ ] Toasts de erro: "Erro ao [ação]" + `variant="destructive"`
- [ ] Todos os campos têm `label` + `placeholder`
- [ ] Campos obrigatórios têm `*` no label
- [ ] Uploads mostram confirmação visual após seleção
- [ ] Todos os botões têm `min-h-[44px]`
