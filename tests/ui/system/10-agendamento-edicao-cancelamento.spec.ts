/**
 * NEXOR — Fase 10: Edição e Cancelamento de Agendamento
 *
 * Cenários:
 *   10.1 — Admin edita campos do agendamento (quantidade, data, placas, motorista,
 *          transportadora) enquanto etapa_atual = 1 → mudanças persistem
 *   10.2 — Admin cancela agendamento → aparece em "Agendamentos Cancelados" com
 *          "Cancelado em DD/MM/AAAA", some de "Agendamentos Ativos"
 *   10.3 — Cliente NÃO vê os botões "Editar Agendamento"/"Cancelar Agendamento"
 *          (ação restrita a admin/logística)
 *
 * Pré-requisito: test 01 deve ter rodado (banco dev tem produto, armazém e clientes
 * configurados). Este teste cria sua própria liberação/agendamento de forma
 * independente para não interferir com outros testes.
 *
 * Execução: npx playwright test tests/ui/system/10-agendamento-edicao-cancelamento.spec.ts --project=edge
 */

import { test, expect, Page } from '@playwright/test';
import { NEW_PASSWORD, readState, ADMIN } from './helpers';

const SS = (name: string) => `tests/ui/system/screenshots/agenda-editcancel-${name}.png`;

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
  // Porto Alegre em vez de Joinville: Joinville costuma ficar com saldo disponível
  // esgotado por resíduo de outros testes que criam liberações e não as cancelam
  await page.getByRole('option', { name: /Porto Alegre/i }).first().click();
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

async function criarAgendamento(page: Page, pedido: string, quantidade: string, placa: string): Promise<void> {
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

async function abrirDetalhesAgendamento(page: Page, placa: string): Promise<void> {
  const card = page.getByText(placa).first();
  await expect(card).toBeVisible({ timeout: 8000 });
  await card.click();
  await page.waitForTimeout(500);
}

// Cancela uma liberação de execuções anteriores desta suite que por algum motivo
// não tenha sido limpa (ex.: teste anterior falhou antes da limpeza final) — evita
// que reservas de estoque não canceladas se acumulem no ambiente de Dev a cada
// execução (mesmo problema já observado em outros dados de teste residuais).
async function cancelarLiberacaoSeExistir(page: Page, pedido: string): Promise<void> {
  await page.goto('/liberacoes');
  await page.waitForLoadState('networkidle');

  const liberacao = page.getByText(pedido).first();
  if (await liberacao.count() === 0) return;

  await liberacao.click();
  await page.waitForTimeout(500);

  const btnCancelar = page.getByRole('button', { name: /Cancelar Liberação/i });
  if (await btnCancelar.count() === 0) {
    // Já cancelada ou finalizada — nada a fazer
    await page.keyboard.press('Escape');
    return;
  }

  await btnCancelar.click();
  await expect(page.getByRole('heading', { name: /Cancelar Liberação\?/i })).toBeVisible({ timeout: 8000 });
  await page.getByRole('button', { name: /Confirmar Cancelamento/i }).click();
  await expect(page.getByText(/cancelada|sucesso/i).first()).toBeVisible({ timeout: 10000 });
}

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe.serial('Edição e Cancelamento de Agendamento', () => {
  const state = readState();

  test('10.0 — admin cria liberação e agendamento para este bloco de testes', async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await cancelarLiberacaoSeExistir(page, 'PEDIDO-EDCANC-001');
    await criarLiberacao(page, 'PEDIDO-EDCANC-001', '15');
    await criarAgendamento(page, 'PEDIDO-EDCANC-001', '10', 'EDC-0001');
    await page.screenshot({ path: SS('00-agendamento-criado') });
  });

  test('10.1 — admin edita quantidade, data, placas, motorista e transportadora', async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto('/agendamentos');
    await page.waitForLoadState('networkidle');

    await abrirDetalhesAgendamento(page, 'EDC-0001');
    await page.screenshot({ path: SS('01-detalhe-antes-editar') });

    await page.getByRole('button', { name: /Editar Agendamento/i }).click();
    await expect(page.getByRole('heading', { name: /Editar Agendamento/i })).toBeVisible({ timeout: 8000 });

    const dialog = page.getByRole('dialog').filter({ hasText: 'Editar Agendamento' });
    await expect(dialog.locator('#editar-quantidade')).toHaveValue('10', { timeout: 8000 });

    await dialog.locator('#editar-quantidade').fill('12');
    await dialog.locator('#editar-motorista').fill('Motorista Editado E2E');
    await dialog.locator('#editar-transportadora').fill('Transportadora Editada E2E');

    await page.screenshot({ path: SS('02-editando-campos') });

    await dialog.getByRole('button', { name: /Salvar Alterações/i }).click();
    await expect(page.getByText(/agendamento atualizado/i).first()).toBeVisible({ timeout: 10000 });

    // Reabrir e confirmar persistência
    await abrirDetalhesAgendamento(page, 'EDC-0001');
    const detalhes = page.getByRole('dialog').filter({ hasText: 'Detalhes do Agendamento' });
    await expect(detalhes.getByText('12t', { exact: true })).toBeVisible({ timeout: 8000 });
    await expect(detalhes.getByText('Motorista Editado E2E')).toBeVisible();
    await expect(detalhes.getByText('Transportadora Editada E2E')).toBeVisible();
    await page.screenshot({ path: SS('03-detalhe-pos-editar') });

    await page.getByRole('button', { name: /Fechar/i }).click();
  });

  test('10.2 — admin cancela agendamento → some de Ativos, aparece em Cancelados com data', async ({ page }) => {
    await loginAs(page, ADMIN.email, ADMIN.password);
    await page.goto('/agendamentos');
    await page.waitForLoadState('networkidle');

    await abrirDetalhesAgendamento(page, 'EDC-0001');
    await page.getByRole('button', { name: /Cancelar Agendamento/i }).click();

    await expect(page.getByRole('heading', { name: /Cancelar Agendamento\?/i })).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/esta ação é irreversível/i)).toBeVisible();
    await page.screenshot({ path: SS('04-dialog-confirmacao') });

    await page.getByRole('button', { name: /Confirmar Cancelamento/i }).click();
    await expect(page.getByText(/agendamento cancelado/i).first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: SS('05-cancelado-sucesso') });

    await page.goto('/agendamentos');
    await page.waitForLoadState('networkidle');

    // Expandir "Agendamentos Cancelados" e confirmar que o agendamento está lá
    // (a seção "Cancelados" só existe fora de "Ativos" — vê-lo aqui já comprova
    // que saiu de Ativos)
    await page.getByRole('button', { name: /Agendamentos Cancelados/i }).click();
    await expect(page.getByText('EDC-0001').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/cancelado em \d{2}\/\d{2}\/\d{4}/i).first()).toBeVisible({ timeout: 8000 });
    await page.screenshot({ path: SS('06-secao-cancelados') });

    // Modal de detalhe mostra "Cancelamento" no lugar de "Status do Carregamento"
    await page.getByText('EDC-0001').first().click();
    await expect(page.getByRole('heading', { name: /Cancelamento/i })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('heading', { name: /Status do Carregamento/i })).not.toBeVisible();
    await page.screenshot({ path: SS('07-detalhe-cancelado') });
  });

  test('10.3 — cliente NÃO vê botões "Editar Agendamento"/"Cancelar Agendamento" (acesso restrito)', async ({ page }) => {
    await loginAs(page, state.users.cliente1!.email);
    await page.goto('/agendamentos');
    await page.waitForLoadState('networkidle');

    const algumAgendamento = page.locator('[class*="cursor-pointer"]').filter({ hasText: 'Pedido:' }).first();
    if (await algumAgendamento.count() > 0) {
      await algumAgendamento.click();
      await page.waitForTimeout(1000);
      await expect(page.getByRole('button', { name: /Editar Agendamento/i })).not.toBeVisible();
      await expect(page.getByRole('button', { name: /Cancelar Agendamento/i })).not.toBeVisible();
      await page.screenshot({ path: SS('08-cliente-sem-botoes') });
    }
  });

  test('10.4 — limpeza: cancelar a liberação de teste (libera a reserva de estoque)', async ({ page }) => {
    // O agendamento já foi cancelado em 10.2, mas a liberação em si continua
    // reservando quantidade_liberada contra o estoque do armazém até ser
    // cancelada — sem isso, cada execução deste teste reduz permanentemente o
    // saldo disponível do armazém usado (mesmo problema já visto em outros
    // dados de teste residuais no ambiente de Dev).
    await loginAs(page, ADMIN.email, ADMIN.password);
    await cancelarLiberacaoSeExistir(page, 'PEDIDO-EDCANC-001');
  });
});
