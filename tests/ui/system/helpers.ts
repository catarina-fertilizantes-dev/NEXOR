import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const STATE_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'state.json');

export const ADMIN = { email: 'administrador1@nexorops.com.br', password: 'DWJ_SHhsc3EN!F2' };
export const NEW_PASSWORD = 'Teste@2026!';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function login(page: Page, email: string, password: string) {
  // Garantir que não está logado
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');

  // Se foi redirecionado para /change-password, voltar para /auth
  if (page.url().includes('/change-password')) {
    // Precisamos fazer logout — ir para /auth com query de logout se disponível
    await page.goto('/auth?logout=1');
    await page.waitForLoadState('networkidle');
  }

  if (!page.url().includes('/auth')) {
    await page.evaluate(() => {
      // Limpar sessão do Supabase
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('sb-')) localStorage.removeItem(k);
      });
    });
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
  }

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  // Aguarda sair do /auth (pode ir para /change-password ou para home)
  await page.waitForURL(url => !url.pathname.includes('/auth'), { timeout: 15000 });
}

export async function loginExpectPasswordChange(page: Page, email: string, tempPassword: string): Promise<void> {
  await login(page, email, tempPassword);
  await expect(page).toHaveURL(/\/change-password/, { timeout: 10000 });
}

export async function changePassword(page: Page, newPassword: string): Promise<void> {
  // Deve estar em /change-password
  await page.waitForURL(/\/change-password/, { timeout: 5000 });

  // Preencher nova senha nos campos disponíveis
  const inputs = page.locator('input[type="password"]');
  const count = await inputs.count();

  if (count >= 2) {
    await inputs.nth(0).fill(newPassword);
    await inputs.nth(1).fill(newPassword);
  } else {
    await inputs.first().fill(newPassword);
  }

  await page.locator('button[type="submit"]').click();
  // Aguarda redirecionar para a área logada
  await page.waitForURL(url => !url.pathname.includes('/change-password') && !url.pathname.includes('/auth'), { timeout: 15000 });
}

// ─── Captura de senha temporária do modal de credenciais ─────────────────────

export async function captureTempPassword(page: Page): Promise<string> {
  // Aguarda o modal de credenciais aparecer
  await expect(page.locator('.font-mono.text-sm.font-bold').first()).toBeVisible({ timeout: 15000 });
  const senha = await page.locator('.font-mono.text-sm.font-bold').first().textContent() ?? '';
  return senha.trim();
}

// ─── Navegação ────────────────────────────────────────────────────────────────

export async function goTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

// ─── Estado ──────────────────────────────────────────────────────────────────

export interface SystemState {
  users: Record<string, { email: string; tempPassword: string; finalPassword: string }>;
  produto1Nome?: string;
  armazem1Nome?: string;
  armazem2Nome?: string;
  cliente1Nome?: string;
  cliente2Nome?: string;
  representante1Nome?: string;
}

export function readState(): SystemState {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return { users: {} };
  }
}

export function saveState(state: SystemState): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function updateState(partial: Partial<SystemState>): void {
  const current = readState();
  saveState({ ...current, ...partial, users: { ...current.users, ...(partial.users ?? {}) } });
}
