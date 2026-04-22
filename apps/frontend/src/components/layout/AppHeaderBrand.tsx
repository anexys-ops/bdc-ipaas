import { Link } from 'react-router-dom';
import { Cloud, Zap } from 'lucide-react';

type AppHeaderBrandProps = {
  /** Lien du logo : `/` pages publiques, `/dashboard` espace connecté */
  homeTo: '/' | '/dashboard';
  /** Présentation marketing (header public) : marine, sans dégradé */
  variant?: 'default' | 'marketing';
};

export function AppHeaderBrand({ homeTo, variant = 'default' }: AppHeaderBrandProps) {
  if (variant === 'marketing') {
    return (
      <Link to={homeTo} className="flex items-center gap-2.5 shrink-0">
        <div className="w-9 h-9 rounded-[12px] bg-brand-900 flex items-center justify-center shadow-[0_2px_8px_rgba(11,29,58,0.12)]">
          <Cloud className="w-5 h-5 text-white" strokeWidth={1.75} />
        </div>
        <div className="hidden sm:flex flex-col leading-tight shrink-0">
          <span className="font-display font-semibold text-brand-900 text-sm whitespace-nowrap tracking-tight">
            Ultimate Edicloud
          </span>
          <span className="text-[10px] font-medium text-text-soft uppercase tracking-[0.1em]">
            Plateforme iPaaS
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link to={homeTo} className="flex items-center gap-2 shrink-0">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center shadow-sm">
        <Zap className="w-5 h-5 text-white" />
      </div>
      <div className="hidden sm:flex flex-col leading-tight shrink-0">
        <span className="font-semibold text-slate-800 text-sm whitespace-nowrap">
          Ultimate <span className="text-primary-600">Edicloud</span>
        </span>
        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Le connecteur</span>
      </div>
    </Link>
  );
}
