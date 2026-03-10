import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '../../components/ui';
import { groupsApi } from '../../api/groups.api';
import type { Group, CreateGroupDto } from '../../api/groups.api';
import { Users, Loader2, Plus, Shield, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function GroupsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const { data: groups = [], isLoading, error } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsApi.getList(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateGroupDto) => groupsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setShowCreate(false);
      setNewName('');
      setNewDescription('');
      toast.success('Groupe créé');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la création');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => groupsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Groupe supprimé');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la suppression');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createMutation.mutate({
      name: newName.trim(),
      description: newDescription.trim() || undefined,
    });
  };

  useEffect(() => {
    if (error) toast.error('Impossible de charger les groupes');
  }, [error]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-700 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-500" />
            Groupes et permissions
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Liste et gestion des groupes et de leurs permissions
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nouveau groupe
        </Button>
      </div>

      {showCreate && (
        <Card className="mb-6">
          <form onSubmit={handleCreate}>
            <CardHeader>
              <CardTitle className="text-slate-800">Créer un groupe</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4 items-end">
              <Input
                label="Nom"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Opérateurs EDIFACT"
                required
                className="min-w-[200px]"
              />
              <Input
                label="Description (optionnel)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Description du groupe"
                className="min-w-[240px]"
              />
              <Button type="submit" loading={createMutation.isPending} disabled={createMutation.isPending}>
                Créer
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreate(false);
                  setNewName('');
                  setNewDescription('');
                }}
              >
                Annuler
              </Button>
            </CardContent>
          </form>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full p-8 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : groups.length === 0 ? (
          <div className="col-span-full p-8 text-center text-slate-500">
            Aucun groupe. Créez-en un pour gérer les permissions.
          </div>
        ) : (
          groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onDelete={() => deleteMutation.mutate(group.id)}
              isDeleting={deleteMutation.isPending}
            />
          ))
        )}
      </div>
    </div>
  );
}

function GroupCard({
  group,
  onDelete,
  isDeleting,
}: {
  group: Group;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Shield className="w-5 h-5 text-primary-500 shrink-0" />
            <CardTitle className="text-slate-800 truncate">{group.name}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-red-600 shrink-0"
            onClick={onDelete}
            disabled={isDeleting}
            title="Supprimer le groupe"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        {group.description && (
          <p className="text-sm text-slate-500 mt-1">{group.description}</p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-slate-500">
          {group.usersCount} utilisateur{group.usersCount !== 1 ? 's' : ''} ·{' '}
          {group.permissions.length} permission{group.permissions.length !== 1 ? 's' : ''}
        </p>
        {group.permissions.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1">
            {group.permissions.slice(0, 5).map((p) => (
              <li
                key={p.id}
                className="inline-flex px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-xs"
              >
                {p.resource}:{p.action}
              </li>
            ))}
            {group.permissions.length > 5 && (
              <li className="text-xs text-slate-400">
                +{group.permissions.length - 5} autres
              </li>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
