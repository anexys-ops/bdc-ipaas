import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

type AppHeaderBrandProps = {
  /** Lien du logo : `/` pages publiques, `/dashboard` espace connecté */
  homeTo: '/' | '/dashboard';
};

export function AppHeaderBrand({ homeTo }: AppHeaderBrandProps) {
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
