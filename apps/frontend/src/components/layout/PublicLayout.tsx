import { Outlet, Link } from 'react-router-dom';
import { Zap, ArrowRight } from 'lucide-react';
import { AppFooter } from './AppFooter';

interface PublicLayoutProps {
  children?: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen app-shell flex flex-col">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-y-3 gap-x-4">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 via-primary-500 to-violet-600 p-[2px] shadow-md">
                <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-sky-300 group-hover:text-white transition-colors" />
                </div>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">
                  Ultimate <span className="text-primary-600">Edicloud</span>
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                  Le connecteur
                </span>
              </div>
            </Link>
            <nav
              className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 sm:gap-4 text-sm font-medium"
              aria-label="Navigation marketing"
            >
              <Link to="/" className="text-slate-600 hover:text-sky-600 transition-colors">
                Accueil
              </Link>
              <Link to="/marketplace" className="text-slate-600 hover:text-sky-600 transition-colors">
                Marketplace
              </Link>
              <Link to="/tarifs" className="text-slate-600 hover:text-sky-600 transition-colors">
                Tarifs
              </Link>
              <Link to="/avis" className="text-slate-600 hover:text-sky-600 transition-colors">
                Avis
              </Link>
              <Link to="/login" className="text-slate-600 hover:text-sky-600 transition-colors">
                Connexion
              </Link>
              <Link
                to="/signup-trial"
                className="btn-primary inline-flex items-center gap-1.5 text-sm no-underline shadow-sm shadow-sky-500/15"
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
