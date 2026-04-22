import { Link } from 'react-router-dom';
import { Linkedin, Youtube } from 'lucide-react';
import { clsx } from 'clsx';
import { APP_VERSION } from '../../appVersion';

const footerColumns: { title: string; links: { href: string; label: string; external?: boolean }[] }[] = [
  {
    title: 'Produit',
    links: [
      { href: '/marketplace', label: 'Connecteurs' },
      { href: '/tarifs', label: 'Tarifs' },
      { href: '/reserver-demo', label: 'Démonstration' },
    ],
  },
  {
    title: 'Ressources',
    links: [
      { href: '/avis', label: 'Témoignages' },
      { href: '/login', label: 'Connexion' },
      { href: '/signup-trial', label: 'Créer un compte' },
    ],
  },
  {
    title: 'Éditeur',
    links: [{ href: 'https://anexys.fr', label: 'ANEXYS', external: true }],
  },
];

export function MarketingFooter({ className }: { className?: string }) {
  const year = new Date().getFullYear();

  return (
    <footer className={clsx('bg-brand-900 text-white/90', className)} aria-labelledby="footer-heading">
      <div className="max-w-container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          <div className="lg:col-span-4">
            <p id="footer-heading" className="font-display text-lg font-semibold tracking-tight text-white">
              Ultimate Edicloud
            </p>
            <p className="mt-3 text-sm text-white/70 max-w-sm leading-relaxed">
              Plateforme iPaaS française : fiabilisez vos échanges, supervisez vos flux et accélérez vos intégrations
              métier.
            </p>
            <p className="mt-6 text-xs text-white/50">
              v{APP_VERSION} · © {year} Ultimate Edicloud
            </p>
          </div>
          <div className="lg:col-span-5 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {footerColumns.map((col) => (
              <div key={col.title}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">{col.title}</h3>
                <ul className="mt-3 space-y-2">
                  {col.links.map((l) => (
                    <li key={l.href + l.label}>
                      {l.external ? (
                        <a
                          href={l.href}
                          className="text-sm text-white/80 hover:text-white transition-colors"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {l.label}
                        </a>
                      ) : (
                        <Link to={l.href} className="text-sm text-white/80 hover:text-white transition-colors">
                          {l.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="lg:col-span-3 flex flex-col items-start lg:items-end gap-4">
            <div className="flex items-center gap-3">
              <a
                href="https://www.linkedin.com/"
                className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-white/20 text-white/80 hover:bg-white/10 transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="https://www.youtube.com/"
                className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-white/20 text-white/80 hover:bg-white/10 transition-colors"
                aria-label="YouTube"
              >
                <Youtube className="w-4 h-4" />
              </a>
              <a
                href="https://twitter.com/"
                className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-white/20 text-sm font-semibold text-white/80 hover:bg-white/10 transition-colors"
                aria-label="X (Twitter)"
              >
                X
              </a>
            </div>
            <Link
              to="/reserver-demo"
              className="inline-flex items-center justify-center rounded-[var(--radius-md)] bg-white px-4 py-2.5 text-sm font-semibold text-brand-900 shadow-sm hover:bg-white/95 transition-colors"
            >
              Réserver une démo
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
