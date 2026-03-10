import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { Button, Card, CardHeader, CardTitle, CardContent, Input } from '../../components/ui';
import { ShieldCheck } from 'lucide-react';
import { auditApi } from '../../api/audit';
import type { AuditLogEntry } from '../../types';
import { toast } from 'sonner';

const PAGE_SIZE = 20;

export function AuditPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [resource, setResource] = useState('');
  const [offset, setOffset] = useState(0);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const res = await auditApi.getLogs({
          action: action || undefined,
          resource: resource || undefined,
          limit: PAGE_SIZE,
          offset,
        });
        setLogs(res.logs);
        setTotal(res.total);
      } catch (e) {
        toast.error('Impossible de charger les logs d\'audit');
        setLogs([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAdmin, navigate, action, resource, offset]);

  if (!isAdmin) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-700 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-amber-400" />
          Logs d&apos;audit
        </h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Historique des actions sur le tenant
        </p>
      </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-800">Filtres</CardTitle>
            <div className="flex flex-wrap gap-3 mt-2">
              <Input
                placeholder="Action (ex: LOGIN, CREATE)"
                value={action}
                onChange={(e) => {
                  setAction(e.target.value);
                  setOffset(0);
                }}
                className="max-w-[180px]"
              />
              <Input
                placeholder="Ressource (ex: auth, flow)"
                value={resource}
                onChange={(e) => {
                  setResource(e.target.value);
                  setOffset(0);
                }}
                className="max-w-[180px]"
              />
            </div>
          </CardHeader>
        </Card>

        <Card className="mt-6 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-slate-800">
              {total} événement{total !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-slate-500">Chargement…</div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-slate-500">Aucun log d&apos;audit.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      <th className="text-left p-3 font-medium text-slate-700">Date</th>
                      <th className="text-left p-3 font-medium text-slate-700">Action</th>
                      <th className="text-left p-3 font-medium text-slate-700">Ressource</th>
                      <th className="text-left p-3 font-medium text-slate-700">ID ressource</th>
                      <th className="text-left p-3 font-medium text-slate-700">Utilisateur</th>
                      <th className="text-left p-3 font-medium text-slate-700">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="p-3 text-slate-600 whitespace-nowrap">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="p-3">
                          <span className="font-medium text-slate-800">{log.action}</span>
                        </td>
                        <td className="p-3 text-slate-600">{log.resource}</td>
                        <td className="p-3 text-slate-500 font-mono text-xs">
                          {log.resourceId || '—'}
                        </td>
                        <td className="p-3 text-slate-600">{log.userId ?? '—'}</td>
                        <td className="p-3 text-slate-500 text-xs">{log.ipAddress ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {total > PAGE_SIZE && (
              <div className="flex items-center justify-between p-3 border-t border-slate-200 bg-slate-50/50">
                <span className="text-slate-600 text-sm">
                  {offset + 1} – {Math.min(offset + PAGE_SIZE, total)} sur {total}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={offset === 0}
                    onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                  >
                    Précédent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={offset + PAGE_SIZE >= total}
                    onClick={() => setOffset((o) => o + PAGE_SIZE)}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
