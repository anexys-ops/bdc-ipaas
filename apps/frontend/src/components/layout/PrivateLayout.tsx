import { useRef, useEffect, useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { LogOut, Settings, User, Key, CreditCard, ShieldCheck, UserCog, Users, PieChart } from 'lucide-react';
import { authApi } from '../../api/auth';
import { toast } from 'sonner';
import { AppMainNav } from './AppMainNav';
import { AppFooter } from './AppFooter';
import { AppHeaderBrand } from './AppHeaderBrand';
import { AppPageBackground } from './AppPageBackground';

interface PrivateLayoutProps {
  children?: React.ReactNode;
}

export function PrivateLayout({ children }: PrivateLayoutProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    logout();
    toast.success('Déconnexion réussie');
    navigate('/login');
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen app-shell flex flex-col">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm overflow-visible">
        <div className="max-w-[min(100rem,100%)] mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 min-h-[3.5rem] py-2 overflow-visible">
            <AppHeaderBrand homeTo="/dashboard" />

            <nav
              className="hidden xl:flex items-center gap-2 shrink-0 text-[11px] font-medium text-slate-500 border-l border-slate-200/90 pl-3 ml-1"
              aria-label="Liens site public"
            >
              <Link to="/" className="hover:text-sky-600 transition-colors">
                Site
              </Link>
              <span className="text-slate-300" aria-hidden>
                ·
              </span>
              <Link to="/tarifs" className="hover:text-sky-600 transition-colors">
                Tarifs
              </Link>
              <span className="text-slate-300" aria-hidden>
                ·
              </span>
              <Link to="/avis" className="hover:text-sky-600 transition-colors">
                Avis
              </Link>
            </nav>

            {/* Pas d'overflow ici : overflow-x-auto masque les sous-menus (position absolute sous le header). */}
            <div className="flex-1 min-w-0 overflow-visible min-h-0">
              <AppMainNav role={user?.role} />
            </div>

            <div className="flex items-center gap-2 shrink-0 pl-2 sm:pl-3 border-l border-slate-200/80">
              <span className="text-xs sm:text-sm text-slate-600 hidden md:inline font-medium max-w-[8rem] lg:max-w-[12rem] xl:max-w-[14rem] truncate" title={user?.email}>
                {user?.firstName} {user?.lastName}
              </span>
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-primary-50 border border-slate-200/80 transition-colors"
                  aria-expanded={menuOpen}
                  aria-haspopup="true"
                  aria-label="Paramètres et compte"
                >
                  <Settings className="w-5 h-5" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-xl py-2 z-50">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-800">Configuration</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Compte, accès API et facturation</p>
                    </div>
                    <Link
                      to="/account"
                      onClick={closeMenu}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      Mon compte
                    </Link>
                    <Link
                      to="/settings/api-key"
                      onClick={closeMenu}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Key className="w-4 h-4 text-slate-400" />
                      Clé API
                    </Link>
                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <p className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Facturation</p>
                      <Link to="/billing" onClick={closeMenu} className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        <CreditCard className="w-4 h-4 text-slate-400" />
                        Facturation
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/billing/subscribe"
                          onClick={closeMenu}
                          className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <CreditCard className="w-4 h-4 text-sky-500" />
                          Abonnement Stripe
                        </Link>
                      )}
                      <Link to="/billing/quota" onClick={closeMenu} className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        <PieChart className="w-4 h-4 text-slate-400" />
                        Quota et volumes
                      </Link>
                    </div>
                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <p className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Organisation</p>
                      {isAdmin && (
                        <Link to="/audit" onClick={closeMenu} className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                          <ShieldCheck className="w-4 h-4 text-slate-400" />
                          Journal d&apos;audit
                        </Link>
                      )}
                      <Link to="/groups" onClick={closeMenu} className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        <UserCog className="w-4 h-4 text-slate-400" />
                        Groupes
                      </Link>
                      <Link to="/users" onClick={closeMenu} className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        <Users className="w-4 h-4 text-slate-400" />
                        Utilisateurs
                      </Link>
                    </div>
                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-red-50 hover:text-red-600"
                      >
                        <LogOut className="w-4 h-4" />
                        Déconnexion
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 min-h-0 relative overflow-hidden flex flex-col">
        <AppPageBackground />
        <div className="relative z-[1] flex-1 min-h-0 flex flex-col">{children ?? <Outlet />}</div>
      </main>
      <AppFooter />
    </div>
  );
}
