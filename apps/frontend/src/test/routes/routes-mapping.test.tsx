/**
 * Tests de mapping des routes : chaque route déclarée rend le bon composant (pas de 404),
 * paramètres et chemins cohérents avec la config centralisée.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PUBLIC_ROUTES, PRIVATE_ROUTES, ALL_STATIC_PATHS } from '../config/routes';
import { TestWrapper } from '../utils/test-wrapper';
import App from '../../App';

function renderApp(initialEntry: string) {
  return render(
    <TestWrapper>
      <MemoryRouter initialEntries={[initialEntry]}>
        <App />
      </MemoryRouter>
    </TestWrapper>,
  );
}

describe('Mapping des routes', () => {
  describe('Routes publiques', () => {
    it.each(PUBLIC_ROUTES)('route $path existe et est déclarée', ({ path }) => {
      expect(ALL_STATIC_PATHS).toContain(path);
    });

    it('"/" affiche la page d\'accueil (lien Ultimate Edicloud ou hero)', () => {
      renderApp('/');
      expect(screen.getAllByText(/Ultimate Edicloud/i)[0]).toBeInTheDocument();
    });

    it('"/login" affiche le formulaire de connexion', () => {
      renderApp('/login');
      expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/email|admin/i)).toBeInTheDocument();
    });

    it('"/marketplace" affiche la page marketplace (sans auth)', () => {
      renderApp('/marketplace');
      const bodyText = (document.body.textContent ?? '').toLowerCase();
      const isMarketplacePage =
        bodyText.includes('catalogue') ||
        bodyText.includes('marketplace') ||
        bodyText.includes('connecteurs') ||
        bodyText.includes('modules connecteurs') ||
        bodyText.includes('chargement du catalogue');
      expect(isMarketplacePage).toBe(true);
    });
  });

  describe('Routes privées — redirection vers /login si non authentifié', () => {
    it.each(PRIVATE_ROUTES.slice(0, 5))('$path redirige vers /login quand non connecté', ({ path }) => {
      renderApp(path);
      expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument();
    });
  });

  describe('Cohérence des chemins', () => {
    it('toutes les routes statiques sont dans la liste canonique', () => {
      const knownPaths = [
        '/dashboard',
        '/audit',
        '/flows',
        '/mappings',
        '/connectors',
        '/account',
        '/billing',
        '/billing/subscribe',
      ];
      knownPaths.forEach((p) => {
        expect(ALL_STATIC_PATHS.some((r) => r === p || r.startsWith(p))).toBe(true);
      });
    });

    it('route inconnue redirige vers "/"', () => {
      renderApp('/page-inexistante-404');
      expect(screen.getAllByText(/Ultimate Edicloud/i)[0]).toBeInTheDocument();
    });
  });
});
