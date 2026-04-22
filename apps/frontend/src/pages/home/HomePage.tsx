import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  Cloud,
  FileText,
  Gauge,
  Network,
  Quote,
  Settings2,
  Shield,
  ShoppingCart,
  ChevronDown,
  Activity,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

// ─── Design tokens (mirrors tailwind.config.js) ─────────────────────────────
// brand-900:#0B1D3A  brand-800:#133A6B  accent-500:#00B5E2
// font-display:Fraunces  font-sans:Inter

// ─── Static data ─────────────────────────────────────────────────────────────

const BENEFITS = [
  {
    icon: <Network className="w-7 h-7 text-accent-500" />,
    title: 'Connectivité universelle',
    body: 'EDI X12/EDIFACT, AS2, SFTP, API REST, webhooks — une seule gateway pour tous vos partenaires.',
  },
  {
    icon: <Shield className="w-7 h-7 text-accent-500" />,
    title: 'Sécurité intégrée',
    body: 'Chiffrement TLS end-to-end, tokens rotatifs, audit trail complet et DLQ avec replay.',
  },
  {
    icon: <Gauge className="w-7 h-7 text-accent-500" />,
    title: 'Temps réel',
    body: 'Stream Redis natif, latence < 200 ms, monitoring live depuis le tableau de bord.',
  },
  {
    icon: <Settings2 className="w-7 h-7 text-accent-500" />,
    title: 'Zéro code',
    body: 'Configurez vos flux en quelques clics. Pas de développement, pas de maintenace infra.',
  },
];

const USE_CASES = [
  {
    icon: <ShoppingCart className="w-6 h-6" />,
    label: 'E-commerce',
    desc: 'Shopify, WooCommerce, Magento — synchronisez commandes, stocks et livraisons en temps réel.',
  },
  {
    icon: <Building2 className="w-6 h-6" />,
    label: 'Distribution',
    desc: 'Automatisez EDI 850/856/810 avec vos fournisseurs et GMS sans toucher à votre ERP.',
  },
  {
    icon: <FileText className="w-6 h-6" />,
    label: 'Facturation électronique',
    desc: 'Émission et réception conformes Chorus Pro, Peppol BIS 3.0, format Factur-X.',
  },
  {
    icon: <Cloud className="w-6 h-6" />,
    label: 'Cloud & SaaS',
    desc: "Connectez n'importe quel SaaS via webhook entrant ou API sortante — sans développement.",
  },
];

const FEATURED_CONNECTORS = [
  'Sellsy', 'Cegid', 'Dolibarr', 'Shopify', 'WooCommerce',
  'Chorus Pro', 'Peppol', 'AS2 direct', 'SFTP', 'EBP',
  'QuickEDI', 'Taskit', 'iSales', 'Docoon', 'n8n',
];

const STATS = [
  { value: '12 M+', label: 'messages routés / an' },
  { value: '< 200 ms', label: 'latence médiane' },
  { value: '99,9 %', label: 'SLA disponibilité' },
  { value: '60+', label: 'connecteurs natifs' },
];

const TRUST_LOGOS = [
  'Cegid', 'EBP', 'Dolibarr', 'Chorus Pro', 'Peppol', 'Shopify',
];

const TESTIMONIALS = [
  {
    quote: "Ultimate EDICloud a divisé par 4 le temps de traitement de nos commandes EDI. L'intégration avec notre ERP Cegid était en ligne en moins d'une journée.",
    name: 'Isabelle Moreau',
    role: 'DSI — Groupe Distribution Atlantique',
  },
  {
    quote: "La gateway AS2 tourne sans accroc depuis 8 mois. Le monitoring temps réel nous a évité deux incidents majeurs grâce aux alertes précoces.",
    name: 'Thomas Leroy',
    role: "Responsable IT — Coopérative d'Achats Régionale",
  },
  {
    quote: "Enfin une solution EDI pensée pour les PME : simple à configurer, robuste en production et supportée par une équipe réactive.",
    name: 'Céline Dupuis',
    role: 'Directrice Opérations — BioFood Distribution',
  },
];

// ─── Existing pricing data (UNCHANGED) ───────────────────────────────────────

const PRICING = [
  {
    name: 'Essentiel',
    price: '490',
    period: '/mois',
    description: 'Pour démarrer votre transformation EDI',
    features: [
      "Jusqu'à 5 connecteurs",
      '10 000 messages/mois',
      'Support email',
      'Dashboard basique',
      '1 utilisateur',
    ],
    cta: 'Commencer',
    highlighted: false,
  },
  {
    name: 'Professionnel',
    price: '1 490',
    period: '/mois',
    description: 'Pour les équipes en croissance',
    features: [
      'Connecteurs illimités',
      '100 000 messages/mois',
      'Support prioritaire',
      'Dashboard avancé',
      '5 utilisateurs',
      'AS2 & SFTP inclus',
      'DLQ & replay',
    ],
    cta: 'Essayer 14 jours gratuits',
    highlighted: true,
  },
  {
    name: 'Entreprise',
    price: 'Sur devis',
    period: '',
    description: 'Pour les volumes et besoins spécifiques',
    features: [
      'Volume illimité',
      'SLA personnalisé',
      'Support dédié 24/7',
      'On-premise disponible',
      'Utilisateurs illimités',
      'Intégrations sur mesure',
    ],
    cta: 'Nous contacter',
    highlighted: false,
  },
];

// ─── Existing FAQ data (UNCHANGED) ───────────────────────────────────────────

const FAQ_ITEMS = [
  {
    question: "Comment fonctionne l'intégration avec mon ERP ?",
    answer:
      "Ultimate EDICloud se connecte à votre ERP via API REST, SFTP ou EDI natif. Nous disposons de connecteurs préconfigurés pour Cegid, Dolibarr, EBP, Sage et bien d'autres. La mise en place prend généralement moins d'une journée.",
  },
  {
    question: "Qu'est-ce qu'un 'message' dans votre tarification ?",
    answer:
      "Un message correspond à un document échangé : une commande, une facture, un accusé de réception, etc. Chaque entrée ou sortie de la gateway compte comme un message.",
  },
  {
    question: 'Proposez-vous un hébergement on-premise ?',
    answer:
      "Oui, notre offre Entreprise inclut la possibilité de déployer Ultimate EDICloud dans votre infrastructure privée (VPS, datacenter). Contactez-nous pour un devis personnalisé.",
  },
  {
    question: 'Quelle est la durée minimale d\'engagement ?',
    answer:
      "Nos offres Essentiel et Professionnel sont sans engagement : facturation mensuelle, résiliation à tout moment. L'offre Entreprise fait l'objet d'un contrat annuel.",
  },
  {
    question: 'Le support AS2 est-il certifié ?',
    answer:
      "Oui, notre implémentation AS2 est compatible avec les standards MDN synchrones et asynchrones. Elle a été testée avec les principaux partenaires EDI (GS1, Odette, etc.).",
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function HeroVisual() {
  return (
    <div className="relative w-full max-w-lg mx-auto select-none" aria-hidden="true">
      <svg viewBox="0 0 420 300" className="w-full drop-shadow-2xl">
        {/* Background card */}
        <rect x="10" y="10" width="400" height="280" rx="16" fill="#133A6B" opacity="0.7" />

        {/* Center gateway node */}
        <circle cx="210" cy="150" r="40" fill="#00B5E2" opacity="0.15" />
        <circle cx="210" cy="150" r="28" fill="#00B5E2" opacity="0.25" />
        <circle cx="210" cy="150" r="18" fill="#00B5E2" />
        <text x="210" y="155" textAnchor="middle" fontSize="9" fill="white" fontWeight="700">GATE</text>

        {/* Satellite nodes */}
        {[
          { cx: 80,  cy: 80,  label: 'ERP',      color: '#2DBE60' },
          { cx: 340, cy: 80,  label: 'EDI',       color: '#F59E0B' },
          { cx: 80,  cy: 220, label: 'Webhook',   color: '#818CF8' },
          { cx: 340, cy: 220, label: 'SFTP/AS2',  color: '#F472B6' },
        ].map(({ cx, cy, label, color }) => (
          <g key={label}>
            <line
              x1={cx} y1={cy} x2="210" y2="150"
              stroke="#00B5E2" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5"
            />
            <circle cx={cx} cy={cy} r="22" fill={color} opacity="0.15" />
            <circle cx={cx} cy={cy} r="14" fill={color} opacity="0.9" />
            <text x={cx} y={cy + 4} textAnchor="middle" fontSize="7" fill="white" fontWeight="600">
              {label}
            </text>
          </g>
        ))}

        {/* Animated pulse ring */}
        <circle cx="210" cy="150" r="50" fill="none" stroke="#00B5E2" strokeWidth="1" opacity="0.3">
          <animate attributeName="r" values="50;70;50" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.3;0;0.3" dur="3s" repeatCount="indefinite" />
        </circle>

        {/* Status chip */}
        <rect x="150" y="230" width="120" height="22" rx="11" fill="#0B1D3A" />
        <circle cx="168" cy="241" r="5" fill="#2DBE60" />
        <text x="178" y="245" fontSize="8" fill="#94A3B8">Tous les flux actifs</text>
      </svg>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border-ui rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-6 py-4 text-left font-medium text-gray-900 hover:bg-page-bg transition-colors"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>{question}</span>
        <ChevronDown
          className={`w-5 h-5 text-text-soft flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-6 pb-5 pt-1 text-text-soft text-sm leading-relaxed border-t border-border-ui bg-page-bg">
          {answer}
        </div>
      )}
    </div>
  );
}

// ─── Mock supervision widget ──────────────────────────────────────────────────
function SupervisionMock() {
  const streams = [
    { name: 'ingress:global', count: 1248, status: 'ok' },
    { name: 'ingress:toyo',   count: 342,  status: 'ok' },
    { name: 'dlq:flow',       count: 3,    status: 'warn' },
    { name: 'dlq:noroute',    count: 0,    status: 'ok' },
  ];
  return (
    <div className="bg-brand-900 rounded-2xl p-6 text-white shadow-2xl border border-white/10">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-accent-500" />
        <span className="text-sm font-semibold text-accent-500">Supervision en temps réel</span>
      </div>
      <div className="space-y-3">
        {streams.map((s) => (
          <div key={s.name} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
            <div className="flex items-center gap-3">
              {s.status === 'ok'
                ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                : <AlertCircle className="w-4 h-4 text-yellow-400" />
              }
              <span className="text-xs font-mono text-white/80">{s.name}</span>
            </div>
            <span className="text-sm font-bold tabular-nums">{s.count.toLocaleString()}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/40">
        <span>Mis à jour il y a 2 s</span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block animate-pulse" />
          Live
        </span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="bg-surface font-sans antialiased">

      {/* ── HERO ── */}
      <section className="relative bg-brand-900 overflow-hidden">
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,181,226,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0,181,226,.4) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div className="relative max-w-container mx-auto px-6 py-24 lg:py-32 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 text-accent-500 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-accent-500/30">
              <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse" />
              Gateway EDI cloud-native
            </div>
            <h1 className="font-display text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight mb-6">
              Connectez tous vos{' '}
              <span className="text-accent-500">flux EDI</span>{' '}
              en quelques minutes
            </h1>
            <p className="text-lg text-white/70 mb-8 max-w-xl leading-relaxed">
              Une gateway universelle pour unifier EDI, AS2, SFTP, webhooks et API.
              Zéro infrastructure. Monitoring temps réel. SLA 99,9 %.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 bg-accent-500 hover:bg-sky-400 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-accent-500/30"
              >
                Réserver une démo <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/connectors"
                className="inline-flex items-center gap-2 border border-white/30 text-white hover:bg-white/10 font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                Voir les connecteurs
              </Link>
            </div>
          </div>
          <HeroVisual />
        </div>
      </section>

      {/* ── TRUST STRIP ── */}
      <section className="border-y border-border-ui bg-page-bg py-6">
        <div className="max-w-container mx-auto px-6">
          <p className="text-xs font-semibold text-text-soft uppercase tracking-widest text-center mb-4">
            Compatible avec vos outils du quotidien
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {TRUST_LOGOS.map((name) => (
              <span
                key={name}
                className="text-sm font-medium text-text-soft border border-border-ui rounded-full px-4 py-1.5 bg-white"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section className="max-w-container mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-brand-900 mb-4">
            Tout ce dont vous avez besoin, rien de plus
          </h2>
          <p className="text-text-soft max-w-xl mx-auto">
            Une plateforme conçue pour les équipes IT qui veulent de la robustesse sans la complexité.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {BENEFITS.map((b) => (
            <div
              key={b.title}
              className="bg-page-bg border border-border-ui rounded-2xl p-6 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="mb-4">{b.icon}</div>
              <h3 className="font-semibold text-brand-900 mb-2">{b.title}</h3>
              <p className="text-sm text-text-soft leading-relaxed">{b.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <section className="bg-brand-900 py-16">
        <div className="max-w-container mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="font-display text-3xl lg:text-4xl font-bold text-accent-500 mb-1">
                {s.value}
              </div>
              <div className="text-sm text-white/60">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── USE CASES ── */}
      <section className="max-w-container mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-brand-900 mb-4">
            Adapté à votre secteur
          </h2>
          <p className="text-text-soft max-w-xl mx-auto">
            Des templates prêts à l'emploi pour accélérer votre déploiement.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          {USE_CASES.map((u) => (
            <div
              key={u.label}
              className="flex gap-4 border border-border-ui rounded-2xl p-6 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center text-accent-500">
                {u.icon}
              </div>
              <div>
                <h3 className="font-semibold text-brand-900 mb-1">{u.label}</h3>
                <p className="text-sm text-text-soft leading-relaxed">{u.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CONNECTORS ── */}
      <section className="bg-page-bg border-y border-border-ui py-16">
        <div className="max-w-container mx-auto px-6 text-center">
          <h2 className="font-display text-2xl lg:text-3xl font-bold text-brand-900 mb-3">
            60+ connecteurs natifs
          </h2>
          <p className="text-text-soft mb-8">Branchez-vous en quelques clics, pas en quelques semaines.</p>
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {FEATURED_CONNECTORS.map((c) => (
              <span
                key={c}
                className="bg-white border border-border-ui rounded-full px-4 py-2 text-sm font-medium text-brand-800 shadow-sm"
              >
                {c}
              </span>
            ))}
            <span className="bg-accent-500/10 border border-accent-500/30 rounded-full px-4 py-2 text-sm font-medium text-accent-500">
              + 45 autres
            </span>
          </div>
          <Link
            to="/connectors"
            className="inline-flex items-center gap-2 text-accent-500 font-semibold hover:underline"
          >
            Voir tous les connecteurs <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── SUPERVISION ── */}
      <section className="max-w-container mx-auto px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-accent-500/10 text-accent-500 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <BarChart3 className="w-3.5 h-3.5" /> Supervision
          </div>
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-brand-900 mb-4">
            Vos flux sous contrôle,{' '}
            <span className="text-accent-500">en temps réel</span>
          </h2>
          <p className="text-text-soft mb-6 leading-relaxed">
            Tableau de bord live, métriques par stream, Dead Letter Queue avec replay en 1 clic.
            Votre équipe voit tout, agit vite.
          </p>
          <ul className="space-y-3">
            {[
              'Latences et volumes par route',
              'Alertes email & Slack instantanées',
              'Replay des messages en erreur',
              'Logs exportables en JSON/CSV',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-gray-700">
                <Check className="w-4 h-4 text-accent-500 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <SupervisionMock />
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="bg-page-bg border-t border-border-ui py-20">
        <div className="max-w-container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-brand-900 mb-4">
              Ils font confiance à Ultimate EDICloud
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white border border-border-ui rounded-2xl p-6 shadow-sm">
                <Quote className="w-6 h-6 text-accent-500 mb-4 opacity-70" />
                <p className="text-sm text-text-soft leading-relaxed mb-6 italic">{t.quote}</p>
                <div>
                  <div className="font-semibold text-brand-900 text-sm">{t.name}</div>
                  <div className="text-xs text-text-soft">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING (UNCHANGED) ── */}
      <section className="max-w-container mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-brand-900 mb-4">
            Tarifs transparents
          </h2>
          <p className="text-text-soft max-w-lg mx-auto">
            Choisissez le plan adapté à votre volume. Sans frais cachés.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6 items-start">
          {PRICING.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-8 flex flex-col ${
                plan.highlighted
                  ? 'bg-brand-900 border-accent-500 shadow-2xl shadow-brand-900/30 scale-105'
                  : 'bg-white border-border-ui'
              }`}
            >
              <div className="mb-6">
                <h3
                  className={`text-lg font-bold mb-1 ${
                    plan.highlighted ? 'text-white' : 'text-brand-900'
                  }`}
                >
                  {plan.name}
                </h3>
                <p
                  className={`text-sm mb-4 ${
                    plan.highlighted ? 'text-white/60' : 'text-text-soft'
                  }`}
                >
                  {plan.description}
                </p>
                <div className="flex items-end gap-1">
                  <span
                    className={`font-display text-4xl font-bold ${
                      plan.highlighted ? 'text-accent-500' : 'text-brand-900'
                    }`}
                  >
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span
                      className={`text-sm mb-1 ${
                        plan.highlighted ? 'text-white/50' : 'text-text-soft'
                      }`}
                    >
                      {plan.period}
                    </span>
                  )}
                </div>
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check
                      className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        plan.highlighted ? 'text-accent-500' : 'text-green-500'
                      }`}
                    />
                    <span className={plan.highlighted ? 'text-white/80' : 'text-gray-700'}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                to="/contact"
                className={`w-full text-center font-semibold py-3 rounded-xl transition-colors ${
                  plan.highlighted
                    ? 'bg-accent-500 hover:bg-sky-400 text-white'
                    : 'bg-page-bg hover:bg-border-ui border border-border-ui text-brand-900'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ (UNCHANGED) ── */}
      <section className="bg-page-bg border-t border-border-ui py-20">
        <div className="max-w-container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-brand-900 mb-4">
              Questions fréquentes
            </h2>
          </div>
          <div className="max-w-3xl mx-auto space-y-3">
            {FAQ_ITEMS.map((item) => (
              <FaqItem key={item.question} question={item.question} answer={item.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="bg-brand-900 py-20">
        <div className="max-w-container mx-auto px-6 text-center">
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-white mb-4">
            Prêt à unifier vos flux EDI ?
          </h2>
          <p className="text-white/60 mb-8 max-w-lg mx-auto">
            Déployez en quelques minutes. Pas de carte bancaire requise pour l'essai.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 bg-accent-500 hover:bg-sky-400 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors shadow-lg shadow-accent-500/30"
            >
              Réserver une démo <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 border border-white/30 text-white hover:bg-white/10 font-semibold px-8 py-3.5 rounded-xl transition-colors"
            >
              Essai gratuit 14 jours
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
