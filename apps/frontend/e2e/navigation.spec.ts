import { test, expect } from '@playwright/test';

test.describe('Navigation — liens et pages (authentifié)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(process.env.VITE_TEST_USER_EMAIL ?? 'admin@anexys.fr');
    await page.getByLabel(/mot de passe|password/i).fill(process.env.VITE_TEST_USER_PASSWORD ?? 'MotDePasse123!');
    await page.getByRole('button', { name: /se connecter/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('parcours menu principal : routes clés répondent sans page vide', async ({ page }) => {
    const cases: Array<{
      openMenu?: RegExp;
      linkName: RegExp;
      url: RegExp;
    }> = [
      { linkName: /tableau de bord/i, url: /\/dashboard/ },
      { linkName: /^flux$/i, url: /\/flows/ },
      { linkName: /^connecteurs$/i, url: /\/connectors/ },
      { linkName: /^mappings$/i, url: /\/mappings/ },
      { openMenu: /^planifier$/i, linkName: /liste des planifications/i, url: /\/planifier$/ },
      { linkName: /^marketplace$/i, url: /\/marketplace/ },
      { openMenu: /^monitoring$/i, linkName: /alertes.*notifications/i, url: /\/monitoring/ },
      { openMenu: /^monitoring$/i, linkName: /hub pipeline/i, url: /\/hub\/pipeline/ },
      { openMenu: /^administration$/i, linkName: /journal d[\u2019']audit/i, url: /\/audit/ },
    ];

    for (const { openMenu, linkName, url } of cases) {
      await page.goto('/dashboard');
      if (openMenu) {
        await page.getByRole('button', { name: openMenu }).click();
        await page.getByRole('menuitem', { name: linkName }).click();
      } else {
        await page.getByRole('link', { name: linkName }).first().click();
      }
      await expect(page).toHaveURL(url);
      await expect(page.getByRole('heading', { level: 1 }).or(page.locator('main')).first()).toBeVisible({
        timeout: 8000,
      });
    }
  });

  test('menu paramètres : liens compte, clé API, facturation', async ({ page }) => {
    await page.getByRole('button', { name: /paramètres et compte/i }).click();
    await expect(page.getByRole('link', { name: /^mon compte$/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /^clé api$/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /^facturation$/i })).toBeVisible();
  });

  test('clic Mon compte mène à /account sans erreur', async ({ page }) => {
    await page.getByRole('button', { name: /paramètres et compte/i }).click();
    await page.getByRole('link', { name: /^mon compte$/i }).click();
    await expect(page).toHaveURL(/\/account/);
  });

  test('bouton Déconnexion redirige vers /login', async ({ page }) => {
    await page.getByRole('button', { name: /paramètres et compte/i }).click();
    await page.getByRole('button', { name: /déconnexion/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
