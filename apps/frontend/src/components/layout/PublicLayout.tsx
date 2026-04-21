import { Outlet, Link, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { AppFooter } from './AppFooter';
import { AppHeaderBrand } from './AppHeaderBrand';
import { AppPageBackground } from './AppPageBackground';
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
    <div className="min-h-screen app-shell flex flex-col">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm overflow-visible">
        <div className="max-w-[min(100rem,100%)] mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 min-h-[3.5rem] py-2 overflow-visible">
            <AppHeaderBrand homeTo="/" />

            <div className="flex shrink-0 border-l border-slate-200/90 pl-2 ml-1 items-center">
              <NavMenuGroup group={publicSiteNavGroup} pathname={pathname} />
            </div>

            <div className="flex-1 min-w-0 flex flex-wrap items-center justify-end gap-x-2 sm:gap-x-3 gap-y-2 sm:pl-2">
              <nav
                className="flex flex-wrap items-center justify-end gap-x-2 sm:gap-x-3 text-sm font-medium"
                aria-label="Navigation marketing"
              >
                <Link to="/marketplace" className="text-slate-600 hover:text-primary-600 transition-colors px-1">
                  Marketplace
                </Link>
                <Link to="/login" className="text-slate-600 hover:text-primary-600 transition-colors px-1">
                  Connexion
                </Link>
                <Link
                  to="/signup-trial"
                  className="btn-primary inline-flex items-center gap-1.5 text-sm no-underline shrink-0"
                >
                  S&apos;inscrire
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
        <AppPageBackground />
        <div className="relative z-[1] flex-1 min-h-0 flex flex-col">{children ?? <Outlet />}</div>
      </main>
      <AppFooter />
    </div>
  );
}
