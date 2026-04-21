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
  CheckCircle2,
  TrendingUp,
  Clock,
  Globe,
} from 'lucide-react';
import { Button } from '../../components/ui';
import { QuoteEstimatorSection } from '../../components/tarifs/QuoteEstimatorSection';

const VALUE_PROPS = [
  { icon: HeadphonesIcon, title: 'Support dédié', description: 'Une équipe à vos côtés pour vos intégrations.' },
  { icon: Rocket, title: 'Intégration rapide', description: 'Connectez vos systèmes en quelques jours.' },
  {
    icon: FileCheck,
    title: 'Devis & simulateur',
    description: 'Estimation en ligne et envoi automatique au pôle commercial.',
  },
] as const;

const CONNECTOR_BRICKS = [
  { label: 'Connecteur ERP', href: '/marketplace', icon: Building2, desc: 'Flux bidirectionnels entre ERP et vos applications métier. Compatible Sage, CEGID, Dolibarr.' },
  { label: 'Connecteur E-commerce', href: '/marketplace', icon: ShoppingCart, desc: 'Synchronisez Shopify, WooCommerce et PrestaShop avec votre ERP en temps réel.' },
  { label: 'Connecteur CRM', href: '/marketplace', icon: BarChart3, desc: 'Tiers, devis et commandes synchronisés entre ERP et CRM (Salesforce, HubSpot).' },
  { label: 'Connecteur GED', href: '/marketplace', icon: FileText, desc: 'Documents électroniques et factures PDF vers votre ERP automatiquement.' },
  { label: 'Base Financière', href: '/marketplace', icon: Database, desc: 'Connectez ERP et bases financières pour un reporting centralisé.' },
  { label: 'Logiciels métier', href: '/marketplace', icon: Wrench, desc: 'Intégrez tout logiciel spécifique à votre secteur avec votre ERP.' },
  { label: 'Connecteur WMS', href: '/marketplace', icon: Package, desc: 'Stocks, entrées et sorties synchronisés entre WMS et ERP.' },
  { label: 'Sur mesure', href: '/marketplace', icon: Box, desc: 'Fonctionnalité manquante ? Nos équipes développent votre connecteur.' },
] as const;

const ETL_STEPS = [
  { step: 1, title: 'Extraction', description: 'Récupérez les données depuis vos sources : API REST, fichiers plats (CSV, XML, EDIFACT), bases de données.', icon: Database },
  { step: 2, title: 'Transformation', description: 'Nettoyez, mappez et normalisez vos données vers le format cible (JSON, XML, IDOC, ORDERS…).', icon: RefreshCw },
  { step: 3, title: 'Chargement', description: 'Poussez les données transformées vers l'application cible avec gestion des erreurs et relance automatique.', icon: Upload },
] as const;

const TRUST_BADGES = [
  { text: '100 % configurable', icon: CheckCircle2 },
  { text: 'Hébergement France', icon: Globe },
  { text: 'Supervision temps réel', icon: TrendingUp },
  { text: 'Déploiement rapide', icon: Clock },
] as const;

const STATS = [
  { value: '50+', label: 'Connecteurs disponibles' },
  { value: '<48h', label: 'Mise en production' },
  { value: '99.9%', label: 'Disponibilité SLA' },
  { value: '100%', label: 'Hébergé en France' },
] as const;

/** Visuel hero — animation CSS pure (pas d'image externe). */
function HeroVisual() {
  const nodes = [
    { label: 'ERP', sublabel: 'Sage / CEGID', color: '#0ea5e9', x: 50, y: 50, icon: Building2 },
    { label: 'E-commerce', sublabel: 'Shopify', color: '#8b5cf6', x: 82, y: 22, icon: ShoppingCart },
    { label: 'CRM', sublabel: 'Salesforce', color: '#10b981', x: 82, y: 78, icon: BarChart3 },
    { label: 'EDI', sublabel: 'EDIFACT / AS2', color: '#f59e0b', x: 18, y: 22, icon: FileText },
    { label: 'WMS', sublabel: 'Stocks', color: '#ef4444', x: 18, y: 78, icon: Package },
  ];

  const lines = [
    { x1: 50, y1: 50, x2: 82, y2: 22 },
    { x1: 50, y1: 50, x2: 82, y2: 78 },
    { x1: 50, y1: 50, x2: 18, y2: 22 },
    { x1: 50, y1: 50, x2: 18, y2: 78 },
  ];

  return (
    <div className="relative w-full max-w-lg mx-auto select-none" aria-hidden="true">
      <div
        className="relative rounded-3xl overflow-hidden border border-slate-200/60 shadow-2xl shadow-sky-500/10"
        style={{
          background: 'linear-gradient(145deg, #f8fafc 0%, #f0f9ff 50%, #ede9fe 100%)',
          aspectRatio: '4/3',
        }}
      >
        {/* Animated background grid */}
        <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#0ea5e9" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* SVG lines connecting nodes */}
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 75">
          {lines.map((line, i) => (
            <line
              key={i}
              x1={`${line.x1}%`} y1={`${line.y1}%`}
              x2={`${line.x2}%`} y2={`${line.y2}%`}
              stroke="#cbd5e1"
              strokeWidth="0.4"
              strokeDasharray="2 1.5"
            />
          ))}
          {/* Animated pulse dots on lines */}
          {lines.map((line, i) => (
            <circle key={`pulse-${i}`} r="0.8" fill="#0ea5e9" opacity="0.7">
              <animateMotion
                dur={`${1.8 + i * 0.6}s`}
                repeatCount="indefinite"
                path={`M${line.x1},${line.y1 * 0.75} L${line.x2},${line.y2 * 0.75}`}
              />
            </circle>
          ))}
        </svg>

        {/* Nodes */}
        {nodes.map((node, i) => {
          const Icon = node.icon;
          const isCenter = i === 0;
          return (
            <div
              key={node.label}
              className="absolute flex flex-col items-center gap-1"
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div
                className={`flex items-center justify-center rounded-xl shadow-lg border-2 border-white/80 ${isCenter ? 'w-14 h-14' : 'w-11 h-11'}`}
                style={{ background: `linear-gradient(135deg, ${node.color}20, ${node.color}40)`, borderColor: `${node.color}30` }}
              >
                {isCenter ? (
                  <div className="relative">
                    <div
                      className="absolute inset-0 rounded-xl animate-ping opacity-30"
                      style={{ background: node.color }}
                    />
                    <Zap className="w-7 h-7 relative" style={{ color: node.color }} />
                  </div>
                ) : (
                  <Icon className="w-5 h-5" style={{ color: node.color }} />
                )}
              </div>
              <span className="text-[9px] font-bold text-slate-700 text-center leading-tight whitespace-nowrap">{node.label}</span>
              <span className="text-[7px] text-slate-400 text-center leading-tight whitespace-nowrap">{node.sublabel}</span>
            </div>
          );
        })}

        {/* Badge overlay */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 shadow-sm border border-slate-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-semibold text-slate-700">Flux actifs</span>
          </div>
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 shadow-sm border border-slate-100">
            <span className="text-[10px] font-semibold text-sky-600">209 messages / 24h</span>
          </div>
        </div>
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
    <section
      className="py-12 sm:py-16 border-t border-slate-200/60 bg-slate-50/80"
      aria-labelledby="ecosystem-heading"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-sky-600 text-sm font-semibold uppercase tracking-wider text-center">Écosystème</p>
        <h2 id="ecosystem-heading" className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 text-center">
          Connecteurs ERP, e-commerce, CRM et EDI
        </h2>
        <p className="mt-3 text-slate-600 text-center max-w-2xl mx-auto text-sm sm:text-base">
          Sage, CEGID, Shopify, WooCommerce, Salesforce, QuickBooks et bien d'autres — tous disponibles dans le
          marketplace Ultimate Edicloud.
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
                  title={`Connecteur ${c.name} — Ultimate Edicloud`}
                >
                  <SoftwareLogoImg
                    src={src}
                    alt={`Logo ${c.name}`}
                    size="lg"
                    rounded="xl"
                    className="group-hover:border-sky-300"
                  />
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
            Voir tout le catalogue de connecteurs →
          </Link>
        </p>
      </div>
    </section>
  );
}

export function HomePage() {
  return (
    <div className="relative overflow-hidden">
      {/* Background gradient */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(14, 165, 233, 0.15), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(139, 92, 246, 0.10), transparent)',
        }}
      />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative py-14 sm:py-20 lg:py-28" aria-labelledby="hero-heading">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-sky-700 shadow-sm">
                <Zap className="w-3.5 h-3.5 text-sky-500" />
                Ultimate · le connecteur iPaaS
              </p>
              <h1
                id="hero-heading"
                className="mt-5 text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold tracking-tight leading-[1.1]"
              >
                <span className="bg-gradient-to-r from-slate-900 via-sky-800 to-violet-700 bg-clip-text text-transparent">
                  Connectez vos ERP,
                </span>
                <br />
                <span className="text-slate-800">EDI et e-commerce.</span>
              </h1>
              <p className="mt-5 text-lg text-slate-600 max-w-xl leading-relaxed">
                Ultimate Edicloud est la plateforme iPaaS française pour automatiser vos échanges de données. Connectez
                Sage, CEGID, Shopify et vos flux EDI avec un marketplace de connecteurs prêts à l'emploi.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/marketplace">
                  <Button size="lg" className="gap-2 shadow-lg shadow-sky-500/20">
                    Explorer le marketplace
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/tarifs#estimateur-devis">
                  <Button variant="outline" size="lg">
                    Tarifs & simulateur
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

      {/* ── Stats band ────────────────────────────────────────────────── */}
      <section className="border-y border-slate-200/60 bg-white/60 backdrop-blur-sm py-8 sm:py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {STATS.map(({ value, label }) => (
              <div key={label}>
                <dt className="text-3xl sm:text-4xl font-extrabold text-sky-600">{value}</dt>
                <dd className="mt-1 text-sm text-slate-500">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <QuoteEstimatorSection layout="hero" />

      <HomeMarketplaceLogos />

      {/* ── Connecteurs ───────────────────────────────────────────────── */}
      <section
        className="py-16 sm:py-20 border-t border-slate-200/60 bg-white/40 backdrop-blur-sm"
        aria-labelledby="connectors-heading"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sky-600 text-sm font-semibold uppercase tracking-wider text-center">Intégration SI</p>
          <h2 id="connectors-heading" className="mt-2 text-3xl sm:text-4xl font-bold text-slate-900 text-center">
            Connectez toutes vos applications métier
          </h2>
          <p className="mt-4 text-slate-600 text-center max-w-2xl mx-auto">
            ERP, e-commerce, CRM, GED, WMS et logiciels métier — Ultimate Edicloud synchronise vos données en temps
            réel pour éliminer les ressaisies et les erreurs.
          </p>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CONNECTOR_BRICKS.map(({ label, href, icon: Icon, desc }) => (
              <Link
                key={label}
                to={href}
                className="group flex flex-col p-6 rounded-2xl bg-white/90 border border-slate-200/90 hover:border-sky-300/80 hover:shadow-lg transition-all duration-300"
                title={`${label} — Intégration ERP avec Ultimate Edicloud`}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-100 to-violet-100 flex items-center justify-center text-sky-600 border border-sky-200/50">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="mt-4 font-semibold text-slate-900 group-hover:text-sky-700 transition-colors">
                  {label}
                </h3>
                <p className="mt-1 text-sm text-slate-600 line-clamp-3 leading-relaxed">{desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-sky-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  En savoir plus
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pipeline ETL ──────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 border-t border-slate-200/60" aria-labelledby="etl-heading">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sky-600 text-sm font-semibold uppercase tracking-wider text-center">Pipeline de données</p>
          <h2 id="etl-heading" className="mt-2 text-3xl sm:text-4xl font-bold text-slate-900 text-center">
            ETL sur mesure — Extraction, Transformation, Chargement
          </h2>
          <p className="mt-4 text-slate-600 text-center max-w-2xl mx-auto">
            Des flux de données entièrement configurables pour vos intégrations ERP, EDI et e-commerce —
            orchestrés et supervisés dans Ultimate Edicloud.
          </p>
          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cloud + Sécurité ──────────────────────────────────────────── */}
      <section
        className="py-16 sm:py-20 border-t border-slate-200/60 bg-white/40 backdrop-blur-sm"
        aria-labelledby="cloud-security-heading"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 id="cloud-security-heading" className="sr-only">Cloud hébergé en France et sécurité des données</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-8 rounded-2xl bg-gradient-to-br from-white to-sky-50/60 border border-slate-200/90 shadow-sm">
              <div className="flex items-center gap-3">
                <Layers className="w-8 h-8 text-sky-600 shrink-0" />
                <h3 className="text-xl font-semibold text-slate-900">SaaS hébergé en France</h3>
              </div>
              <p className="mt-3 text-slate-600 leading-relaxed">
                Plateforme 100 % web, hébergée sur infrastructure française. Pas de déploiement lourd — vos équipes
                accèdent au portail depuis leur navigateur, vos données restent souveraines.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-slate-500">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />Full web, sans installation</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />Hébergement sécurisé — datacenter France</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />API REST documentée Swagger</li>
              </ul>
            </div>
            <div className="p-8 rounded-2xl bg-gradient-to-br from-white to-violet-50/60 border border-slate-200/90 shadow-sm">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-violet-600 shrink-0" />
                <h3 className="text-xl font-semibold text-slate-900">Sécurité & traçabilité</h3>
              </div>
              <p className="mt-3 text-slate-600 leading-relaxed">
                Isolation multi-tenant par base de données dédiée, chiffrement des tokens en transit, audit log complet
                et supervision des flux EDI en temps réel.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-slate-500">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-violet-500 shrink-0" />Base de données isolée par client</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-violet-500 shrink-0" />Tokens chiffrés (AES-256)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-violet-500 shrink-0" />Journal d'audit horodaté</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust & CTA ───────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 border-t border-slate-200/60" aria-labelledby="trust-heading">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sky-600 text-sm font-semibold uppercase tracking-wider">Confiance</p>
          <h2 id="trust-heading" className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900">
            Pensé pour les équipes IT et les intégrateurs ERP
          </h2>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {TRUST_BADGES.map(({ text, icon: Icon }) => (
              <span
                key={text}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium shadow-sm"
              >
                <Icon className="w-4 h-4 text-sky-500" />
                {text}
              </span>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link to="/avis" className="text-sm font-medium text-sky-700 hover:underline">
              Lire les avis clients
            </Link>
            <span className="text-slate-300">·</span>
            <Link to="/signup-trial" className="text-sm font-medium text-sky-700 hover:underline">
              Créer un compte gratuit
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA final ─────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 border-t border-slate-200/60 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Prêt à automatiser vos intégrations ?
          </h2>
          <p className="mt-4 text-slate-300 text-lg leading-relaxed">
            Découvrez le catalogue Ultimate Edicloud et lancez vos premières intégrations ERP, EDI et e-commerce en
            quelques jours.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/marketplace"
              className="inline-flex items-center justify-center font-semibold rounded-xl px-6 py-3 text-base bg-sky-500 text-white hover:bg-sky-400 shadow-lg transition-all"
            >
              Explorer le marketplace
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link
              to="/signup-trial"
              className="inline-flex items-center justify-center font-semibold rounded-xl px-6 py-3 text-base bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all"
            >
              Essai gratuit
            </Link>
            <Link
              to="/reserver-demo"
              className="inline-flex items-center justify-center font-semibold rounded-xl px-6 py-3 text-base border border-slate-500 text-slate-300 hover:bg-white/10 transition-all"
            >
              Réserver une démo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
