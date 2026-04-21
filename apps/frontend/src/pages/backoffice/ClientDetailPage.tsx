import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui';
import { BackButton } from '../../components/layout';
import { Button, Input } from '../../components/ui';
import { tenantsApi } from '../../api/tenants';
import type { CreateTenantUserDto, UpdateTenantUserDto, TenantUserRole } from '../../api/tenants';
import {
  Building2,
  Loader2,
  Users,
  Package,
  Zap,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Calendar,
  LogIn,
  Activity,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatLastLogin(iso: string | null | undefined): string {
  if (!iso) return 'Jamais';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const ROLES: { value: TenantUserRole; label: string }[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'OPERATOR', label: 'Opérateur' },
  { value: 'VIEWER', label: 'Lecteur' },
];

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
    <form onSubmit={handleSubmit} className="p-4 rounded-lg bg-white border border-slate-200 space-y-3 mb-4">
      <div className="grid grid-cols-2 gap-3">
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
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">Rôle</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as TenantUserRole)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200/80 bg-white focus:ring-2 focus:ring-primary-400/50"
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
  user: { id: string; email: string; firstName: string; lastName: string; role: string; isActive: boolean };
  onSave: (data: UpdateTenantUserDto) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [role, setRole] = useState<TenantUserRole>(user.role as TenantUserRole);
  const [isActive, setIsActive] = useState(user.isActive);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ firstName, lastName, role, isActive });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Input
          label="Prénom"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <Input
          label="Nom"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">Rôle</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as TenantUserRole)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200/80 bg-white focus:ring-2 focus:ring-primary-400/50"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2 pb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span className="text-sm text-slate-700">Actif</span>
          </label>
        </div>
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

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const { data: tenant, isLoading, error } = useQuery({
    queryKey: ['tenant', id],
    queryFn: () => tenantsApi.getOne(id!),
    enabled: !!id && user?.role === 'SUPER_ADMIN',
  });

  const { data: stats } = useQuery({
    queryKey: ['tenant', id, 'stats'],
    queryFn: () => tenantsApi.getStats(id!),
    enabled: !!id && !!tenant,
  });

  const { data: connectors } = useQuery({
    queryKey: ['tenant', id, 'connectors'],
    queryFn: () => tenantsApi.getConnectors(id!),
    enabled: !!id && !!tenant,
  });

  const { data: users } = useQuery({
    queryKey: ['tenant', id, 'users'],
    queryFn: () => tenantsApi.getUsers(id!),
    enabled: !!id && !!tenant,
  });

  const createUserMutation = useMutation({
    mutationFn: (data: CreateTenantUserDto) => tenantsApi.createUser(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', id, 'users'] });
      queryClient.invalidateQueries({ queryKey: ['tenant', id, 'stats'] });
      setShowAddUser(false);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateTenantUserDto }) =>
      tenantsApi.updateUser(id!, userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', id, 'users'] });
      setEditingUserId(null);
    },
  });

  const deleteConnectorMutation = useMutation({
    mutationFn: (connectorId: string) => tenantsApi.deleteConnector(id!, connectorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', id, 'connectors'] });
      queryClient.invalidateQueries({ queryKey: ['tenant', id, 'stats'] });
    },
  });

  if (user?.role !== 'SUPER_ADMIN') return null;

  if (isLoading || !tenant) {
    return (
      <div className="flex-1 min-h-0 w-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 min-h-0 w-full flex items-center justify-center p-4">
        <Card className="max-w-md text-center py-10">
          <p className="text-sm text-red-500">Client introuvable.</p>
          <div className="mt-4">
            <BackButton to="/backoffice/clients">Retour aux clients</BackButton>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 w-full">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton to="/backoffice/clients" className="mb-6">
          Retour aux clients
        </BackButton>

        <Card className="mb-6">
          <CardHeader className="flex flex-row items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <CardTitle className="text-xl">{tenant.name}</CardTitle>
                <p className="text-sm text-slate-500">{tenant.slug}</p>
                <p className="text-xs text-slate-400 mt-1">
                  Plan {tenant.plan} ·{' '}
                  <span
                    className={
                      tenant.isActive ? 'text-emerald-600' : 'text-amber-600'
                    }
                  >
                    {tenant.isActive ? 'Actif' : 'Inactif'}
                    </span>
                </p>
              </div>
            </div>
          </CardHeader>
          {stats != null && (
            <CardContent className="flex flex-wrap gap-6 pt-0">
              <div className="flex items-center gap-2 text-slate-600">
                <Users className="w-5 h-5" />
                <span className="font-medium">{stats.usersCount}</span>
                <span className="text-sm">utilisateur(s)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Package className="w-5 h-5" />
                <span className="font-medium">{stats.connectorsCount}</span>
                <span className="text-sm">connecteur(s)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Zap className="w-5 h-5" />
                <span className="font-medium">{stats.flowsCount}</span>
                <span className="text-sm">flux</span>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Visu par client : création, dernière co, flux, exécutions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Calendar className="w-4 h-4" />
                Création compte
              </div>
              <p className="font-semibold text-slate-900 mt-1">
                {tenant.createdAt ? formatDate(tenant.createdAt) : '—'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <LogIn className="w-4 h-4" />
                Dernière connexion
              </div>
              <p className="font-semibold text-slate-900 mt-1">
                {stats?.lastLoginAt != null ? formatLastLogin(stats.lastLoginAt) : 'Jamais'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Zap className="w-4 h-4" />
                Flux
              </div>
              <p className="font-semibold text-slate-900 mt-1">{stats?.flowsCount ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Activity className="w-4 h-4" />
                Exécutions
              </div>
              <p className="font-semibold text-slate-900 mt-1">{stats?.executionsCount ?? 0}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Connecteurs ({connectors?.length ?? 0})
            </CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              Chaque client peut avoir plusieurs connecteurs (Sellsy, EBP, etc.).
            </p>
          </CardHeader>
          <CardContent>
            {!connectors?.length ? (
              <p className="text-slate-500 text-sm">Aucun connecteur configuré.</p>
            ) : (
              <ul className="space-y-2">
                {connectors.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <div>
                      <p className="font-medium text-slate-800">{c.name}</p>
                      <p className="text-xs text-slate-500">
                        {c.type}
                        {c.lastTestedAt != null && (
                          <span className="ml-2 text-slate-400">
                            · Testé {formatLastLogin(c.lastTestedAt)}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {c.lastTestedAt != null &&
                        (c.lastTestOk ? (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Test OK
                          </span>
                        ) : (
                          <span className="text-amber-600 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Échec
                          </span>
                        ))}
                      <span className={c.isActive ? 'text-emerald-600' : 'text-slate-400'}>
                        {c.isActive ? 'Actif' : 'Inactif'}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        disabled={deleteConnectorMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`Supprimer le connecteur "${c.name}" ?`)) {
                            deleteConnectorMutation.mutate(c.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Utilisateurs ({users?.length ?? 0})
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddUser((v) => !v)}
            >
              <Plus className="w-4 h-4 mr-2" />
              {showAddUser ? 'Annuler' : 'Ajouter un utilisateur'}
            </Button>
          </CardHeader>
          <CardContent>
            {showAddUser && (
              <AddUserForm
                onSubmit={(data) => createUserMutation.mutate(data)}
                onCancel={() => setShowAddUser(false)}
                isSubmitting={createUserMutation.isPending}
                error={createUserMutation.error ? (createUserMutation.error as Error).message : undefined}
              />
            )}
            {!users?.length && !showAddUser ? (
              <p className="text-slate-500 text-sm">Aucun utilisateur.</p>
            ) : (
              <ul className="space-y-2">
                {users?.map((u) => (
                  <li
                    key={u.id}
                    className="py-2 px-3 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    {editingUserId === u.id ? (
                      <EditUserRow
                        user={u}
                        onSave={(data) => {
                          updateUserMutation.mutate({ userId: u.id, data });
                        }}
                        onCancel={() => setEditingUserId(null)}
                        isSubmitting={updateUserMutation.isPending}
                      />
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-800">
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="text-sm text-slate-500">{u.email}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Dernière connexion : {formatLastLogin(u.lastLoginAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {u.role}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingUserId(u.id)}
                          >
                            Modifier
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
