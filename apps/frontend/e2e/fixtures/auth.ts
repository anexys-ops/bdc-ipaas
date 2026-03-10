import { test as base, expect } from '@playwright/test';

const TEST_EMAIL = process.env.VITE_TEST_USER_EMAIL ?? 'admin@anexys.fr';
const TEST_PASSWORD = process.env.VITE_TEST_USER_PASSWORD ?? 'MotDePasse123!';

export const test = base.extend<{ authenticated: void }>({
  authenticated: async ({ page }, use) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/mot de passe|password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /se connecter/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await use();
  },
});

export { expect };
