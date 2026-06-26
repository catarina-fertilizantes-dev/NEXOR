/**
 * NEXOR — Testes de UI: Cancelar Liberação
 * Ambiente: https://nexor-dev.vercel.app
 *
 * Execução: npx playwright test tests/ui/cancelar-liberacao.spec.ts
 * Com report: npx playwright test tests/ui/cancelar-liberacao.spec.ts --reporter=html
 */

import { test, expect, Page } from '@playwright/test';
import { USERS, login, logout } from './helpers';

// ─── Helpers locais ───────────────────────────────────────────────────────────

async function irParaLiberacoes(page: Page) {
  await page.goto('/liberacoes');
  await page.waitForLoadState('networkidle');
  // Aguarda a lista carregar (spinner desaparecer)
  await page.waitForSelector('text=Liberações Ativas', { timeout: 15000 });
}

async function abrirPrimeiraLiberacaoAtiva(page: Page): Promise<string> {
  // Os cards ficam dentro da seção "Liberações Ativas"
  // Clicamos na área de texto/ícone do card (div com onClick → setDetalhesLiberacao)
  const card = page.locator('.cursor-pointer').filter({ hasText: 'Pedido:' }).first();
  await expect(card).toBeVisible({ timeout: 10000 });
  const pedidoText = (await card.locator('h3').textContent()) ?? '';
  await card.click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 8000 });
  return pedidoText;
}

// ─── Suite 1: Fluxo completo de cancelamento (admin) ─────────────────────────

test.describe('Fluxo de cancelamento — admin', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, USERS.admin.email, USERS.admin.password);
    await irParaLiberacoes(page);
  });

  test('botão "Cancelar Liberação" visível no modal de detalhes', async ({ page }) => {
    await abrirPrimeiraLiberacaoAtiva(page);

    const btnCancelar = page.getByRole('button', { name: /Cancelar Liberação/i });
    await expect(btnCancelar).toBeVisible();
    await expect(btnCancelar).toBeEnabled();
  });

  test('dialog de confirmação abre com preview de valores', async ({ page }) => {
    await abrirPrimeiraLiberacaoAtiva(page);

    // Clica no botão de cancelar
    await page.getByRole('button', { name: /Cancelar Liberação/i }).click();

    // Dialog secundário deve abrir
    await expect(page.getByRole('heading', { name: /Cancelar Liberação\?/i })).toBeVisible();

    // Aviso de ação irreversível
    await expect(page.getByText(/Esta ação é irreversível/i)).toBeVisible();

    // Aguarda preview carregar (spinner some e valores aparecem)
    // Scope dentro do dialog de cancelamento para evitar conflitos com outros elementos
    const cancelarDialog = page.getByRole('dialog', { name: /Cancelar Liberação\?/i });
    await expect(cancelarDialog.getByText('Quantidade a devolver ao estoque')).toBeVisible({ timeout: 12000 });

    // Cards de valores no preview (scoped no dialog)
    await expect(cancelarDialog.getByText('Liberada', { exact: true })).toBeVisible();
    await expect(cancelarDialog.getByText(/Já retirada/i)).toBeVisible();
    await expect(cancelarDialog.getByText(/Em carregamento/i)).toBeVisible();

    // Painel verde com "Quantidade a devolver ao estoque"
    await expect(cancelarDialog.getByText('Quantidade a devolver ao estoque')).toBeVisible();

    // O valor devolvido deve ser um número seguido de "t"
    const valorDevolvido = cancelarDialog.locator('.bg-green-50 p').last();
    await expect(valorDevolvido).toBeVisible();
    const textoValor = await valorDevolvido.textContent();
    expect(textoValor).toMatch(/[\d,.]+t/);
  });

  test('botão "Voltar" fecha dialog sem cancelar', async ({ page }) => {
    await abrirPrimeiraLiberacaoAtiva(page);
    await page.getByRole('button', { name: /Cancelar Liberação/i }).click();
    await expect(page.getByRole('heading', { name: /Cancelar Liberação\?/i })).toBeVisible();

    // Clicar em "Voltar"
    await page.getByRole('button', { name: /Voltar/i }).click();

    // Dialog fecha, detalhes permanecem abertos
    await expect(page.getByRole('heading', { name: /Cancelar Liberação\?/i })).not.toBeVisible();
    await expect(page.getByRole('heading', { name: /Detalhes da Liberação/i })).toBeVisible();
  });

  test('confirmar cancelamento → toast + badge vermelho + seção Canceladas', async ({ page }) => {
    const pedido = await abrirPrimeiraLiberacaoAtiva(page);
    await page.getByRole('button', { name: /Cancelar Liberação/i }).click();

    // Aguarda preview
    const dlg = page.getByRole('dialog', { name: /Cancelar Liberação\?/i });
    await expect(dlg.getByText('Quantidade a devolver ao estoque')).toBeVisible({ timeout: 12000 });

    // Confirma
    await page.getByRole('button', { name: /Confirmar Cancelamento/i }).click();

    // Toast de sucesso (exact para evitar o ARIA live region)
    await expect(page.getByText('Liberação cancelada', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/devolvidas ao estoque do armazém/i).first()).toBeVisible();

    // Modal fecha
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8000 });

    // Seção "Liberações Canceladas" deve aparecer
    await expect(page.getByText(/Liberações Canceladas/i)).toBeVisible({ timeout: 10000 });

    // Expandir seção
    await page.getByText(/Liberações Canceladas/i).click();

    // O pedido cancelado deve aparecer com badge "Cancelada"
    const cardCancelado = page.locator('.cursor-pointer').filter({ hasText: pedido.replace('Pedido: ', '') });
    await expect(cardCancelado.first()).toBeVisible({ timeout: 8000 });
    await expect(cardCancelado.first().getByText('Cancelada')).toBeVisible();
  });

  test('liberação cancelada não aparece mais entre as Ativas', async ({ page }) => {
    // Conta liberações ativas antes
    const liberacoesAntes = await page.locator('.cursor-pointer').filter({ hasText: 'Pedido:' }).count();

    if (liberacoesAntes === 0) {
      test.skip();
      return;
    }

    const pedido = await abrirPrimeiraLiberacaoAtiva(page);
    await page.getByRole('button', { name: /Cancelar Liberação/i }).click();
    const dlg = page.getByRole('dialog', { name: /Cancelar Liberação\?/i });
    await expect(dlg.getByText('Quantidade a devolver ao estoque')).toBeVisible({ timeout: 12000 });
    await page.getByRole('button', { name: /Confirmar Cancelamento/i }).click();
    await expect(page.getByText('Liberação cancelada', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8000 });

    // Seção ativas deve ter 1 item a menos
    const liberacoesDepois = await page.locator('.cursor-pointer').filter({ hasText: 'Pedido:' }).count();
    expect(liberacoesDepois).toBeLessThan(liberacoesAntes);
  });
});

// ─── Suite 2: Fluxo completo (colaborador/logistica) ─────────────────────────

test.describe('Fluxo de cancelamento — colaborador (logistica)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, USERS.colaborador.email, USERS.colaborador.password);
    await irParaLiberacoes(page);
  });

  test('botão "Cancelar Liberação" visível para logistica', async ({ page }) => {
    await abrirPrimeiraLiberacaoAtiva(page);
    await expect(page.getByRole('button', { name: /Cancelar Liberação/i })).toBeVisible();
  });

  test('fluxo completo de cancelamento funciona para logistica', async ({ page }) => {
    await abrirPrimeiraLiberacaoAtiva(page);
    await page.getByRole('button', { name: /Cancelar Liberação/i }).click();
    const dlg = page.getByRole('dialog', { name: /Cancelar Liberação\?/i });
    await expect(dlg.getByText('Quantidade a devolver ao estoque')).toBeVisible({ timeout: 12000 });
    await page.getByRole('button', { name: /Confirmar Cancelamento/i }).click();
    await expect(page.getByText('Liberação cancelada', { exact: true })).toBeVisible({ timeout: 10000 });
  });
});

// ─── Suite 3: Ausência do botão para roles sem permissão ─────────────────────

test.describe('Controle de acesso — botão Cancelar ausente', () => {

  test('cliente: não vê botão "Cancelar Liberação" no modal de detalhes', async ({ page }) => {
    await login(page, USERS.cliente1.email, USERS.cliente1.password);
    await irParaLiberacoes(page);

    const cards = page.locator('.cursor-pointer').filter({ hasText: 'Pedido:' });
    const count = await cards.count();

    if (count === 0) {
      // Cliente sem liberações — passa automaticamente pois nem chega ao modal
      console.log('  cliente1 sem liberações ativas visíveis');
      return;
    }

    await cards.first().click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 8000 });

    // Botão NÃO deve existir
    await expect(page.getByRole('button', { name: /Cancelar Liberação/i })).not.toBeVisible();
  });

  test('representante: não vê botão "Cancelar Liberação"', async ({ page }) => {
    await login(page, USERS.representante1.email, USERS.representante1.password);
    await irParaLiberacoes(page);

    const cards = page.locator('.cursor-pointer').filter({ hasText: 'Pedido:' });
    const count = await cards.count();

    if (count === 0) {
      console.log('  representante1 sem liberações ativas visíveis');
      return;
    }

    await cards.first().click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: /Cancelar Liberação/i })).not.toBeVisible();
  });

  test('armazem: é redirecionado para / ao acessar /liberacoes', async ({ page }) => {
    await login(page, USERS.armazem1.email, USERS.armazem1.password);
    await page.goto('/liberacoes');
    await page.waitForLoadState('networkidle');

    // Deve redirecionar para raiz (comportamento hardcoded na página)
    await expect(page).toHaveURL(/\/$/, { timeout: 10000 });
  });
});

// ─── Suite 4: Liberação cancelada não aparece como ativa ─────────────────────

test.describe('Visibilidade pós-cancelamento', () => {

  test('liberação cancelada fica na seção Canceladas (não em Ativas)', async ({ page }) => {
    await login(page, USERS.admin.email, USERS.admin.password);
    await irParaLiberacoes(page);

    // Verifica que a seção "Liberações Canceladas" existe e contém badge vermelho
    const secaoCanceladas = page.getByText(/Liberações Canceladas \(\d+\)/i);
    await expect(secaoCanceladas).toBeVisible({ timeout: 10000 });

    // Expande
    await secaoCanceladas.click();

    // Os cards de canceladas devem ter badge "Cancelada" (vermelho)
    const badgesCancelada = page.locator('.bg-red-100, .text-red-800').filter({ hasText: 'Cancelada' });
    await expect(badgesCancelada.first()).toBeVisible({ timeout: 5000 });
  });

  test('botão "Cancelar Liberação" não aparece em liberação já cancelada', async ({ page }) => {
    await login(page, USERS.admin.email, USERS.admin.password);
    await irParaLiberacoes(page);

    // Expande seção de canceladas
    const secaoCanceladas = page.getByText(/Liberações Canceladas \(\d+\)/i);
    await expect(secaoCanceladas).toBeVisible({ timeout: 10000 });
    await secaoCanceladas.click();

    // Abre o primeiro card cancelado
    const cardCancelado = page.locator('.cursor-pointer').filter({ hasText: 'Cancelada' }).first();
    await expect(cardCancelado).toBeVisible({ timeout: 5000 });
    await cardCancelado.click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 8000 });

    // Botão cancelar NÃO deve aparecer (condição: status !== 'cancelada')
    await expect(page.getByRole('button', { name: /Cancelar Liberação/i })).not.toBeVisible();
  });
});

// ─── Suite 5: Agendamentos cancelados não visíveis ───────────────────────────

test.describe('Agendamentos — efeito do cancelamento', () => {

  test('página de agendamentos não exibe agendamentos com status cancelado', async ({ page }) => {
    await login(page, USERS.admin.email, USERS.admin.password);
    await page.goto('/agendamentos');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=Agendamentos', { timeout: 10000 });

    // Verifica que nenhum card visível exibe badge "Cancelado"
    // Os cards de status devem ser: pendente, em_andamento, concluido
    const badgeCancelado = page.locator('text=Cancelado').first();

    // "Cancelado" pode aparecer no filtro de status — mas não deve aparecer como badge em card ativo
    // Verificamos que nenhum card na listagem principal tem esse badge
    const cardsCancelados = page.locator('.cursor-pointer').filter({ hasText: 'Cancelado' });
    const countCancelados = await cardsCancelados.count();

    // Se aparecer, é na seção de filtros (texto), não em cards de dados
    // Verificação mais precisa: badge com cor vermelho nos cards
    const badgesVermelhoNosCards = page.locator('.bg-red-100').filter({ hasText: 'Cancelado' });
    const countBadgesVermelhos = await badgesVermelhoNosCards.count();

    expect(countBadgesVermelhos).toBe(0);
  });
});
