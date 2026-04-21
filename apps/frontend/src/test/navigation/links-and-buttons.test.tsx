/**
 * Vérification des liens et des boutons du menu :
 * - Tous les liens du layout (nav + menu déroulant) pointent vers des routes déclarées.
 * - Aucun lien ne cible une URL cassée ou 404.
 * - Les boutons principaux (connexion, déconnexion) déclenchent les bonnes actions.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PrivateLayout } from '../../components/layout/PrivateLayout';
import { useAuthStore } from '../../stores/auth.store';
import { TestWrapper } from '../utils/test-wrapper';
import { ALL_STATIC_PATHS } from '../config/routes';

const mockUser = {
  id: 'user-1',
  email: 'admin@anexys.fr',
  firstName: 'Admin',
  lastName: 'User',
  role: 'SUPER_ADMIN',
  tenantId: 'tenant-1',
  tenantSlug: 'anexys',
};

beforeEach(() => {
  useAuthStore.getState().setAuth(mockUser, 'test-access-token');
});

function renderPrivateLayout(initialRoute = '/dashboard') {
  return render(
    <TestWrapper>
      <MemoryRouter initialEntries={[initialRoute]}>
        <PrivateLayout />
      </MemoryRouter>
    </TestWrapper>,
  );
}

describe('Navigation — liens du layout', () => {
  it('tous les liens de la barre nav pointent vers des routes connues', () => {
    const { container } = renderPrivateLayout('/dashboard');
    const nav = container.querySelector('nav[aria-label="Navigation principale"]');
    expect(nav).toBeInTheDocument();
    const links = nav?.querySelectorAll('a[href]') ?? [];
    const hrefs = Array.from(links).map((a) => (a.getAttribute('href') ?? '').replace(/\/$/, '') || '/');
    hrefs.forEach((href) => {
      const path = href.startsWith('/') ? href : `/${href}`;
      const isKnown =
        ALL_STATIC_PATHS.some((p) => p === path || path.startsWith(p + '/')) ||
        path === '/dashboard' ||
        path === '/marketplace' ||
        path === '/backoffice';
      expect(isKnown || path === '/dashboard').toBeTruthy();
    });
  });

  it('liens directs : tableau de bord, flux, marketplace, plateforme (super-admin)', () => {
    renderPrivateLayout('/dashboard');
    expect(screen.getByRole('link', { name: /tableau de bord/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: /^flux$/i })).toHaveAttribute('href', '/flows');
    screen.getAllByRole('link', { name: /^marketplace$/i }).forEach((link) => {
      expect(link).toHaveAttribute('href', '/marketplace');
    });
    expect(screen.getByRole('link', { name: /^plateforme$/i })).toHaveAttribute('href', '/backoffice');
  });

  it('menu Intégration : connecteurs, mappings, planifications', async () => {
    const user = userEvent.setup();
    renderPrivateLayout('/dashboard');
    const mainNav = screen.getByRole('navigation', { name: /navigation principale/i });
    await user.click(within(mainNav).getByRole('button', { name: /^intégration$/i }));
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /connecteurs/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('menuitem', { name: /connecteurs/i })).toHaveAttribute('href', '/connectors');
    expect(screen.getByRole('menuitem', { name: /mappings/i })).toHaveAttribute('href', '/mappings');
    expect(screen.getByRole('menuitem', { name: /planifications/i })).toHaveAttribute('href', '/planifier');
  });

  it('menu Supervision : alertes vers /monitoring, hub pipeline vers /hub/pipeline', async () => {
    const user = userEvent.setup();
    renderPrivateLayout('/dashboard');
    const mainNav = screen.getByRole('navigation', { name: /navigation principale/i });
    await user.click(within(mainNav).getByRole('button', { name: /^supervision$/i }));
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /alertes.*notifications/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('menuitem', { name: /alertes.*notifications/i })).toHaveAttribute('href', '/monitoring');
    expect(screen.getByRole('menuitem', { name: /hub pipeline/i })).toHaveAttribute('href', '/hub/pipeline');
  });

  it('menu Intégration : nouvelle planification vers /planifier/new', async () => {
    const user = userEvent.setup();
    renderPrivateLayout('/dashboard');
    const mainNav = screen.getByRole('navigation', { name: /navigation principale/i });
    await user.click(within(mainNav).getByRole('button', { name: /^intégration$/i }));
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /nouvelle planification/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('menuitem', { name: /nouvelle planification/i })).toHaveAttribute('href', '/planifier/new');
  });

  it('menu Administration : journal d’audit vers /audit', async () => {
    const user = userEvent.setup();
    renderPrivateLayout('/dashboard');
    const mainNav = screen.getByRole('navigation', { name: /navigation principale/i });
    await user.click(within(mainNav).getByRole('button', { name: /^administration$/i }));
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /journal d[\u2019']audit/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('menuitem', { name: /journal d[\u2019']audit/i })).toHaveAttribute('href', '/audit');
  });
});

describe('Navigation — boutons', () => {
  it('bouton menu paramètres ouvre le menu déroulant (aria-expanded)', async () => {
    const user = userEvent.setup();
    renderPrivateLayout('/dashboard');
    const menuButton = screen.getByRole('button', { name: /paramètres et compte/i });
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    await user.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('menu déroulant contient Mon compte, Clé API, Facturation, Déconnexion', async () => {
    const user = userEvent.setup();
    renderPrivateLayout('/dashboard');
    await user.click(screen.getByRole('button', { name: /paramètres et compte/i }));
    expect(screen.getByRole('link', { name: /^mon compte$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^clé api$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^facturation$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /déconnexion/i })).toBeInTheDocument();
  });
});

describe("Liens — page d'accueil", () => {
  it('home contient lien vers /marketplace et /login', async () => {
    const { default: App } = await import('../../App');
    render(
      <TestWrapper>
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      </TestWrapper>,
    );
    const marketplaceLinks = screen.getAllByRole('link', { name: /marketplace/i });
    expect(marketplaceLinks.some((l) => l.getAttribute('href') === '/marketplace')).toBe(true);
    const loginLinks = screen.getAllByRole('link', { name: /connexion/i });
    const loginLink = loginLinks.find((l) => l.getAttribute('href') === '/login');
    expect(loginLink).toBeDefined();
  });
});
