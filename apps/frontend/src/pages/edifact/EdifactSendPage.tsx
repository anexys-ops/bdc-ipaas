import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '../../components/ui';
import { BackButton } from '../../components/layout';
import { edifactApi } from '../../api/edifact.api';
import type { EdifactMessageType } from '../../api/edifact.api';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';

const MESSAGE_TYPES: { value: EdifactMessageType; label: string }[] = [
  { value: 'ORDERS', label: 'ORDERS' },
  { value: 'INVOIC', label: 'INVOIC' },
  { value: 'DESADV', label: 'DESADV' },
  { value: 'ORDRSP', label: 'ORDRSP' },
];

export function EdifactSendPage() {
  const navigate = useNavigate();
  const [type, setType] = useState<EdifactMessageType>('ORDERS');
  const [reference, setReference] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [payloadJson, setPayloadJson] = useState('{}');

  const sendMutation = useMutation({
    mutationFn: () => {
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(payloadJson || '{}');
      } catch {
        throw new Error('JSON invalide');
      }
      return edifactApi.send({
        type,
        payload,
        reference: reference || undefined,
        partnerId: partnerId || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Message EDIFACT envoyé');
      navigate('/edifact');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de l\'envoi');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMutation.mutate();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center gap-4">
        <BackButton to="/edifact" />
        <div>
          <h1 className="text-xl font-bold text-slate-700 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-500" />
            Envoyer un message EDIFACT
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Générer et envoyer un message EDIFACT
          </p>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-slate-800">Nouveau message</CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              Renseignez le type et le contenu (JSON) du message.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type de message</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as EdifactMessageType)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200/80 bg-white focus:ring-2 focus:ring-primary-400/50"
                  required
                >
                  {MESSAGE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Référence"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ex: REF-2024-001"
              />
            </div>
            <Input
              label="ID partenaire (optionnel)"
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              placeholder="Identifiant partenaire"
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Payload (JSON)
              </label>
              <textarea
                value={payloadJson}
                onChange={(e) => setPayloadJson(e.target.value)}
                className="w-full min-h-[200px] px-4 py-3 rounded-xl border border-slate-200/80 bg-white focus:ring-2 focus:ring-primary-400/50 font-mono text-sm"
                placeholder='{"key": "value"}'
                spellCheck={false}
              />
              {payloadJson.trim() && (() => {
                try {
                  JSON.parse(payloadJson);
                  return null;
                } catch {
                  return (
                    <p className="text-sm text-red-500 mt-1">JSON invalide</p>
                  );
                }
              })()}
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                loading={sendMutation.isPending}
                disabled={sendMutation.isPending}
              >
                Envoyer
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/edifact')}
              >
                Annuler
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
