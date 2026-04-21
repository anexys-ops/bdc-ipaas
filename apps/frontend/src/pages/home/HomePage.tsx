import { Link } from 'react-router-dom';
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
} from 'lucide-react';
import { APP_VERSION } from '../../appVersion';
import { Button } from '../../components/ui';

const VALUE_PROPS = [
  {
    icon: HeadphonesIcon,
    title: 'Support dédié',
    description: 'Une équipe à vos côtés pour vos intégrations.',
  },
  {
    icon: Rocket,
    title: 'Intégration rapide',
    description: 'Connectez vos systèmes en quelques jours.',
  },
  {
    icon: FileCheck,
    title: 'Devis gratuit',
    description: 'Étude de faisabilité et chiffrage sur mesure.',
  },
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
  {
    step: 1,
    title: 'Extraction',
    description: 'Récupérez les données depuis vos sources (API, fichiers, bases).',
    icon: Database,
  },
  {
    step: 2,
    title: 'Transformation',
    description: 'Nettoyez, structurez et normalisez (CSV, XML, JSON…).',
    icon: RefreshCw,
  },
  {
    step: 3,
    title: 'Chargement',
    description: 'Automatisez l’insertion des données vers la destination.',
    icon: Upload,
  },
] as const;

const TRUST_BADGES = [
  '100 % configurable',
  'Hébergement sécurisé',
  'Sans stockage de vos données',
];

export function HomePage() {
  return (
    <div className="min-h-screen page-bg-mesh">
      {/* Barre marque */}
      <header className="border-b border-slate-200/80 sticky top-0 z-20 bg-white/85 backdrop-blur-md shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary-400 flex items-center justify-center shadow-sm">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-slate-700 text-lg">ANEXYS iPaaS</span>
            </Link>
            <nav className="flex items-center gap-4">
              <Link to="/marketplace" className="text-slate-600 hover:text-primary-600 text-sm font-medium transition-colors">
                Marketplace
              </Link>
              <Link to="/login">
                <Button variant="outline" size="sm">
                  Se connecter
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-700 tracking-tight leading-tight">
            Connectez vos ERP, E‑commerce, CRM, logiciels métier…
          </h1>
          <p className="mt-6 text-xl text-slate-600 max-w-3xl mx-auto">
            Pour automatiser vos processus. Une plateforme d’intégration 100 % configurable, pensée pour vos flux métier.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/marketplace"
              className="inline-flex items-center justify-center font-medium rounded-xl px-6 py-3 text-base bg-primary-500 text-white hover:bg-primary-400 shadow-sm transition-all"
            >
              Explorer le marketplace
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center font-medium rounded-xl px-6 py-3 text-base border-2 border-primary-200 bg-white text-primary-700 hover:bg-primary-50 transition-all"
            >
              Réserver une démo
            </Link>
          </div>
          <ul className="mt-12 flex flex-wrap justify-center gap-8 text-slate-600 text-sm">
            {VALUE_PROPS.map(({ icon: Icon, title }) => (
              <li key={title} className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-primary-400" />
                <span>{title}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Intégration – briques connecteurs */}
      <section className="py-16 sm:py-20 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-primary-600 text-sm font-medium uppercase tracking-wider text-center">
            Intégration
          </p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-slate-700 text-center">
            Couplez facilement vos applications
          </h2>
          <p className="mt-4 text-slate-600 text-center max-w-2xl mx-auto">
            Connectez ERP, e‑commerce, CRM, GED, bases financières, WMS et logiciels métier pour un échange d’informations fluide et automatisé.
          </p>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CONNECTOR_BRICKS.map(({ label, href, icon: Icon, desc }) => (
              <Link
                key={label}
                to={href}
                className="group flex flex-col p-6 rounded-2xl bg-white/80 border border-slate-200/80 hover:bg-white hover:border-primary-200 hover:shadow-md transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-500 border border-primary-200/60">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="mt-4 font-semibold text-slate-700 group-hover:text-primary-600 transition-colors">
                  {label}
                </h3>
                <p className="mt-1 text-sm text-slate-600 line-clamp-2">{desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  En savoir plus
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Comment ça marche – ETL */}
      <section className="py-16 sm:py-20 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-primary-600 text-sm font-medium uppercase tracking-wider text-center">
            Comment ça marche
          </p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-slate-700 text-center">
            Étapes simples, possibilités infinies
          </h2>
          <p className="mt-4 text-slate-600 text-center max-w-2xl mx-auto">
            Créez des flux sur mesure pour toutes vos intégrations de données.
          </p>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
            {ETL_STEPS.map(({ step, title, description, icon: Icon }) => (
              <div
                key={step}
                className="relative flex flex-col items-center text-center p-8 rounded-2xl bg-white/90 border border-slate-200/80 shadow-sm"
              >
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary-100 text-primary-600 text-xs font-bold border border-primary-200">
                  ÉTAPE {step}
                </span>
                <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-500 border border-primary-200/60 mt-2">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-slate-700">{title}</h3>
                <p className="mt-2 text-sm text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Offre / Plateforme */}
      <section className="py-16 sm:py-20 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl bg-white/90 border border-slate-200/80 shadow-sm">
              <div className="flex items-center gap-3">
                <Layers className="w-8 h-8 text-primary-500" />
                <h3 className="text-xl font-semibold text-slate-700">Version cloud</h3>
              </div>
              <p className="mt-2 text-slate-600">
                Plateforme 100 % web, hébergée en France. Pas de déploiement, pas de stockage de vos données sensibles.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-500">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                  Full web, sans installation
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                  Hébergement sécurisé
                </li>
              </ul>
            </div>
            <div className="p-8 rounded-2xl bg-white/90 border border-slate-200/80 shadow-sm">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-primary-500" />
                <h3 className="text-xl font-semibold text-slate-700">Sécurité & stabilité</h3>
              </div>
              <p className="mt-2 text-slate-600">
                Sécurité et stabilité au cœur de vos opérations. Une solution qui s’adapte à chaque étape de votre croissance.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-500">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                  Données chiffrées
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                  Supervision des flux
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Ils nous font confiance / Confiance */}
      <section className="py-16 sm:py-20 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-primary-600 text-sm font-medium uppercase tracking-wider">
            Ils nous font confiance
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-700">
            Une plateforme pensée pour l’entreprise
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-6">
            {TRUST_BADGES.map((badge) => (
              <span
                key={badge}
                className="px-4 py-2 rounded-xl bg-white/90 border border-slate-200/80 text-slate-600 text-sm font-medium shadow-sm"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-16 sm:py-20 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">
            Commencez dès maintenant
          </h2>
          <p className="mt-3 text-slate-400">
            Découvrez le catalogue de connecteurs et lancez vos premières intégrations.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/marketplace"
              className="inline-flex items-center justify-center font-medium rounded-xl px-6 py-3 text-base bg-primary-500 text-white hover:bg-primary-400 shadow-sm transition-all"
            >
              Explorer le marketplace
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center font-medium rounded-xl px-6 py-3 text-base border-2 border-primary-200 bg-white text-primary-700 hover:bg-primary-50 transition-all"
            >
              Planifier une démo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer minimal */}
      <footer className="border-t border-slate-200/80 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary-500" />
              <span className="text-slate-600 text-sm">ANEXYS iPaaS</span>
            </div>
            <span className="text-slate-400 text-xs tabular-nums" title="Version du frontend (package.json)">
              v{APP_VERSION}
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link to="/marketplace" className="text-slate-600 hover:text-primary-600 transition-colors">
              Marketplace
            </Link>
            <Link to="/login" className="text-slate-600 hover:text-primary-600 transition-colors">
              Connexion
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
