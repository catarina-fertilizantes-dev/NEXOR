/**
 * NEXOR — Fase 9: Seed de dados para validação dos dashboards por perfil
 *
 * Objetivo: popular o banco Dev com dados variados o suficiente para que
 * TODOS os cards dos 3 dashboards (logística, armazém, cliente/representante)
 * tenham pelo menos uma informação para exibir.
 *
 * Cria (tudo via UI real, nenhum insert direto no banco):
 *  - 1 cliente novo (Fazenda Serra Verde), vinculado ao representante1
 *    → representante1 passa a representar 2 clientes (cliente1 + cliente3),
 *      cliente2 (Fazenda São João) continua sem representante — testa o filtro.
 *  - 6 liberações novas, espalhadas entre os 3 clientes e os 2 armazéns
 *  - 10 agendamentos: 7 hoje, 1 amanhã, 2 dentro da semana
 *  - Carregamentos avançados por etapas diferentes (fila, carregando,
 *    finalizado, documentação parcial) e 4 totalmente finalizados
 *    (incluindo o ABC-1234 que ficou parado na etapa 1 desde o teste 04)
 *
 * Datas/timestamps históricos (backdating) são ajustados depois via SQL,
 * separadamente — este spec só cria dados "hoje", pela interface.
 *
 * Execução: npx playwright test tests/ui/system/09-seed-dashboards.spec.ts --project=edge
 */

import { test, expect, Page, Locator } from '@playwright/test';
import { NEW_PASSWORD, readState, updateState, captureTempPassword, goTo, login, ADMIN } from './helpers';

const SS = (name: string) => `tests/ui/system/screenshots/seed-${name}.png`;

const CLIENTE3 = {
  nome: 'Fazenda Serra Verde',
  cnpj: '33.444.555/0001-22',
  email: 'serraverde@nexortest.com',
  telefone: '(47) 95555-1122',
};

async function openDialog(page: Page, buttonLabel: string | RegExp) {
  await page.getByRole('button', { name: buttonLabel }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 8000 });
  return page.getByRole('dialog');
}

function dateOffset(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().split('T')[0];
}

// ─── Helper: criar liberação ──────────────────────────────────────────────────

async function criarLiberacao(
  page: Page,
  pedido: string,
  clienteRegex: RegExp,
  armazemRegex: RegExp,
  quantidade: string
) {
  await goTo(page, '/liberacoes');
  const dialog = await openDialog(page, /Nova Liberação/i);

  await dialog.locator('#pedido').fill(pedido);
  await dialog.locator('#cliente').click();
  await page.getByRole('option', { name: clienteRegex }).first().click();
  await dialog.locator('#armazem').click();
  await page.getByRole('option', { name: armazemRegex }).first().click();
  await dialog.locator('#produto').click();
  await page.getByRole('option', { name: /Ureia 46%/i }).first().click();
  await dialog.locator('#quantidade').fill(quantidade);

  const btn = dialog.getByRole('button', { name: /Criar Liberação|Confirmar|Salvar/i }).first();
  await expect(btn).toBeEnabled({ timeout: 5000 });
  await btn.click();
  await expect(page.getByText(/liberação criada|criada com sucesso/i).first()).toBeVisible({ timeout: 10000 });
}

// ─── Helper: criar agendamento ────────────────────────────────────────────────

async function criarAgendamento(
  page: Page,
  pedidoRegex: RegExp,
  quantidade: string,
  placa: string,
  motorista: string,
  diasOffset: number
) {
  await goTo(page, '/agendamentos');
  await page.getByRole('button', { name: /Novo Agendamento/i }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 8000 });

  const dialog = page.getByRole('dialog');
  await dialog.locator('#liberacao').click();
  await page.getByRole('option', { name: pedidoRegex }).first().click();

  await dialog.locator('#quantidade').fill(quantidade);
  await dialog.locator('#data').fill(dateOffset(diasOffset));
  await dialog.locator('#placa').fill(placa);
  await dialog.locator('#placaCarreta1').fill(`CAR${placa.slice(-4)}`);
  await dialog.locator('#motorista').fill(motorista);
  await dialog.locator('#documento').fill('222.333.444-55');
  await dialog.locator('#transportadora').fill('Transportes Seed Ltda');
  await dialog.locator('#cnpjTransportadora').fill('22.333.444/0001-55');

  await dialog.getByRole('button', { name: /Confirmar|Salvar|Criar/i }).first().click();
  await expect(page.getByText(/agendamento.*criado|criado.*sucesso/i).first()).toBeVisible({ timeout: 10000 });
}

// ─── Helper: navegar até o carregamento pela placa ───────────────────────────

async function navegarParaCarregamento(page: Page, placa: string): Promise<void> {
  await page.goto('/carregamentos');
  await page.waitForLoadState('networkidle');
  // A UI formata a placa com um traço entre letras e números (ex: "SED0001" -> "SED-0001").
  const placaComTracoOpcional = placa.replace(/^([A-Z]+)(\d+)$/i, '$1-?$2');
  const card = page.getByText(new RegExp(placaComTracoOpcional, 'i')).first();
  await expect(card).toBeVisible({ timeout: 10000 });
  await card.click();
  await page.waitForURL(/\/carregamentos\//, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

// ─── Helper: avançar etapa 1-4 com foto ──────────────────────────────────────

async function avancarEtapaComFoto(page: Page, etapaNome: string): Promise<void> {
  const btnEtapa = page.getByRole('button', { name: new RegExp(etapaNome, 'i') }).first();
  if (await btnEtapa.count() > 0) {
    await btnEtapa.click();
    await page.waitForTimeout(400);
  }

  await page.locator('#file-upload-foto').setInputFiles({
    name: `foto-${Date.now()}.jpg`,
    mimeType: 'image/jpeg',
    buffer: Buffer.from('FAKE_JPEG_CONTENT'),
  });
  await page.waitForTimeout(400);

  const btnProxima = page.getByRole('button', { name: 'Próxima' });
  await expect(btnProxima).toBeEnabled({ timeout: 5000 });
  await btnProxima.click();

  await expect(
    page.getByText(/carregamento avançou|etapa.*atualiz|avançou para/i).first()
  ).toBeVisible({ timeout: 10000 });
}

// ─── Helper: enviar documentos de uma sub-etapa (5a/5b/5c) ───────────────────

async function enviarDocumentosSubEtapa(page: Page, subEtapaId: '5a' | '5b' | '5c'): Promise<void> {
  const btnEtapa5 = page.getByRole('button', { name: /Documentação/i }).first();
  if (await btnEtapa5.count() > 0) {
    await btnEtapa5.click();
    await page.waitForTimeout(400);
  }

  await page.locator(`#pdf-upload-${subEtapaId}`).setInputFiles({
    name: `nota-${subEtapaId}-${Date.now()}.pdf`,
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 fake content'),
  });
  await page.locator(`#xml-upload-${subEtapaId}`).setInputFiles({
    name: `nota-${subEtapaId}-${Date.now()}.xml`,
    mimeType: 'application/xml',
    buffer: Buffer.from(`<?xml version="1.0"?><nota><tipo>${subEtapaId}</tipo></nota>`),
  });
  await page.waitForTimeout(300);

  const btnEnviar = page.getByRole('button', { name: /Enviar Documentos/i }).first();
  await expect(btnEnviar).toBeEnabled({ timeout: 5000 });
  await btnEnviar.click();

  await expect(
    page.getByText(/documentos enviados|carregamento finalizado/i).first()
  ).toBeVisible({ timeout: 15000 });
}

// ═══════════════════════════════════════════════════════════════════════════
// SUITE
// ═══════════════════════════════════════════════════════════════════════════

test.describe.serial('Seed de dados para dashboards', () => {

  // ─── 0. Terceiro cliente, vinculado ao representante1 ─────────────────────

  test('0.1 — Cadastrar Cliente 3: Fazenda Serra Verde (com representante)', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await goTo(page, '/clientes');

    const dialog = await openDialog(page, /Novo Cliente/i);
    await dialog.locator('#nome').fill(CLIENTE3.nome);
    await dialog.locator('#cnpj_cpf').fill(CLIENTE3.cnpj);
    await dialog.locator('#new-client-email').fill(CLIENTE3.email);
    await dialog.locator('#telefone').fill(CLIENTE3.telefone);

    await dialog.locator('#representante_id').click();
    await page.getByRole('option', { name: /João Representações/i }).first().click();

    await page.screenshot({ path: SS('00-cliente3-form') });
    await dialog.getByRole('button', { name: /Criar Cliente/i }).click();

    const tempPass = await captureTempPassword(page);
    updateState({
      cliente3Nome: CLIENTE3.nome,
      users: { cliente3: { email: CLIENTE3.email, tempPassword: tempPass, finalPassword: 'Teste@2026!' } },
    } as any);

    await page.getByRole('button', { name: /fechar|ok|concluir|entendi|cancelar/i }).first().click();
    await page.screenshot({ path: SS('01-cliente3-criado') });
  });

  // ─── 1. Liberações ──────────────────────────────────────────────────────────

  test('1.1 — Liberação SEED-001: Agro Centro-Oeste / Joinville / 150t', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await criarLiberacao(page, 'SEED-001', /Agro Centro-Oeste/i, /Joinville/i, '150');
  });

  test('1.2 — Liberação SEED-002: Fazenda Serra Verde / Porto Alegre / 200t', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await criarLiberacao(page, 'SEED-002', /Serra Verde/i, /Porto Alegre/i, '200');
  });

  test('1.3 — Liberação SEED-003: Fazenda São João / Joinville / 120t', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await criarLiberacao(page, 'SEED-003', /Fazenda São João/i, /Joinville/i, '120');
  });

  test('1.4 — Liberação SEED-004: Agro Centro-Oeste / Porto Alegre / 80t (vai ficar "vencida")', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await criarLiberacao(page, 'SEED-004', /Agro Centro-Oeste/i, /Porto Alegre/i, '80');
  });

  test('1.5 — Liberação SEED-005: Fazenda Serra Verde / Joinville / 60t (vai ficar "perto do prazo")', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await criarLiberacao(page, 'SEED-005', /Serra Verde/i, /Joinville/i, '60');
    await page.screenshot({ path: SS('02-liberacoes-listagem') });
  });

  test('1.6 — Liberação SEED-006: Agro Centro-Oeste / Joinville / 90t', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await criarLiberacao(page, 'SEED-006', /Agro Centro-Oeste/i, /Joinville/i, '90');
  });

  // ─── 2. Agendamentos ────────────────────────────────────────────────────────

  test('2.1 — Agendamento hoje: SED0001 (SEED-006, Joinville)', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await criarAgendamento(page, /SEED-006/i, '30', 'SED0001', 'Motorista Seed Um', 0);
  });

  test('2.2 — Agendamento hoje: SED0002 (SEED-002, Porto Alegre)', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await criarAgendamento(page, /SEED-002/i, '40', 'SED0002', 'Motorista Seed Dois', 0);
  });

  test('2.3 — Agendamento hoje: SED0003 (SEED-001, Joinville)', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await criarAgendamento(page, /SEED-001/i, '50', 'SED0003', 'Motorista Seed Tres', 0);
  });

  test('2.4 — Agendamento hoje: SED0004 (SEED-002, Porto Alegre)', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await criarAgendamento(page, /SEED-002/i, '30', 'SED0004', 'Motorista Seed Quatro', 0);
  });

  test('2.5 — Agendamento hoje: SED0005 (SEED-001, Joinville) — vai finalizar', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await criarAgendamento(page, /SEED-001/i, '25', 'SED0005', 'Motorista Seed Cinco', 0);
  });

  test('2.6 — Agendamento hoje: SED0006 (SEED-002, Porto Alegre) — vai finalizar', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await criarAgendamento(page, /SEED-002/i, '35', 'SED0006', 'Motorista Seed Seis', 0);
  });

  test('2.7 — Agendamento hoje: SED0007 (SEED-006, Joinville) — vai finalizar', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await criarAgendamento(page, /SEED-006/i, '20', 'SED0007', 'Motorista Seed Sete', 0);
    await page.screenshot({ path: SS('03-agendamentos-hoje') });
  });

  test('2.8 — Agendamento amanhã: SED0008 (SEED-003, Joinville)', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await criarAgendamento(page, /SEED-003/i, '40', 'SED0008', 'Motorista Seed Oito', 1);
  });

  test('2.9 — Agendamento +3 dias: SED0009 (SEED-005, Joinville)', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await criarAgendamento(page, /SEED-005/i, '20', 'SED0009', 'Motorista Seed Nove', 3);
  });

  test('2.10 — Agendamento +5 dias: SED0010 (SEED-004, Porto Alegre)', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await criarAgendamento(page, /SEED-004/i, '30', 'SED0010', 'Motorista Seed Dez', 5);
    await page.screenshot({ path: SS('04-agendamentos-semana') });
  });

  // ─── 3. Carregamentos: avançar por etapas diferentes ──────────────────────

  test('3.1 — SED0001 (Joinville): avança até etapa 2 (fila)', async ({ page }) => {
    const state = readState();
    await login(page, state.users.armazem1!.email, NEW_PASSWORD);
    await navegarParaCarregamento(page, 'SED0001');
    await avancarEtapaComFoto(page, 'Chegada');
    await page.screenshot({ path: SS('05-seed0001-etapa2') });
  });

  test('3.2 — SED0002 (Porto Alegre): avança até etapa 3 (carregando)', async ({ page }) => {
    const state = readState();
    await login(page, state.users.armazem2!.email, NEW_PASSWORD);
    await navegarParaCarregamento(page, 'SED0002');
    await avancarEtapaComFoto(page, 'Chegada');
    await navegarParaCarregamento(page, 'SED0002');
    await avancarEtapaComFoto(page, 'Início Carregamento');
    await page.screenshot({ path: SS('06-seed0002-etapa3') });
  });

  test('3.3 — SED0003 (Joinville): avança até etapa 4 (finalizado)', async ({ page }) => {
    const state = readState();
    await login(page, state.users.armazem1!.email, NEW_PASSWORD);
    for (const etapa of ['Chegada', 'Início Carregamento', 'Carregando']) {
      await navegarParaCarregamento(page, 'SED0003');
      await avancarEtapaComFoto(page, etapa);
    }
    await page.screenshot({ path: SS('07-seed0003-etapa4') });
  });

  test('3.4 — SED0004 (Porto Alegre): avança até etapa 5, só 5a concluída', async ({ page }) => {
    const state = readState();
    await login(page, state.users.armazem2!.email, NEW_PASSWORD);
    for (const etapa of ['Chegada', 'Início Carregamento', 'Carregando', 'Carreg. Finalizado']) {
      await navegarParaCarregamento(page, 'SED0004');
      await avancarEtapaComFoto(page, etapa);
    }
    await navegarParaCarregamento(page, 'SED0004');
    await enviarDocumentosSubEtapa(page, '5a');
    await page.screenshot({ path: SS('08-seed0004-etapa5-parcial') });
  });

  test('3.5 — SED0005 (Joinville): finaliza completamente (etapa 6)', async ({ page }) => {
    // Retomando de tentativas anteriores: confirmado via banco que já está na
    // etapa 5 com 5a e 5b concluídos — só falta 5c (armazém).
    test.setTimeout(60000);
    const state = readState();

    await login(page, state.users.armazem1!.email, NEW_PASSWORD);
    await navegarParaCarregamento(page, 'SED0005');
    await enviarDocumentosSubEtapa(page, '5c');
    await page.screenshot({ path: SS('09-seed0005-finalizado') });
  });

  test('3.6 — SED0006 (Porto Alegre): finaliza completamente (etapa 6)', async ({ page }) => {
    test.setTimeout(120000);
    const state = readState();
    await login(page, state.users.armazem2!.email, NEW_PASSWORD);
    for (const etapa of ['Chegada', 'Início Carregamento', 'Carregando', 'Carreg. Finalizado']) {
      await navegarParaCarregamento(page, 'SED0006');
      await avancarEtapaComFoto(page, etapa);
    }
    await navegarParaCarregamento(page, 'SED0006');
    await enviarDocumentosSubEtapa(page, '5a');

    await login(page, state.users.colaborador1!.email, state.users.colaborador1!.finalPassword);
    await navegarParaCarregamento(page, 'SED0006');
    await enviarDocumentosSubEtapa(page, '5b');

    await login(page, state.users.armazem2!.email, NEW_PASSWORD);
    await navegarParaCarregamento(page, 'SED0006');
    await enviarDocumentosSubEtapa(page, '5c');
    await page.screenshot({ path: SS('10-seed0006-finalizado') });
  });

  test('3.7 — SED0007 (Joinville): finaliza completamente (etapa 6)', async ({ page }) => {
    test.setTimeout(120000);
    const state = readState();
    await login(page, state.users.armazem1!.email, NEW_PASSWORD);
    for (const etapa of ['Chegada', 'Início Carregamento', 'Carregando', 'Carreg. Finalizado']) {
      await navegarParaCarregamento(page, 'SED0007');
      await avancarEtapaComFoto(page, etapa);
    }
    await navegarParaCarregamento(page, 'SED0007');
    await enviarDocumentosSubEtapa(page, '5a');

    await login(page, state.users.colaborador1!.email, state.users.colaborador1!.finalPassword);
    await navegarParaCarregamento(page, 'SED0007');
    await enviarDocumentosSubEtapa(page, '5b');

    await login(page, state.users.armazem1!.email, NEW_PASSWORD);
    await navegarParaCarregamento(page, 'SED0007');
    await enviarDocumentosSubEtapa(page, '5c');
    await page.screenshot({ path: SS('11-seed0007-finalizado') });
  });

  test('3.8 — ABC-1234 (Joinville, do teste 04): finaliza completamente (etapa 6)', async ({ page }) => {
    // Confirmado via banco antes de rodar: ambos os carregamentos do ABC-1234
    // (do teste 04) estão parados na etapa 1 — .first() pega um deles e avança
    // até o fim; o outro fica na etapa 1 mesmo (dado extra, não atrapalha).
    test.setTimeout(120000);
    const state = readState();
    await login(page, state.users.armazem1!.email, NEW_PASSWORD);
    for (const etapa of ['Chegada', 'Início Carregamento', 'Carregando', 'Carreg. Finalizado']) {
      await navegarParaCarregamento(page, 'ABC-1234');
      await avancarEtapaComFoto(page, etapa);
    }
    await navegarParaCarregamento(page, 'ABC-1234');
    await enviarDocumentosSubEtapa(page, '5a');

    await login(page, state.users.colaborador1!.email, state.users.colaborador1!.finalPassword);
    await navegarParaCarregamento(page, 'ABC-1234');
    await enviarDocumentosSubEtapa(page, '5b');

    await login(page, state.users.armazem1!.email, NEW_PASSWORD);
    await navegarParaCarregamento(page, 'ABC-1234');
    await enviarDocumentosSubEtapa(page, '5c');
    await page.screenshot({ path: SS('12-abc1234-finalizado') });
  });

  // ─── 4. Verificação final ───────────────────────────────────────────────────

  test('4.1 — dashboard de logística carrega sem erro após o seed', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SS('13-dashboard-pos-seed') });
    await expect(page.locator('main, [role="main"]').first()).toBeVisible({ timeout: 8000 });
  });

});
