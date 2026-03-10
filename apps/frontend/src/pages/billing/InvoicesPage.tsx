import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui';
import { FileText } from 'lucide-react';

export function InvoicesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Mes factures</h1>
      <Card className="border-2 border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <FileText className="w-5 h-5" />
            Historique des factures
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">Aucune facture pour le moment. Vos factures apparaîtront ici.</p>
        </CardContent>
      </Card>
    </div>
  );
}
