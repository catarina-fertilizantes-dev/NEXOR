import { Page, expect } from '@playwright/test';

export const BASE = 'https://nexor-dev.vercel.app';

// Arquivo não usado por nenhum workflow de CI (só tests/ui/cancelar-liberacao.spec.ts,
// que roda manualmente). Credenciais vêm de variáveis de ambiente — nunca hardcode
// aqui. admin/colaborador reaproveitam as mesmas variáveis de tests/backend/.env.local;
// os demais mapeamentos deste arquivo são legados e podem não corresponder mais às
// contas atuais (ver memória project-nexor-test-credentials-churn).
export const USERS = {
  admin:          { email: process.env.TEST_ADMIN_EMAIL ?? '',       password: process.env.TEST_ADMIN_PASSWORD ?? '',       label: 'admin' },
  colaborador:    { email: process.env.TEST_COLABORADOR_EMAIL ?? '', password: process.env.TEST_COLABORADOR_PASSWORD ?? '', label: 'colaborador (logistica)' },
  cliente1:       { email: process.env.TEST_CLIENTE1_EMAIL ?? '',    password: process.env.TEST_CLIENTE1_PASSWORD ?? '',    label: 'cliente1' },
  representante1: { email: process.env.TEST_REPRESENTANTE1_EMAIL ?? '', password: process.env.TEST_REPRESENTANTE1_PASSWORD ?? '', label: 'representante1' },
  armazem1:       { email: process.env.TEST_ARMAZEM1_EMAIL ?? '',    password: process.env.TEST_ARMAZEM1_PASSWORD ?? '',    label: 'armazem1' },
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
