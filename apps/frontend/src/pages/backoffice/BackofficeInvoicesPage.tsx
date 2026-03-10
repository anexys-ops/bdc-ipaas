import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui';
import { FileText } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';

export function BackofficeInvoicesPage() {
  const user = useAuthStore((s) => s.user);

  if (user?.role !== 'SUPER_ADMIN') {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Factures clients</h1>
      <Card className="border-2 border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <FileText className="w-5 h-5" />
            Facturation clients
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">Vue d’ensemble des factures par client. À connecter avec votre module de facturation.</p>
        </CardContent>
      </Card>
    </div>
  );
}
