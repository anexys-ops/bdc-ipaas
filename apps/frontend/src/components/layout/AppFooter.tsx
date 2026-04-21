import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { APP_VERSION } from '../../appVersion';

export type AppFooterProps = {
  className?: string;
  /** Affiche les liens rapides (marketplace, tarifs, connexion). */
  showQuickLinks?: boolean;
};

export function AppFooter({ className, showQuickLinks = true }: AppFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={clsx(
        'border-t border-slate-200/80 bg-white/85 backdrop-blur-sm text-xs text-slate-500',
        className,
      )}
    >
      <div className="max-w-[min(100rem,100%)] mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:justify-start">
          <span className="font-medium text-slate-700">Ultimate Edicloud</span>
          <span className="text-slate-300 hidden sm:inline" aria-hidden>
            ·
          </span>
          <span className="tabular-nums" title="Version du frontend (package.json au build)">
            v{APP_VERSION}
          </span>
          <span className="text-slate-300 hidden sm:inline" aria-hidden>
            ·
          </span>
          <span>© {year}</span>
        </div>
        {showQuickLinks ? (
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1" aria-label="Liens pied de page">
            <Link to="/marketplace" className="text-slate-600 hover:text-primary-600 transition-colors">
              Marketplace
            </Link>
            <Link to="/tarifs" className="text-slate-600 hover:text-primary-600 transition-colors">
              Tarifs
            </Link>
            <Link to="/login" className="text-slate-600 hover:text-primary-600 transition-colors">
              Connexion
            </Link>
          </nav>
        ) : null}
      </div>
    </footer>
  );
}
