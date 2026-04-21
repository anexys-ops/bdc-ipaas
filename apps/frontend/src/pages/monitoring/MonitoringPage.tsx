import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input } from '../../components/ui';
import {
  Activity,
  Bell,
  Mail,
  AlertTriangle,
  Plus,
  Trash2,
  Save,
  Info,
} from 'lucide-react';

export type TypeErreurNotification = 'TOUTES' | 'ECHEC_UNIQUEMENT' | 'ECHEC_ET_PARTIEL' | 'AUCUNE';

const LABELS_TYPE_ERREUR: Record<TypeErreurNotification, string> = {
  TOUTES: 'Toutes les erreurs (échec + partiel + timeout)',
  ECHEC_UNIQUEMENT: 'Échec uniquement',
  ECHEC_ET_PARTIEL: 'Échec et partiel',
  AUCUNE: 'Aucune notification par erreur',
};

export function MonitoringPage() {
  const [alertesActives, setAlertesActives] = useState(true);
  const [emails, setEmails] = useState<string[]>(['admin@example.com', 'ops@example.com']);
  const [nouvelEmail, setNouvelEmail] = useState('');
  const [typeErreur, setTypeErreur] = useState<TypeErreurNotification>('ECHEC_ET_PARTIEL');
  const [saved, setSaved] = useState(false);

  const ajouterEmail = () => {
    const email = nouvelEmail.trim().toLowerCase();
    if (!email) return;
    if (emails.includes(email)) return;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email)) return;
    setEmails((prev) => [...prev, email]);
    setNouvelEmail('');
  };

  const supprimerEmail = (email: string) => {
    setEmails((prev) => prev.filter((e) => e !== email));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen page-bg-mesh">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Activity className="w-7 h-7 text-primary-500" />
            Monitoring
          </h1>
          <p className="text-slate-600 mt-1">
            Configuration des alertes, adresses de notification et types d’erreur pour l’information.
          </p>
        </div>

        {/* Configuration des alertes */}
        <Card className="border border-slate-200/80 bg-white/95 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <Bell className="w-5 h-5 text-primary-500" />
              Configuration des alertes
            </CardTitle>
            <CardDescription>
              Activez ou désactivez l’envoi d’alertes par email en cas d’erreur sur les flux.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={alertesActives}
                onChange={(e) => setAlertesActives(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-primary-500 focus:ring-primary-400"
              />
              <span className="text-sm font-medium text-slate-700">
                Alertes actives (notifications par email)
              </span>
            </label>
          </CardContent>
        </Card>

        {/* Adresses email */}
        <Card className="border border-slate-200/80 bg-white/95 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <Mail className="w-5 h-5 text-primary-500" />
              Adresses email
            </CardTitle>
            <CardDescription>
              Liste des adresses qui recevront les notifications en cas d’erreur (selon le type choisi).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="nouvelle@adresse.com"
                value={nouvelEmail}
                onChange={(e) => setNouvelEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), ajouterEmail())}
                className="flex-1"
              />
              <Button type="button" onClick={ajouterEmail} className="shrink-0 gap-1.5">
                <Plus className="w-4 h-4" />
                Ajouter
              </Button>
            </div>
            {emails.length === 0 ? (
              <p className="text-sm text-slate-500">Aucune adresse configurée.</p>
            ) : (
              <ul className="space-y-2">
                {emails.map((email) => (
                  <li
                    key={email}
                    className="flex items-center justify-between gap-3 py-2.5 px-4 rounded-xl bg-slate-50 border border-slate-100"
                  >
                    <span className="text-sm font-medium text-slate-700">{email}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => supprimerEmail(email)}
                      className="text-slate-500 hover:text-red-600 shrink-0"
                      aria-label={`Supprimer ${email}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Type d'erreur pour l'information */}
        <Card className="border border-slate-200/80 bg-white/95 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Type d’erreur pour l’information
            </CardTitle>
            <CardDescription>
              Choisissez quelles erreurs déclenchent l’envoi d’une notification aux adresses ci-dessus.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(Object.keys(LABELS_TYPE_ERREUR) as TypeErreurNotification[]).map((value) => (
                <label
                  key={value}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    typeErreur === value
                      ? 'border-primary-300 bg-primary-50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="typeErreur"
                    value={value}
                    checked={typeErreur === value}
                    onChange={() => setTypeErreur(value)}
                    className="w-4 h-4 text-primary-500 focus:ring-primary-400"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    {LABELS_TYPE_ERREUR[value]}
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600">
                « Échec » = exécution en erreur ; « Partiel » = une partie des enregistrements a échoué ;
                « Timeout » = dépassement du délai. Choisir « Toutes » envoie une alerte pour chaque type.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} className="gap-2" disabled={saved}>
            <Save className="w-4 h-4" />
            {saved ? 'Enregistré' : 'Enregistrer la configuration'}
          </Button>
        </div>
      </div>
    </div>
  );
}
