import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '../../components/ui';
import { Key, Copy, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export function ApiKeyPage() {
  const [revealed, setRevealed] = useState(false);
  const [apiKey] = useState('••••••••••••••••••••••••••••••••'); // Placeholder: à remplacer par un appel API

  const handleCopy = () => {
    if (apiKey.startsWith('•')) return;
    navigator.clipboard.writeText(apiKey);
    toast.success('Clé copiée dans le presse-papiers');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Ma clé API</h1>
      <Card className="border-2 border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Key className="w-5 h-5" />
            Clé API
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Utilisez cette clé pour authentifier vos appels à l’API. Ne la partagez jamais.
          </p>
          <div className="flex gap-2">
            <Input
              readOnly
              value={revealed ? apiKey : '••••••••••••••••••••••••••••••••'}
              className="font-mono bg-slate-50"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRevealed((r) => !r)}
              className="shrink-0"
              aria-label={revealed ? 'Masquer' : 'Afficher'}
            >
              {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
