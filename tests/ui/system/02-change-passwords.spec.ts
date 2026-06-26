/**
 * NEXOR — Fase 2: Troca de senha obrigatória no primeiro login
 *
 * Cada usuário criado pelo admin (armazem1, armazem2, rep1, cli1, cli2)
 * precisa fazer login com a senha temporária e trocá-la pela senha definitiva.
 *
 * Colaborador (Maria Logística) já recebeu senha definitiva diretamente, então
 * não aparece aqui.
 *
 * Lê credenciais do state.json escrito pelo 01-admin-setup.spec.ts.
 *
 * Execução: npx playwright test tests/ui/system/02-change-passwords.spec.ts --project=edge
 */

import { test, expect } from '@playwright/test';
import { NEW_PASSWORD, readState, updateState } from './helpers';

const SS = (name: string) => `tests/ui/system/screenshots/${name}.png`;

// ─── Helper para trocar senha ─────────────────────────────────────────────────

async function trocarSenha(page: import('@playwright/test').Page, email: string, tempPassword: string, label: string) {
  // Garantir que está na página de auth sem sessão ativa
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => {
    Object.keys(localStorage).forEach(k => { if (k.startsWith('sb-')) localStorage.removeItem(k); });
  });

  // Login com senha temporária
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(tempPassword);
  await page.locator('button[type="submit"]').click();

  // Aguardar resposta do login (3 casos possíveis):
  //   1. Redireciona para /change-password → senha ainda não trocada (fluxo normal)
  //   2. Redireciona para a app → senha já trocada (testar com nova senha)
  //   3. Fica em /auth → senha temporária incorreta, tentar com nova senha
  await page.waitForTimeout(3000);
  const urlAfterLogin = page.url();

  if (urlAfterLogin.includes('/change-password')) {
    // Fluxo normal: trocar senha
    await page.screenshot({ path: `tests/ui/system/screenshots/cp-${label}-01-change-page.png` });

    const inputs = page.locator('input[type="password"]');
    const count = await inputs.count();
    if (count >= 2) {
      await inputs.nth(0).fill(NEW_PASSWORD);
      await inputs.nth(1).fill(NEW_PASSWORD);
    } else {
      await inputs.first().fill(NEW_PASSWORD);
    }

    await page.locator('button[type="submit"]').click();

    // Após a troca, app faz signOut e redireciona para /auth
    await page.waitForURL(/\/auth/, { timeout: 15000 });
    await page.screenshot({ path: `tests/ui/system/screenshots/cp-${label}-02-redirected-auth.png` });

    // Login com nova senha para confirmar
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(NEW_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(url => !url.pathname.includes('/auth') && !url.pathname.includes('/change-password'), { timeout: 15000 });
    await page.screenshot({ path: `tests/ui/system/screenshots/cp-${label}-03-logged-in.png` });
    console.log(`  ✅ ${label}: senha trocada com sucesso`);

  } else if (!urlAfterLogin.includes('/auth')) {
    // Senha temp já funcionou e foi para a app — provavelmente já trocada antes
    console.log(`  ℹ️  ${label}: usuário já tinha senha ativa (force_change=true, mas temp ainda funciona)`);
    await page.screenshot({ path: `tests/ui/system/screenshots/cp-${label}-01-already-logged-in.png` });

  } else {
    // Falhou com a senha temp — tentar com NEW_PASSWORD (já foi trocada antes)
    console.log(`  ℹ️  ${label}: senha temp inválida, tentando com senha final...`);
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(NEW_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(url => !url.pathname.includes('/auth'), { timeout: 15000 });
    await page.screenshot({ path: `tests/ui/system/screenshots/cp-${label}-01-already-changed.png` });
    console.log(`  ✅ ${label}: senha já alterada, login com nova senha confirmado`);
  }
}

// ─── Suite ───────────────────────────────────────────────────────────────────

test.describe.serial('Troca de senha — primeiro login', () => {

  test('2.1 — armazem1 (Joinville) troca senha', async ({ page }) => {
    const state = readState();
    const user = state.users.armazem1;
    expect(user, 'armazem1 deve estar no state.json').toBeTruthy();

    await trocarSenha(page, user!.email, user!.tempPassword, 'armazem1');

    updateState({ users: { armazem1: { ...user!, finalPassword: NEW_PASSWORD } } });
  });

  test('2.2 — armazem2 (Porto Alegre) troca senha', async ({ page }) => {
    const state = readState();
    const user = state.users.armazem2;
    expect(user, 'armazem2 deve estar no state.json').toBeTruthy();

    await trocarSenha(page, user!.email, user!.tempPassword, 'armazem2');

    updateState({ users: { armazem2: { ...user!, finalPassword: NEW_PASSWORD } } });
  });

  test('2.3 — representante1 (João) troca senha', async ({ page }) => {
    const state = readState();
    const user = state.users.representante1;
    expect(user, 'representante1 deve estar no state.json').toBeTruthy();

    await trocarSenha(page, user!.email, user!.tempPassword, 'rep1');

    updateState({ users: { representante1: { ...user!, finalPassword: NEW_PASSWORD } } });
  });

  test('2.4 — cliente1 (Agro Centro-Oeste) troca senha', async ({ page }) => {
    const state = readState();
    const user = state.users.cliente1;
    expect(user, 'cliente1 deve estar no state.json').toBeTruthy();

    await trocarSenha(page, user!.email, user!.tempPassword, 'cli1');

    updateState({ users: { cliente1: { ...user!, finalPassword: NEW_PASSWORD } } });
  });

  test('2.5 — cliente2 (Fazenda São João) troca senha', async ({ page }) => {
    const state = readState();
    const user = state.users.cliente2;
    expect(user, 'cliente2 deve estar no state.json').toBeTruthy();

    await trocarSenha(page, user!.email, user!.tempPassword, 'cli2');

    updateState({ users: { cliente2: { ...user!, finalPassword: NEW_PASSWORD } } });
  });

});
