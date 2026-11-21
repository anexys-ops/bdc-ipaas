import { useQuery } from '@tanstack/react-query';
import { BellRing, CloudFog, CloudLightning, CloudSun, Construction, Sun } from 'lucide-react';
import { tenantsApi, type FlowWeatherFlow } from '../../api/tenants';

const WEATHER = {
  ok: { icon: Sun, label: 'Tout fonctionne', tone: 'text-emerald-600', row: '' },
  warning: { icon: CloudSun, label: 'À surveiller', tone: 'text-amber-600', row: 'bg-amber-50/60' },
  critical: { icon: CloudLightning, label: 'Incident en cours', tone: 'text-red-600', row: 'bg-red-50/60' },
  unknown: { icon: CloudFog, label: 'En attente de données', tone: 'text-slate-400', row: '' },
  maintenance: { icon: Construction, label: 'Maintenance', tone: 'text-sky-600', row: '' },
} as const;
const ORDER: FlowWeatherFlow['status'][] = ['critical', 'warning', 'unknown', 'maintenance', 'ok'];

const number = (value: number) => new Intl.NumberFormat('fr-FR').format(value);
const day = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
function ago(value: string | null): string {
  if (!value) return 'Aucun passage';
  const minutes = Math.max(0, (Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return 'à l’instant';
  if (minutes < 60) return `il y a ${Math.floor(minutes)} min`;
  if (minutes < 1440) return `il y a ${Math.floor(minutes / 60)} h`;
  return `il y a ${Math.floor(minutes / 1440)} j`;
}

/** Météo des flux du client : même base de monitoring que l'équipe BDC (Tickflow). */
export function FlowWeatherCard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['tenants', 'me', 'flow-weather'],
    queryFn: () => tenantsApi.getMyFlowWeather(),
    refetchInterval: 60_000,
    retry: 1,
  });
  // Tant que la liaison n'est pas configurée pour ce compte, la carte reste masquée.
  if (isLoading || isError || !data?.enabled) return null;
  const flows = data.clients
    .flatMap((client) => client.flows)
    .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || a.name.localeCompare(b.name, 'fr'));
  const worst = ORDER.find((status) => flows.some((flow) => flow.status === status)) ?? 'unknown';
  const Global = WEATHER[worst].icon;
  const total = flows.reduce(
    (sum, flow) => ({
      today: sum.today + flow.documents.today,
      month: sum.month + flow.documents.month,
      year: sum.year + flow.documents.year,
    }),
    { today: 0, month: 0, year: 0 },
  );

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-sm shadow-sm overflow-hidden mb-8">
      <div className="px-5 py-4 border-b border-slate-200/60 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Global className={`w-8 h-8 ${WEATHER[worst].tone}`} aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Météo de vos flux</h2>
            <p className="text-sm text-slate-500">
              {WEATHER[worst].label} · {flows.length} flux suivis
            </p>
          </div>
        </div>
        <dl className="flex gap-6 text-right">
          {(
            [
              ['Aujourd’hui', total.today],
              ['Ce mois', total.month],
              ['Cette année', total.year],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd className="text-lg font-bold text-slate-800 tabular-nums">{number(value)}</dd>
            </div>
          ))}
        </dl>
      </div>
      {flows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-slate-500">Aucun flux n’est encore suivi pour votre compte.</p>
      ) : (
        <ul className="divide-y divide-slate-200/60">
          {flows.map((flow) => {
            const weather = WEATHER[flow.status];
            const Icon = weather.icon;
            const issue = flow.open_issues[0];
            return (
              <li key={flow.flow_code} className={`px-5 py-3 grid gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,2fr)_1fr_1fr_1.2fr] sm:items-center ${weather.row}`}>
                <div className="flex items-start gap-3 min-w-0">
                  <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${weather.tone}`} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{flow.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {weather.label}
                      {flow.project ? ` · ${flow.project}` : ''}
                      {flow.in_production_since ? ` · en production depuis le ${day(flow.in_production_since)}` : ''}
                    </p>
                    {(issue || flow.silent) && (
                      <p className="mt-1 text-xs text-slate-700">
                        {issue ? issue.message : 'Aucune nouvelle du flux, nos équipes vérifient.'}
                        {issue?.client_notified_at && (
                          <span className="ml-2 inline-flex items-center gap-1 text-emerald-700">
                            <BellRing className="w-3 h-3" aria-hidden="true" /> vous avez été prévenu le {day(issue.client_notified_at)}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-sm text-slate-600">
                  <span className="text-xs text-slate-400 sm:hidden">Dernier flux : </span>
                  {ago(flow.last_run_at)}
                </p>
                <p className="text-sm text-slate-600 tabular-nums">
                  <span className="text-xs text-slate-400 sm:hidden">Aujourd’hui : </span>
                  <strong className="text-slate-800">{number(flow.documents.today)}</strong> aujourd’hui
                </p>
                <p className="text-sm text-slate-600 tabular-nums">
                  {number(flow.documents.month)} ce mois · {number(flow.documents.year)} cette année
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
