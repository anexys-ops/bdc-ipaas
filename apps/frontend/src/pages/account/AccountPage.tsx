import { useAuthStore } from '../../stores/auth.store';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui';
import { User, Mail, Building2 } from 'lucide-react';

export function AccountPage() {
  const { user } = useAuthStore();

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Mon compte</h1>
      <Card className="border-2 border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <User className="w-5 h-5" />
            Informations personnelles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <Mail className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs font-medium text-slate-500">Email</p>
              <p className="font-medium text-slate-800">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <User className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs font-medium text-slate-500">Nom</p>
              <p className="font-medium text-slate-800">{user?.firstName} {user?.lastName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <Building2 className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs font-medium text-slate-500">Rôle</p>
              <p className="font-medium text-slate-800">{user?.role}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
