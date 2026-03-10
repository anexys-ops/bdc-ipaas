import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.VITE_TEST_USER_EMAIL ?? 'admin@anexys.fr';
const TEST_PASSWORD = process.env.VITE_TEST_USER_PASSWORD ?? 'MotDePasse123!';

test.describe('Authentification', () => {
  test('page login affiche le formulaire et le bouton Se connecter', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /se connecter/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/mot de passe|password/i)).toBeVisible();
  });

  test('connexion avec identifiants valides redirige vers /dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/mot de passe|password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /se connecter/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('connexion avec mot de passe invalide affiche une erreur', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/mot de passe|password/i).fill('WrongPassword123!');
    await page.getByRole('button', { name: /se connecter/i }).click();
    await expect(page.getByText(/incorrect|erreur|invalid/i)).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('accès à /dashboard sans auth redirige vers /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
