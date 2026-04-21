import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, CreditCard, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { billingApi, type BillingPlan, type PlanInfo } from '../../api/billing';
import { useAuthStore } from '../../stores/auth.store';
import { Button } from '../../components/ui';

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

export function SubscribePage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [searchParams, setSearchParams] = useSearchParams();
  const [loadingPlan, setLoadingPlan] = useState<BillingPlan | null>(null);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const plansQuery = useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: () => billingApi.getPlans(),
  });

  const billingQuery = useQuery({
    queryKey: ['billing', 'info'],
    queryFn: () => billingApi.getBillingInfo(),
    enabled: !!user,
  });

  useEffect(() => {
    if (searchParams.get('session_id')) {
      toast.success('Paiement traité. Votre abonnement sera mis à jour sous peu.');
      setSearchParams({}, { replace: true });
      void queryClient.invalidateQueries({ queryKey: ['billing', 'info'] });
    }
  }, [searchParams, setSearchParams, queryClient]);

  const checkoutMutation = useMutation({
    mutationFn: (plan: Exclude<BillingPlan, 'FREE'>) => {
      const origin = window.location.origin;
      return billingApi.createCheckoutSession({
        plan,
        successUrl: `${origin}/billing/subscribe`,
        cancelUrl: `${origin}/billing/subscribe`,
      });
    },
    onSuccess: (data) => {
      if (data?.url) {
        window.location.assign(data.url);
        return;
      }
      toast.error('URL de paiement indisponible');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Impossible de démarrer le paiement');
    },
    onSettled: () => setLoadingPlan(null),
  });

  const portalMutation = useMutation({
    mutationFn: () =>
      billingApi.createPortalSession(`${window.location.origin}/billing/subscribe`),
    onSuccess: (data) => {
      if (data?.url) window.location.assign(data.url);
      else toast.error('Portail indisponible');
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur portail Stripe'),
  });

  const currentPlan = billingQuery.data?.plan ?? 'FREE';
  const paidPlans = (plansQuery.data ?? []).filter((p): p is PlanInfo & { plan: Exclude<BillingPlan, 'FREE'> } => p.plan !== 'FREE');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-600 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Ultimate Edicloud
        </p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900">Abonnement Stripe</h1>
        <p className="mt-2 text-slate-600 text-sm sm:text-base max-w-2xl">
          Choisissez un plan payant : vous serez redirigé vers Stripe Checkout pour finaliser l’abonnement en toute
          sécurité.
        </p>
      </div>

      {!isAdmin && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900 mb-6">
          Seuls les administrateurs du compte peuvent souscrire ou gérer l’abonnement. Contactez un administrateur de
          votre organisation.
        </div>
      )}

      {billingQuery.data?.stripeCustomerId && isAdmin && (
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={portalMutation.isPending}
            onClick={() => portalMutation.mutate()}
            className="inline-flex items-center gap-2"
          >
            {portalMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            Portail client Stripe
          </Button>
          <span className="text-xs text-slate-500">Moyen de paiement, factures et résiliation</span>
        </div>
      )}

      {plansQuery.isError && (
        <p className="text-sm text-red-600 mb-4">Impossible de charger les plans. Vérifiez la configuration Stripe côté API.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
        {paidPlans.map((p) => {
          const active = currentPlan === p.plan;
          const hasStripePrice = Boolean(p.priceId);
          return (
            <div
              key={p.plan}
              className={`relative rounded-2xl border p-5 flex flex-col ${
                active
                  ? 'border-primary-400 bg-gradient-to-b from-primary-50/80 to-white shadow-md'
                  : 'border-slate-200 bg-white/95'
              }`}
            >
              {active && (
                <span className="absolute -top-2.5 right-3 text-[10px] font-bold uppercase tracking-wide bg-primary-600 text-white px-2 py-0.5 rounded-full">
                  Plan actuel
                </span>
              )}
              <h2 className="text-lg font-bold text-slate-900">{PLAN_LABEL[p.plan]}</h2>
              <ul className="mt-4 space-y-2 text-xs text-slate-600 flex-1">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Flux : {formatLimit(p.limits.flows)}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Exécutions / mois : {formatLimit(p.limits.executions)}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Connecteurs : {formatLimit(p.limits.connectors)}
                </li>
              </ul>
              <Button
                type="button"
                className="mt-5 w-full inline-flex items-center justify-center gap-2"
                disabled={!isAdmin || !hasStripePrice || checkoutMutation.isPending || active}
                onClick={() => {
                  if (!hasStripePrice) {
                    toast.error('Prix Stripe non configuré pour ce plan');
                    return;
                  }
                  setLoadingPlan(p.plan);
                  checkoutMutation.mutate(p.plan);
                }}
              >
                {loadingPlan === p.plan ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4" />
                )}
                {active ? 'Déjà actif' : 'Payer avec Stripe'}
              </Button>
              {!hasStripePrice && (
                <p className="mt-2 text-[11px] text-amber-700">Configurer STRIPE_PRICE_* sur l’API.</p>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-center text-sm text-slate-500">
        <Link to="/tarifs#estimateur-devis" className="text-primary-600 font-medium hover:underline">
          Voir les tarifs et le simulateur de devis
        </Link>
        {' · '}
        <Link to="/billing" className="text-primary-600 font-medium hover:underline">
          Facturation
        </Link>
      </p>
    </div>
  );
}
