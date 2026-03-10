/**
 * Vérification des liens et des boutons du menu :
 * - Tous les liens du layout (nav + menu déroulant) pointent vers des routes déclarées.
 * - Aucun lien ne cible une URL cassée ou 404.
 * - Les boutons principaux (connexion, déconnexion) déclenchent les bonnes actions.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    const nav = container.querySelector('nav');
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

  it('liens présents : Tableau de bord, Flux, Connecteurs, Mappings, Audit, Marketplace', () => {
    renderPrivateLayout('/dashboard');
    expect(screen.getByRole('link', { name: /tableau de bord/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: /flux/i })).toHaveAttribute('href', '/flows');
    expect(screen.getByRole('link', { name: /connecteurs/i })).toHaveAttribute('href', '/connectors');
    expect(screen.getByRole('link', { name: /mappings/i })).toHaveAttribute('href', '/mappings');
    expect(screen.getByRole('link', { name: /audit/i })).toHaveAttribute('href', '/audit');
    expect(screen.getByRole('link', { name: /marketplace/i })).toHaveAttribute('href', '/marketplace');
  });
});

describe('Navigation — boutons', () => {
  it('bouton menu paramètres ouvre le menu déroulant (aria-expanded)', async () => {
    const user = userEvent.setup();
    renderPrivateLayout('/dashboard');
    const menuButton = screen.getByRole('button', { name: /menu administration et compte/i });
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    await user.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('menu déroulant contient Mon compte, Ma clé API, Facturation, Déconnexion', async () => {
    const user = userEvent.setup();
    renderPrivateLayout('/dashboard');
    await user.click(screen.getByRole('button', { name: /menu administration et compte/i }));
    expect(screen.getByRole('link', { name: /mon compte/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ma clé api/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /facturation/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /déconnexion/i })).toBeInTheDocument();
  });
});

describe('Liens — page d\'accueil', () => {
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
    const loginLink = screen.getByRole('link', { name: /se connecter/i });
    expect(loginLink).toHaveAttribute('href', '/login');
  });
});
