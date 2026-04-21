import { Link } from 'react-router-dom';
import { FileCheck, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';

export function TarifsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div className="text-center mb-12">
        <p className="text-primary-600 text-sm font-semibold uppercase tracking-wider">Tarifs</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-slate-800">
          Devis personnalisé et audit
        </h1>
        <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
          Nos offres sont établies sur devis selon votre volume, vos connecteurs et vos besoins. Un audit préalable permet de dimensionner la solution.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        <div className="p-6 sm:p-8 rounded-2xl border-2 border-slate-200 bg-white shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-primary-100 border border-primary-200 flex items-center justify-center">
            <FileCheck className="w-6 h-6 text-primary-600" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-800">Devis sur mesure</h2>
          <p className="mt-2 text-slate-600 text-sm">
            Chaque projet est unique. Nous établissons un devis après analyse de vos flux, du nombre de connecteurs et des volumes. Pas de formule standard : une offre adaptée à votre contexte.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              Étude de faisabilité gratuite
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              Chiffrage détaillé (connecteurs, mappings, hébergement)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              Engagement flexible selon votre taille
            </li>
          </ul>
          <Link
            to="/reserver-demo"
            className="mt-6 inline-flex items-center gap-2 text-primary-600 font-medium hover:text-primary-700"
          >
            Demander un devis
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="p-6 sm:p-8 rounded-2xl border-2 border-slate-200 bg-white shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-primary-100 border border-primary-200 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-primary-600" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-800">Audit d’intégration</h2>
          <p className="mt-2 text-slate-600 text-sm">
            Avant de signer, nous proposons un audit de votre existant (ERP, e-commerce, outils métier) pour identifier les flux prioritaires, les risques et le périmètre recommandé. L’audit sert de base au devis.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              Analyse de votre paysage applicatif
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              Recommandations et plan de déploiement
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              Livrable documenté
            </li>
          </ul>
          <Link
            to="/reserver-demo"
            className="mt-6 inline-flex items-center gap-2 text-primary-600 font-medium hover:text-primary-700"
          >
            Planifier un audit
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <p className="mt-8 text-center text-sm text-slate-500">
        Vous avez déjà un compte ?{' '}
        <Link to="/login" className="text-primary-600 font-medium hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
