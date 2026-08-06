/**
 * NEXOR — Fase 1: Setup completo como admin
 *
 * Cria toda a base de cadastro do zero via UI:
 *  1. Produto
 *  2. Armazéns (+ usuários armazem1 e armazem2)
 *  3. Representante (+ usuário rep1)
 *  4. Colaborador (usuário logistica1 com senha direta)
 *  5. Clientes (+ usuários cli1 e cli2)
 *  6. Estoque para os armazéns
 *  7. Liberação para cliente1
 *
 * Execução: npx playwright test tests/ui/system/01-admin-setup.spec.ts --project=edge
 */

import { test, expect, Page, Locator } from '@playwright/test';
import { ADMIN, captureTempPassword, goTo, updateState } from './helpers';

const SS = (name: string) => `tests/ui/system/screenshots/${name}.png`;

// ─── Dados de teste ────────────────────────────────────────────────────────

const PRODUTO = { nome: 'Ureia 46%', unidade: 't' };

const ARMAZEM1 = {
  nome: 'Armazém Joinville',
  cidade: 'Joinville',
  estado: 'SC',
  email: 'armazem.joinville@nexortest.com',
  cnpj: '12.345.678/0001-90',
};

const ARMAZEM2 = {
  nome: 'Armazém Porto Alegre',
  cidade: 'Porto Alegre',
  estado: 'RS',
  email: 'armazem.poa@nexortest.com',
  cnpj: '98.765.432/0001-10',
};

const REPRESENTANTE = {
  nome: 'João Representações',
  cpf: '123.456.789-09',
  email: 'joao.rep@nexortest.com',
  telefone: '(11) 91234-5678',
  regiao: 'Sul e Sudeste',
};

const COLABORADOR = {
  nome: 'Maria Logística',
  email: 'maria.logistica@nexortest.com',
  password: 'Teste@2026!',
};

const CLIENTE1 = {
  nome: 'Agro Centro-Oeste Ltda',
  cnpj: '11.222.333/0001-44',
  email: 'agro.co@nexortest.com',
  telefone: '(65) 93333-2222',
};

const CLIENTE2 = {
  nome: 'Fazenda São João',
  cnpj: '55.666.777/0001-88',
  email: 'fazenda.sj@nexortest.com',
  telefone: '(51) 94444-3333',
};

// ─── Login como admin ────────────────────────────────────────────────────────

async function loginAdmin(page: Page) {
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="email"]').fill(ADMIN.email);
  await page.locator('input[type="password"]').fill(ADMIN.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(url => !url.pathname.includes('/auth'), { timeout: 15000 });
}

// ─── Helper: abrir dialog e aguardar ─────────────────────────────────────────

async function openDialog(page: Page, buttonLabel: string, dialogTitle: RegExp) {
  await page.getByRole('button', { name: buttonLabel }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 8000 });
  await expect(page.getByRole('heading', { name: dialogTitle })).toBeVisible({ timeout: 8000 });
  return page.getByRole('dialog');
}

// ─── Suite ─────────────────────────────────────────────────────────────────

test.describe.serial('Admin Setup — banco de dev limpo', () => {

  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  // ═══════════════════════════════════════════════════════
  // STEP 1 — Produto
  // ═══════════════════════════════════════════════════════

  test('1.1 — Cadastrar produto "Ureia 46%"', async ({ page }) => {
    await goTo(page, '/produtos');
    await page.screenshot({ path: SS('01-produtos-vazio') });

    // Abrir dialog de criação
    const dialog = await openDialog(page, 'Novo Produto', /Cadastrar Novo Produto/i);

    // Preencher formulário dentro do dialog
    await dialog.locator('#nome').fill(PRODUTO.nome);

    // Selecionar unidade toneladas
    await dialog.locator('#unidade').click();
    await page.getByRole('option', { name: /tonelada/i }).first().click();

    await page.screenshot({ path: SS('02-produto-form') });

    // Salvar
    await dialog.getByRole('button', { name: /Criar Produto/i }).click();

    // Toast de sucesso
    await expect(page.getByText(/produto.*cadastrado|cadastrado.*sucesso|adicionado/i).first())
      .toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: SS('03-produto-criado') });

    updateState({ produto1Nome: PRODUTO.nome });
  });

  // ═══════════════════════════════════════════════════════
  // STEP 2 — Armazéns
  // ═══════════════════════════════════════════════════════

  test('2.1 — Cadastrar Armazém Joinville (com usuário)', async ({ page }) => {
    await goTo(page, '/armazens');
    await page.screenshot({ path: SS('04-armazens-vazio') });

    const dialog = await openDialog(page, 'Novo Armazém', /Cadastrar Novo Armazém/i);

    await dialog.locator('#nome').fill(ARMAZEM1.nome);
    await dialog.locator('[placeholder*="cidade" i], #cidade').first().fill(ARMAZEM1.cidade);

    await dialog.locator('#estado').click();
    await page.getByRole('option', { name: ARMAZEM1.estado }).first().click();

    await dialog.locator('#new-armazem-email').fill(ARMAZEM1.email);
    await dialog.locator('#cnpj_cpf').fill(ARMAZEM1.cnpj);

    await page.screenshot({ path: SS('05-armazem1-form') });

    await dialog.getByRole('button', { name: /Criar Armazém|Salvar|Cadastrar/i }).first().click();

    // Modal de credenciais
    const tempPass = await captureTempPassword(page);
    expect(tempPass.length).toBeGreaterThan(5);

    await page.screenshot({ path: SS('06-armazem1-credenciais') });
    console.log(`  Armazém Joinville — email: ${ARMAZEM1.email}, senha temp: ${tempPass}`);

    updateState({
      armazem1Nome: ARMAZEM1.nome,
      users: { armazem1: { email: ARMAZEM1.email, tempPassword: tempPass, finalPassword: 'Teste@2026!' } },
    });

    await page.getByRole('button', { name: /fechar|ok|concluir|entendi|cancelar/i }).first().click();
  });

  test('2.2 — Cadastrar Armazém Porto Alegre (com usuário)', async ({ page }) => {
    await goTo(page, '/armazens');

    const dialog = await openDialog(page, 'Novo Armazém', /Cadastrar Novo Armazém/i);

    await dialog.locator('#nome').fill(ARMAZEM2.nome);
    await dialog.locator('[placeholder*="cidade" i], #cidade').first().fill(ARMAZEM2.cidade);

    await dialog.locator('#estado').click();
    await page.getByRole('option', { name: ARMAZEM2.estado }).first().click();

    await dialog.locator('#new-armazem-email').fill(ARMAZEM2.email);
    await dialog.locator('#cnpj_cpf').fill(ARMAZEM2.cnpj);

    await dialog.getByRole('button', { name: /Criar Armazém|Salvar|Cadastrar/i }).first().click();

    const tempPass = await captureTempPassword(page);
    console.log(`  Armazém POA — email: ${ARMAZEM2.email}, senha temp: ${tempPass}`);

    updateState({
      armazem2Nome: ARMAZEM2.nome,
      users: { armazem2: { email: ARMAZEM2.email, tempPassword: tempPass, finalPassword: 'Teste@2026!' } },
    });

    await page.getByRole('button', { name: /fechar|ok|concluir|entendi|cancelar/i }).first().click();
    await page.screenshot({ path: SS('07-armazens-listagem') });
  });

  // ═══════════════════════════════════════════════════════
  // STEP 3 — Representante
  // ═══════════════════════════════════════════════════════

  test('3.1 — Cadastrar representante (com usuário)', async ({ page }) => {
    await goTo(page, '/representantes');
    await page.screenshot({ path: SS('08-representantes-vazio') });

    const dialog = await openDialog(page, 'Novo Representante', /Cadastrar Novo Representante/i);

    await dialog.locator('#nome').fill(REPRESENTANTE.nome);
    await dialog.locator('#cpf').fill(REPRESENTANTE.cpf);
    await dialog.locator('#new-representante-email').fill(REPRESENTANTE.email);
    await dialog.locator('#telefone').fill(REPRESENTANTE.telefone);
    await dialog.locator('#regiao_atuacao').fill(REPRESENTANTE.regiao);

    await page.screenshot({ path: SS('09-representante-form') });

    await dialog.getByRole('button', { name: /Criar Representante|Salvar|Cadastrar/i }).first().click();

    const tempPass = await captureTempPassword(page);
    console.log(`  Representante — email: ${REPRESENTANTE.email}, senha temp: ${tempPass}`);

    updateState({
      representante1Nome: REPRESENTANTE.nome,
      users: { representante1: { email: REPRESENTANTE.email, tempPassword: tempPass, finalPassword: 'Teste@2026!' } },
    });

    await page.getByRole('button', { name: /fechar|ok|concluir|entendi|cancelar/i }).first().click();
    await page.screenshot({ path: SS('10-representante-criado') });
  });

  // ═══════════════════════════════════════════════════════
  // STEP 4 — Colaborador (logística)
  // ═══════════════════════════════════════════════════════

  test('4.1 — Cadastrar colaborador Maria Logística', async ({ page }) => {
    await goTo(page, '/colaboradores');
    await page.screenshot({ path: SS('11-colaboradores-vazio') });

    const dialog = await openDialog(page, 'Novo Colaborador', /Criar Novo Colaborador/i);

    await dialog.locator('#nome').fill(COLABORADOR.nome);
    await dialog.locator('#new-user-email').fill(COLABORADOR.email);
    await dialog.locator('#new-user-password').fill(COLABORADOR.password);

    // Role — o combobox padrão pode ser "admin", mudar para "logistica"
    const roleSelect = dialog.locator('[id="role"], [aria-label*="role" i]').first();
    if (await roleSelect.count() > 0) {
      await roleSelect.click();
      await page.getByRole('option', { name: 'Logística' }).click();
    }

    await page.screenshot({ path: SS('12-colaborador-form') });

    await dialog.getByRole('button', { name: /Criar Colaborador/i }).click();

    await expect(page.getByText(/colaborador.*criado|criado.*sucesso|usuário.*criado/i).first())
      .toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: SS('13-colaborador-criado') });

    updateState({
      users: { colaborador1: { email: COLABORADOR.email, tempPassword: COLABORADOR.password, finalPassword: COLABORADOR.password } },
    });
  });

  // ═══════════════════════════════════════════════════════
  // STEP 5 — Clientes
  // ═══════════════════════════════════════════════════════

  test('5.1 — Cadastrar Cliente 1: Agro Centro-Oeste (com representante)', async ({ page }) => {
    await goTo(page, '/clientes');
    await page.screenshot({ path: SS('14-clientes-vazio') });

    const dialog = await openDialog(page, 'Novo Cliente', /Cadastrar Novo Cliente/i);

    await dialog.locator('#nome').fill(CLIENTE1.nome);
    await dialog.locator('#cnpj_cpf').fill(CLIENTE1.cnpj);
    await dialog.locator('#new-client-email').fill(CLIENTE1.email);
    await dialog.locator('#telefone').fill(CLIENTE1.telefone);

    // Selecionar representante
    await dialog.locator('#representante_id').click();
    await page.getByRole('option', { name: /João Representações/i }).first().click();

    await page.screenshot({ path: SS('15-cliente1-form') });

    await dialog.getByRole('button', { name: /Criar Cliente/i }).click();

    const tempPass = await captureTempPassword(page);
    console.log(`  Cliente 1 — email: ${CLIENTE1.email}, senha temp: ${tempPass}`);

    updateState({
      cliente1Nome: CLIENTE1.nome,
      users: { cliente1: { email: CLIENTE1.email, tempPassword: tempPass, finalPassword: 'Teste@2026!' } },
    });

    await page.getByRole('button', { name: /fechar|ok|concluir|entendi|cancelar/i }).first().click();
    await page.screenshot({ path: SS('16-cliente1-criado') });
  });

  test('5.2 — Cadastrar Cliente 2: Fazenda São João (sem representante)', async ({ page }) => {
    await goTo(page, '/clientes');

    const dialog = await openDialog(page, 'Novo Cliente', /Cadastrar Novo Cliente/i);

    await dialog.locator('#nome').fill(CLIENTE2.nome);
    await dialog.locator('#cnpj_cpf').fill(CLIENTE2.cnpj);
    await dialog.locator('#new-client-email').fill(CLIENTE2.email);
    await dialog.locator('#telefone').fill(CLIENTE2.telefone);

    await dialog.getByRole('button', { name: /Criar Cliente/i }).click();

    const tempPass = await captureTempPassword(page);
    console.log(`  Cliente 2 — email: ${CLIENTE2.email}, senha temp: ${tempPass}`);

    updateState({
      cliente2Nome: CLIENTE2.nome,
      users: { cliente2: { email: CLIENTE2.email, tempPassword: tempPass, finalPassword: 'Teste@2026!' } },
    });

    await page.getByRole('button', { name: /fechar|ok|concluir|entendi|cancelar/i }).first().click();
    await page.screenshot({ path: SS('17-clientes-listagem') });
  });

  // ═══════════════════════════════════════════════════════
  // STEP 6 — Estoque
  // ═══════════════════════════════════════════════════════

  // Helper para preencher o formulário de entrada de estoque
  async function preencherEstoque(page: Page, dialog: Locator, armazem: string, quantidade: string, remessa: string) {
    await dialog.locator('#produto').click();
    await page.getByRole('option', { name: /Ureia 46%/i }).first().click();

    await dialog.locator('#armazem').click();
    await page.getByRole('option', { name: new RegExp(armazem, 'i') }).first().click();

    await dialog.locator('#quantidade').fill(quantidade);
    await dialog.locator('#numero-remessa').fill(remessa);

    // Nota de Remessa (PDF)
    await dialog.locator('#nota-remessa').setInputFiles({
      name: `nota-${remessa}.pdf`,
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 test content'),
    });

    // XML da Remessa
    await dialog.locator('#xml-remessa').setInputFiles({
      name: `remessa-${remessa}.xml`,
      mimeType: 'application/xml',
      buffer: Buffer.from(`<?xml version="1.0"?><remessa><numero>${remessa}</numero></remessa>`),
    });
  }

  test('6.1 — Registrar 1000t no Armazém Joinville', async ({ page }) => {
    await goTo(page, '/estoque');
    await page.screenshot({ path: SS('18-estoque-vazio') });

    const dialog = await openDialog(page, 'Entrada de Estoque', /Registrar Entrada de Estoque/i);

    await preencherEstoque(page, dialog, 'Joinville', '1000', 'REM-001');

    await page.screenshot({ path: SS('19-estoque1-form') });

    await dialog.getByRole('button', { name: /Salvar/i }).click();

    await expect(page.getByText(/estoque.*registrado|entrada.*registrada|adicionado.*sucesso/i).first())
      .toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: SS('20-estoque1-criado') });
  });

  test('6.2 — Registrar 500t no Armazém Porto Alegre', async ({ page }) => {
    await goTo(page, '/estoque');

    const dialog = await openDialog(page, 'Entrada de Estoque', /Registrar Entrada de Estoque/i);

    await preencherEstoque(page, dialog, 'Porto Alegre', '500', 'REM-002');

    await dialog.getByRole('button', { name: /Salvar/i }).click();

    await expect(page.getByText(/estoque.*registrado|entrada.*registrada|adicionado.*sucesso/i).first())
      .toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: SS('21-estoque-listagem') });
  });

  // ═══════════════════════════════════════════════════════
  // STEP 7 — Liberação
  // ═══════════════════════════════════════════════════════

  test('7.1 — Criar liberação 100t para Agro Centro-Oeste', async ({ page }) => {
    await goTo(page, '/liberacoes');
    await page.screenshot({ path: SS('22-liberacoes-vazio') });

    const dialog = await openDialog(page, 'Nova Liberação', /Nova Liberação/i);

    await dialog.locator('#pedido').fill('PEDIDO-TESTE-001');

    await dialog.locator('#cliente').click();
    await page.getByRole('option', { name: /Agro Centro-Oeste/i }).first().click();

    await dialog.locator('#armazem').click();
    await page.getByRole('option', { name: /Joinville/i }).first().click();

    await dialog.locator('#produto').click();
    await page.getByRole('option', { name: /Ureia 46%/i }).first().click();

    await dialog.locator('#quantidade').fill('100');

    await page.screenshot({ path: SS('23-liberacao-form') });

    await dialog.getByRole('button', { name: /Criar Liberação|Salvar|Confirmar/i }).first().click();

    await expect(page.getByText(/liberação.*criada|criada.*sucesso/i).first())
      .toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: SS('24-liberacao-criada') });
  });

  // ═══════════════════════════════════════════════════════
  // STEP 8 — UX edge cases
  // ═══════════════════════════════════════════════════════

  test('8.1 — Dashboard carrega sem erro após setup', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SS('25-dashboard-pos-setup') });
    await expect(page.locator('main, [role="main"]').first()).toBeVisible({ timeout: 8000 });
  });

  test('8.2 — Liberação com estoque insuficiente: validação inline bloqueia envio', async ({ page }) => {
    await goTo(page, '/liberacoes');

    const dialog = await openDialog(page, 'Nova Liberação', /Nova Liberação/i);

    await dialog.locator('#pedido').fill('PEDIDO-TESTE-ERRO');

    await dialog.locator('#cliente').click();
    await page.getByRole('option', { name: /Agro Centro-Oeste/i }).first().click();

    await dialog.locator('#armazem').click();
    await page.getByRole('option', { name: /Joinville/i }).first().click();

    await dialog.locator('#produto').click();
    await page.getByRole('option', { name: /Ureia 46%/i }).first().click();

    // 950t > disponível (1000 - 100 comprometidos = 900t), deve mostrar erro inline
    await dialog.locator('#quantidade').fill('950');

    // Aguardar validação assíncrona do estoque
    await page.waitForTimeout(1000);
    await page.screenshot({ path: SS('26-liberacao-estoque-insuf-form') });

    // Erro inline deve aparecer com a mensagem de excesso
    await expect(page.getByText(/quantidade excede o estoque disponível|excede.*disponível/i).first())
      .toBeVisible({ timeout: 8000 });

    // Botão deve estar desabilitado (não pode submeter)
    await expect(dialog.getByRole('button', { name: /Criar Liberação/i }).first()).toBeDisabled();

    await page.screenshot({ path: SS('27-liberacao-erro-estoque') });
  });
});
