import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Calculator, Send } from 'lucide-react';
import { Button, Input } from '../ui';
import { demoApi } from '../../api/demo';
import { computeIndicativeMonthlyEuroHt, QUOTE_VOLUME_TIERS } from '../../lib/quote-estimate';

const contactSchema = z.object({
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().optional(),
  email: z.string().email('Email invalide'),
  company: z.string().optional(),
  phone: z.string().max(40, 'Téléphone trop long').optional(),
  message: z.string().max(2000).optional(),
});

type ContactForm = z.infer<typeof contactSchema>;

export type QuoteEstimatorSectionProps = {
  id?: string;
  /** `hero` : texte à gauche, simulateur à droite (accueil). */
  layout?: 'full' | 'hero';
};

export function QuoteEstimatorSection({ id = 'estimateur-devis', layout = 'full' }: QuoteEstimatorSectionProps) {
  const [connectors, setConnectors] = useState(5);
  const [mappings, setMappings] = useState(4);
  const [executionsPerMonth, setExecutionsPerMonth] = useState<number>(QUOTE_VOLUME_TIERS[1].value);

  const estimateHt = useMemo(
    () =>
      computeIndicativeMonthlyEuroHt({
        connectors,
        executionsPerMonth,
        mappings,
      }),
    [connectors, executionsPerMonth, mappings],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
  });

  const quoteMutation = useMutation({
    mutationFn: (data: ContactForm) =>
      demoApi.requestQuote({
        ...data,
        connectors,
        executionsPerMonth,
        mappings,
        clientEstimatedMonthlyHt: estimateHt,
      }),
    onSuccess: () => {
      toast.success(
        'Demande envoyée. Vous recevrez un devis détaillé par email ; notre équipe commerciale vous recontacte sous peu.',
      );
      reset();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Erreur lors de l'envoi";
      if (message.includes('fetch') || message === 'Failed to fetch' || message === 'NetworkError') {
        toast.error('Impossible de joindre le serveur. Réessayez plus tard.');
      } else {
        toast.error(message);
      }
    },
  });

  const onSubmit = (data: ContactForm) => {
    quoteMutation.mutate(data);
  };

  const intro = (
    <div className={layout === 'hero' ? 'lg:pr-8' : ''}>
      <p className="text-xs font-semibold uppercase tracking-widest text-sky-600 flex items-center gap-1.5">
        <Calculator className="w-4 h-4" />
        Tarifs sur devis et audit
      </p>
      <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
        Offres personnalisées selon votre volume et vos connecteurs
      </h2>
      <p className="mt-3 text-slate-600 leading-relaxed">
        Un audit préalable permet de dimensionner la solution et d’établir un devis détaillé. Ajustez les curseurs
        {layout === 'hero' ? ' ci-contre' : ' ci-dessous'} pour obtenir une{' '}
        <strong className="text-slate-800">estimation indicative</strong> de l’abonnement mensuel HT, puis envoyez
        votre demande : un récapitulatif part automatiquement vers{' '}
        <a href="mailto:commercial@anexys.fr" className="text-sky-700 font-medium hover:underline">
          commercial@anexys.fr
        </a>
        .
      </p>
    </div>
  );

  const simulator = (
    <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 sm:p-6 shadow-sm space-y-6">
      <div>
        <label htmlFor="qe-connectors" className="flex justify-between text-sm font-medium text-slate-800">
          <span>Nombre de connexions (connecteurs)</span>
          <span className="text-sky-700 tabular-nums">{connectors}</span>
        </label>
        <input
          id="qe-connectors"
          type="range"
          min={1}
          max={40}
          value={connectors}
          onChange={(e) => setConnectors(Number(e.target.value))}
          className="mt-2 w-full h-2 rounded-full appearance-none bg-slate-200 accent-sky-600 cursor-pointer"
        />
        <p className="mt-1 text-xs text-slate-500">Connecteurs configurés côté plateforme.</p>
      </div>

      <div>
        <label htmlFor="qe-volume" className="block text-sm font-medium text-slate-800 mb-2">
          Volume mensuel (exécutions / messages)
        </label>
        <select
          id="qe-volume"
          value={executionsPerMonth}
          onChange={(e) => setExecutionsPerMonth(Number(e.target.value))}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400"
        >
          {QUOTE_VOLUME_TIERS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="qe-mappings" className="flex justify-between text-sm font-medium text-slate-800">
          <span>Nombre de mappings</span>
          <span className="text-sky-700 tabular-nums">{mappings}</span>
        </label>
        <input
          id="qe-mappings"
          type="range"
          min={1}
          max={40}
          value={mappings}
          onChange={(e) => setMappings(Number(e.target.value))}
          className="mt-2 w-full h-2 rounded-full appearance-none bg-slate-200 accent-sky-600 cursor-pointer"
        />
        <p className="mt-1 text-xs text-slate-500">Transformations de données entre systèmes.</p>
      </div>

      <div className="rounded-xl bg-gradient-to-br from-sky-50 to-violet-50/80 border border-sky-100 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">Estimation abonnement</p>
        <p className="mt-1 text-3xl sm:text-4xl font-bold text-slate-900 tabular-nums">
          {estimateHt.toLocaleString('fr-FR')} € <span className="text-lg font-semibold text-slate-600">HT / mois</span>
        </p>
        <p className="mt-2 text-xs text-slate-600 leading-relaxed">
          Chiffre non contractuel, basé sur vos réglages. Le devis définitif intègre audit, connecteurs spécifiques et
          engagements de volume.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 pt-2 border-t border-slate-100">
        <p className="text-sm font-semibold text-slate-900">Être recontacté et recevoir le devis</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Prénom" placeholder="Jean" error={errors.firstName?.message} {...register('firstName')} />
          <Input label="Nom" placeholder="Dupont" error={errors.lastName?.message} {...register('lastName')} />
        </div>
        <Input
          label="Email professionnel"
          type="email"
          placeholder="vous@entreprise.fr"
          error={errors.email?.message}
          {...register('email')}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Société (optionnel)" placeholder="Ma Société SAS" error={errors.company?.message} {...register('company')} />
          <Input label="Téléphone (optionnel)" placeholder="+33 …" error={errors.phone?.message} {...register('phone')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Précisions sur votre contexte (optionnel)</label>
          <textarea
            {...register('message')}
            rows={3}
            placeholder="ERP, connecteurs souhaités, contraintes…"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 resize-none text-sm"
          />
          {errors.message?.message && <p className="mt-1 text-sm text-red-500">{errors.message.message}</p>}
        </div>
        <Button type="submit" className="w-full gap-2" loading={quoteMutation.isPending}>
          <Send className="w-4 h-4" />
          Envoyer ma demande et le devis à l’équipe commerciale
        </Button>
      </form>
    </div>
  );

  if (layout === 'hero') {
    return (
      <section id={id} className="py-16 sm:py-20 border-t border-slate-200/60 bg-slate-50/90">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-12 items-start">{intro}{simulator}</div>
        </div>
      </section>
    );
  }

  return (
    <section id={id} className="mt-14 rounded-2xl border border-slate-200 bg-slate-50/80 p-6 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {intro}
        {simulator}
      </div>
    </section>
  );
}
