import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

/** Recoge errores de JS y respuestas locales con error mientras se usa la página. */
function watch(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && /Content Security Policy|Refused to/i.test(m.text())) problems.push(m.text());
  });
  page.on('response', (r) => {
    const url = r.url();
    if (url.startsWith('http://127.0.0.1') && r.status() >= 400 && !url.includes('/_vercel/')) {
      problems.push(`HTTP ${r.status()} ${url}`);
    }
  });
  return problems;
}

test('la demo carga sin errores y muestra el panel', async ({ page }) => {
  const problems = watch(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('CoreIT');
  await expect(page.getByRole('navigation', { name: 'Filtro de Categorías' })).toBeVisible();
  await expect(page.locator('h3').first()).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(problems).toEqual([]);
});

test('no hay scroll horizontal', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test('el buscador filtra las automatizaciones', async ({ page }) => {
  await page.goto('/');
  const search = page.getByPlaceholder('Buscar automatización...');
  await expect(page.locator('h3').first()).toBeVisible();
  await search.fill('zzzz-no-existe');
  await expect(page.getByText('No se encontraron automatizaciones')).toBeVisible();
  await search.fill('');
  await expect(page.locator('h3').first()).toBeVisible();
});
