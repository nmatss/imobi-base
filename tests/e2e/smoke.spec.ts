/**
 * Smoke Tests - Critical Path
 *
 * These checks cover the current public landing, authentication, persistence,
 * health endpoint, and the protected pages most likely to break P0 flows.
 */

import { expect, Page, test } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { testUsers } from './fixtures/auth.fixture';

const adminUser = testUsers.admin;

async function loginAsAdmin(page: Page) {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAndWait(adminUser.email, adminUser.password);

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('heading', { name: /Painel Operacional/i })).toBeVisible();
}

async function expectNoAppCrash(page: Page) {
  await expect(page.getByText('Ops! Algo deu errado')).not.toBeVisible();
  await expect(page.getByText('Erro no Servidor')).not.toBeVisible();
  await expect(page.getByText('Erro de Conexão')).not.toBeVisible();
}

test.describe('Smoke Tests - Critical Path @smoke', () => {
  test.describe.configure({ mode: 'serial' });

  test('landing publica acessivel', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole('heading', { name: /A intelig.ncia.*imobili.ria.*precisa/i })
    ).toBeVisible();
    await expect(page).not.toHaveTitle(/error/i);
    await expectNoAppCrash(page);
  });

  test('site publico do tenant seed carrega', async ({ page }) => {
    await page.goto('/e/sol');

    await expect(page).toHaveURL(/\/e\/sol$/);
    await expect(page.getByText('Imobiliária Sol').first()).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Encontre o im.vel dos seus sonhos/i })
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: /Im.veis Dispon.veis/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Ver Im.veis/i }).first()).toBeVisible();
    await expectNoAppCrash(page);
  });

  test('login funciona com admin seed', async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('dashboard permanece apos reload', async ({ page }) => {
    await loginAsAdmin(page);

    await page.reload();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: /Painel Operacional/i })).toBeVisible();
    await expectNoAppCrash(page);
  });

  test('API health check retorna 200', async ({ request }) => {
    const response = await request.get('/api/health');

    expect(response.status()).toBe(200);
    expect(response.ok()).toBeTruthy();
  });

  test('/marketing mostra estado de upgrade sem crash', async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));

    await loginAsAdmin(page);
    await page.goto('/marketing');

    await expect(page).toHaveURL(/\/marketing/);
    await expect(page.getByRole('heading', { name: 'Marketing IA', exact: true })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Marketing IA disponivel no plano Profissional/i })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Ver planos/i })).toBeVisible();
    await expectNoAppCrash(page);
    expect(runtimeErrors).toEqual([]);
  });

  test('/vistorias mostra estado de upgrade sem crash', async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));

    await loginAsAdmin(page);
    await page.goto('/vistorias');

    await expect(page).toHaveURL(/\/vistorias/);
    // O tenant seed nao tem a feature digital_inspections (plano Business):
    // o gate do servidor retorna 403 e a pagina mostra o estado de upgrade,
    // mantendo o h1 "Vistorias" visivel (mesmo padrao do /marketing).
    await expect(page.getByRole('heading', { name: 'Vistorias', exact: true })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Vistorias digitais disponiveis no plano Business/i })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Ver planos/i })).toBeVisible();
    await expectNoAppCrash(page);
    expect(runtimeErrors).toEqual([]);
  });

  test('navegacao principal basica', async ({ page }) => {
    await loginAsAdmin(page);

    const nav = page.getByRole('navigation', { name: /Menu principal/i });
    const destinations = [
      { href: '/properties', heading: /Im.veis/i },
      { href: '/leads', heading: /CRM de Vendas/i },
      { href: '/calendar', heading: /Agenda de Visitas/i },
      // Match exato: a pagina bloqueada por plano tambem renderiza o heading
      // "Vistorias digitais disponiveis no plano Business" (strict mode).
      { href: '/vistorias', heading: 'Vistorias' },
    ];

    for (const destination of destinations) {
      await nav.locator(`a[href="${destination.href}"]`).click();

      await expect(page).toHaveURL(new RegExp(`${destination.href}$`));
      // exact so vale para nomes string (ignorado em regex): evita strict-mode
      // violation quando ha headings que contem o nome (ex.: /vistorias).
      await expect(
        page.getByRole('heading', {
          name: destination.heading,
          exact: typeof destination.heading === 'string',
        })
      ).toBeVisible();
      await expectNoAppCrash(page);
    }
  });
});
