import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '../../components/ui';
import { edifactApi } from '../../api/edifact.api';
import type { EdifactDirection, EdifactMessageType, EdifactMessage } from '../../api/edifact.api';
import { FileText, Loader2, Plus, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';

const PAGE_SIZE = 20;
const MESSAGE_TYPES: { value: EdifactMessageType; label: string }[] = [
  { value: 'ORDERS', label: 'ORDERS' },
  { value: 'HANMOV', label: 'HANMOV' },
  { value: 'INVOIC', label: 'INVOICE' },
  { value: 'PRICAT', label: 'PRICAT' },
  { value: 'DESADV', label: 'DESADV' },
  { value: 'ORDRSP', label: 'ORDRSP' },
];
const DIRECTIONS: { value: EdifactDirection; label: string }[] = [
  { value: 'INBOUND', label: 'Entrant' },
  { value: 'OUTBOUND', label: 'Sortant' },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  });
}

export function EdifactPage() {
  const [type, setType] = useState<EdifactMessageType | ''>('');
  const [direction, setDirection] = useState<EdifactDirection | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [offset, setOffset] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ['edifact-messages', type, direction, from, to, offset],
    queryFn: () =>
      edifactApi.getMessages({
        type: type || undefined,
        direction: direction || undefined,
        from: from || undefined,
        to: to || undefined,
        limit: PAGE_SIZE,
        offset,
      }),
  });

  useEffect(() => {
    if (error) toast.error('Impossible de charger les messages EDIFACT');
  }, [error]);

  const messages = data?.messages ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-700 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-500" />
            Messages EDIFACT
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Liste des messages reçus et émis
          </p>
        </div>
        <Link to="/edifact/send">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Envoyer un message
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-slate-800">Filtres</CardTitle>
          <div className="flex flex-wrap gap-3 mt-2 items-end">
            <div className="min-w-[140px]">
              <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value as EdifactMessageType | '');
                  setOffset(0);
                }}
                className="w-full px-4 py-3 rounded-xl border border-slate-200/80 bg-white focus:ring-2 focus:ring-primary-400/50 text-sm"
              >
                <option value="">Tous</option>
                {MESSAGE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[140px]">
              <label className="block text-xs font-medium text-slate-500 mb-1">Direction</label>
              <select
                value={direction}
                onChange={(e) => {
                  setDirection(e.target.value as EdifactDirection | '');
                  setOffset(0);
                }}
                className="w-full px-4 py-3 rounded-xl border border-slate-200/80 bg-white focus:ring-2 focus:ring-primary-400/50 text-sm"
              >
                <option value="">Toutes</option>
                {DIRECTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Du"
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setOffset(0);
              }}
              className="max-w-[160px]"
            />
            <Input
              label="Au"
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setOffset(0);
              }}
              className="max-w-[160px]"
            />
          </div>
        </CardHeader>
      </Card>

      <Card className="mt-6 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-slate-800">
            {total} message{total !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : messages.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Aucun message EDIFACT.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="text-left p-3 font-medium text-slate-700">Date</th>
                    <th className="text-left p-3 font-medium text-slate-700">Type</th>
                    <th className="text-left p-3 font-medium text-slate-700">Direction</th>
                    <th className="text-left p-3 font-medium text-slate-700">Référence</th>
                    <th className="text-left p-3 font-medium text-slate-700">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((msg: EdifactMessage) => (
                    <tr key={msg.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="p-3 text-slate-600 whitespace-nowrap">
                        {formatDate((msg as { receivedAt?: string; createdAt?: string }).receivedAt ?? (msg as { createdAt?: string }).createdAt ?? '')}
                      </td>
                      <td className="p-3 font-medium text-slate-800">{msg.type}</td>
                      <td className="p-3">
                        {msg.direction === 'INBOUND' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <ArrowDownLeft className="w-4 h-4" />
                            Entrant
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-primary-600">
                            <ArrowUpRight className="w-4 h-4" />
                            Sortant
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600 font-mono text-xs">
                        {msg.reference ?? '—'}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium ${
                            msg.status === 'SENT' || msg.status === 'RECEIVED'
                              ? 'bg-emerald-500/20 text-emerald-600'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {msg.status}
                        </span>
                      </td>
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
