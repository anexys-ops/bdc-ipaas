import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '../../components/ui';
import { Cable, Copy, RefreshCw, CheckCircle2, XCircle, HelpCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { tenantsApi } from '../../api/tenants';
import { flowsApi } from '../../api/flows';
import type { Flow } from '../../types';

function buildCurlExample(webhookUrl: string, token: string): string {
  return `curl -X POST ${webhookUrl} \\
  -H "Content-Type: application/json" \\
  -H "X-Gate-Token: ${token}" \\
  -H "X-Route: default" \\
  -d '{"data":{"message":"test"}}'`;
}

export function GatewayPage() {
  const queryClient = useQueryClient();

  const { data: me, isLoading: loadingMe, error: errMe } = useQuery({
    queryKey: ['tenants', 'me', 'gateway'],
    queryFn: () => tenantsApi.getMeGateway(),
  });

  const { data: redisStatus } = useQuery({
    queryKey: ['tenants', 'me', 'gateway-redis'],
    queryFn: () => tenantsApi.getGatewayRedisStatus(),
    enabled: !!me,
  });

  const { data: flows } = useQuery({
    queryKey: ['flows'],
    queryFn: () => flowsApi.getAll(),
  });

  const webhookFlows = (flows ?? []).filter((f: Flow) => f.triggerType === 'WEBHOOK');

  const { data: executions, isLoading: loadingExec } = useQuery({
    queryKey: ['tenants', 'me', 'webhook-executions'],
    queryFn: () => tenantsApi.listWebhookExecutions(20),
  });

  const regenerate = useMutation({
    mutationFn: () => tenantsApi.regenerateGateToken(),
    onSuccess: (data) => {
      queryClient.setQueryData(['tenants', 'me', 'gateway'], data);
      queryClient.invalidateQueries({ queryKey: ['tenants', 'me', 'gateway-redis'] });
      queryClient.invalidateQueries({ queryKey: ['flows'] });
      toast.success('Nouveau jeton gate généré. Pensez à mettre à jour vos appels côté gate.');
    },
    onError: () => toast.error('Impossible de régénérer le jeton.'),
  });

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copié`);
    } catch {
      toast.error('Copie impossible');
    }
  };

  if (loadingMe) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (errMe || !me) {
    return (
      <div className="flex-1 max-w-3xl mx-auto px-4 py-12">
        <p className="text-red-600">Impossible de charger la porte d’entrée gateway.</p>
      </div>
    );
  }

  const curl = buildCurlExample(me.webhookUrl, me.gateToken);

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Cable className="w-7 h-7 text-primary-500" />
            Porte d’entrée (webhook gateway)
          </h1>
          <p className="text-slate-600 mt-1">
            URL publique Benthos, jeton <code className="text-xs bg-slate-100 px-1 rounded">X-Gate-Token</code>, flux
            WEBHOOK actifs et dernières exécutions.
          </p>
        </div>

        <Card className="mb-6 border border-slate-200/90">
          <CardHeader>
            <CardTitle className="text-base">Votre URL d’entrée</CardTitle>
            <CardDescription>Point de terminaison exposé sur le gate (Benthos).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Webhook</p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="text-sm bg-slate-50 border rounded px-2 py-1 break-all">{me.webhookUrl}</code>
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => copy(me.webhookUrl, 'URL')}>
                  <Copy className="w-3.5 h-3.5" />
                  Copier
                </Button>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Jeton gate</p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="text-sm bg-slate-50 border rounded px-2 py-1 break-all">{me.gateToken}</code>
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => copy(me.gateToken, 'Jeton')}>
                  <Copy className="w-3.5 h-3.5" />
                  Copier
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-1"
                  disabled={regenerate.isPending}
                  onClick={() => regenerate.mutate()}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${regenerate.isPending ? 'animate-spin' : ''}`} />
                  Régénérer
                </Button>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Ingestion API (côté gate)</p>
              <code className="text-xs text-slate-600 break-all">{me.ingestPublicUrl}</code>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Exemple cURL</p>
              <pre className="text-xs bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{curl}</pre>
              <Button type="button" variant="outline" size="sm" className="mt-2 gap-1" onClick={() => copy(curl, 'cURL')}>
                <Copy className="w-3.5 h-3.5" />
                Copier la commande
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 border border-slate-200/90">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Flux WEBHOOK
              <HelpCircle className="w-4 h-4 text-slate-400" aria-hidden />
            </CardTitle>
            <CardDescription>Activation et route (<code className="text-xs">webhookRoute</code>, défaut : default).</CardDescription>
          </CardHeader>
          <CardContent>
            {redisStatus && (
              <div className="flex items-center gap-2 mb-4 text-sm">
                <span className="text-slate-600">Redis gate :</span>
                {!redisStatus.gateRedisReachable ? (
                  <span className="inline-flex items-center gap-1 text-amber-700">
                    <XCircle className="w-4 h-4" /> injoignable ou non configuré
                  </span>
                ) : redisStatus.routeEnabled ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" /> route active (enabled)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-slate-600">
                    <XCircle className="w-4 h-4" /> route inactive (aucun flux WEBHOOK actif)
                  </span>
                )}
              </div>
            )}
            {webhookFlows.length === 0 ? (
              <p className="text-sm text-slate-600">Aucun flux en déclenchement WEBHOOK. Créez-en un depuis Planifier.</p>
            ) : (
              <ul className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
                {webhookFlows.map((f) => (
                  <li key={f.id} className="px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-medium text-slate-800">{f.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        f.isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {f.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border border-slate-200/90">
          <CardHeader>
            <CardTitle className="text-base">Historique récent (webhook)</CardTitle>
            <CardDescription>20 dernières exécutions dont la source commence par WEBHOOK.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingExec ? (
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
            ) : !executions?.length ? (
              <p className="text-sm text-slate-600">Aucune exécution webhook enregistrée.</p>
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Flux</th>
                      <th className="px-3 py-2">Statut</th>
                      <th className="px-3 py-2">In / Out</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {executions.map((e) => (
                      <tr key={e.executionId}>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-700">
                          {new Date(e.startedAt).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{e.flowId.slice(0, 8)}…</td>
                        <td className="px-3 py-2">{e.status}</td>
                        <td className="px-3 py-2">
                          {e.recordsIn} / {e.recordsOut}
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
    </div>
  );
}
