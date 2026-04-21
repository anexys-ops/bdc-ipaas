import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { marketplaceApi } from '../../api/marketplace';
import { resolveMarketplaceLogoUrl } from '../../lib/connector-logos';
import { SoftwareLogoImg } from '../../components/marketplace/SoftwareLogoImg';
import {
  Zap,
  ArrowRight,
  HeadphonesIcon,
  Rocket,
  FileCheck,
  Database,
  RefreshCw,
  Upload,
  Shield,
  Layers,
  BarChart3,
  Wrench,
  ShoppingCart,
  Building2,
  FileText,
  Package,
  Box,
  Cpu,
  Orbit,
} from 'lucide-react';
import { Button } from '../../components/ui';

const VALUE_PROPS = [
  { icon: HeadphonesIcon, title: 'Support dédié', description: 'Une équipe à vos côtés pour vos intégrations.' },
  { icon: Rocket, title: 'Intégration rapide', description: 'Connectez vos systèmes en quelques jours.' },
  { icon: FileCheck, title: 'Devis gratuit', description: 'Étude de faisabilité et chiffrage sur mesure.' },
] as const;

const CONNECTOR_BRICKS = [
  { label: 'Connecteur ERP', href: '/marketplace', icon: Building2, desc: 'Flux bidirectionnels entre ERP et vos applications.' },
  { label: 'Connecteur E-commerce', href: '/marketplace', icon: ShoppingCart, desc: 'Sites e-commerce et ERP connectés.' },
  { label: 'Connecteur CRM', href: '/marketplace', icon: BarChart3, desc: 'Tiers et données entre ERP et CRM.' },
  { label: 'Connecteur GED', href: '/marketplace', icon: FileText, desc: 'Documents électroniques vers votre ERP.' },
  { label: 'BDD Financière', href: '/marketplace', icon: Database, desc: 'Connectez ERP et bases financières.' },
  { label: 'Logiciels métier', href: '/marketplace', icon: Wrench, desc: 'Logiciels spécifiques et ERP du marché.' },
  { label: 'Connecteur WMS', href: '/marketplace', icon: Package, desc: 'WMS et ERP interconnectés.' },
  { label: 'Connecteur sur mesure', href: '/marketplace', icon: Box, desc: 'Fonctionnalité manquante ? Nous l’ajoutons.' },
] as const;

const ETL_STEPS = [
  { step: 1, title: 'Extraction', description: 'Récupérez les données depuis vos sources (API, fichiers, bases).', icon: Database },
  { step: 2, title: 'Transformation', description: 'Nettoyez, structurez et normalisez (CSV, XML, JSON…).', icon: RefreshCw },
  { step: 3, title: 'Chargement', description: 'Automatisez l’insertion des données vers la destination.', icon: Upload },
] as const;

const TRUST_BADGES = ['100 % configurable', 'Hébergement sécurisé', 'Sans stockage de vos données'] as const;

/** Illustration hero : réseau / hub futuriste (SVG), sans photo stock. */
function HeroVisual() {
  return (
    <div className="relative w-full max-w-lg mx-auto aspect-[4/3] rounded-3xl border border-slate-200/60 bg-slate-950/95 shadow-2xl shadow-sky-500/10 overflow-hidden">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(circle at 30% 20%, rgba(56, 189, 248, 0.35), transparent 45%), radial-gradient(circle at 80% 60%, rgba(167, 139, 250, 0.35), transparent 40%)',
        }}
      />
      <svg viewBox="0 0 400 300" className="relative w-full h-full text-sky-400/90" aria-hidden>
        <defs>
          <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
        <circle cx="200" cy="150" r="8" fill="url(#g1)" className="animate-pulse" />
        {[
          [80, 80],
          [320, 90],
          [100, 220],
          [300, 210],
          [200, 40],
        ].map(([x, y], i) => (
          <g key={i}>
            <line x1="200" y1="150" x2={x} y2={y} stroke="currentColor" strokeWidth="0.5" opacity="0.35" />
            <circle cx={x} cy={y} r="5" fill="currentColor" opacity="0.6" />
          </g>
        ))}
        <rect x="120" y="110" width="160" height="80" rx="12" fill="none" stroke="url(#g1)" strokeWidth="1" opacity="0.8" />
        <text x="200" y="152" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontFamily="system-ui">
          Edicloud Hub
        </text>
        <text x="200" y="172" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="system-ui">
          Ultimate · connecteur
        </text>
      </svg>
      <div className="absolute bottom-3 left-3 right-3 flex justify-between text-[10px] uppercase tracking-widest text-slate-500 font-medium">
        <span className="flex items-center gap-1">
          <Cpu className="w-3 h-3 text-sky-400" /> iPaaS
        </span>
        <span className="flex items-center gap-1">
          <Orbit className="w-3 h-3 text-violet-400" /> Sync
        </span>
      </div>
    </div>
  );
}

function HomeMarketplaceLogos() {
  const { data: connectors, isLoading } = useQuery({
    queryKey: ['marketplace', 'home-showcase'],
    queryFn: () => marketplaceApi.getAll(),
    staleTime: 60_000,
  });

  const sorted = connectors ? [...connectors].sort((a, b) => a.name.localeCompare(b.name, 'fr')) : [];

  return (
    <section className="py-12 sm:py-16 border-t border-slate-200/60 bg-slate-50/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-sky-600 text-sm font-semibold uppercase tracking-wider text-center">Écosystème</p>
        <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 text-center">
          Logiciels et connecteurs du marketplace
        </h2>
        <p className="mt-3 text-slate-600 text-center max-w-2xl mx-auto text-sm sm:text-base">
          Les mêmes logos harmonisés que sur le catalogue public — identité visuelle unifiée sur tout le site.
        </p>
        {isLoading ? (
          <p className="mt-8 text-center text-sm text-slate-500">Chargement des connecteurs…</p>
        ) : (
          <div className="mt-10 flex flex-wrap justify-center gap-3 sm:gap-4">
            {sorted.map((c) => {
              const src = resolveMarketplaceLogoUrl(c.id, c.icon, c.libraryLogoId);
              return (
                <Link
                  key={c.id}
                  to={`/marketplace/${c.id}`}
                  className="group flex flex-col items-center gap-2 w-[4.5rem] sm:w-[5.25rem]"
                  title={c.name}
                >
                  <SoftwareLogoImg src={src} alt="" size="lg" rounded="xl" className="group-hover:border-sky-300" />
                  <span className="text-[10px] sm:text-xs text-center text-slate-500 line-clamp-2 leading-tight group-hover:text-sky-700 transition-colors">
                    {c.name}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
        <p className="mt-8 text-center">
          <Link to="/marketplace" className="text-sm font-semibold text-sky-700 hover:underline">
            Voir tout le catalogue →
          </Link>
        </p>
      </div>
    </section>
  );
}

export function HomePage() {
  return (
    <div className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(14, 165, 233, 0.18), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(139, 92, 246, 0.12), transparent)',
        }}
      />

      <section className="relative py-14 sm:py-20 lg:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-sky-700 shadow-sm">
                <Zap className="w-3.5 h-3.5 text-sky-500" />
                Ultimate · le connecteur
              </p>
              <h1 className="mt-5 text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold tracking-tight leading-[1.1]">
                <span className="bg-gradient-to-r from-slate-900 via-sky-800 to-violet-700 bg-clip-text text-transparent">
                  Edicloud
                </span>
                <br />
                <span className="text-slate-800">intègre tout votre SI.</span>
              </h1>
              <p className="mt-5 text-lg text-slate-600 max-w-xl leading-relaxed">
                Plateforme iPaaS pour ERP, e‑commerce, CRM et flux EDI. Automatisez vos échanges de données avec le
                marketplace Ultimate Edicloud — sans image décorative superflue, avec une architecture pensée pour la
                production.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/marketplace">
                  <Button size="lg" className="gap-2 shadow-lg shadow-sky-500/20">
                    Explorer le marketplace
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/tarifs">
                  <Button variant="outline" size="lg">
                    Tarifs & abonnements
                  </Button>
                </Link>
                <Link to="/reserver-demo">
                  <Button variant="ghost" size="lg" className="text-slate-600">
                    Réserver une démo
                  </Button>
                </Link>
              </div>
              <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-600">
                {VALUE_PROPS.map(({ icon: Icon, title }) => (
                  <li key={title} className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-sky-500" />
                    <span>{title}</span>
                  </li>
                ))}
              </ul>
            </div>
            <HeroVisual />
          </div>
        </div>
      </section>

      <HomeMarketplaceLogos />

      <section className="py-16 sm:py-20 border-t border-slate-200/60 bg-white/40 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sky-600 text-sm font-semibold uppercase tracking-wider text-center">Intégration</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-slate-900 text-center">Couplez vos applications</h2>
          <p className="mt-4 text-slate-600 text-center max-w-2xl mx-auto">
            Ultimate connecte ERP, e‑commerce, CRM, GED, bases financières, WMS et logiciels métier pour un échange
            fluide et automatisé.
          </p>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CONNECTOR_BRICKS.map(({ label, href, icon: Icon, desc }) => (
              <Link
                key={label}
                to={href}
                className="group flex flex-col p-6 rounded-2xl bg-white/90 border border-slate-200/90 hover:border-sky-300/80 hover:shadow-glass-lg transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-100 to-violet-100 flex items-center justify-center text-sky-600 border border-sky-200/50">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="mt-4 font-semibold text-slate-900 group-hover:text-sky-700 transition-colors">{label}</h3>
                <p className="mt-1 text-sm text-slate-600 line-clamp-2">{desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-sky-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  En savoir plus
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 border-t border-slate-200/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sky-600 text-sm font-semibold uppercase tracking-wider text-center">Pipeline</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-slate-900 text-center">Extraction, transformation, chargement</h2>
          <p className="mt-4 text-slate-600 text-center max-w-2xl mx-auto">
            Des flux sur mesure pour toutes vos intégrations de données — orchestrés dans Edicloud.
          </p>
          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
            {ETL_STEPS.map(({ step, title, description, icon: Icon }) => (
              <div
                key={step}
                className="relative flex flex-col items-center text-center p-8 rounded-2xl bg-slate-900 text-slate-100 border border-slate-700/80 shadow-xl"
              >
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-xs font-bold border border-sky-500/40">
                  ÉTAPE {step}
                </span>
                <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-sky-400 border border-slate-600 mt-2">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="mt-4 text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 border-t border-slate-200/60 bg-white/40 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl bg-gradient-to-br from-white to-sky-50/50 border border-slate-200/90 shadow-sm">
              <div className="flex items-center gap-3">
                <Layers className="w-8 h-8 text-sky-600" />
                <h3 className="text-xl font-semibold text-slate-900">Version cloud</h3>
              </div>
              <p className="mt-2 text-slate-600">
                Plateforme 100 % web, hébergée en France. Pas de déploiement lourd, pas de stockage superflu de vos
                données sensibles.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-500">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  Full web, sans installation
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  Hébergement sécurisé
                </li>
              </ul>
            </div>
            <div className="p-8 rounded-2xl bg-gradient-to-br from-white to-violet-50/50 border border-slate-200/90 shadow-sm">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-violet-600" />
                <h3 className="text-xl font-semibold text-slate-900">Sécurité & stabilité</h3>
              </div>
              <p className="mt-2 text-slate-600">
                Ultimate Edicloud place la résilience et la traçabilité au centre : supervision des flux, contrôle
                d’accès et évolutivité.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-500">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                  Données chiffrées en transit
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                  Supervision des connecteurs
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 border-t border-slate-200/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sky-600 text-sm font-semibold uppercase tracking-wider">Confiance</p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900">Pensé pour l’entreprise moderne</h2>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {TRUST_BADGES.map((badge) => (
              <span
                key={badge}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium shadow-sm"
              >
                {badge}
              </span>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link to="/avis" className="text-sm font-medium text-sky-700 hover:underline">
              Lire les avis
            </Link>
            <span className="text-slate-300">·</span>
            <Link to="/signup-trial" className="text-sm font-medium text-sky-700 hover:underline">
              Créer un compte
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 border-t border-slate-200/60 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold">Prêt à connecter votre écosystème ?</h2>
          <p className="mt-3 text-slate-300">
            Découvrez le catalogue Ultimate et lancez vos premières intégrations sur Edicloud.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/marketplace"
              className="inline-flex items-center justify-center font-medium rounded-xl px-6 py-3 text-base bg-sky-500 text-white hover:bg-sky-400 shadow-lg transition-all"
            >
              Marketplace
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center font-medium rounded-xl px-6 py-3 text-base border-2 border-slate-500 text-white hover:bg-white/10 transition-all"
            >
              Connexion
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
