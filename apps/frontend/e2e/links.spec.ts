import { test, expect } from '@playwright/test';

/**
 * Vérification des liens : chaque lien fonctionne (pas de 404).
 * Parcours des pages publiques et vérification que les liens internes répondent.
 */
test.describe('Vérification des liens (pages publiques)', () => {
  test('page d\'accueil : liens Marketplace et Connexion fonctionnent', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /marketplace/i }).first().click();
    await expect(page).toHaveURL(/\/marketplace/);
    await expect(page.locator('body')).not.toContainText(/404|not found|page introuvable/i);

    await page.goto('/');
    await page.getByRole('link', { name: /connexion/i }).first().click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('page login : lien "Explorer le Marketplace" mène à /marketplace', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /marketplace/i }).first().click();
    await expect(page).toHaveURL(/\/marketplace/);
  });

  test('route inconnue redirige vers accueil (pas de 404 brut)', async ({ page }) => {
    const res = await page.goto('/page-inexistante-xyz');
    expect(res?.status()).toBe(200);
    await expect(page).toHaveURL(/\//);
  });
});
