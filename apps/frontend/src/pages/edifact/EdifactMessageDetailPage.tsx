import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Button, Card, CardContent, CardHeader, CardTitle } from '../../components/ui';
import { BackButton } from '../../components/layout';
import { edifactApi } from '../../api/edifact.api';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  FileText,
  Loader2,
  Receipt,
} from 'lucide-react';
import { toast } from 'sonner';

function formatDate(dateStr: string | undefined | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  });
}

export function EdifactMessageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: msg, isLoading, error } = useQuery({
    queryKey: ['edifact-message', id],
    queryFn: () => edifactApi.getMessage(id!),
    enabled: Boolean(id),
  });

  const billingMutation = useMutation({
    mutationFn: (billed: boolean) => edifactApi.setBilling(id!, { billed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edifact-message', id] });
      queryClient.invalidateQueries({ queryKey: ['edifact-messages'] });
      toast.success('Statut facturation mis à jour');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!id) {
    return <div className="p-8 text-slate-600">Message inconnu.</div>;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error || !msg) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <BackButton to="/edifact" />
        <p className="mt-4 text-red-600">Impossible de charger le message.</p>
      </div>
    );
  }

  const e = msg.enrichment;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-wrap items-start gap-4 justify-between">
        <div className="flex items-start gap-4">
          <BackButton to="/edifact" />
          <div>
            <h1 className="text-xl font-bold text-slate-700 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-500" />
              Message EDIFACT
            </h1>
            <p className="text-sm text-slate-500 font-mono mt-1">{msg.id}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {msg.direction === 'INBOUND' ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 text-sm">
              <ArrowDownLeft className="w-4 h-4" />
              Entrant
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-primary-600 text-sm">
              <ArrowUpRight className="w-4 h-4" />
              Sortant
            </span>
          )}
          <span className="text-slate-400">|</span>
          <span className="text-sm font-medium text-slate-800">{msg.type}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-slate-800 text-base">Résumé</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-slate-500">BGM (code document)</div>
                <div className="font-medium text-slate-800">
                  {e?.bgm.documentNameCode ?? msg.bgmCode ?? '—'}{' '}
                  {e?.bgm.documentNameLabel ? (
                    <span className="text-slate-600 font-normal">— {e.bgm.documentNameLabel}</span>
                  ) : null}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Réf. document</div>
                <div className="font-mono text-slate-800">{msg.reference ?? e?.bgm.messageNumber ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Date document</div>
                <div>{formatDate(msg.documentDate ?? e?.documentDate)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Montant</div>
                <div>
                  {msg.totalAmount != null || e?.totalAmount != null
                    ? `${(msg.totalAmount ?? e?.totalAmount ?? 0).toLocaleString('fr-FR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} ${msg.currency ?? e?.currency ?? ''}`.trim()
                    : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Interchange</div>
                <div className="text-slate-700">
                  {e?.interchange.sender ?? msg.sender} → {e?.interchange.receiver ?? msg.receiver}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Reçu le</div>
                <div>{formatDate(msg.receivedAt)}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-slate-800 text-base flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                Facturation (support)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-slate-500">
                Marquez ce message comme facturé dans votre suivi (périmètre EDI / iPaaS).
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={msg.billed ? 'outline' : 'primary'}
                  disabled={billingMutation.isPending}
                  onClick={() => billingMutation.mutate(!msg.billed)}
                >
                  {msg.billed ? 'Retirer la facturation' : 'Marquer facturé'}
                </Button>
                {msg.billed && msg.billedAt && (
                  <span className="text-xs text-slate-600 self-center">
                    le {formatDate(msg.billedAt)}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {e && e.nads.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-slate-800 text-base">Partenaires (NAD)</CardTitle>
                <p className="text-xs text-slate-500">
                  Rôles : BY, SU, IV, DP, etc.
                </p>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-left">
                      <th className="p-2 font-medium text-slate-700">Rôle</th>
                      <th className="p-2 font-medium text-slate-700">Id</th>
                      <th className="p-2 font-medium text-slate-700">Nom</th>
                    </tr>
                  </thead>
                  <tbody>
                    {e.nads.map((n) => (
                      <tr key={`${n.role}-${n.partyId}`} className="border-b border-slate-100">
                        <td className="p-2">
                          <span className="font-mono text-xs text-primary-600">{n.role}</span>
                          <div className="text-xs text-slate-500">{n.roleLabel}</div>
                        </td>
                        <td className="p-2 font-mono text-xs">{n.partyId || '—'}</td>
                        <td className="p-2 text-slate-700">{n.name ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {e && e.moa.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-slate-800 text-base">Montants (MOA)</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-left">
                      <th className="p-2 font-medium text-slate-700">Qualif.</th>
                      <th className="p-2 font-medium text-slate-700">Montant</th>
                      <th className="p-2 font-medium text-slate-700">Devise</th>
                    </tr>
                  </thead>
                  <tbody>
                    {e.moa.map((m, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="p-2 font-mono text-xs">{m.qualifier}</td>
                        <td className="p-2">{m.amount.toLocaleString('fr-FR')}</td>
                        <td className="p-2">{m.currency ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {msg.enrichError && (
            <Card className="border-amber-200/80 bg-amber-50/30">
              <CardContent className="py-3 text-sm text-amber-900">
                Aperçu partiel : {msg.enrichError}
              </CardContent>
            </Card>
          )}

          {e && e.segmentLines.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-slate-800 text-base">Segments (1er message)</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap break-all max-h-[28rem] overflow-y-auto bg-slate-50/80 rounded-lg p-3 border border-slate-200/80">
                  {e.segmentLines.map((s) => `${s.position} ${s.line}\n`).join('')}
                </pre>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-slate-800 text-base">Fichier EDIFACT</CardTitle>
                {msg.rawContent && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      void navigator.clipboard.writeText(msg.rawContent!);
                      toast.success('Contenu copié');
                    }}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copier
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap break-all max-h-64 overflow-y-auto bg-slate-50/80 rounded-lg p-3 border border-slate-200/80">
                {msg.rawContent ?? '—'}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-8 text-center">
        <Link to="/edifact" className="text-sm text-primary-600 hover:underline">
          ← Retour à la liste
        </Link>
      </div>
    </div>
  );
}
