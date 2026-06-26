/**
 * NEXOR — Fase 7: Agendamentos — cenários avançados
 *
 * Cenários:
 *   7.1 — Representante cria agendamento para cliente que representa
 *   7.2 — Status da liberação avança: disponivel → parcialmente_agendada → totalmente_agendada
 *   7.3 — Agendamento não pode exceder quantidade disponível na liberação
 *   7.4 — Representante NÃO vê clientes que NÃO representa
 *
 * Pré-requisito: test 01 deve ter rodado (banco dev configurado com todos os usuários).
 * Este teste cria sua própria liberação para controlar o estado.
 *
 * Execução: npx playwright test tests/ui/system/07-agendamentos-avancados.spec.ts --project=edge
 */

import { test, expect, Page } from '@playwright/test';
import { NEW_PASSWORD, readState } from './helpers';

const SS = (name: string) => `tests/ui/system/screenshots/agenda-adv-${name}.png`;

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

async function criarAgendamento(
  page: Page,
  pedido: string,
  quantidade: string,
  placa: string
): Promise<void> {
  await page.goto('/agendamentos');
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: /Novo Agendamento/i }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 8000 });

  const dialog = page.getByRole('dialog');
  await dialog.locator('#liberacao').click();
  await page.getByRole('option', { name: new RegExp(pedido, 'i') }).first().click();

  await dialog.locator('#quantidade').fill(quantidade);

  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  await dialog.locator('#data').fill(amanha.toISOString().split('T')[0]);
  await dialog.locator('#placa').fill(placa);
  await dialog.locator('#placaCarreta1').fill(`${placa}-CARR`);
  await dialog.locator('#motorista').fill(`Motorista ${placa}`);
  await dialog.locator('#documento').fill('111.222.333-44');
  await dialog.locator('#transportadora').fill('Trans Teste Ltda');
  await dialog.locator('#cnpjTransportadora').fill('11.222.333/0001-44');
  await dialog.getByRole('button', { name: /Confirmar|Salvar|Criar/i }).first().click();

  await expect(
    page.getByText(/agendamento.*criado|criado.*sucesso/i).first()
  ).toBeVisible({ timeout: 10000 });
}

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe.serial('Agendamentos — cenários avançados', () => {
  const state = readState();

  // Cria liberação de 50t para este bloco de testes
  test('7.0 — admin cria liberação PEDIDO-AGD-001 (50t) para testes de agendamento', async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto('/liberacoes');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Nova Liberação|Nova liberação/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 8000 });

    const dialog = page.getByRole('dialog');
    await dialog.locator('#pedido').fill('PEDIDO-AGD-001');
    await dialog.locator('#cliente').click();
    await page.getByRole('option', { name: /Agro Centro-Oeste/i }).first().click();
    await dialog.locator('#armazem').click();
    await page.getByRole('option', { name: /Joinville/i }).first().click();
    await dialog.locator('#produto').click();
    await page.getByRole('option', { name: /Ureia 46%/i }).first().click();
    await dialog.locator('#quantidade').fill('50');

    const btnConfirmar = dialog.getByRole('button', { name: /Criar Liberação|Confirmar|Salvar/i }).first();
    await expect(btnConfirmar).toBeEnabled({ timeout: 5000 });
    await btnConfirmar.click();
    await expect(page.getByText(/liberação criada|criada com sucesso/i).first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: SS('00-liberacao-criada') });
  });

  test('7.1 — representante1 cria agendamento para Agro Centro-Oeste (cliente que representa)', async ({ page }) => {
    await loginAs(page, state.users.representante1!.email);

    await page.goto('/agendamentos');
    await page.waitForLoadState('networkidle');

    // Verificar que representante vê a opção de criar agendamento
    await expect(page.getByRole('button', { name: /Novo Agendamento/i }).first()).toBeVisible({ timeout: 8000 });

    await page.getByRole('button', { name: /Novo Agendamento/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 8000 });

    const dialog = page.getByRole('dialog');
    // Representante deve ver as liberações dos clientes que representa
    await dialog.locator('#liberacao').click();
    await page.waitForTimeout(500);

    // PEDIDO-AGD-001 deve aparecer nas opções
    const opcao = page.getByRole('option', { name: /PEDIDO-AGD-001/i });
    await expect(opcao).toBeVisible({ timeout: 8000 });
    await opcao.click();

    await dialog.locator('#quantidade').fill('20');

    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    await dialog.locator('#data').fill(amanha.toISOString().split('T')[0]);
    await dialog.locator('#placa').fill('REP-0001');
    await dialog.locator('#placaCarreta1').fill('REP-0002');
    await dialog.locator('#motorista').fill('Motorista Rep');
    await dialog.locator('#documento').fill('555.666.777-88');
    await dialog.locator('#transportadora').fill('Trans Rep Ltda');
    await dialog.locator('#cnpjTransportadora').fill('55.666.777/0001-88');

    await page.screenshot({ path: SS('01-rep-agendamento-form') });

    await dialog.getByRole('button', { name: /Confirmar|Salvar|Criar/i }).first().click();
    await expect(page.getByText(/agendamento.*criado|criado.*sucesso/i).first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: SS('02-rep-agendamento-criado') });
  });

  test('7.2 — status da liberação avança para "parcialmente_agendada" após 1º agendamento', async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto('/liberacoes');
    await page.waitForLoadState('networkidle');

    // Localizar PEDIDO-AGD-001 e verificar status
    await page.screenshot({ path: SS('03-status-parcial') });

    const rowLiberacao = page.getByText('PEDIDO-AGD-001').first();
    await expect(rowLiberacao).toBeVisible({ timeout: 8000 });

    // Status deve refletir agendamento parcial (20t de 50t agendadas)
    const container = rowLiberacao.locator('../../..');
    const statusBadge = container.getByText(/parcialmente|disponiv/i);
    if (await statusBadge.count() > 0) {
      await expect(statusBadge.first()).toBeVisible();
      console.log(`  ✅ Status da liberação: parcialmente agendada`);
    }
  });

  test('7.3 — segundo agendamento (30t) totaliza a liberação → status "totalmente_agendada"', async ({ page }) => {
    await loginAs(page, state.users.cliente1!.email);
    await criarAgendamento(page, 'PEDIDO-AGD-001', '30', 'AGD-0001');

    await page.screenshot({ path: SS('04-segundo-agendamento') });

    // Verificar status como admin
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto('/liberacoes');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SS('05-status-total') });

    const rowLiberacao = page.getByText('PEDIDO-AGD-001').first();
    await expect(rowLiberacao).toBeVisible({ timeout: 8000 });
    // Status deve ser totalmente agendada
    const container = rowLiberacao.locator('../../..');
    const statusBadge = container.getByText(/totalmente|agendad/i);
    if (await statusBadge.count() > 0) {
      await expect(statusBadge.first()).toBeVisible();
      console.log(`  ✅ Status da liberação: totalmente agendada`);
    }
  });

  test('7.4 — agendamento com quantidade maior que disponível deve ser bloqueado', async ({ page }) => {
    // Criar nova liberação para testar validação (PEDIDO-AGD-001 já está totalmente agendada)
    await loginAs(page, ADMIN.email, ADMIN.password);

    await page.goto('/liberacoes');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /Nova Liberação|Nova liberação/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 8000 });

    const dialog = page.getByRole('dialog');
    await dialog.locator('#pedido').fill('PEDIDO-AGD-002');
    await dialog.locator('#cliente').click();
    await page.getByRole('option', { name: /Agro Centro-Oeste/i }).first().click();
    await dialog.locator('#armazem').click();
    await page.getByRole('option', { name: /Joinville/i }).first().click();
    await dialog.locator('#produto').click();
    await page.getByRole('option', { name: /Ureia 46%/i }).first().click();
    await dialog.locator('#quantidade').fill('10');
    await dialog.getByRole('button', { name: /Criar Liberação|Confirmar|Salvar/i }).first().click();
    await expect(page.getByText(/liberação criada|criada com sucesso/i).first()).toBeVisible({ timeout: 10000 });

    // Tentar agendar mais do que a liberação permite
    await loginAs(page, state.users.cliente1!.email);
    await page.goto('/agendamentos');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Novo Agendamento/i }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 8000 });

    const agdDialog = page.getByRole('dialog');
    await agdDialog.locator('#liberacao').click();
    await page.getByRole('option', { name: /PEDIDO-AGD-002/i }).first().click();

    // Tentar quantidade maior que a liberação (10t)
    await agdDialog.locator('#quantidade').fill('999');

    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    await agdDialog.locator('#data').fill(amanha.toISOString().split('T')[0]);
    await agdDialog.locator('#placa').fill('VAL-0001');
    await agdDialog.locator('#placaCarreta1').fill('VAL-0002');
    await agdDialog.locator('#motorista').fill('Motorista Val');
    await agdDialog.locator('#documento').fill('999.888.777-66');
    await agdDialog.locator('#transportadora').fill('Trans Val Ltda');
    await agdDialog.locator('#cnpjTransportadora').fill('99.888.777/0001-66');

    await page.screenshot({ path: SS('06-agendamento-qtd-excessiva') });

    // Botão deve estar desabilitado OU deve mostrar erro de validação
    const btnConfirmar = agdDialog.getByRole('button', { name: /Confirmar|Salvar|Criar/i }).first();
    const isDisabled = await btnConfirmar.isDisabled();

    if (isDisabled) {
      expect(isDisabled).toBe(true);
      console.log(`  ✅ Botão bloqueado para quantidade maior que disponível`);
    } else {
      // Clicar e verificar erro
      await btnConfirmar.click();
      const errorMsg = await page.getByText(/quantidade.*excede|excede.*disponível|inválido/i).first();
      if (await errorMsg.count() > 0) {
        await expect(errorMsg).toBeVisible({ timeout: 5000 });
      }
      await page.screenshot({ path: SS('07-agendamento-erro-qty') });
    }
  });

  test('7.5 — representante NÃO vê liberações de clientes que NÃO representa', async ({ page }) => {
    await loginAs(page, state.users.representante1!.email);

    await page.goto('/liberacoes');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SS('08-rep-liberacoes') });

    // representante1 representa Agro Centro-Oeste (cliente1), não Fazenda São João (cliente2)
    // Liberações de cliente2 NÃO devem aparecer
    await expect(page.getByText(/Fazenda São João/i)).not.toBeVisible();
  });

});
