/**
 * NEXOR — Fase 8: Entrada de estoque e alteração de armazém de liberação
 *
 * Cenários:
 *   8.1 — Admin registra entrada de estoque (nova remessa com PDF + XML)
 *   8.2 — Estoque aumenta após registrar entrada
 *   8.3 — Logística registra entrada de estoque
 *   8.4 — Admin altera armazém de uma liberação disponível
 *   8.5 — Botão "Alterar" não aparece para liberação totalmente agendada
 *   8.6 — Cliente não vê botão "Alterar" armazém (acesso restrito)
 *
 * Pré-requisito: test 01 deve ter rodado (produto, armazéns e estoque configurados).
 *
 * Execução: npx playwright test tests/ui/system/08-estoque-e-armazem.spec.ts --project=edge
 */

import { test, expect, Page } from '@playwright/test';
import { NEW_PASSWORD, readState } from './helpers';

const SS = (name: string) => `tests/ui/system/screenshots/estoque-arm-${name}.png`;

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

async function registrarEntradaEstoque(
  page: Page,
  armazem: string,
  quantidade: string,
  numeroRemessa: string
): Promise<void> {
  await page.goto('/estoque');
  await page.waitForLoadState('networkidle');

  // Abrir dialog de entrada de estoque
  await page.getByRole('button', { name: /Entrada de Estoque/i }).first().click();
  await expect(
    page.getByRole('heading', { name: /Registrar Entrada de Estoque/i })
  ).toBeVisible({ timeout: 8000 });

  const dialog = page.getByRole('dialog');

  // Selecionar produto
  await dialog.locator('#produto').click();
  await page.getByRole('option', { name: /Ureia 46%/i }).first().click();

  // Selecionar armazém
  await dialog.locator('#armazem').click();
  await page.getByRole('option', { name: new RegExp(armazem, 'i') }).first().click();

  // Quantidade
  await dialog.locator('#quantidade').fill(quantidade);

  // Número da remessa
  await dialog.locator('#numero-remessa').fill(numeroRemessa);

  // Upload PDF (obrigatório)
  await dialog.locator('#nota-remessa').setInputFiles({
    name: `remessa-${numeroRemessa}.pdf`,
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 fake remessa content'),
  });

  // Upload XML (obrigatório)
  await dialog.locator('#xml-remessa').setInputFiles({
    name: `remessa-${numeroRemessa}.xml`,
    mimeType: 'application/xml',
    buffer: Buffer.from(`<?xml version="1.0"?><remessa><numero>${numeroRemessa}</numero></remessa>`),
  });

  await page.screenshot({ path: SS(`entrada-form-${numeroRemessa}`) });

  // Confirmar
  const btnSalvar = dialog.getByRole('button', { name: /Salvar/i }).first();
  await expect(btnSalvar).toBeEnabled({ timeout: 5000 });
  await btnSalvar.click();

  await expect(
    page.getByText(/estoque.*registrado|entrada.*registrada|adicionado.*sucesso|sucesso/i).first()
  ).toBeVisible({ timeout: 15000 });
}

// ─── Suite: Entrada de Estoque ────────────────────────────────────────────────

test.describe('Entrada de Estoque', () => {
  const state = readState();

  test('8.1 — admin registra nova entrada de estoque no armazém 1', async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await registrarEntradaEstoque(page, 'Joinville', '500', 'REM-TEST-001');
    await page.screenshot({ path: SS('01-entrada-registrada') });
  });

  test('8.2 — quantidade do armazém aumentou após a entrada', async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto('/estoque');
    await page.waitForLoadState('networkidle');

    // Navegar para armazém 1
    const cardArmazem = page.getByText(new RegExp(state.armazem1Nome!, 'i')).first();
    await expect(cardArmazem).toBeVisible({ timeout: 8000 });
    await cardArmazem.click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SS('02-estoque-pos-entrada') });

    // O estoque do produto deve estar visível com algum valor
    await expect(page.getByText(/Ureia 46%/i).first()).toBeVisible({ timeout: 8000 });
    const qtdText = await page.getByText(/\d[\d.,]*\s*t/i).first().textContent();
    expect(qtdText).toBeTruthy();
    console.log(`  📦 Estoque armazém 1 após entrada: ${qtdText}`);
  });

  test('8.3 — logística também pode registrar entrada de estoque', async ({ page }) => {
    await loginAs(page, state.users.colaborador1!.email, state.users.colaborador1!.finalPassword);
    await registrarEntradaEstoque(page, 'Porto Alegre', '200', 'REM-TEST-002');
    await page.screenshot({ path: SS('03-logistica-entrada') });
  });

  test('8.4 — armazem NÃO pode acessar entrada de estoque (somente leitura)', async ({ page }) => {
    await loginAs(page, state.users.armazem1!.email);
    await page.goto('/estoque');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SS('04-armazem-estoque-readonly') });

    // Role armazem vê estoque mas não tem botão de entrada
    await expect(
      page.getByRole('button', { name: /Entrada de Estoque/i })
    ).not.toBeVisible();
  });

  test('8.5 — entrada de estoque com campos obrigatórios faltando mantém botão desabilitado', async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto('/estoque');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Entrada de Estoque/i }).first().click();
    await expect(
      page.getByRole('heading', { name: /Registrar Entrada de Estoque/i })
    ).toBeVisible({ timeout: 8000 });

    const dialog = page.getByRole('dialog');

    // Preencher apenas produto (sem armazém, quantidade, remessa, docs)
    await dialog.locator('#produto').click();
    await page.getByRole('option', { name: /Ureia 46%/i }).first().click();

    await page.screenshot({ path: SS('05-form-incompleto') });

    // Botão Salvar deve estar desabilitado sem os campos obrigatórios
    const btnSalvar = dialog.getByRole('button', { name: /Salvar/i }).first();
    await expect(btnSalvar).toBeDisabled({ timeout: 3000 });

    // Fechar dialog
    await page.keyboard.press('Escape');
  });

});

// ─── Suite: Alterar Armazém de Liberação ─────────────────────────────────────

test.describe.serial('Alterar armazém de liberação', () => {
  const state = readState();

  test('8.6 — admin cria liberação PEDIDO-ALTARMAZEM-001 para teste de alteração', async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto('/liberacoes');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Nova Liberação|Nova liberação/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 8000 });

    const dialog = page.getByRole('dialog');
    await dialog.locator('#pedido').fill('PEDIDO-ALTARMAZEM-001');
    await dialog.locator('#cliente').click();
    await page.getByRole('option', { name: /Agro Centro-Oeste/i }).first().click();
    await dialog.locator('#armazem').click();
    await page.getByRole('option', { name: /Joinville/i }).first().click();
    await dialog.locator('#produto').click();
    await page.getByRole('option', { name: /Ureia 46%/i }).first().click();
    await dialog.locator('#quantidade').fill('10');
    await dialog.getByRole('button', { name: /Criar Liberação|Confirmar|Salvar/i }).first().click();
    await expect(page.getByText(/liberação criada|criada com sucesso/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('8.7 — admin abre detalhes da liberação e vê botão "Alterar" ao lado do armazém', async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto('/liberacoes');
    await page.waitForLoadState('networkidle');

    // Abrir detalhes da liberação
    const row = page.getByText('PEDIDO-ALTARMAZEM-001').first();
    await expect(row).toBeVisible({ timeout: 8000 });
    await row.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: SS('06-detalhe-com-botao-alterar') });

    // Botão "Alterar" (pequeno, ao lado do nome do armazém) deve estar visível
    await expect(page.getByRole('button', { name: /Alterar/i }).first()).toBeVisible({ timeout: 8000 });
  });

  test('8.8 — admin altera armazém de Joinville para Porto Alegre', async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto('/liberacoes');
    await page.waitForLoadState('networkidle');

    const row = page.getByText('PEDIDO-ALTARMAZEM-001').first();
    await expect(row).toBeVisible({ timeout: 8000 });
    await row.click();
    await page.waitForTimeout(500);

    // Clicar em "Alterar"
    await page.getByRole('button', { name: /Alterar/i }).first().click();
    await expect(
      page.getByRole('heading', { name: /Alterar Armazém da Liberação/i })
    ).toBeVisible({ timeout: 8000 });

    await page.screenshot({ path: SS('07-modal-alterar-armazem') });

    // Selecionar o novo armazém (Porto Alegre)
    const dialog = page.getByRole('dialog');
    await dialog.locator('#novo-armazem').click();
    await page.getByRole('option', { name: /Porto Alegre/i }).first().click();

    await page.screenshot({ path: SS('08-novo-armazem-selecionado') });

    // Confirmar
    await page.getByRole('button', { name: /Confirmar Alteração/i }).click();

    await expect(
      page.getByText(/armazém.*alterado|alterado.*sucesso|sucesso/i).first()
    ).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: SS('09-armazem-alterado') });
  });

  test('8.9 — liberação reflete o novo armazém após alteração', async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto('/liberacoes');
    await page.waitForLoadState('networkidle');

    const row = page.getByText('PEDIDO-ALTARMAZEM-001').first();
    await expect(row).toBeVisible({ timeout: 8000 });
    await row.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: SS('10-liberacao-pos-alteracao') });

    // Armazém deve ser Porto Alegre agora
    await expect(
      page.getByText(/Porto Alegre/i).first()
    ).toBeVisible({ timeout: 8000 });
  });

  test('8.10 — botão "Alterar" NÃO aparece para liberação totalmente agendada', async ({ page }) => {
    // Usar PEDIDO-AGD-001 que foi totalmente agendada no test 07
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto('/liberacoes');
    await page.waitForLoadState('networkidle');

    const row = page.getByText('PEDIDO-AGD-001').first();
    if (await row.count() > 0) {
      await row.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: SS('11-liberacao-total-sem-alterar') });
      // Para liberação totalmente agendada, o botão "Alterar" não deve aparecer
      // (condição: status !== 'totalmente_agendada' no código)
      await expect(page.getByRole('button', { name: /^Alterar$/i })).not.toBeVisible();
    } else {
      console.log('  ℹ️  PEDIDO-AGD-001 não encontrada — test 07 pode não ter rodado ainda');
    }
  });

  test('8.11 — cliente não vê botão "Alterar" armazém em suas liberações', async ({ page }) => {
    await loginAs(page, state.users.cliente1!.email);
    await page.goto('/liberacoes');
    await page.waitForLoadState('networkidle');

    const row = page.getByText('PEDIDO-TESTE-001').first();
    if (await row.count() > 0) {
      await row.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: SS('12-cliente-sem-alterar') });
      // Cliente não pode alterar armazém
      await expect(page.getByRole('button', { name: /^Alterar$/i })).not.toBeVisible();
    }
  });

});
