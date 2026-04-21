import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Check, Sparkles, Building2 } from 'lucide-react';
import { billingApi, type BillingPlan } from '../../api/billing';

const PLAN_LABEL: Record<BillingPlan, string> = {
  FREE: 'Gratuit',
  STARTER: 'Starter',
  PRO: 'Pro',
  ENTERPRISE: 'Enterprise',
};

function formatLimit(n: number): string {
  if (n === -1) return 'Illimité';
  return n.toLocaleString('fr-FR');
}

export function TarifsPage() {
  const plansQuery = useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: () => billingApi.getPlans(),
  });

  const plans = plansQuery.data ?? [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div className="text-center mb-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-600 flex items-center justify-center gap-1.5">
          <Sparkles className="w-4 h-4" />
          Ultimate Edicloud · Tarifs
        </p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          Des plans clairs pour le connecteur iPaaS
        </h1>
        <p className="mt-4 text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Choisissez l’offre adaptée à vos volumes. L’abonnement payant se règle en ligne via{' '}
          <strong>Stripe Checkout</strong> depuis votre espace (rôle administrateur).
        </p>
      </div>

      {plansQuery.isError && (
        <p className="text-center text-sm text-red-600 mb-6">Impossible de charger les plans pour le moment.</p>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => {
          const highlight = p.plan === 'PRO';
          return (
            <div
              key={p.plan}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                highlight
                  ? 'border-sky-400 bg-gradient-to-b from-sky-50 to-white shadow-lg shadow-sky-500/10 scale-[1.02] z-[1]'
                  : 'border-slate-200 bg-white/95'
              }`}
            >
              {highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wide bg-sky-600 text-white px-3 py-1 rounded-full">
                  Populaire
                </span>
              )}
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Building2 className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Edicloud</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">{PLAN_LABEL[p.plan]}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {p.plan === 'FREE' && 'Découverte et tests'}
                {p.plan === 'STARTER' && 'PME, premiers flux'}
                {p.plan === 'PRO' && 'Production, équipes IT'}
                {p.plan === 'ENTERPRISE' && 'Grand compte, exigences fortes'}
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-slate-600 flex-1">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  Flux : {formatLimit(p.limits.flows)}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  Exécutions / mois : {formatLimit(p.limits.executions)}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  Connecteurs : {formatLimit(p.limits.connectors)}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  Stockage : {formatLimit(p.limits.storage)} Mo
                </li>
              </ul>
              <div className="mt-8 pt-4 border-t border-slate-100">
                {p.plan === 'FREE' ? (
                  <Link
                    to="/signup-trial"
                    className="btn-primary w-full inline-flex items-center justify-center gap-2 text-sm no-underline"
                  >
                    Commencer gratuitement
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    className={`w-full inline-flex items-center justify-center gap-2 text-sm font-medium rounded-xl px-4 py-2.5 no-underline transition-colors ${
                      highlight
                        ? 'bg-sky-600 text-white hover:bg-sky-500 shadow-sm'
                        : 'border-2 border-slate-200 text-slate-800 hover:border-sky-300 hover:bg-sky-50/50'
                    }`}
                  >
                    S’abonner (Stripe)
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
                {p.plan !== 'FREE' && !p.priceId && (
                  <p className="mt-2 text-[11px] text-amber-700 text-center">Prix Stripe à configurer côté serveur.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-14 rounded-2xl border border-slate-200 bg-slate-50/80 p-6 sm:p-8">
        <h3 className="text-lg font-semibold text-slate-900">Devis & sur mesure</h3>
        <p className="mt-2 text-sm text-slate-600 max-w-3xl">
          Enterprise, volumes spécifiques ou connecteurs dédiés : nous établissons un devis après audit. L’offre
          Ultimate reste alignée sur votre contexte métier.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/reserver-demo" className="btn-primary inline-flex items-center gap-2 text-sm no-underline">
            Demander un devis
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/avis" className="btn-outline inline-flex items-center gap-2 text-sm no-underline">
            Voir les avis
          </Link>
        </div>
      </div>

      <p className="mt-8 text-center text-sm text-slate-500">
        Une fois connecté en <strong>administrateur</strong>, ouvrez <strong>Facturation → Abonnement Stripe</strong>{' '}
        pour payer via Checkout ou gérer le mandat dans le portail client.
      </p>
    </div>
  );
}
