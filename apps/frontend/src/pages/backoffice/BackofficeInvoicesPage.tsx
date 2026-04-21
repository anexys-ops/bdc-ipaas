import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui';
import { BackofficePageContainer, BackofficePageHeader } from '../../components/layout';
import { FileText } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';

export function BackofficeInvoicesPage() {
  const user = useAuthStore((s) => s.user);

  if (user?.role !== 'SUPER_ADMIN') {
    return null;
  }

  return (
    <BackofficePageContainer>
      <BackofficePageHeader title="Factures clients" />
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
    </BackofficePageContainer>
  );
}
