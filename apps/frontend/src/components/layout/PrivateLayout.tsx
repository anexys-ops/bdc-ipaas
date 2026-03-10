import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useRef, useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import {
  Zap,
  LogOut,
  LayoutDashboard,
  GitBranch,
  Package,
  FileStack,
  CalendarClock,
  ShieldCheck,
  Building2,
  Store,
  Settings,
  User,
  Key,
  CreditCard,
  FileText,
  BarChart3,
  MessageSquareText,
  Users,
  UserCog,
} from 'lucide-react';
import { authApi } from '../../api/auth';
import { toast } from 'sonner';

const navItems = [
  { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/flows', label: 'Flux', icon: GitBranch },
  { to: '/connectors', label: 'Connecteurs', icon: Package },
  { to: '/mappings', label: 'Mappings', icon: FileStack },
  { to: '/planifier', label: 'Planifier', icon: CalendarClock },
  { to: '/edifact', label: 'EDIFACT', icon: MessageSquareText },
] as const;

export function PrivateLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

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
    <div className="min-h-screen page-bg-mesh">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between min-h-[4rem] py-3 sm:min-h-[4.5rem] sm:py-4">
            <div className="flex items-center gap-8 sm:gap-10">
              <Link to="/dashboard" className="flex items-center gap-2.5 shrink-0">
                <div className="w-9 h-9 rounded-xl bg-primary-400 flex items-center justify-center shadow-sm">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold text-slate-800 hidden sm:inline text-base">ANEXYS</span>
              </Link>
              <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                {navItems.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive(to)
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-slate-600 hover:text-primary-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                  </Link>
                ))}
                <Link
                  to="/marketplace"
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                    location.pathname.startsWith('/marketplace')
                      ? 'text-primary-600 bg-primary-50'
                      : 'text-slate-600 hover:text-primary-600 hover:bg-slate-50'
                  }`}
                >
                  <Store className="w-4 h-4 shrink-0" />
                  Marketplace
                </Link>
                {isSuperAdmin && (
                  <Link
                    to="/backoffice"
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive('/backoffice')
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-slate-600 hover:text-primary-600 hover:bg-slate-50'
                    }`}
                  >
                    <Building2 className="w-4 h-4 shrink-0" />
                    Administration
                  </Link>
                )}
              </nav>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm text-slate-600 hidden md:inline font-medium">
                {user?.firstName} {user?.lastName}
              </span>
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-500 hover:text-primary-600 hover:bg-primary-50 border border-slate-200 hover:border-primary-200 transition-colors"
                  aria-expanded={menuOpen}
                  aria-haspopup="true"
                  aria-label="Menu administration et compte"
                >
                  <Settings className="w-5 h-5" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-lg py-2 z-30">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Compte & paramètres</p>
                    </div>
                    <Link
                      to="/account"
                      onClick={closeMenu}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      Mon compte
                    </Link>
                    <Link
                      to="/settings/api-key"
                      onClick={closeMenu}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Key className="w-4 h-4 text-slate-400" />
                      Ma clé API
                    </Link>
                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <p className="px-4 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Gestion</p>
                      <Link
                        to="/audit"
                        onClick={closeMenu}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <ShieldCheck className="w-4 h-4 text-slate-400" />
                        Audit
                      </Link>
                      <Link
                        to="/groups"
                        onClick={closeMenu}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <UserCog className="w-4 h-4 text-slate-400" />
                        Groupes
                      </Link>
                      <Link
                        to="/users"
                        onClick={closeMenu}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <Users className="w-4 h-4 text-slate-400" />
                        Utilisateurs
                      </Link>
                    </div>
                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <p className="px-4 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Facturation</p>
                      <Link
                        to="/billing"
                        onClick={closeMenu}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <CreditCard className="w-4 h-4 text-slate-400" />
                        Facturation
                      </Link>
                      <Link
                        to="/billing/invoices"
                        onClick={closeMenu}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <FileText className="w-4 h-4 text-slate-400" />
                        Mes factures
                      </Link>
                      <Link
                        to="/billing/quota"
                        onClick={closeMenu}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <BarChart3 className="w-4 h-4 text-slate-400" />
                        Mon quota et volumes
                      </Link>
                    </div>
                    {isSuperAdmin && (
                      <>
                        <div className="border-t border-slate-100 mt-1 pt-1">
                          <p className="px-4 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Administration</p>
                          <Link
                            to="/backoffice"
                            onClick={closeMenu}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <Building2 className="w-4 h-4 text-slate-400" />
                            Dashboard gestion
                          </Link>
                          <Link
                            to="/backoffice/clients"
                            onClick={closeMenu}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <Building2 className="w-4 h-4 text-slate-400" />
                            Clients
                          </Link>
                          <Link
                            to="/backoffice/invoices"
                            onClick={closeMenu}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <FileText className="w-4 h-4 text-slate-400" />
                            Factures clients
                          </Link>
                        </div>
                      </>
                    )}
                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-red-50 hover:text-red-600"
                      >
                        <LogOut className="w-4 h-4 text-slate-400" />
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
      <main>
        <Outlet />
      </main>
    </div>
  );
}
