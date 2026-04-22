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
  Sparkles,
  Users,
  ChevronDown,
} from 'lucide-react';
import { clsx } from 'clsx';

const BENEFITS = [
  {
    icon: Shield,
    title: 'Fiabilité & sécurité',
    text: 'Données hébergées en France, traçabilité complète et contrôle d’accès aligné sur vos exigences SI.',
  },
  {
    icon: Settings2,
    title: 'Automatisation avancée',
    text: 'Réduisez les ressaisies : vos flux tournent en continu, avec relances et règles adaptées à votre activité.',
  },
  {
    icon: Gauge,
    title: 'Visibilité en temps réel',
    text: 'Pilotez l’activité, détectez les écarts tôt et gagnez en sérénité opérationnelle sur tous vos canaux.',
  },
  {
    icon: Network,
    title: 'Ouverture & flexibilité',
    text: 'Raccordez l’existant (ERP, e-commerce, partenaires) et faites évoluer vos intégrations sans rupture.',
  },
] as const;

const USE_CASES = [
  {
    title: 'Intégration ERP',
    items: [
      'Synchronisez commandes, stocks, prix et clients entre vos systèmes',
      'Réduisez les opérations manuelles côté finance et logistique',
      'Fiabilisez le passage à l’échelle (nouveaux canaux, nouvelles agences)',
    ],
  },
  {
    title: 'EDI & partenaires',
    items: [
      'Échangez avec vos partenaires de façon structurée, supervisée, traçable',
      'Déclenchez les traitements côté ERP dès réception, sans reprise à la main',
      'Gagnez en clarté sur l’avancement de vos messages et exceptions',
    ],
  },
  {
    title: 'E-commerce',
    items: [
      'Alignez catalogue, stocks et commandes entre boutique et back-office',
      'Accélérez les délais d’exécution en limitant les erreurs',
      'Facilitez l’onboarding d’un nouveau canal de vente',
    ],
  },
  {
    title: 'CRM & données clients',
    items: [
      'Unifiez l’information client : historique, segments, suivi com',
      'Évitez les incohérences entre commerciaux, service et comptabilité',
      'Améliorez le pilotage par la qualité de données unifiée',
    ],
  },
] as const;

const FEATURED_CONNECTORS = [
  { name: 'Sage', to: '/marketplace' },
  { name: 'Cegid', to: '/marketplace' },
  { name: 'Shopify', to: '/marketplace' },
  { name: 'WooCommerce', to: '/marketplace' },
  { name: 'Salesforce', to: '/marketplace' },
  { name: 'HubSpot', to: '/marketplace' },
] as const;

const STATS = [
  { value: '+10M', label: 'Messages / jour' },
  { value: '99,95 %', label: 'Disponibilité' },
  { value: '50+', label: 'Connecteurs' },
  { value: '< 2 min', label: 'Détection d’erreur' },
] as const;

const TRUST_NAMES = [
  { abbr: 'A', name: 'Industrie' },
  { abbr: 'B', name: 'Distribution' },
  { abbr: 'C', name: 'Agro' },
  { abbr: 'D', name: 'Équipement' },
  { abbr: 'E', name: 'Services' },
] as const;

const TESTIMONIALS = [
  {
    name: 'Claire Durand',
    role: 'DSI — groupe industriel (500 pers.)',
    quote:
      'Nous avons gagné en visibilité sur les flux EDI : moins d’arbitrages à chaud, plus de maîtrise. La prise en main a été claire côté métier.',
  },
  {
    name: 'Yannick Peltier',
    role: 'Responsable intégration — PME e-commerce + retail',
    quote:
      'Le gros bénéfice, c’est d’en finir avec les ressaisies. Les équipes suivront enfin la même information à la même heure, sans "aller chercher" ailleurs.',
  },
  {
    name: 'Hélène Morvan',
    role: 'Directrice des opérations — ETI multi-sites',
    quote:
      'Nous voulions une approche rassurante, durable : une plateforme, des habitudes communes, et moins d’improvisation sur les intégrations sensibles.',
  },
] as const;

const PRICING = [
  {
    name: 'Essentiel',
    price: '490',
    desc: 'Pour lancer l’intégration cœur de métier avec un accompagnement structuré.',
    features: [
      'Volume standard',
      'Supervision de base',
      'Support e-mail (heures ouvrées)',
    ],
    cta: 'Parler à un expert',
    highlight: false,
  },
  {
    name: 'Professionnel',
    price: '1 490',
    desc: 'Pour accélérer, fiabiliser et donner de la marge d’industrialisation sur plusieurs flux.',
    features: [
      'Volumes étendus',
      'Règles d’automatisation avancées',
      'Supervision & alertes renforcées',
      'SLA de support',
    ],
    cta: 'En savoir plus',
    highlight: true,
  },
  {
    name: 'Entreprise',
    price: null,
    priceLabel: 'Sur devis',
    desc: 'Pour les hauts volumes, les exigences fortes d’accompagnement et les architectures spécifiques.',
    features: [
      'Accompagnement dédié',
      'Roadmap cadrée avec votre DSI / MOA',
      'Gouvernance, sécurité et continuité adaptées',
    ],
    cta: 'Nous contacter',
    highlight: false,
  },
] as const;

const FAQ = [
  {
    q: 'Où sont hébergées les données et quelles sont les pratiques de sécurité ?',
    a: 'L’hébergement s’inscrit dans une exigence de contrôle, traçabilité et séparation des contextes. Les échanges sont tracés, l’accès est borné, et l’accompagnement s’adapte à vos règles (réseau, gouvernance, procédures).',
  },
  {
    q: 'En combien de temps peut-on être opérationnel ?',
    a: 'Le délai dépend de votre périmètre (nombre de canaux, qualité de données, parties prenantes). Dès le démarrage, on fixe un plan de mise en service réaliste et on sépare les "quick wins" des chantiers d’enrichissement.',
  },
  {
    q: 'Puis-je brancher "ce que j’ai déjà" (Sage, Cegid, Shopify, etc.) ?',
    a: 'Oui : l’idée est de bâtir autour de votre réalité. Nous cadrons les connecteurs, les règles, puis nous faisons valider côté métier avant d’industrialiser.',
  },
  {
    q: 'Le support s’adresse-t-il plutôt aux IT ou au métier ?',
    a: 'Aux deux : l’IT garde le pilotage, le métier comprend ce qu’il supervise. Le vocabulaire reste orienté usage (fiabiliser, automatiser, superviser), pas jargon interne.',
  },
] as const;

function HeroVisual() {
  const nodes: { label: string; sub: string; x: number; y: number; Icon: typeof Building2 }[] = [
    { label: 'ERP', sub: 'Cœur de données', x: 20, y: 22, Icon: Building2 },
    { label: 'EDI', sub: 'Partenaires', x: 20, y: 78, Icon: FileText },
    { label: 'E-commerce', sub: 'Canal client', x: 82, y: 22, Icon: ShoppingCart },
    { label: 'CRM', sub: 'Clients & com', x: 82, y: 78, Icon: BarChart3 },
  ];
  return (
    <div className="w-full max-w-lg mx-auto" aria-hidden>
      <div
        className="relative rounded-[16px] border border-[#E5E7EB] bg-surface [box-shadow:var(--shadow-md)]"
        style={{ aspectRatio: '4/3' }}
      >
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 75" fill="none" xmlns="http://www.w3.org/2000/svg">
          {nodes.map((n) => (
            <line
              key={`${n.x}-${n.y}`}
              x1="50"
              y1="40"
              x2={n.x}
              y2={n.y * 0.75}
              stroke="#E5E7EB"
              strokeWidth="0.4"
            />
          ))}
        </svg>
        <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 w-20 h-20 sm:w-24 sm:h-24 rounded-[12px] bg-brand-800 flex items-center justify-center [box-shadow:var(--shadow-sm)]">
          <Cloud className="w-9 h-9 sm:w-11 sm:h-11 text-white" strokeWidth={1.4} />
        </div>
        {nodes.map((n) => {
          const Icon = n.Icon;
          return (
            <div
              key={n.label}
              className="absolute flex flex-col items-center"
              style={{
                left: `${n.x}%`,
                top: `${n.y * 0.75}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[10px] border border-[#E5E7EB] bg-surface flex items-center justify-center [box-shadow:var(--shadow-sm)]">
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-brand-800" strokeWidth={1.4} />
              </div>
              <span className="mt-1.5 text-[9px] sm:text-[10px] font-semibold text-[#1F2937]">{n.label}</span>
              <span className="text-[8px] text-text-soft hidden sm:block">{n.sub}</span>
            </div>
          );
        })}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 rounded-[10px] border border-[#E5E7EB] bg-surface/95 px-2.5 py-2 text-[10px] sm:text-xs text-text-soft">
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <span className="h-2 w-2 rounded-full bg-success shrink-0" />
            <span className="font-medium text-[#1F2937]">Supervision active</span>
          </span>
          <span className="shrink-0 text-brand-800 font-medium">Flux stables</span>
        </div>
      </div>
    </div>
  );
}

function FaqItem({
  open,
  onToggle,
  question,
  answer,
  id,
}: {
  open: boolean;
  onToggle: () => void;
  question: string;
  answer: string;
  id: string;
}) {
  return (
    <div className="border-b border-[#E5E7EB] last:border-b-0">
      <h3>
        <button
          type="button"
          id={id}
          className="flex w-full items-center justify-between gap-3 py-4 text-left text-sm sm:text-base font-medium text-[#1F2937] hover:text-brand-900"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
        >
          {question}
          <ChevronDown
            className={clsx('w-4 h-4 text-text-soft shrink-0 transition-transform', open && 'rotate-180')}
            aria-hidden
          />
        </button>
      </h3>
      {open && (
        <div id={`${id}-panel`} role="region" className="pb-4 pr-2 text-sm text-text-soft leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}

export function HomePage() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="font-sans">
      {/* Hero */}
      <section className="pt-10 pb-12 sm:pt-14 sm:pb-20 lg:pt-16" aria-labelledby="hero-heading">
        <div className="max-w-container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div>
              <p className="text-xs sm:text-sm font-semibold tracking-[0.12em] uppercase text-accent-500">
                Plateforme iPaaS & intégration métier
              </p>
              <h1
                id="hero-heading"
                className="mt-3 font-display text-3xl sm:text-4xl lg:text-[2.4rem] font-semibold text-brand-900 tracking-tight leading-tight"
              >
                Connectez ERP, EDI et e-commerce sur une seule plateforme
              </h1>
              <p className="mt-4 text-base sm:text-lg text-text-soft max-w-xl leading-relaxed">
                Automatisez vos échanges de données, supervisez vos flux en temps réel et réduisez vos opérations
                manuelles.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to="/reserver-demo"
                  className="inline-flex items-center justify-center rounded-[12px] bg-brand-900 px-5 py-3 text-sm sm:text-base font-semibold text-white [box-shadow:var(--shadow-sm)] hover:bg-brand-800"
                >
                  Réserver une démo
                </Link>
                <Link
                  to="/marketplace"
                  className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-[#B8E3F0] bg-surface px-5 py-3 text-sm sm:text-base font-semibold text-brand-900 hover:border-accent-500/60 [box-shadow:var(--shadow-sm)]"
                >
                  Voir les connecteurs
                  <ArrowRight className="w-4 h-4" strokeWidth={2} />
                </Link>
              </div>
            </div>
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="py-8 sm:py-10 border-y border-[#E5E7EB] bg-surface" aria-labelledby="trust-line">
        <div className="max-w-container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p id="trust-line" className="text-sm sm:text-base font-medium text-[#1F2937]">
            Plus de 250 entreprises nous font confiance
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-8">
            {TRUST_NAMES.map((c) => (
              <div
                key={c.name}
                className="h-9 sm:h-10 min-w-[5.5rem] px-3 flex items-center justify-center rounded-[10px] border border-[#E5E7EB] text-[10px] sm:text-xs font-semibold tracking-wide text-text-soft/90 uppercase bg-page-bg/60"
                title={c.name}
              >
                {c.abbr}
                <span className="ml-1.5 normal-case text-[9px] text-text-soft hidden sm:inline">· {c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4 bénéfices */}
      <section className="py-14 sm:py-20 bg-page-bg" aria-labelledby="benefits-heading">
        <div className="max-w-container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 id="benefits-heading" className="font-display text-2xl sm:text-3xl font-semibold text-brand-900">
              Bénéfices concrets, sans complexité
            </h2>
            <p className="mt-2 text-text-soft">Fiabiliser, automatiser, superviser, accélérer — le tout avec une exigence de clarté.</p>
          </div>
          <ul className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 list-none p-0 m-0">
            {BENEFITS.map(({ icon: Icon, title, text }) => (
              <li
                key={title}
                className="flex flex-col rounded-[12px] border border-[#E5E7EB] bg-surface p-6 [box-shadow:var(--shadow-sm)]"
              >
                <div className="w-10 h-10 rounded-[10px] border border-[#E5E7EB] flex items-center justify-center">
                  <Icon className="w-5 h-5 text-brand-800" strokeWidth={1.4} />
                </div>
                <h3 className="mt-4 font-semibold text-[#1F2937]">{title}</h3>
                <p className="mt-2 text-sm text-text-soft leading-relaxed">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Cas d'usage */}
      <section className="py-14 sm:py-20 bg-surface" aria-labelledby="usecases-heading">
        <div className="max-w-container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 id="usecases-heading" className="font-display text-2xl sm:text-3xl font-semibold text-brand-900 text-center">
            Cas d’usage
          </h2>
          <p className="mt-2 text-center text-text-soft max-w-2xl mx-auto">
            Des intégrations business, racontées côté impact, pas côté jargon.
          </p>
          <div className="mt-10 grid sm:grid-cols-2 gap-4 sm:gap-5">
            {USE_CASES.map((u) => (
              <div
                key={u.title}
                className="flex flex-col rounded-[12px] border border-[#E5E7EB] p-6 sm:p-7 [box-shadow:var(--shadow-sm)]"
              >
                <h3 className="font-semibold text-lg text-[#1F2937]">{u.title}</h3>
                <ul className="mt-4 space-y-2 text-sm text-text-soft">
                  {u.items.map((it) => (
                    <li key={it} className="flex gap-2">
                      <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/marketplace"
                  className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-800 hover:underline w-fit"
                >
                  Voir les connecteurs
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-10 sm:py-12 bg-brand-900 text-white" aria-label="Indicateurs de confiance">
        <div className="max-w-container mx-auto px-4 sm:px-6 lg:px-8">
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 text-center">
            {STATS.map((s) => (
              <div key={s.label}>
                <dt className="text-2xl sm:text-3xl font-semibold text-accent-500 font-display tabular-nums">
                  {s.value}
                </dt>
                <dd className="mt-1 text-sm text-white/75">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Supervision */}
      <section className="py-14 sm:py-20 bg-page-bg" aria-labelledby="sup-heading">
        <div className="max-w-container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <div>
              <h2 id="sup-heading" className="font-display text-2xl sm:text-3xl font-semibold text-brand-900">
                Supervision : une vision fiable, au bon moment
              </h2>
              <p className="mt-3 text-text-soft max-w-prose">
                Moins de "je ne savais pas" : suivez l’état de vos intégrations, priorisez les correctifs, et gagnez du
                temps côté équipe terrain comme côté direction.
              </p>
              <ul className="mt-6 space-y-3 text-sm sm:text-base text-[#1F2937]">
                <li className="flex gap-2">
                  <Sparkles className="w-4 h-4 text-accent-500 shrink-0 mt-1" />
                  Tableaux conçus pour décider, pas seulement pour "voir des logs"
                </li>
                <li className="flex gap-2">
                  <BarChart3 className="w-4 h-4 text-accent-500 shrink-0 mt-1" />
                  Indicateurs de fluidité, délais, volumes — sans surcharge visuelle
                </li>
                <li className="flex gap-2">
                  <Users className="w-4 h-4 text-accent-500 shrink-0 mt-1" />
                  Un partage d’info plus simple entre IT, finance et opérations
                </li>
              </ul>
            </div>
            <div className="rounded-[12px] border border-[#E5E7EB] bg-surface p-6 sm:p-8 [box-shadow:var(--shadow-sm)]">
              <p className="text-sm font-medium text-text-soft">Exemple d’intention d’écran (schéma)</p>
              <div className="mt-4 space-y-3">
                {['Derniers messages', 'Erreurs à traiter', 'Débit sur 24 h', 'Dépendances clés'].map((row, i) => (
                  <div
                    key={row}
                    className="flex items-center justify-between rounded-[10px] border border-[#E5E7EB] bg-page-bg/70 px-3 py-2.5 text-sm"
                  >
                    <span className="text-[#1F2937]">{row}</span>
                    <span className="text-text-soft">OK{ i === 1 ? ' (2)' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Connecteurs vedettes */}
      <section className="py-14 sm:py-20 bg-surface" aria-labelledby="connectors-heading">
        <div className="max-w-container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 id="connectors-heading" className="font-display text-2xl sm:text-3xl font-semibold text-brand-900">
            Des connecteurs prêts à l’emploi
          </h2>
          <p className="mt-2 text-text-soft max-w-2xl mx-auto">
            Raccordez d’abord l’utile : ERP, e-commerce, CRM, solutions métier. Puis industrialisez.
          </p>
          <ul className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 list-none p-0 m-0">
            {FEATURED_CONNECTORS.map((c) => (
              <li key={c.name}>
                <Link
                  to={c.to}
                  className="flex h-20 items-center justify-center rounded-[12px] border border-[#E5E7EB] text-sm font-semibold text-[#1F2937] hover:border-brand-800/30 hover:[box-shadow:var(--shadow-sm)] transition-shadow"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Link
              to="/marketplace"
              className="inline-flex items-center justify-center gap-2 rounded-[12px] border border-[#B8E3F0] bg-surface px-5 py-2.5 text-sm font-semibold text-brand-900"
            >
              Voir les connecteurs
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Témoignages */}
      <section className="py-14 sm:py-20 border-t border-[#E5E7EB] bg-page-bg" aria-labelledby="t-testimonials">
        <div className="max-w-container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 id="t-testimonials" className="font-display text-2xl sm:text-3xl font-semibold text-brand-900 text-center">
            Ils accélèrent, sans s’y perdre
          </h2>
          <p className="mt-2 text-center text-text-soft">Des contextes PME, ETI et groupes, avec le même fil conducteur : la clarté.</p>
          <ul className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 list-none p-0 m-0">
            {TESTIMONIALS.map((t) => (
              <li
                key={t.name}
                className="relative flex flex-col rounded-[12px] border border-[#E5E7EB] bg-surface p-6 [box-shadow:var(--shadow-sm)]"
              >
                <Quote className="w-6 h-6 text-brand-800/25" aria-hidden />
                <p className="mt-3 text-sm sm:text-base text-[#1F2937] leading-relaxed">« {t.quote} »</p>
                <p className="mt-4 text-sm font-semibold text-[#1F2937]">{t.name}</p>
                <p className="text-sm text-text-soft">{t.role}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Tarifs */}
      <section className="py-14 sm:py-20 bg-surface" id="tarifs" aria-labelledby="pricing-heading">
        <div className="max-w-container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 id="pricing-heading" className="font-display text-2xl sm:text-3xl font-semibold text-brand-900 text-center">
            Tarification simple, lisible, pilotable
          </h2>
          <p className="mt-2 text-center text-text-soft">Une offre centrale, souvent retenue pour cadrer un passage à l’échelle proprement.</p>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {PRICING.map((p) => (
              <div
                key={p.name}
                className={clsx(
                  'relative flex flex-col rounded-[12px] border p-6 sm:p-7 [box-shadow:var(--shadow-sm)]',
                  p.highlight ? 'border-brand-800 bg-page-bg' : 'border-[#E5E7EB] bg-surface',
                )}
              >
                {p.highlight && (
                  <p className="absolute -top-2.5 left-3 inline-flex items-center rounded-full border border-[#E5E7EB] bg-surface px-2 py-0.5 text-xs font-semibold text-brand-900 [box-shadow:var(--shadow-sm)]">
                    Le plus choisi
                  </p>
                )}
                <h3 className="text-base font-semibold text-[#1F2937]">{p.name}</h3>
                <p className="mt-1 text-3xl font-display font-semibold text-brand-900">
                  {p.price != null && (
                    <>
                      {p.price} €<span className="text-sm font-sans font-medium text-text-soft"> / mois</span>
                    </>
                  )}
                  {p.price == null && <span className="text-2xl">{p.priceLabel}</span>}
                </p>
                <p className="mt-2 text-sm text-text-soft min-h-12">{p.desc}</p>
                <ul className="mt-4 space-y-2 text-sm text-[#1F2937] flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                {p.name === 'Entreprise' ? (
                  <Link
                    to="/reserver-demo"
                    className="mt-6 inline-flex justify-center items-center rounded-[12px] bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white w-full"
                  >
                    {p.cta}
                  </Link>
                ) : (
                  <Link
                    to="/tarifs"
                    className="mt-6 inline-flex justify-center items-center rounded-[12px] border border-[#E5E7EB] bg-surface px-4 py-2.5 text-sm font-semibold text-brand-900 w-full hover:border-brand-800/30"
                  >
                    {p.cta}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 sm:py-20 border-t border-[#E5E7EB] bg-page-bg" aria-labelledby="faq-heading">
        <div className="max-w-container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 id="faq-heading" className="font-display text-2xl sm:text-3xl font-semibold text-brand-900 text-center">
            Questions fréquentes
          </h2>
          <div className="mt-8 max-w-3xl mx-auto rounded-[12px] border border-[#E5E7EB] bg-surface px-4 sm:px-6 [box-shadow:var(--shadow-sm)]">
            {FAQ.map((f, i) => (
              <FaqItem
                key={f.q}
                id={`faq-${i}`}
                question={f.q}
                answer={f.a}
                open={openFaq === i}
                onToggle={() => setOpenFaq((x) => (x === i ? -1 : i))}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-12 sm:py-16 bg-brand-900" aria-labelledby="final-cta">
        <div className="max-w-container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 id="final-cta" className="font-display text-2xl sm:text-3xl font-semibold text-white">
            Prêt à accélérer vos flux métiers ?
          </h2>
          <p className="mt-2 text-sm sm:text-base text-white/75 max-w-2xl mx-auto">
            Échangez avec nous sur votre contexte, vos canaux, vos délais. Nous cadrerons un plan réaliste et
            pédagogique, sans en faire trop.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/reserver-demo"
              className="inline-flex items-center justify-center rounded-[12px] bg-accent-500 text-brand-900 px-5 py-3 text-sm sm:text-base font-semibold [box-shadow:var(--shadow-sm)] hover:brightness-95"
            >
              Réserver une démo
            </Link>
            <Link
              to="/marketplace"
              className="inline-flex items-center justify-center rounded-[12px] border border-white/25 text-white px-5 py-3 text-sm sm:text-base font-semibold hover:bg-white/5"
            >
              Voir les connecteurs
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
