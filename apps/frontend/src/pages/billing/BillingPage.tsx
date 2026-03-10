import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui';
import { CreditCard, FileText, BarChart3, ArrowRight } from 'lucide-react';

export function BillingPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Facturation</h1>
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
            Moyen de paiement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">Gestion du moyen de paiement à venir.</p>
        </CardContent>
      </Card>
    </div>
  );
}
