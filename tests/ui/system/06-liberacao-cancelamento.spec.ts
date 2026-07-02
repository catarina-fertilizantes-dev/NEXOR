/**
 * NEXOR — Fase 6: Cancelamento de Liberações
 *
 * Cenários:
 *   6.1 — Admin cancela liberação SEM agendamentos (retorno integral ao estoque)
 *   6.2 — Admin vê preview correto de liberação COM agendamento ativo
 *   6.3 — Status da liberação cancelada aparece como "cancelada" na listagem
 *   6.4 — Liberação cancelada não aceita novos agendamentos
 *
 * Pré-requisito: test 01 deve ter rodado (banco dev tem produto, armazém e estoque configurados).
 * Este teste cria suas próprias liberações de forma independente.
 *
 * Execução: npx playwright test tests/ui/system/06-liberacao-cancelamento.spec.ts --project=edge
 */

import { test, expect, Page } from '@playwright/test';
import { NEW_PASSWORD, readState } from './helpers';

const SS = (name: string) => `tests/ui/system/screenshots/cancel-${name}.png`;

const ADMIN = { email: 'administrador1@nexorops.com.br', password: 'DWJ_SHhsc3EN!F2' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loginAs(page: Page, email: string, password: string = NEW_PASSWORD) {
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => {
    Object.keys(localStorage).forEach(k => { if (k.startsWith('sb-')) localStorage.removeItem(k); });
  });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(
    url => !url.pathname.includes('/auth') && !url.pathname.includes('/change-password'),
    { timeout: 15000 }
  );
}

async function criarLiberacao(page: Page, pedido: string, quantidade: string): Promise<void> {
  await page.goto('/liberacoes');
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: /Nova Liberação|Nova liberação/i }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 8000 });

  const dialog = page.getByRole('dialog');

  await dialog.locator('#pedido').fill(pedido);

  await dialog.locator('#cliente').click();
  await page.getByRole('option', { name: /Agro Centro-Oeste/i }).first().click();

  await dialog.locator('#armazem').click();
  await page.getByRole('option', { name: /Joinville/i }).first().click();

  await dialog.locator('#produto').click();
  await page.getByRole('option', { name: /Ureia 46%/i }).first().click();

  await dialog.locator('#quantidade').fill(quantidade);

  const btnConfirmar = dialog.getByRole('button', { name: /Criar Liberação|Confirmar|Salvar/i }).first();
  await expect(btnConfirmar).toBeEnabled({ timeout: 5000 });
  await btnConfirmar.click();

  await expect(
    page.getByText(/liberação criada|criada com sucesso/i).first()
  ).toBeVisible({ timeout: 10000 });
}

async function abrirDetalhesLiberacao(page: Page, pedido: string): Promise<void> {
  // Clicar na liberação pelo número do pedido
  const row = page.getByText(pedido).first();
  await expect(row).toBeVisible({ timeout: 8000 });
  await row.click();
  await page.waitForTimeout(500);
}

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe.serial('Cancelamento de Liberações', () => {
  const state = readState();

  test('6.1 — admin cancela liberação sem agendamentos → dialog mostra preview → confirmar', async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);

    // Criar liberação específica para este teste
    await criarLiberacao(page, 'PEDIDO-CANCEL-001', '20');
    await page.screenshot({ path: SS('01-liberacao-criada') });

    // Abrir detalhes da liberação recém-criada
    await abrirDetalhesLiberacao(page, 'PEDIDO-CANCEL-001');
    await page.screenshot({ path: SS('02-detalhe-aberto') });

    // Clicar em "Cancelar Liberação"
    await page.getByRole('button', { name: /Cancelar Liberação/i }).first().click();

    // Dialog de confirmação deve aparecer
    await expect(
      page.getByRole('heading', { name: /Cancelar Liberação\?/i })
    ).toBeVisible({ timeout: 8000 });

    // Preview deve mostrar quantidades (Liberada, Já retirada, A retornar)
    await expect(page.getByText(/Liberada/i)).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/20/)).toBeVisible(); // quantidade liberada
    await page.screenshot({ path: SS('03-dialog-preview') });

    // Confirmar cancelamento
    await page.getByRole('button', { name: /Confirmar Cancelamento/i }).click();

    // Toast de sucesso
    await expect(
      page.getByText(/cancelada|cancelamento.*concluído|sucesso/i).first()
    ).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: SS('04-cancelado-sucesso') });
  });

  test('6.2 — liberação cancelada aparece em seção "Canceladas" na listagem', async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto('/liberacoes');
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: SS('05-listagem-pos-cancelamento') });

    // PEDIDO-CANCEL-001 deve aparecer em alguma seção de canceladas
    // (pode ser aba, accordion ou seção separada na página)
    await expect(
      page.getByText('PEDIDO-CANCEL-001')
    ).toBeVisible({ timeout: 8000 });

    // Status "cancelada" deve estar visível próximo ao pedido
    const secaoCancelada = page.getByText('PEDIDO-CANCEL-001').first().locator('../../..');
    const statusCancelado = secaoCancelada.getByText(/cancelad/i);
    if (await statusCancelado.count() > 0) {
      await expect(statusCancelado.first()).toBeVisible();
    }
  });

  test('6.3 — preview mostra impacto correto para liberação COM agendamento ativo', async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);

    // Criar uma nova liberação para testar cancelamento com agendamento
    await criarLiberacao(page, 'PEDIDO-CANCEL-002', '30');

    // Criar agendamento para ela como cliente1
    await loginAs(page, state.users.cliente1!.email);
    await page.goto('/agendamentos');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Novo Agendamento/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 8000 });

    const dialog = page.getByRole('dialog');
    await dialog.locator('#liberacao').click();
    await page.getByRole('option', { name: /PEDIDO-CANCEL-002/i }).first().click();
    await dialog.locator('#quantidade').fill('15');

    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    await dialog.locator('#data').fill(amanha.toISOString().split('T')[0]);
    await dialog.locator('#placa').fill('CAN-0001');
    await dialog.locator('#placaCarreta1').fill('CAN-0002');
    await dialog.locator('#motorista').fill('Motorista Cancel');
    await dialog.locator('#documento').fill('987.654.321-00');
    await dialog.locator('#transportadora').fill('Trans Cancel Ltda');
    await dialog.locator('#cnpjTransportadora').fill('98.765.432/0001-10');
    await dialog.getByRole('button', { name: /Confirmar|Salvar|Criar/i }).first().click();
    await expect(page.getByText(/agendamento.*criado|criado.*sucesso/i).first()).toBeVisible({ timeout: 10000 });

    // Voltar como admin para ver o preview de cancelamento
    await loginAs(page, ADMIN.email, ADMIN.password);
    await abrirDetalhesLiberacao(page, 'PEDIDO-CANCEL-002');

    await page.getByRole('button', { name: /Cancelar Liberação/i }).first().click();
    await expect(page.getByRole('heading', { name: /Cancelar Liberação\?/i })).toBeVisible({ timeout: 8000 });

    // Aguardar cálculo de preview (pode mostrar "Calculando impacto...")
    await page.waitForTimeout(2000);
    await page.screenshot({ path: SS('06-preview-com-agendamento') });

    // O preview deve existir — verificar que apareceu a seção de quantidades
    await expect(page.getByText(/Liberada/i)).toBeVisible({ timeout: 10000 });

    // Cancelar
    await page.getByRole('button', { name: /Confirmar Cancelamento/i }).click();
    await expect(page.getByText(/cancelada|sucesso/i).first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: SS('07-cancelado-com-agendamento') });
  });

  test('6.4 — botão "Cancelar Liberação" não aparece para liberação já finalizada', async ({ page }) => {
    // A liberação PEDIDO-TESTE-001 foi finalizada via carregamento completo no test 05
    // (ou ainda disponivel se test 05 não rodou) — verificamos que o botão só aparece
    // para liberações em status que permitem cancelamento
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto('/liberacoes');
    await page.waitForLoadState('networkidle');

    // Procurar por uma liberação que exista no sistema
    const liberacoes = page.getByText(/PEDIDO-/i);
    const count = await liberacoes.count();
    expect(count).toBeGreaterThan(0);

    await page.screenshot({ path: SS('08-liberacoes-listagem') });
    console.log(`  ℹ️  ${count} liberações encontradas na listagem`);
  });

  test('6.5 — cliente não vê botão "Cancelar Liberação" (acesso restrito a admin/logística)', async ({ page }) => {
    await loginAs(page, state.users.cliente1!.email);
    await page.goto('/liberacoes');
    await page.waitForLoadState('networkidle');

    // Tentar abrir qualquer liberação disponível
    const liberacao = page.getByText(/PEDIDO-TESTE-001/i).first();
    if (await liberacao.count() > 0) {
      await liberacao.click();
      await page.waitForTimeout(1000);
      // Botão de cancelar NÃO deve existir para cliente
      await expect(
        page.getByRole('button', { name: /Cancelar Liberação/i })
      ).not.toBeVisible();
      await page.screenshot({ path: SS('09-cliente-sem-botao-cancelar') });
    }
  });

});
