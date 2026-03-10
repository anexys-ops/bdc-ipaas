import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../../components/ui';
import { usersApi } from '../../api/users.api';
import type { TenantUser, TenantUserRole, UpdateTenantUserDto } from '../../api/users.api';
import { Users, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const ROLES: { value: TenantUserRole; label: string }[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'OPERATOR', label: 'Opérateur' },
  { value: 'VIEWER', label: 'Lecteur' },
];

function formatLastLogin(iso: string | null | undefined): string {
  if (!iso) return 'Jamais';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function UsersPage() {
  const queryClient = useQueryClient();
  const [editingRoleFor, setEditingRoleFor] = useState<string | null>(null);

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['tenant-users'],
    queryFn: () => usersApi.getList(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTenantUserDto }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users'] });
      setEditingRoleFor(null);
      toast.success('Utilisateur mis à jour');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la mise à jour');
    },
  });

  const handleToggleActive = (user: TenantUser) => {
    updateMutation.mutate({
      id: user.id,
      data: { isActive: !user.isActive },
    });
  };

  const handleRoleChange = (userId: string, role: TenantUserRole) => {
    updateMutation.mutate({
      id: userId,
      data: { role },
    });
  };

  useEffect(() => {
    if (error) toast.error('Impossible de charger les utilisateurs');
  }, [error]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-700 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary-500" />
          Utilisateurs
        </h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Liste des utilisateurs du tenant — activer/désactiver, modifier le rôle
        </p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-slate-800">
            {users.length} utilisateur{users.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Aucun utilisateur.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="text-left p-3 font-medium text-slate-700">Utilisateur</th>
                    <th className="text-left p-3 font-medium text-slate-700">Email</th>
                    <th className="text-left p-3 font-medium text-slate-700">Rôle</th>
                    <th className="text-left p-3 font-medium text-slate-700">Statut</th>
                    <th className="text-left p-3 font-medium text-slate-700">Dernière connexion</th>
                    <th className="text-left p-3 font-medium text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="p-3">
                        <span className="font-medium text-slate-800">
                          {user.firstName} {user.lastName}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">{user.email}</td>
                      <td className="p-3">
                        {editingRoleFor === user.id ? (
                          <select
                            value={user.role}
                            onChange={(e) =>
                              handleRoleChange(user.id, e.target.value as TenantUserRole)
                            }
                            onBlur={() => setEditingRoleFor(null)}
                            autoFocus
                            className="px-2 py-1 rounded-lg border border-slate-200 text-sm"
                          >
                            {ROLES.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingRoleFor(user.id)}
                            className="text-left font-medium text-slate-700 hover:text-primary-600 underline decoration-dotted"
                          >
                            {ROLES.find((r) => r.value === user.role)?.label ?? user.role}
                          </button>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ${
                            user.isActive
                              ? 'bg-emerald-500/20 text-emerald-600'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {user.isActive ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              Actif
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              Désactivé
                            </>
                          )}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 text-xs">
                        {formatLastLogin(user.lastLoginAt)}
                      </td>
                      <td className="p-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(user)}
                          disabled={updateMutation.isPending}
                        >
                          {user.isActive ? 'Désactiver' : 'Activer'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
