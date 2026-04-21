import { Outlet, Link } from 'react-router-dom';
import { Zap, ArrowRight } from 'lucide-react';
import { AppFooter } from './AppFooter';

interface PublicLayoutProps {
  children?: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen app-shell flex flex-col">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center shadow-sm">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-slate-800 text-base">Ultimate Edicloud</span>
            </Link>
            <nav className="flex flex-wrap items-center gap-3 sm:gap-4">
              <Link to="/" className="text-slate-600 hover:text-primary-600 text-sm font-medium transition-colors">
                Accueil
              </Link>
              <Link to="/marketplace" className="text-slate-600 hover:text-primary-600 text-sm font-medium transition-colors">
                Marketplace
              </Link>
              <Link to="/tarifs" className="text-slate-600 hover:text-primary-600 text-sm font-medium transition-colors">
                Tarifs
              </Link>
              <Link to="/login" className="text-slate-600 hover:text-primary-600 text-sm font-medium transition-colors">
                Connexion
              </Link>
              <Link
                to="/signup-trial"
                className="btn-primary inline-flex items-center gap-1.5 text-sm no-underline"
              >
                S&apos;inscrire
                <ArrowRight className="w-4 h-4" />
              </Link>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1 min-h-0">{children ?? <Outlet />}</main>
      <AppFooter />
    </div>
  );
}
