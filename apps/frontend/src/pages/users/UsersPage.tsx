import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '../../components/ui';
import { usersApi } from '../../api/users.api';
import type {
  TenantUser,
  TenantUserRole,
  UpdateTenantUserDto,
  CreateTenantUserDto,
} from '../../api/users.api';
import { useAuthStore } from '../../stores/auth.store';
import { Users, Loader2, CheckCircle, XCircle, Plus, Pencil } from 'lucide-react';
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

function AddUserForm({
  onSubmit,
  onCancel,
  isSubmitting,
  error,
}: {
  onSubmit: (data: CreateTenantUserDto) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  error?: string;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<TenantUserRole>('VIEWER');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ email, password, firstName, lastName, role });
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border border-slate-200 rounded-lg space-y-3 mb-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Mot de passe"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <Input
          label="Prénom"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
        />
        <Input
          label="Nom"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
        />
        <div className="space-y-1 sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700">Rôle</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as TenantUserRole)}
            className="w-full max-w-xs px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
          Créer
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

function EditUserRow({
  user,
  onSave,
  onCancel,
  isSubmitting,
}: {
  user: TenantUser;
  onSave: (data: UpdateTenantUserDto) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [role, setRole] = useState<TenantUserRole>(user.role);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ firstName, lastName, role });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 p-2 bg-slate-50/80 rounded-lg">
      <Input
        label="Prénom"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        className="min-w-[140px]"
      />
      <Input
        label="Nom"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        className="min-w-[140px]"
      />
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700">Rôle</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as TenantUserRole)}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={isSubmitting} disabled={isSubmitting}>
          Enregistrer
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isSubmitting}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

export function UsersPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRoleFor, setEditingRoleFor] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['tenant-users'],
    queryFn: () => usersApi.getList(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTenantUserDto) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users'] });
      setShowCreate(false);
      toast.success('Utilisateur créé');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur à la création');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTenantUserDto }) => usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-users'] });
      setEditingRoleFor(null);
      setEditingUserId(null);
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
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-700 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-500" />
            Utilisateurs
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Création, rôles, activation / désactivation des comptes du tenant
          </p>
        </div>
        <Button onClick={() => setShowCreate((v) => !v)} className="flex items-center gap-2" variant="default">
          <Plus className="w-4 h-4" />
          {showCreate ? 'Fermer' : 'Nouvel utilisateur'}
        </Button>
      </div>

      {showCreate && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-slate-800">Créer un utilisateur</CardTitle>
          </CardHeader>
          <CardContent>
            <AddUserForm
              onSubmit={(data) => createMutation.mutate(data)}
              onCancel={() => setShowCreate(false)}
              isSubmitting={createMutation.isPending}
              error={createMutation.error ? (createMutation.error as Error).message : undefined}
            />
          </CardContent>
        </Card>
      )}

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
                    <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50/50 align-top">
                      <td className="p-3" colSpan={editingUserId === user.id ? 6 : 1}>
                        {editingUserId === user.id ? (
                          <EditUserRow
                            user={user}
                            onSave={(data) => updateMutation.mutate({ id: user.id, data })}
                            onCancel={() => setEditingUserId(null)}
                            isSubmitting={updateMutation.isPending}
                          />
                        ) : (
                          <span className="font-medium text-slate-800">
                            {user.firstName} {user.lastName}
                          </span>
                        )}
                      </td>
                      {editingUserId === user.id ? null : (
                        <>
                          <td className="p-3 text-slate-600">{user.email}</td>
                          <td className="p-3">
                            {editingRoleFor === user.id ? (
                              <select
                                value={user.role}
                                onChange={(e) => handleRoleChange(user.id, e.target.value as TenantUserRole)}
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
                            <div className="flex flex-wrap gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingUserId(user.id);
                                  setEditingRoleFor(null);
                                }}
                                disabled={updateMutation.isPending}
                                title="Modifier prénom, nom, rôle"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleActive(user)}
                                disabled={updateMutation.isPending || currentUser?.id === user.id}
                                title={
                                  currentUser?.id === user.id
                                    ? 'Vous ne pouvez pas désactiver votre propre compte ici'
                                    : undefined
                                }
                              >
                                {user.isActive ? 'Désactiver' : 'Activer'}
                              </Button>
                            </div>
                          </td>
                        </>
                      )}
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
