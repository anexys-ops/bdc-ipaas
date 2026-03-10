import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui';
import { BarChart3 } from 'lucide-react';

export function QuotaPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Mon quota et volumes</h1>
      <Card className="border-2 border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <BarChart3 className="w-5 h-5" />
            Consommation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">Vos quotas et volumes d’utilisation seront affichés ici.</p>
        </CardContent>
      </Card>
    </div>
  );
}
