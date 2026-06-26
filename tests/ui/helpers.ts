import { Page, expect } from '@playwright/test';

export const BASE = 'https://nexor-dev.vercel.app';

export const USERS = {
  admin:          { email: 'administrador1@nexorops.com.br', password: 'DWJ_SHhsc3EN!F2', label: 'admin' },
  colaborador:    { email: 'colaborador1@nexorops.com.br',   password: 'DWJ_SHhsc3EN!F2', label: 'colaborador (logistica)' },
  cliente1:       { email: 'cliente1@nexorops.com.br',       password: 'Senha@2026',       label: 'cliente1' },
  representante1: { email: 'representante1@nexorops.com.br', password: 'Senha@2026',       label: 'representante1' },
  armazem1:       { email: 'armazem1@nexorops.com.br',       password: 'Senha@2026',       label: 'armazem1' },
};

export async function login(page: Page, email: string, password: string) {
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');

  // Pode ter redirecionado direto se já logado — logout primeiro
  if (!page.url().includes('/auth')) {
    await page.goto('/auth?logout=true');
    await page.waitForLoadState('networkidle');
  }

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  // Aguarda sair da tela de auth
  await page.waitForURL((url) => !url.pathname.includes('/auth') && !url.pathname.includes('/change-password'), { timeout: 15000 });
}

export async function logout(page: Page) {
  // Tenta via URL de logout ou navega para /auth
  await page.goto('/auth');
  await page.waitForLoadState('networkidle');
}

/** Abre o primeiro card de liberação ativa disponível e retorna o texto do pedido */
export async function abrirPrimeiraLiberacaoAtiva(page: Page): Promise<string | null> {
  await page.goto('/liberacoes');
  await page.waitForLoadState('networkidle');

  // Espera cards carregarem
  const cardSelector = '.space-y-4 .grid .cursor-pointer';
  const count = await page.locator(cardSelector).count();
  if (count === 0) return null;

  const card = page.locator(cardSelector).first();
  const pedidoText = await card.locator('h3').textContent();
  await card.click();

  // Aguarda modal de detalhes abrir
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

  return pedidoText ?? null;
}
