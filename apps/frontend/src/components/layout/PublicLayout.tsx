import { Outlet, Link, useLocation } from 'react-router-dom';
import { AppHeaderBrand } from './AppHeaderBrand';
import { MarketingFooter } from './MarketingFooter';
import { NavMenuGroup, publicSiteNavGroup } from './AppMainNav';

interface PublicLayoutProps {
  children?: React.ReactNode;
}

/**
 * Même chrome d’en-tête que {@link PrivateLayout} / marketplace connecté :
 * hauteur, largeur max, logo et typo identiques.
 */
export function PublicLayout({ children }: PublicLayoutProps) {
  const pathname = useLocation().pathname;

  return (
    <div className="min-h-screen flex flex-col bg-page-bg text-[#1F2937] font-sans">
      <header className="sticky top-0 z-30 bg-surface border-b border-[#E5E7EB] overflow-visible [box-shadow:var(--shadow-sm)]">
        <div className="max-w-container mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-4 min-h-14 sm:min-h-16 py-2 sm:py-0 overflow-visible">
            <AppHeaderBrand homeTo="/" variant="marketing" />

            <div className="flex shrink-0 border-l border-[#E5E7EB] pl-2 sm:pl-4 ml-0 sm:ml-1 items-center min-w-0">
              <NavMenuGroup group={publicSiteNavGroup} pathname={pathname} />
            </div>

            <div className="flex-1 min-w-0 flex flex-wrap items-center justify-end gap-x-1 sm:gap-x-2 gap-y-2 sm:pl-2">
              <nav
                className="flex flex-wrap items-center justify-end gap-x-1 sm:gap-x-3 text-sm font-medium text-text-soft"
                aria-label="Navigation marketing"
              >
                <Link
                  to="/marketplace"
                  className="px-1.5 py-1 rounded-[10px] hover:text-brand-900 hover:bg-white/80 transition-colors"
                >
                  Connecteurs
                </Link>
                <span className="text-[#E5E7EB] hidden sm:inline" aria-hidden>
                  |
                </span>
                <Link
                  to="/login"
                  className="px-1.5 py-1 rounded-[10px] hover:text-brand-900 hover:bg-white/80 transition-colors"
                >
                  Connexion
                </Link>
                <Link
                  to="/signup-trial"
                  className="hidden sm:inline text-sm text-brand-700 font-medium px-1.5 py-1 rounded-[10px] hover:underline"
                >
                  Inscription
                </Link>
              </nav>
              <Link
                to="/reserver-demo"
                className="inline-flex items-center justify-center rounded-[12px] bg-brand-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 shrink-0"
              >
                Réserver une démo
              </Link>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 min-h-0 flex flex-col relative">
        <div className="relative z-[1] flex-1 min-h-0 flex flex-col">{children ?? <Outlet />}</div>
      </main>
      <MarketingFooter />
    </div>
  );
}
