import { Star, Quote } from 'lucide-react';

const REVIEWS = [
  {
    name: 'Sophie M.',
    role: 'DSI, distribution',
    text: 'Ultimate Edicloud a accéléré nos échanges ERP–e‑commerce. Les flux sont visibles et stables, l’équipe support est réactive.',
    rating: 5,
  },
  {
    name: 'Karim B.',
    role: 'Responsable intégration',
    text: 'Le marketplace de connecteurs nous a fait gagner des semaines sur un projet EDI critique. Interface claire, documentation utile.',
    rating: 5,
  },
  {
    name: 'Claire D.',
    role: 'CFO',
    text: 'Facturation et quotas transparents. Nous avons pu dimensionner notre abonnement sans surprise.',
    rating: 4,
  },
] as const;

export function AvisPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div className="text-center mb-14">
        <p className="text-sm font-semibold uppercase tracking-widest text-sky-600">Avis clients</p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          Ils font confiance à <span className="text-primary-600">Ultimate Edicloud</span>
        </h1>
        <p className="mt-4 text-slate-600 max-w-2xl mx-auto text-base leading-relaxed">
          Retours d’expérience sur la plateforme <strong>Ultimate</strong>, le connecteur iPaaS du projet{' '}
          <strong>Edicloud</strong> — intégrations, marketplace et accompagnement.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {REVIEWS.map((r) => (
          <article
            key={r.name}
            className="relative rounded-2xl border border-slate-200/90 bg-white/90 backdrop-blur-sm p-6 shadow-glass hover:shadow-glass-lg transition-shadow"
          >
            <Quote className="absolute top-4 right-4 w-8 h-8 text-sky-100" aria-hidden />
            <div className="flex gap-0.5 mb-4" aria-label={`Note : ${r.rating} sur 5`}>
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
                />
              ))}
            </div>
            <p className="text-slate-700 text-sm leading-relaxed relative z-10">&ldquo;{r.text}&rdquo;</p>
            <footer className="mt-5 pt-4 border-t border-slate-100">
              <p className="font-semibold text-slate-900 text-sm">{r.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{r.role}</p>
            </footer>
          </article>
        ))}
      </div>

      <p className="mt-12 text-center text-xs text-slate-500 max-w-xl mx-auto leading-relaxed">
        Ces témoignages illustrent des usages types de la plateforme. Pour un accompagnement ou une référence détaillée,
        contactez-nous depuis la page Tarifs ou l’espace connecté.
      </p>
    </div>
  );
}
