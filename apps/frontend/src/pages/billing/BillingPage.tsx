import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../../components/ui';
import { CreditCard, FileText, BarChart3, ArrowRight, ExternalLink, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { billingApi } from '../../api/billing';
import { toast } from 'sonner';

export function BillingPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const billingQuery = useQuery({
    queryKey: ['billing', 'info'],
    queryFn: () => billingApi.getBillingInfo(),
  });

  const openPortal = async () => {
    try {
      const { url } = await billingApi.createPortalSession(`${window.location.origin}/billing`);
      if (url) window.location.assign(url);
      else toast.error('Portail indisponible');
    } catch (e) {
      toast.error((e as Error).message || 'Impossible d’ouvrir le portail Stripe');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-sky-600 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Ultimate Edicloud
          </p>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">Facturation</h1>
          {billingQuery.data && (
            <p className="text-sm text-slate-500 mt-1">
              Plan actuel : <strong className="text-slate-700">{billingQuery.data.plan}</strong>
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/billing/invoices">
          <Card className="h-full border-2 border-slate-200 hover:border-primary-200 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <FileText className="w-5 h-5" />
                Mes factures
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 mb-4">Consultez et téléchargez vos factures.</p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-primary-600">
                Voir mes factures <ArrowRight className="w-4 h-4" />
              </span>
            </CardContent>
          </Card>
        </Link>
        <Link to="/billing/quota">
          <Card className="h-full border-2 border-slate-200 hover:border-primary-200 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <BarChart3 className="w-5 h-5" />
                Mon quota et volumes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 mb-4">Suivez votre consommation et vos limites.</p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-primary-600">
                Voir mon quota <ArrowRight className="w-4 h-4" />
              </span>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card className="mt-6 border-2 border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <CreditCard className="w-5 h-5" />
            Abonnement & moyen de paiement (Stripe)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Souscrivez ou changez de plan via Stripe Checkout. Moyen de paiement, factures récurrentes et résiliation :
            portail client Stripe.
          </p>
          <div className="flex flex-wrap gap-3">
            {isAdmin && (
              <Link
                to="/billing/subscribe"
                className="btn-primary inline-flex items-center gap-2 text-sm no-underline"
              >
                Abonnement & Checkout
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            {isAdmin && billingQuery.data?.stripeCustomerId && (
              <Button type="button" variant="outline" onClick={() => void openPortal()} className="inline-flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Portail client Stripe
              </Button>
            )}
          </div>
          {!isAdmin && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Réservé aux administrateurs du compte.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
