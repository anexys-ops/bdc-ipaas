import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '../../components/ui';
import { BackButton } from '../../components/layout';
import { tenantsApi } from '../../api/tenants';
import { Loader2, Building2, User, CreditCard, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../../stores/auth.store';

const PLANS = [
  {
    value: 'FREE' as const,
    label: 'Gratuit',
    price: '0 €/mois',
    features: ['2 flux', '100 exécutions/mois', '2 connecteurs'],
    color: 'slate',
  },
  {
    value: 'PRO' as const,
    label: 'Pro',
    price: '99 €/mois',
    features: ['50 flux', '50 000 exécutions/mois', '50 connecteurs', 'Support prioritaire'],
    color: 'blue',
  },
  {
    value: 'ENTERPRISE' as const,
    label: 'Entreprise',
    price: 'Sur devis',
    features: ['Flux illimités', 'Exécutions illimitées', 'Connecteurs illimités', 'SLA garanti', 'Déploiement dédié'],
    color: 'violet',
  },
];

export function ClientNewPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  // Infos tenant
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [plan, setPlan] = useState<'FREE' | 'PRO' | 'ENTERPRISE'>('FREE');

  // Premier utilisateur admin
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');

  const [step, setStep] = useState<1 | 2>(1);

  // Auto-génère le slug depuis le nom
  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug || slug === autoSlug(name)) {
      setSlug(autoSlug(val));
    }
  };
  const autoSlug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!slug.trim() || !name.trim()) throw new Error('Nom et slug requis');
      if (!adminEmail.trim() || !adminPassword.trim()) throw new Error('Email et mot de passe de l\'admin requis');
      if (adminPassword.length < 8) throw new Error('Le mot de passe doit faire au moins 8 caractères');

      // 1. Créer le tenant
      const tenant = await tenantsApi.create({
        slug: slug.trim(),
        name: name.trim(),
        plan,
      });

      // 2. Créer l'utilisateur admin
      await tenantsApi.createUser(tenant.id, {
        email: adminEmail.trim(),
        password: adminPassword,
        firstName: adminFirstName.trim() || 'Admin',
        lastName: adminLastName.trim() || name.trim(),
        role: 'ADMIN',
      });

      return tenant;
    },
    onSuccess: (tenant) => {
      toast.success(`Client "${tenant.name}" créé avec son compte admin`);
      navigate(`/backoffice/clients/${tenant.id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur à la création');
    },
  });

  if (user?.role !== 'SUPER_ADMIN') return null;

  const isStep1Valid = name.trim().length >= 2 && slug.trim().length >= 2;
  const isStep2Valid = adminEmail.includes('@') && adminPassword.length >= 8;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton to="/backoffice/clients" className="mb-6">Retour aux clients</BackButton>

        {/* Stepper */}
        <div className="flex items-center gap-3 mb-8">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${step >= 1 ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
            <Building2 className="w-4 h-4" />
            1. Informations client
          </div>
          <div className="flex-1 h-px bg-slate-200" />
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${step >= 2 ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
            <User className="w-4 h-4" />
            2. Compte administrateur
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            {/* Infos de base */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary-600" />
                  Informations du client
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  Chaque client dispose de sa propre base de données isolée.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nom de la société <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Ma Société SAS"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Identifiant unique (slug) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400 shrink-0">app.anexys.fr/</span>
                    <Input
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="ma-societe"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Lettres minuscules, chiffres et tirets. Nom de la base : db_{slug.replace(/-/g,'_')}</p>
                </div>
              </CardContent>
            </Card>

            {/* Choix du plan */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary-600" />
                  Plan d'abonnement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {PLANS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPlan(p.value)}
                      className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                        plan === p.value
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      {plan === p.value && (
                        <span className="absolute top-2 right-2 w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </span>
                      )}
                      <p className="font-semibold text-slate-900 text-sm">{p.label}</p>
                      <p className="text-xs font-medium text-primary-600 mb-2">{p.price}</p>
                      <ul className="space-y-1">
                        {p.features.map((f) => (
                          <li key={f} className="text-xs text-slate-600 flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-500 shrink-0" />{f}
                          </li>
                        ))}
                      </ul>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button onClick={() => setStep(2)} disabled={!isStep1Valid}>
                Suivant →
              </Button>
              <Link to="/backoffice/clients">
                <Button variant="outline">Annuler</Button>
              </Link>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            {/* Récap step 1 */}
            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm">
              <Check className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <span className="font-medium text-emerald-800">{name}</span>
                <span className="text-emerald-600 ml-2">· {slug} · Plan {plan}</span>
              </div>
              <button onClick={() => setStep(1)} className="ml-auto text-xs text-emerald-600 underline">Modifier</button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary-600" />
                  Compte administrateur
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  Ce compte permettra au client de se connecter pour la première fois.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Prénom</label>
                    <Input value={adminFirstName} onChange={(e) => setAdminFirstName(e.target.value)} placeholder="Jean" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
                    <Input value={adminLastName} onChange={(e) => setAdminLastName(e.target.value)} placeholder="Dupont" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@ma-societe.fr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Mot de passe (min. 8 caractères) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                {createMutation.error && (
                  <p className="text-sm text-red-500">{(createMutation.error as Error).message}</p>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !isStep2Valid}
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Créer le client
              </Button>
              <Button variant="outline" onClick={() => setStep(1)} disabled={createMutation.isPending}>
                ← Retour
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
