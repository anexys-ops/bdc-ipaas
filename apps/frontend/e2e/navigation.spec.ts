import { test, expect } from '@playwright/test';

test.describe('Navigation — liens et pages (authentifié)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(process.env.VITE_TEST_USER_EMAIL ?? 'admin@anexys.fr');
    await page.getByLabel(/mot de passe|password/i).fill(process.env.VITE_TEST_USER_PASSWORD ?? 'MotDePasse123!');
    await page.getByRole('button', { name: /se connecter/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('tous les liens du menu principal mènent à une page sans 404', async ({ page }) => {
    const navLinks = [
      { name: /tableau de bord/i, url: /\/dashboard/ },
      { name: /flux/i, url: /\/flows/ },
      { name: /connecteurs/i, url: /\/connectors/ },
      { name: /mappings/i, url: /\/mappings/ },
      { name: /audit/i, url: /\/audit/ },
      { name: /marketplace/i, url: /\/marketplace/ },
    ];
    for (const { name, url } of navLinks) {
      await page.goto('/dashboard');
      await page.getByRole('link', { name }).click();
      await expect(page).toHaveURL(url);
      await expect(page.getByRole('heading', { level: 1 }).or(page.getByRole('main')).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('menu déroulant : Mon compte, Ma clé API, Facturation', async ({ page }) => {
    await page.getByRole('button', { name: /menu administration et compte/i }).click();
    await expect(page.getByRole('link', { name: /mon compte/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /ma clé api/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /facturation/i })).toBeVisible();
  });

  test('clic Mon compte mène à /account sans erreur', async ({ page }) => {
    await page.getByRole('button', { name: /menu administration et compte/i }).click();
    await page.getByRole('link', { name: /mon compte/i }).click();
    await expect(page).toHaveURL(/\/account/);
  });

  test('bouton Déconnexion redirige vers /login', async ({ page }) => {
    await page.getByRole('button', { name: /menu administration et compte/i }).click();
    await page.getByRole('button', { name: /déconnexion/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
