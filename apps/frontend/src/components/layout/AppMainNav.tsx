import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  GitBranch,
  Package,
  FileStack,
  CalendarClock,
  PlusCircle,
  MessageSquareText,
  Send,
  Store,
  Activity,
  ShieldCheck,
  UserCog,
  Users,
  Building2,
  ChevronDown,
  Workflow,
  Home,
  Euro,
  MessageCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type NavRole = 'SUPER_ADMIN' | 'ADMIN' | string | undefined;

export type NavItem = {
  to: string;
  label: string;
  description: string;
  icon?: LucideIcon;
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
  activePrefix?: string[];
};

function pathMatches(pathname: string, to: string): boolean {
  if (to === '/dashboard') return pathname === '/dashboard';
  if (to === '/marketplace') return pathname.startsWith('/marketplace');
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(`${to}/`);
}

function groupIsActive(pathname: string, group: NavGroup): boolean {
  const prefixes = group.activePrefix ?? group.items.map((i) => i.to);
  return prefixes.some((p) => pathMatches(pathname, p));
}

/** Liens marketing regroupés (header app connectée) */
export const publicSiteNavGroup: NavGroup = {
  id: 'public-site',
  label: 'Découvrir',
  activePrefix: ['/', '/tarifs', '/avis'],
  items: [
    {
      to: '/',
      label: 'Accueil',
      description: 'Présentation Ultimate Edicloud',
      icon: Home,
    },
    {
      to: '/tarifs',
      label: 'Tarifs',
      description: 'Offres et simulateur',
      icon: Euro,
    },
    {
      to: '/avis',
      label: 'Avis',
      description: 'Retours clients',
      icon: MessageCircle,
    },
  ],
};

export function NavMenuGroup({
  group,
  pathname,
}: {
  group: NavGroup;
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const active = groupIsActive(pathname, group);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    const update = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const w = Math.min(352, Math.max(280, r.width));
      let left = r.left;
      if (left + w > window.innerWidth - 16) {
        left = Math.max(8, window.innerWidth - 16 - w);
      }
      setMenuPos({ top: r.bottom + 6, left, width: w });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    const id = window.setTimeout(() => document.addEventListener('click', onDoc, true), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('click', onDoc, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const menuContent =
    open &&
    menuPos &&
    createPortal(
      <div
        ref={menuRef}
        className="rounded-xl border border-slate-200 bg-white shadow-lg py-2 max-h-[min(24rem,calc(100vh-6rem))] overflow-y-auto"
        style={{
          position: 'fixed',
          top: menuPos.top,
          left: menuPos.left,
          width: menuPos.width,
          zIndex: 9999,
        }}
        role="menu"
      >
        {group.items.map((item) => {
          const Icon = item.icon;
          const itemActive = pathMatches(pathname, item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={`flex gap-3 px-3 py-2.5 mx-1 rounded-lg transition-colors ${
                itemActive ? 'bg-primary-50 text-primary-900' : 'hover:bg-slate-50 text-slate-800'
              }`}
            >
              {Icon ? (
                <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${itemActive ? 'text-primary-600' : 'text-slate-400'}`} />
              ) : (
                <span className="w-4 shrink-0" />
              )}
              <span className="min-w-0">
                <span className="block text-sm font-medium leading-tight">{item.label}</span>
                <span className="block text-xs text-slate-500 mt-0.5 leading-snug">{item.description}</span>
              </span>
            </Link>
          );
        })}
      </div>,
      document.body,
    );

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap border ${
          active || open
            ? 'text-primary-800 bg-primary-50 border-primary-200/80'
            : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 border-transparent'
        }`}
      >
        {group.label}
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {menuContent}
    </div>
  );
}

const integrationGroup: NavGroup = {
  id: 'integration',
  label: 'Intégration',
  activePrefix: ['/connectors', '/mappings', '/planifier'],
  items: [
    {
      to: '/connectors',
      label: 'Connecteurs',
      description: 'Instances et catalogue',
      icon: Package,
    },
    {
      to: '/mappings',
      label: 'Mappings',
      description: 'Transformations de données',
      icon: FileStack,
    },
    {
      to: '/planifier',
      label: 'Planifications',
      description: 'Voir et modifier vos flux planifiés',
      icon: CalendarClock,
    },
    {
      to: '/planifier/new',
      label: 'Nouvelle planification',
      description: 'Créer un flux et ses déclencheurs',
      icon: PlusCircle,
    },
  ],
};

const edifactGroup: NavGroup = {
  id: 'edifact',
  label: 'EDI',
  activePrefix: ['/edifact'],
  items: [
    {
      to: '/edifact',
      label: 'Messages & réception',
      description: 'Historique et traitements EDI',
      icon: MessageSquareText,
    },
    {
      to: '/edifact/send',
      label: 'Envoi de messages',
      description: 'Émettre un flux EDI',
      icon: Send,
    },
  ],
};

const monitoringGroup: NavGroup = {
  id: 'monitoring',
  label: 'Supervision',
  activePrefix: ['/monitoring', '/hub/pipeline'],
  items: [
    {
      to: '/monitoring',
      label: 'Alertes & notifications',
      description: 'Emails et types d’erreur',
      icon: Activity,
    },
    {
      to: '/hub/pipeline',
      label: 'Hub pipeline',
      description: 'Benthos, Redis, files et workers',
      icon: Workflow,
    },
  ],
};

const administrationGroupBase: NavGroup = {
  id: 'administration',
  label: 'Administration',
  activePrefix: ['/audit', '/users', '/groups'],
  items: [
    {
      to: '/audit',
      label: 'Journal d’audit',
      description: 'Traçabilité des actions (admins)',
      icon: ShieldCheck,
    },
    {
      to: '/users',
      label: 'Utilisateurs',
      description: 'Comptes de l’organisation',
      icon: Users,
    },
    {
      to: '/groups',
      label: 'Groupes',
      description: 'Rôles et permissions',
      icon: UserCog,
    },
  ],
};

function navLinkClass(pathname: string, to: string): string {
  const active = pathMatches(pathname, to);
  return `flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap border ${
    active
      ? 'text-primary-800 bg-primary-50 border-primary-200/80'
      : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 border-transparent'
  }`;
}

export function AppMainNav({ role }: { role: NavRole }) {
  const location = useLocation();
  const pathname = location.pathname;
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

  const administrationItems = administrationGroupBase.items.filter((item) => item.to !== '/audit' || isAdmin);
  const administrationGroup: NavGroup = {
    ...administrationGroupBase,
    items: administrationItems,
  };

  return (
    <nav className="flex flex-wrap items-center gap-x-0.5 gap-y-1 pr-1" aria-label="Navigation principale">
      <Link to="/dashboard" className={navLinkClass(pathname, '/dashboard')}>
        <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
        Tableau de bord
      </Link>

      <NavMenuGroup group={integrationGroup} pathname={pathname} />

      <Link to="/flows" className={navLinkClass(pathname, '/flows')}>
        <GitBranch className="w-3.5 h-3.5 shrink-0" />
        Flux
      </Link>

      <NavMenuGroup group={edifactGroup} pathname={pathname} />

      <Link to="/marketplace" className={navLinkClass(pathname, '/marketplace')}>
        <Store className="w-3.5 h-3.5 shrink-0" />
        Marketplace
      </Link>

      <NavMenuGroup group={monitoringGroup} pathname={pathname} />

      {administrationItems.length > 0 && <NavMenuGroup group={administrationGroup} pathname={pathname} />}

      {isSuperAdmin && (
        <Link
          to="/backoffice"
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap border ${
            pathname.startsWith('/backoffice')
              ? 'text-primary-900 bg-primary-100 border-primary-200'
              : 'text-primary-800 hover:bg-primary-50 border-transparent'
          }`}
          title="Espace opérateur plateforme"
        >
          <Building2 className="w-3.5 h-3.5 shrink-0" />
          Plateforme
        </Link>
      )}
    </nav>
  );
}
