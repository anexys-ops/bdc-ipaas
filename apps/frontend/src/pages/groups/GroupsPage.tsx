import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '../../components/ui';
import { groupsApi } from '../../api/groups.api';
import type { Group, CreateGroupDto, UpdateGroupDto } from '../../api/groups.api';
import { Users, Loader2, Plus, Shield, Trash2, Pencil, X } from 'lucide-react';
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

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGroupDto }) => groupsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Groupe mis à jour');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la mise à jour');
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
              onUpdate={(data) => updateMutation.mutateAsync({ id: group.id, data })}
              isUpdating={updateMutation.isPending}
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
  onUpdate,
  isUpdating,
  onDelete,
  isDeleting,
}: {
  group: Group;
  onUpdate: (data: UpdateGroupDto) => Promise<unknown>;
  isUpdating: boolean;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? '');

  if (editing) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-slate-800 text-sm">Modifier le groupe</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={() => {
                setEditing(false);
                setName(group.name);
                setDescription(group.description ?? '');
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            label="Nom"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Description (optionnel)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              loading={isUpdating}
              disabled={isUpdating || !name.trim()}
              onClick={async () => {
                try {
                  await onUpdate({
                    name: name.trim(),
                    description: description.trim() || undefined,
                  });
                  setEditing(false);
                } catch {
                  /* toast géré par la mutation / client API */
                }
              }}
            >
              Enregistrer
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEditing(false);
                setName(group.name);
                setDescription(group.description ?? '');
              }}
            >
              Annuler
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Shield className="w-5 h-5 text-primary-500 shrink-0" />
            <CardTitle className="text-slate-800 truncate">{group.name}</CardTitle>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-primary-600"
              onClick={() => {
                setName(group.name);
                setDescription(group.description ?? '');
                setEditing(true);
              }}
              disabled={isUpdating || isDeleting}
              title="Modifier"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-red-600"
              onClick={onDelete}
              disabled={isDeleting}
              title="Supprimer le groupe"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
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
