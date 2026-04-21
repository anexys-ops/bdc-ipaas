import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { BackofficeServerStatusStrip } from '../backoffice/BackofficeServerStatusStrip';
import {
  LayoutDashboard,
  Building2,
  FileText,
  Package,
  FileStack,
  CalendarClock,
  MessageSquareText,
  Activity,
  Store,
  FolderSync,
} from 'lucide-react';

type AsideItem = {
  to: string;
  label: string;
  description: string;
  icon: typeof LayoutDashboard;
};

type AsideSection = {
  id: string;
  title: string;
  subtitle: string;
  prefixes: string[];
  items: AsideItem[];
};

const sections: AsideSection[] = [
  {
    id: 'overview',
    title: 'Vue d’ensemble',
    subtitle: 'Indicateurs et navigation admin',
    prefixes: ['/backoffice'],
    items: [
      {
        to: '/backoffice',
        label: 'Tableau de bord plateforme',
        description: 'Santé du service, tuiles moteur et raccourcis',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: 'customers',
    title: 'Clients & revenus',
    subtitle: 'Abonnés, facturation opérateur',
    prefixes: ['/backoffice/clients', '/backoffice/invoices'],
    items: [
      {
        to: '/backoffice/clients',
        label: 'Comptes clients',
        description: 'Tenants, statuts et accès',
        icon: Building2,
      },
      {
        to: '/backoffice/invoices',
        label: 'Factures émises',
        description: 'Revue des factures côté plateforme',
        icon: FileText,
      },
    ],
  },
  {
    id: 'catalog',
    title: 'Catalogue produit',
    subtitle: 'Modules visibles dans le marketplace',
    prefixes: ['/backoffice/marketplace'],
    items: [
      {
        to: '/backoffice/marketplace',
        label: 'Modules marketplace',
        description: 'Publier, activer et ordonner les connecteurs',
        icon: Store,
      },
    ],
  },
  {
    id: 'engine',
    title: 'Moteur & fichiers',
    subtitle: 'Exécutions type Benthos, flux fichier',
    prefixes: ['/backoffice/file-flows', '/monitoring'],
    items: [
      {
        to: '/backoffice/file-flows',
        label: 'Flux fichiers (FILE_WATCH)',
        description: 'Dry-run, logs, dernier fichier généré',
        icon: FolderSync,
      },
      {
        to: '/monitoring',
        label: 'Monitoring (vue tenant)',
        description: 'Files et charge — même écran que les clients',
        icon: Activity,
      },
    ],
  },
  {
    id: 'sandbox',
    title: 'Sandbox support',
    subtitle: 'Mêmes écrans que le client, préfixe /backoffice/…',
    prefixes: [
      '/backoffice/connectors',
      '/backoffice/mappings',
      '/backoffice/planifier',
      '/backoffice/edifact',
    ],
    items: [
      {
        to: '/backoffice/connectors',
        label: 'Connecteurs (support)',
        description: 'Dépannage instances sans changer de compte',
        icon: Package,
      },
      {
        to: '/backoffice/mappings',
        label: 'Mappings (support)',
        description: 'Bibliothèque et détail des transformations',
        icon: FileStack,
      },
      {
        to: '/backoffice/planifier',
        label: 'Planifications (support)',
        description: 'Cron et déclencheurs fichier pour un tenant',
        icon: CalendarClock,
      },
      {
        to: '/backoffice/edifact',
        label: 'EDIFACT (support)',
        description: 'Messages et envois en contexte admin',
        icon: MessageSquareText,
      },
    ],
  },
];

function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  if (prefix === '/backoffice') return pathname === '/backoffice';
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function sectionHasActive(pathname: string, section: AsideSection): boolean {
  return section.prefixes.some((p) => pathMatchesPrefix(pathname, p));
}

function itemIsActive(pathname: string, to: string): boolean {
  if (to === '/backoffice') return pathname === '/backoffice';
  if (to === '/monitoring') return pathname === '/monitoring' || pathname.startsWith('/monitoring/');
  return pathname === to || pathname.startsWith(`${to}/`);
}

/**
 * <details> contrôlé : avec seulement open={route} sans onToggle, React ré-ferme la section à chaque rendu
 * et l’utilisateur ne peut pas ouvrir les sous-menus manuellement.
 */
function BackofficeNavSection({ section, pathname }: { section: AsideSection; pathname: string }) {
  const routeWantsOpen = sectionHasActive(pathname, section);
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);

  useEffect(() => {
    setManualOpen(null);
  }, [pathname]);

  const expanded = manualOpen !== null ? manualOpen : routeWantsOpen;

  return (
    <details
      className="group rounded-lg border border-slate-100 bg-white open:shadow-sm"
      open={expanded}
      onToggle={(e) => {
        const el = e.currentTarget;
        setManualOpen(el.open);
      }}
    >
      <summary className="cursor-pointer list-none px-2.5 py-2 rounded-lg hover:bg-slate-50 transition-colors [&::-webkit-details-marker]:hidden flex items-start gap-2">
        <span className="mt-0.5 text-slate-400 text-xs font-mono select-none group-open:rotate-90 transition-transform inline-block">
          ›
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-900 leading-tight">{section.title}</span>
          <span className="block text-[11px] text-slate-500 mt-0.5 leading-snug">{section.subtitle}</span>
        </span>
      </summary>
      <ul className="pb-2 pt-0.5 space-y-0.5 border-t border-slate-50 mt-1">
        {section.items.map((item) => {
          const Icon = item.icon;
          const active = itemIsActive(pathname, item.to);
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={`flex gap-2.5 px-2.5 py-2 mx-0.5 rounded-lg text-left transition-colors ${
                  active
                    ? 'bg-primary-100 text-primary-900 border border-primary-200/80'
                    : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${active ? 'text-primary-600' : 'text-slate-400'}`} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium leading-tight">{item.label}</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5 leading-snug">{item.description}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

export function BackofficeLayout() {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <div className="flex min-h-[calc(100vh-3.75rem)]">
      <aside className="w-[min(20rem,92vw)] shrink-0 border-r border-slate-200 bg-white">
        <div className="sticky top-[3.75rem] max-h-[calc(100vh-3.75rem)] overflow-y-auto">
          <div className="p-3 border-b border-slate-100 bg-slate-50/80">
            <p className="text-xs font-semibold text-slate-800 uppercase tracking-wide">Back-office</p>
            <p className="text-[11px] text-slate-500 mt-1 leading-snug">
              Outils super-admin : clients, catalogue et pilotage moteur. Les sections repliables regroupent les écrans par
              usage.
            </p>
          </div>
          <nav className="p-2 space-y-1" aria-label="Navigation back-office">
            {sections.map((section) => (
              <BackofficeNavSection key={section.id} section={section} pathname={pathname} />
            ))}
          </nav>
        </div>
      </aside>
      <main className="flex-1 min-w-0 bg-slate-50 border-l border-slate-100/80">
        <div className="px-4 py-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between text-xs text-slate-600 bg-white/90 border-b border-slate-200/80">
          <p className="min-w-0 leading-snug">
            Espace réservé au rôle <strong className="text-slate-800">SUPER_ADMIN</strong> — les liens « support » rejouent les
            pages client sous le préfixe <code className="text-[11px] bg-slate-100 px-1 rounded">/backoffice</code>.
          </p>
          <BackofficeServerStatusStrip />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
